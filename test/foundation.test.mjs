import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { Store } from '../src/store.mjs';
import { ParliamentClient } from '../src/client.mjs';
import { normalizeMatter, normalizePerson, normalizeVote, normalizeDocument, normalizeSpeech, mergeBundles } from '../src/normalize.mjs';
import { createApi } from '../src/server.mjs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { selectMilestones, date } from '../web/src/data.mjs';

const manifest = JSON.parse(await readFile(new URL('./fixtures/manifest.json', import.meta.url), 'utf8'));
const fixtures = {};
for (const sample of manifest.samples) {
  const text = await readFile(new URL(`./fixtures/${sample.file}`, import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(text).digest('hex'), sample.sha256);
  fixtures[sample.kind] = { ...sample, text, payload: JSON.parse(text) };
}

function seed(store) {
  store.ingest(fixtures.person, normalizePerson(fixtures.person.payload));
  store.ingest(fixtures.matter, normalizeMatter(fixtures.matter.payload));
  store.ingest(fixtures.document, normalizeDocument(fixtures.document.payload));
  store.ingest(fixtures.vote, normalizeVote(fixtures.vote.payload, manifest.matterKey));
  const response = fixtures['speech-search'];
  store.ingest(response, mergeBundles(response.payload.results.map((result, index) => normalizeSpeech(result.puheenvuoro, `/results/${index}/puheenvuoro`))));
}

test('captured official records power trace, search, person votes and evidence', () => {
  const store = new Store(':memory:');
  try {
    seed(store);
    const trace = store.trace(manifest.matterKey);
    assert.equal(trace.matter.attributes.outcome.fi, 'Hyväksytty muutettuna');
    assert.ok(trace.related.some(link => link.predicate === 'has_topic' && link.entity.sourceKey === 'http://www.yso.fi/onto/yso/p13997'));
    assert.ok(trace.related.some(link => link.predicate === 'has_document' && !link.entity.attributes.metadataOnly));
    assert.equal(trace.related.find(link => link.predicate === 'has_vote').entity.title, fixtures.vote.payload.aanestysotsikko.fi);
    assert.equal(trace.related.find(link => link.predicate === 'has_vote').entity.attributes.ballotCountCheck.matches, true);
    assert.equal(store.person('1392').ballots[0].choice, fixtures.vote.payload.aanestystapahtumat.find(b => b.henkilonumero === '1392').kayttaytyminen.fi);
    assert.ok(store.search('asumistuki').length);
    assert.equal(store.search("' OR 1=1 --").length, 0);
    assert.equal(trace.steps.length, fixtures.matter.payload.kasittelyt.fi.length);
    assert.equal(trace.steps[0].happenedOn, '2023-10-12');
    for (const step of trace.steps) {
      const snapshot = JSON.parse(store.db.prepare('SELECT payload FROM snapshot WHERE id=?').get(step.evidence.snapshotId).payload);
      const value = step.evidence.pointer.split('/').slice(1).reduce((item, key) => item[key], snapshot);
      assert.deepEqual(step.attributes, value);
    }
    assert.equal(trace.matter.evidence.sha256, fixtures.matter.sha256);
    assert.equal(trace.matter.evidence.license, 'CC BY 4.0');
    assert.equal(trace.coverage.exhaustive, false);
  } finally { store.close(); }
});

test('repeat imports are idempotent and full document is not replaced by a stub', () => {
  const store = new Store(':memory:');
  try {
    seed(store);
    const before = store.coverage();
    seed(store);
    assert.deepEqual(store.coverage(), before);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM snapshot').get().n, manifest.samples.length);
    const doc = store.getEntity('document:EDK-2023-AK-29738');
    assert.equal(doc.attributes.metadataOnly, false);
    assert.ok(doc.attributes.fullText.length > 1000);
  } finally { store.close(); }
});

test('corrected vote replaces ballots, preserves unknown choices and absent person references', () => {
  const store = new Store(':memory:');
  try {
    seed(store);
    const corrected = structuredClone(fixtures.vote.payload);
    corrected.aanestystapahtumat = [{ ...corrected.aanestystapahtumat[0], henkilonumero: 'not-imported', kayttaytyminen: { fi: 'Uusi arvo', sv: null } }];
    const response = { ...fixtures.vote, payload: corrected, text: JSON.stringify(corrected) };
    store.ingest(response, normalizeVote(corrected, manifest.matterKey));
    assert.equal(store.coverage().ballots, 1);
    assert.equal(store.db.prepare('SELECT choice FROM ballot').get().choice, 'Uusi arvo');
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM snapshot').get().n, manifest.samples.length + 1);
    assert.equal(store.person('1392').ballots.length, 0);
    const check = store.getEntity(`vote:${corrected.id}`).attributes.ballotCountCheck;
    assert.equal(check.origin, 'derived');
    assert.equal(check.matches, false);
    corrected.aanestystapahtumat = null;
    assert.equal(normalizeVote(corrected, manifest.matterKey).entities[0].attributes.ballotCountCheck.matches, null);
  } finally { store.close(); }
});

test('failed import rolls back snapshot and entity changes', () => {
  const store = new Store(':memory:');
  try {
    const bundle = normalizeMatter(fixtures.matter.payload);
    bundle.relations[0].toId = 'document:missing';
    assert.throws(() => store.ingest(fixtures.matter, bundle), /FOREIGN KEY/);
    assert.equal(store.coverage().counts.length, 0);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM snapshot').get().n, 0);
    assert.throws(() => normalizePerson({ henkilonro: null }), /henkilonro/);
    assert.throws(() => normalizeVote(fixtures.vote.payload, 'HE 1/2020 vp'), /expected/);
  } finally { store.close(); }
});

test('whole import commits together; later failure retains previous records and import status', () => {
  const store = new Store(':memory:');
  try {
    seed(store);
    const before = store.getEntity('person:1392');
    const corrected = { ...fixtures.person.payload, kutsumanimi: 'Changed name' };
    const broken = normalizeMatter(fixtures.matter.payload);
    broken.relations[0].toId = 'document:missing';
    const run = store.startRun('Atomic verification');
    assert.throws(() => store.ingestBatch([
      { response: { ...fixtures.person, text: JSON.stringify(corrected) }, bundle: normalizePerson(corrected) },
      { response: fixtures.matter, bundle: broken },
    ], run), /FOREIGN KEY/);
    assert.deepEqual(store.getEntity('person:1392'), before);
    assert.equal(store.coverage().recentImports[0].status, 'running');
    store.finishRun(run, new Error('Later response invalid'));
    assert.equal(store.coverage().recentImports[0].status, 'failed');
    const goodRun = store.startRun('Successful batch');
    store.ingestBatch([{ response: { ...fixtures.person, text: JSON.stringify(corrected) }, bundle: normalizePerson(corrected) }], goodRun);
    assert.equal(store.getEntity('person:1392').title, 'Changed name Purra');
    assert.equal(store.coverage().recentImports[0].status, 'complete');
  } finally { store.close(); }
});

test('browse paginates and filters literal names/state; topic and vote keep explicit source links', () => {
  const store = new Store(':memory:');
  try {
    seed(store);
    const people = Array.from({ length: 53 }, (_, index) => normalizePerson({ ...fixtures.person.payload,
      henkilonro: String(2000 + index), kutsumanimi: `Person ${index}`, edustajantoimenTila: 'Entinen' }));
    store.ingest(fixtures.person, mergeBundles(people));
    assert.equal(store.browse('person', { state: 'Entinen' }).total, 53);
    assert.equal(store.browse('person', { state: 'Entinen' }).results.length, 50);
    assert.equal(store.browse('person', { state: 'Entinen', offset: 50 }).results.length, 3);
    assert.equal(store.browse('person', { state: 'Nykyinen', query: 'Riikka Purra' }).total, 1);
    const topic = store.topic('http://www.yso.fi/onto/yso/p13997');
    assert.equal(topic.matters[0].matter.sourceKey, manifest.matterKey);
    assert.equal(topic.matters[0].reason.origin, 'official');
    const vote = store.vote(fixtures.vote.payload.id);
    assert.equal(vote.ballots.length, 199);
    assert.equal(vote.ballots.find(row => row.personKey === '1392').personId, 'person:1392');
    assert.equal(vote.ballots.find(row => row.personKey !== '1392').personId, null);
    assert.ok(vote.ballots.every(row => row.name && row.evidence.pointer.includes('aanestystapahtumat')));
    assert.equal(vote.matter.sourceKey, manifest.matterKey);
  } finally { store.close(); }
});

test('timeline selection preserves source facts and does not infer acceptance from second reading', () => {
  const store = new Store(':memory:');
  try {
    seed(store);
    const steps = store.trace(manifest.matterKey).steps;
    const selected = selectMilestones(steps);
    assert.equal(selected.length, 4);
    assert.equal(selected[0].happenedOn, '2023-10-12');
    assert.equal(selected[1].happenedOn, '2023-10-17');
    assert.equal(selected[2].happenedOn, '2023-12-01');
    assert.equal(selected[3].happenedOn, '2023-12-12');
    assert.equal(selected[3].displayTitle, 'Toinen käsittely päättyi');
    assert.ok(selected[3].attributes.fraasi.fraasisisalto.includes('Eduskunta hyväksyi'));
    assert.equal(date({ fi: '2023-12-12', sv: null }), '12.12.2023');
    assert.equal(date(null), 'Päivämäärä ei saatavilla');
    assert.deepEqual(selectMilestones([]), []);
  } finally { store.close(); }
});

test('built frontend serves bookmark routes and assets without exposing files outside its root', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eduskuntadata-static-'));
  await writeFile(join(directory, 'index.html'), '<main>Frontend</main>');
  await writeFile(join(directory, 'app.js'), 'console.log("asset")');
  const store = new Store(':memory:');
  const server = createApi(store, { staticRoot: directory });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await (await fetch(`${base}/edustajat/1392`)).text(), '<main>Frontend</main>');
    assert.match((await fetch(`${base}/app.js`)).headers.get('content-type'), /javascript/);
    assert.equal((await fetch(`${base}/missing.js`)).status, 404);
    assert.equal((await fetch(`${base}/%2e%2e%2foutside.txt`)).status, 404);
    assert.equal((await fetch(`${base}/api/status`)).status, 200);
    assert.equal((await fetch(`${base}/api/browse?kind=person&offset=-1`)).status, 400);
    assert.equal((await fetch(`${base}/api/browse?kind=invalid`)).status, 400);
    assert.equal((await fetch(`${base}/api/topic?id=missing`)).status, 404);
    assert.equal((await fetch(`${base}/api/vote?id=missing`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    store.close();
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep + 'eduskuntadata-static-'));
    await rm(directory, { recursive: true });
  }
});

