import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fold, idFor } from './normalize.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const json = value => JSON.stringify(value);

export class Store {
  constructor(path = 'data/eduskuntadata.sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    const version = this.db.prepare('PRAGMA user_version').get().user_version;
    if (version > 1) throw new Error('Database is newer than this application');
    this.db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    this.db.exec('PRAGMA user_version = 1');
    this.db.prepare('INSERT OR IGNORE INTO source VALUES (?, ?, ?, ?, ?, ?)').run(
      'eduskunta', 'Eduskunta', 'Eduskunnan avoin data', 'https://api.eduskunta.fi/',
      'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/',
    );
  }

  close() { this.db.close(); }

  ingest(response, bundle, inTransaction = false) {
    const checksum = hash(response.text);
    const snapshotId = hash(json([response.url, response.method, response.requestBody, checksum]));
    if (!inTransaction) this.db.exec('BEGIN');
    try {
      this.db.prepare(`INSERT INTO snapshot VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET last_retrieved_at=excluded.last_retrieved_at`).run(
        snapshotId, 'eduskunta', response.url, response.method, response.requestBody ?? null,
        response.text, checksum, response.retrievedAt, response.retrievedAt, response.contentType ?? null,
      );
      const upsert = this.db.prepare(`INSERT INTO entity VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, search_text=excluded.search_text,
          attributes=excluded.attributes, snapshot_id=excluded.snapshot_id, pointer=excluded.pointer`);
      for (const item of bundle.entities) {
        // A matter's document stub must not overwrite a separately fetched document.
        const existing = this.db.prepare('SELECT attributes FROM entity WHERE id=?').get(item.id);
        if (item.kind === 'document' && item.attributes.metadataOnly && existing && !JSON.parse(existing.attributes).metadataOnly) continue;
        const searchText = [item.title, item.key, item.attributes.givenNames, item.attributes.text, item.attributes.fullText]
          .filter(value => typeof value === 'string').join(' ');
        upsert.run(item.id, item.kind, item.key, item.title, fold(searchText),
          json(item.attributes), snapshotId, item.pointer);
      }
      for (const owner of new Set(bundle.owners)) this.db.prepare('DELETE FROM relation WHERE owner_id=?').run(owner);
      for (const link of bundle.relations) this.db.prepare('INSERT INTO relation VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        link.ownerId, link.fromId, link.toId, link.predicate, json(link.attributes), snapshotId, link.pointer,
      );
      for (const item of bundle.entities) {
        if (item.kind === 'matter') this.db.prepare('DELETE FROM process_step WHERE matter_id=?').run(item.id);
        if (item.kind === 'vote') this.db.prepare('DELETE FROM ballot WHERE vote_id=?').run(item.id);
      }
      for (const step of bundle.steps) this.db.prepare('INSERT INTO process_step VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        step.matterId, step.key, step.date, step.order, json(step.attributes), snapshotId, step.pointer,
      );
      for (const ballot of bundle.ballots) this.db.prepare('INSERT INTO ballot VALUES (?, ?, ?, ?, ?, ?)').run(
        ballot.voteId, ballot.personKey, ballot.choice, json(ballot.attributes), snapshotId, ballot.pointer,
      );
      if (!inTransaction) this.db.exec('COMMIT');
      return snapshotId;
    } catch (error) {
      if (!inTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }

  ingestBatch(entries, runId) {
    this.db.exec('BEGIN');
    try {
      for (const { response, bundle } of entries) this.ingest(response, bundle, true);
      if (runId !== undefined) this.finishRun(runId);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  startRun(scope) {
    return this.db.prepare("INSERT INTO import_run(started_at,status,scope) VALUES (?,'running',?)").run(
      new Date().toISOString(), scope,
    ).lastInsertRowid;
  }
  finishRun(id, error = null) {
    this.db.prepare('UPDATE import_run SET finished_at=?,status=?,error=? WHERE id=?').run(
      new Date().toISOString(), error ? 'failed' : 'complete', error?.message ?? null, id,
    );
  }

  evidence(snapshotId, pointer = '') {
    const row = this.db.prepare(`SELECT s.id,s.url,s.method,s.request_body,s.sha256,s.first_retrieved_at,s.last_retrieved_at,
      p.producer,p.title,p.license,p.license_url FROM snapshot s JOIN source p ON p.id=s.source_id WHERE s.id=?`).get(snapshotId);
    if (!row) return null;
    return { snapshotId: row.id, producer: row.producer, dataset: row.title, url: row.url, method: row.method,
      requestBody: row.request_body ? JSON.parse(row.request_body) : null,
      pointer, sha256: row.sha256, firstRetrievedAt: row.first_retrieved_at, lastRetrievedAt: row.last_retrieved_at,
      license: row.license, licenseUrl: row.license_url,
      origin: 'official', processing: 'deterministic-normalization-v1', modified: true };
  }
  decode(row) {
    if (!row) return null;
    return { id: row.id, kind: row.kind, sourceKey: row.source_key, title: row.title,
      attributes: JSON.parse(row.attributes), evidence: this.evidence(row.snapshot_id, row.pointer) };
  }
  getEntity(id) { return this.decode(this.db.prepare('SELECT * FROM entity WHERE id=?').get(id)); }

  preview(row) {
    const item = this.decode(row);
    const { fullText, text, ...attributes } = item.attributes;
    return { ...item, attributes, excerpt: (fullText ?? text ?? '').slice(0, 220) || null };
  }

  browse(kind, { query = '', state = '', offset = 0 } = {}) {
    const clauses = ['kind = ?'];
    const values = [kind];
    for (const term of fold(query).split(' ').filter(Boolean)) { clauses.push('instr(search_text, ?) > 0'); values.push(term); }
    if (state && kind === 'person') { clauses.push("json_extract(attributes, '$.mandateState') = ?"); values.push(state); }
    const where = clauses.join(' AND ');
    const total = this.db.prepare(`SELECT count(*) AS n FROM entity WHERE ${where}`).get(...values).n;
    const results = this.db.prepare(`SELECT * FROM entity WHERE ${where} ORDER BY title,id LIMIT 50 OFFSET ?`)
      .all(...values, offset).map(row => this.preview(row));
    return { results, total, offset, pageSize: 50, coverage: this.coverage() };
  }

  topic(key) {
    const topic = this.getEntity(idFor('topic', key));
    if (!topic) return null;
    const matters = this.db.prepare("SELECT * FROM relation WHERE to_id=? AND predicate='has_topic'").all(topic.id)
      .map(link => ({ matter: this.getEntity(link.from_id), reason: JSON.parse(link.attributes),
        evidence: this.evidence(link.snapshot_id, link.pointer) }));
    return { topic, matters, coverage: this.coverage() };
  }

  vote(key) {
    const vote = this.getEntity(idFor('vote', key));
    if (!vote) return null;
    const link = this.db.prepare("SELECT from_id FROM relation WHERE to_id=? AND predicate='has_vote'").get(vote.id);
    const ballots = this.db.prepare(`SELECT b.*,p.id AS person_id,p.title AS person_title FROM ballot b
      LEFT JOIN entity p ON p.kind='person' AND p.source_key=b.person_source_key
      WHERE b.vote_id=? ORDER BY json_extract(b.attributes,'$.familyName'),person_source_key`).all(vote.id).map(row => ({
        personKey: row.person_source_key, personId: row.person_id ?? null,
        name: row.person_title ?? [JSON.parse(row.attributes).givenName, JSON.parse(row.attributes).familyName].filter(Boolean).join(' '),
        choice: row.choice, attributes: JSON.parse(row.attributes), evidence: this.evidence(row.snapshot_id, row.pointer),
      }));
    return { vote, matter: link ? this.getEntity(link.from_id) : null, ballots, coverage: this.coverage() };
  }

  search(query, kind = null) {
    const terms = fold(query).split(' ').filter(Boolean).slice(0, 12);
    if (!terms.length) return [];
    const clauses = terms.map(() => 'instr(search_text, ?) > 0');
    if (kind) clauses.push('kind = ?');
    return this.db.prepare(`SELECT * FROM entity WHERE ${clauses.join(' AND ')} ORDER BY kind,title LIMIT 50`)
      .all(...terms, ...(kind ? [kind] : [])).map(row => this.preview(row));
  }

  trace(identifier) {
    const matter = this.getEntity(idFor('matter', identifier));
    if (!matter) return null;
    const links = this.db.prepare('SELECT * FROM relation WHERE from_id=? ORDER BY predicate,to_id').all(matter.id);
    const related = links.map(link => ({ predicate: link.predicate, entity: this.getEntity(link.to_id),
      attributes: JSON.parse(link.attributes), evidence: this.evidence(link.snapshot_id, link.pointer) }));
    const steps = this.db.prepare(`SELECT * FROM process_step WHERE matter_id=?
      ORDER BY happened_on IS NULL, happened_on, source_order, source_key`).all(matter.id).map(step => ({
      sourceKey: step.source_key, happenedOn: step.happened_on, sourceOrder: step.source_order,
      attributes: JSON.parse(step.attributes), evidence: this.evidence(step.snapshot_id, step.pointer),
    }));
    const speeches = this.db.prepare("SELECT * FROM entity WHERE kind='speech' AND json_extract(attributes,'$.matterKey')=?")
      .all(identifier).map(row => this.decode(row));
    return { matter, steps, related, speeches, coverage: this.coverage(), limitations: [
      'Raakadatan käsittelyvaiheiden nimet ja kuvaukset ovat lähteen tekstiä. Käyttöliittymän toimitukselliset vaiheotsikot merkitään erikseen.',
      'Äänestyksen otsikko ja vaihtoehdot on tarkistettava ennen kannan tulkintaa.',
      'Tyhjä lista tarkoittaa vain, ettei tietoa ole tässä tuonnissa. Puheenvuorojen kattavuutta ei ole vahvistettu.',
      'Asian eduskuntakäsittelyn päättyminen ei yksin osoita lain nykyistä voimassaoloa.',
    ] };
  }

  person(personKey) {
    const person = this.getEntity(idFor('person', personKey));
    if (!person) return null;
    const memberships = this.db.prepare('SELECT * FROM relation WHERE from_id=?').all(person.id).map(link => ({
      predicate: link.predicate, entity: this.getEntity(link.to_id), attributes: JSON.parse(link.attributes),
      evidence: this.evidence(link.snapshot_id, link.pointer),
    }));
    const ballots = this.db.prepare('SELECT * FROM ballot WHERE person_source_key=? ORDER BY vote_id').all(personKey).map(row => ({
      choice: row.choice, attributes: JSON.parse(row.attributes), vote: this.getEntity(row.vote_id),
      evidence: this.evidence(row.snapshot_id, row.pointer),
    }));
    const speeches = this.db.prepare("SELECT * FROM entity WHERE kind='speech' AND json_extract(attributes,'$.speakerKey')=?")
      .all(personKey).map(row => this.decode(row));
    return { person, memberships, ballots, speeches, coverage: this.coverage() };
  }

  coverage() {
    return { counts: this.db.prepare('SELECT kind,count(*) AS count FROM entity GROUP BY kind ORDER BY kind').all(),
      ballots: this.db.prepare('SELECT count(*) AS count FROM ballot').get().count,
      recentImports: this.db.prepare('SELECT * FROM import_run ORDER BY id DESC LIMIT 5').all(),
      exhaustive: false, note: 'Counts describe the local import, not all parliamentary activity.' };
  }
}
