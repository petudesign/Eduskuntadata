PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  producer TEXT NOT NULL,
  title TEXT NOT NULL,
  documentation_url TEXT NOT NULL,
  license TEXT NOT NULL,
  license_url TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS snapshot (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source(id),
  url TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('GET', 'POST')),
  request_body TEXT,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  sha256 TEXT NOT NULL,
  first_retrieved_at TEXT NOT NULL,
  last_retrieved_at TEXT NOT NULL,
  content_type TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('person','group','district','matter','document','vote','speech','topic')),
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  search_text TEXT NOT NULL,
  attributes TEXT NOT NULL CHECK(json_valid(attributes)),
  snapshot_id TEXT NOT NULL REFERENCES snapshot(id),
  pointer TEXT NOT NULL,
  UNIQUE(kind, source_key)
) STRICT;
CREATE INDEX IF NOT EXISTS entity_kind ON entity(kind);

-- Every edge is owned by the record that asserts it. A correction replaces
-- only that record's edges, never unrelated relationships.
CREATE TABLE IF NOT EXISTS relation (
  owner_id TEXT NOT NULL REFERENCES entity(id),
  from_id TEXT NOT NULL REFERENCES entity(id),
  to_id TEXT NOT NULL REFERENCES entity(id),
  predicate TEXT NOT NULL CHECK(predicate IN ('has_document','has_vote','has_topic','spoken_by','concerns','member_of','elected_in')),
  attributes TEXT NOT NULL CHECK(json_valid(attributes)),
  snapshot_id TEXT NOT NULL REFERENCES snapshot(id),
  pointer TEXT NOT NULL,
  PRIMARY KEY(owner_id, from_id, to_id, predicate, pointer)
) STRICT;
CREATE INDEX IF NOT EXISTS relation_from ON relation(from_id, predicate);
CREATE INDEX IF NOT EXISTS relation_to ON relation(to_id, predicate);

CREATE TABLE IF NOT EXISTS process_step (
  matter_id TEXT NOT NULL REFERENCES entity(id),
  source_key TEXT NOT NULL,
  happened_on TEXT,
  source_order INTEGER NOT NULL,
  attributes TEXT NOT NULL CHECK(json_valid(attributes)),
  snapshot_id TEXT NOT NULL REFERENCES snapshot(id),
  pointer TEXT NOT NULL,
  PRIMARY KEY(matter_id, source_key)
) STRICT;

-- An MP can be absent from the imported person slice. Keep their official ID
-- rather than inventing a profile or matching names. Resolve at read time.
CREATE TABLE IF NOT EXISTS ballot (
  vote_id TEXT NOT NULL REFERENCES entity(id),
  person_source_key TEXT NOT NULL,
  choice TEXT,
  attributes TEXT NOT NULL CHECK(json_valid(attributes)),
  snapshot_id TEXT NOT NULL REFERENCES snapshot(id),
  pointer TEXT NOT NULL,
  PRIMARY KEY(vote_id, person_source_key)
) STRICT;
CREATE INDEX IF NOT EXISTS ballot_person ON ballot(person_source_key);

CREATE TABLE IF NOT EXISTS import_run (
  id INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('running','complete','failed')),
  scope TEXT NOT NULL,
  error TEXT
) STRICT;