const page = (ids, offset, total) => new Response(JSON.stringify({
  results: ids.map(id => ({ id })), searchMetadata: { totalResultCount: total, startFromIndex: offset },
}), { headers: { 'Content-Type': 'application/json' } });

test('search pagination follows total, preserving POST body and offset', async () => {
  const bodies = [];
  const client = new ParliamentClient({ pause: async () => {}, fetcher: async (url, request) => {
    const body = JSON.parse(request.body);
    bodies.push(body);
    return body.startFromIndex === 0 ? page(['1','2'], 0, 3) : page(['3'], 2, 3);
  } });
  const pages = [];
  for await (const result of client.searchPages({ category: 'kansanedustaja', pageSize: 2 })) pages.push(result);
  assert.equal(pages.length, 2);
  assert.deepEqual(bodies.map(b => b.startFromIndex), [0,2]);
  assert.equal(pages[0].method, 'POST');
  assert.equal(JSON.parse(pages[0].requestBody).category, 'kansanedustaja');
});

test('pagination fails visibly on truncated, duplicate, changing or capped imports', async () => {
  for (const [fetcher, pattern] of [
    [async () => page([], 0, 10), /truncated/],
    [async () => page(['1','1'], 0, 2), /Duplicate/],
    [async (url, request) => { const offset = JSON.parse(request.body).startFromIndex; return page([String(offset)], offset, offset === 0 ? 3 : 4); }, /changed/],
    [async () => page(['1'], 0, 2), /Page limit/],
  ]) {
    const client = new ParliamentClient({ fetcher, pause: async () => {} });
    await assert.rejects(async () => { for await (const result of client.searchPages({ pageSize: 2, maxPages: 1 + Number(pattern.source === 'changed') })) void result; }, pattern);
  }
});

