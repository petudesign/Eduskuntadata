import { readFile } from 'node:fs/promises';
import { Store } from './store.mjs';
import { ParliamentClient } from './client.mjs';
import { normalizePerson, normalizeMatter, normalizeDocument, normalizeVote, normalizeSpeech, mergeBundles } from './normalize.mjs';

const [command, ...args] = process.argv.slice(2);
const store = new Store(process.env.EDUSKUNTADATA_DB || 'data/eduskuntadata.sqlite');
const client = new ParliamentClient();
const print = value => console.log(JSON.stringify(value, null, 2));

async function demo() {
  const manifest = JSON.parse(await readFile(new URL('../test/fixtures/manifest.json', import.meta.url), 'utf8'));
  const run = store.startRun('Captured fixture subset, 2026-10-02; not a live/full import');
  try {
    const entries = [];
    for (const sample of manifest.samples) {
      const text = await readFile(new URL(`../test/fixtures/${sample.file}`, import.meta.url), 'utf8');
      const payload = JSON.parse(text);
      const response = { ...sample, text, payload };
      let bundle;
      if (sample.kind === 'person') bundle = normalizePerson(payload);
      if (sample.kind === 'matter') bundle = normalizeMatter(payload);
      if (sample.kind === 'document') bundle = normalizeDocument(payload);
      if (sample.kind === 'vote') bundle = normalizeVote(payload, manifest.matterKey);
      if (sample.kind === 'speech-search') bundle = mergeBundles(payload.results.map((result, index) => normalizeSpeech(result.puheenvuoro, `/results/${index}/puheenvuoro`)));
      entries.push({ response, bundle });
    }
    store.ingestBatch(entries, run);
  } catch (error) { store.finishRun(run, error); throw error; }
  print(store.coverage());
}

async function sync() {
  const matterKey = args[0] || 'HE 74/2023 vp';
  const run = store.startRun(`All paginated MPs + matter ${matterKey} + related documents and votes`);
  try {
    const entries = [];
    for await (const page of client.searchPages({ category: 'kansanedustaja', sort: [{ property: 'henkilonro', ascending: true }] })) {
      entries.push({ response: page, bundle: mergeBundles(page.payload.results.map((result, index) => normalizePerson(result.kansanedustaja, `/results/${index}/kansanedustaja`))) });
      console.error(`MPs: ${page.payload.searchMetadata.startFromIndex + page.payload.results.length}/${page.payload.searchMetadata.totalResultCount}`);
    }
    const matter = await client.matter(matterKey);
    entries.push({ response: matter, bundle: normalizeMatter(matter.payload) });
    const documents = matter.payload.keskeisetAsiakirjat?.fi ?? [];
    for (const doc of documents) {
      const response = await client.document(doc.edktunnus);
      entries.push({ response, bundle: normalizeDocument(response.payload) });
      await client.pause(200);
    }
    const votes = await client.votes(matterKey);
    if (!Array.isArray(votes.payload)) throw new Error('Unexpected vote list');
    entries.push({ response: votes, bundle: mergeBundles(votes.payload.map((vote, index) => normalizeVote(vote, matterKey, `/${index}`))) });
    store.ingestBatch(entries, run);
    print(store.coverage());
  } catch (error) { store.finishRun(run, error); throw error; }
}

try {
  if (command === 'demo') await demo();
  else if (command === 'sync') await sync();
  else if (command === 'search') print(store.search(args.join(' ')));
  else if (command === 'trace') {
    const trace = store.trace(args.join(' '));
    if (!trace) throw new Error('Matter has not been imported');
    print(trace);
  } else throw new Error('Usage: npm run demo | sync -- "HE 74/2023 vp" | search -- asumistuki | trace -- "HE 74/2023 vp"');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { store.close(); }