test('rate-limit responses retry with bounded waits; invalid JSON and failures surface', async () => {
  let calls = 0;
  const waits = [];
  const client = new ParliamentClient({ pause: async ms => waits.push(ms), fetcher: async () => ++calls < 3
    ? new Response('', { status: 429, headers: { 'Retry-After': '120' } }) : page([], 0, 0) });
  await client.request('search', {});
  assert.deepEqual(waits, [30_000,30_000]);
  await assert.rejects(new ParliamentClient({ fetcher: async () => new Response('not JSON') }).request('search', {}), /Invalid JSON/);
  await assert.rejects(new ParliamentClient({ fetcher: async () => new Response('', { status: 404 }) }).request('missing'), /HTTP 404/);
});

test('local read API supports search, trace and profiles with honest missing/error states', async () => {
  const store = new Store(':memory:');
  seed(store);
  const server = createApi(store);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/status`)).status, 200);
    const result = await (await fetch(`${base}/api/search?q=asumistuki`)).json();
    assert.ok(result.results.length);
    assert.equal(result.coverage.exhaustive, false);
    const trace = await (await fetch(`${base}/api/trace?id=${encodeURIComponent(manifest.matterKey)}`)).json();
    assert.equal(trace.matter.sourceKey, manifest.matterKey);
    assert.equal((await fetch(`${base}/api/people/1392`)).status, 200);
    assert.equal((await fetch(`${base}/api/people/missing`)).status, 404);
    assert.equal((await fetch(`${base}/api/people/%FF`)).status, 400);
    assert.equal((await fetch(`${base}/api/search?q=`)).status, 400);
    assert.equal((await fetch(`${base}/api/trace?id=missing`)).status, 404);
    assert.equal((await fetch(`${base}/api/status`, { method: 'POST' })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    store.close();
  }
});
