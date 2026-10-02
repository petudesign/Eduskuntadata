export const idFor = (kind, key) => `${kind}:${key}`;
export const fold = text => text.normalize('NFKC').toLocaleLowerCase('fi').replace(/\s+/g, ' ').trim();
export const localized = value => typeof value === 'string' ? value : value?.fi ?? null;

function required(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing/invalid ${field}`);
  return value;
}
function list(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`Invalid ${field}`);
  return value;
}
function entity(kind, key, title, attributes, pointer) {
  required(key, `${kind}.key`);
  required(title, `${kind}.title`);
  return { id: idFor(kind, key), kind, key, title, attributes, pointer };
}
function edge(ownerId, fromId, toId, predicate, attributes, pointer) {
  return { ownerId, fromId, toId, predicate, attributes, pointer };
}
function empty() { return { entities: [], relations: [], owners: [], steps: [], ballots: [] }; }

export function normalizePerson(person, pointer = '') {
  const bundle = empty();
  const key = required(person.henkilonro, 'henkilonro');
  const personId = idFor('person', key);
  const title = `${person.kutsumanimi || person.etunimet || ''} ${required(person.sukunimi, 'sukunimi')}`.trim();
  bundle.entities.push(entity('person', key, title, {
    givenNames: person.etunimet ?? null, callName: person.kutsumanimi ?? null,
    familyName: person.sukunimi, mandateState: person.edustajantoimenTila ?? null,
    mandates: list(person.edustajatoimet, 'edustajatoimet'),
    sourceUrl: `https://api.eduskunta.fi/api/v1/kansanedustajat/${encodeURIComponent(key)}`,
  }, pointer));
  bundle.owners.push(personId);
  for (const [field, kind, predicate] of [['eduskuntaryhmat', 'group', 'member_of'], ['vaalipiirit', 'district', 'elected_in']]) {
    list(person[field], field).forEach((membership, index) => {
      const key = required(membership.tunnus, `${field}.tunnus`);
      const at = `${pointer}/${field}/${index}`;
      bundle.entities.push(entity(kind, key, required(localized(membership.nimi), `${field}.nimi`), { name: membership.nimi }, at));
      bundle.relations.push(edge(personId, personId, idFor(kind, key), predicate, {
        validFrom: membership.alkupvm ?? null, validUntil: membership.loppupvm ?? null,
      }, at));
    });
  }
  return bundle;
}

export function normalizeMatter(matter, pointer = '') {
  const bundle = empty();
  const key = required(localized(matter.eduskuntatunnus), 'eduskuntatunnus.fi');
  const matterId = idFor('matter', key);
  bundle.entities.push(entity('matter', key, required(localized(matter.nimeke), 'nimeke.fi'), {
    identifier: matter.eduskuntatunnus, title: matter.nimeke, state: matter.tila,
    outcome: matter.kokonaispaatosnimi, introducedOn: matter.laadintapvm,
    concludedOn: matter.paattymispvm, publishedAt: matter.viimeisinJulkaisuajankohta,
    proposals: matter.ehdotukset ?? null, latestStage: matter.viimeisinKasittelyvaihe ?? null,
    sourceUrl: `https://api.eduskunta.fi/api/v1/valtiopaivaasiat/${encodeURIComponent(key)}`,
  }, pointer));
  bundle.owners.push(matterId);
  list(matter.keskeisetAsiakirjat?.fi, 'keskeisetAsiakirjat.fi').forEach((doc, index) => {
    const key = required(doc.edktunnus, 'edktunnus');
    const at = `${pointer}/keskeisetAsiakirjat/fi/${index}`;
    bundle.entities.push(entity('document', key, required(doc.nimeketeksti, 'nimeketeksti'), {
      identifier: doc.eduskuntatunnus, type: doc.asiakirjatyyppinimi,
      date: doc.laadintapvm, metadataOnly: true,
      sourceUrl: `https://www.eduskunta.fi/fi/asiat-ja-aanestykset/valtiopaivaasiat/asiakirjat/edktunnus/${encodeURIComponent(key)}`,
    }, at));
    bundle.relations.push(edge(matterId, matterId, idFor('document', key), 'has_document', {}, at));
  });
  list(matter.asiasanat?.fi, 'asiasanat.fi').forEach((topic, index) => {
    const key = required(topic.muutunnus, 'topic.muutunnus');
    const at = `${pointer}/asiasanat/fi/${index}`;
    bundle.entities.push(entity('topic', key, required(topic.aiheteksti, 'aiheteksti'), { vocabulary: 'YSO', uri: key }, at));
    bundle.relations.push(edge(matterId, matterId, idFor('topic', key), 'has_topic', {
      origin: 'official', reason: 'Eduskunnan lähdeaineiston asiasana',
    }, at));
  });
  list(matter.kasittelyt?.fi, 'kasittelyt.fi').forEach((step, index) => {
    if (!Number.isInteger(step.jarjestys)) throw new Error('Invalid process order');
    bundle.steps.push({ matterId, key: required(step.kasittelytunnus, 'kasittelytunnus'),
      date: step.tapahtumapvm ?? null, order: step.jarjestys, attributes: step,
      pointer: `${pointer}/kasittelyt/fi/${index}` });
  });
  return bundle;
}

export function normalizeDocument(doc, pointer = '') {
  const bundle = empty();
  const key = required(doc.edktunnus, 'edktunnus');
  bundle.entities.push(entity('document', key, required(doc.nimeketeksti, 'nimeketeksti'), {
    identifier: doc.eduskuntatunnus, type: doc.asiakirjatyyppinimi,
    date: doc.laadintapvm, language: doc.kielikoodi ?? null,
    fullText: doc.fullText ?? null, metadataOnly: false, publishedAt: doc.viimeisinJulkaisuajankohta,
    sourceUrl: `https://www.eduskunta.fi/fi/asiat-ja-aanestykset/valtiopaivaasiat/asiakirjat/edktunnus/${encodeURIComponent(key)}`,
  }, pointer));
  return bundle;
}

export function normalizeVote(vote, matterKey, pointer = '') {
  const bundle = empty();
  const key = required(vote.id, 'vote.id');
  const actualKey = localized(vote.kohta?.asiakirjat?.paaasiakirjaEduskuntatunnus);
  if (actualKey !== matterKey) throw new Error(`Vote ${key} concerns ${actualKey}, expected ${matterKey}`);
  const voteId = idFor('vote', key);
  const ballots = list(vote.aanestystapahtumat, 'aanestystapahtumat');
  const suppliedCount = Array.isArray(vote.aanestystapahtumat) ? ballots.length : null;
  const reportedCount = Number.isInteger(vote.aanestystulos?.yhteensa) ? vote.aanestystulos.yhteensa : null;
  bundle.entities.push(entity('vote', key, required(localized(vote.aanestysotsikko), 'aanestysotsikko.fi'), {
    title: vote.aanestysotsikko, date: vote.aanestysalkuaika ?? null,
    annulled: vote.aanestysmitatoity ?? null, totals: vote.aanestystulos ?? null,
    context: vote.kohta, chair: vote.puhemies ?? null,
    ballotCountCheck: {
      origin: 'derived', method: 'supplied-ballot-count-v1', suppliedCount, reportedCount,
      matches: suppliedCount === null || reportedCount === null ? null : suppliedCount === reportedCount,
    },
    sourceUrl: `https://api.eduskunta.fi/api/v1/taysistunnot/aanestykset/${encodeURIComponent(key)}`,
  }, pointer));
  bundle.owners.push(voteId);
  bundle.relations.push(edge(voteId, idFor('matter', matterKey), voteId, 'has_vote', {}, pointer));
  ballots.forEach((ballot, index) => {
    bundle.ballots.push({ voteId, personKey: required(ballot.henkilonumero, 'henkilonumero'),
      choice: localized(ballot.kayttaytyminen), attributes: {
        choice: ballot.kayttaytyminen, givenName: ballot.etunimi ?? null, familyName: ballot.sukunimi ?? null,
        groupAtVote: ballot.eduskuntaryhma, groupAbbreviationAtVote: ballot.edkryhmalyhenne,
        districtAtVote: ballot.vaalipiiri,
      }, pointer: `${pointer}/aanestystapahtumat/${index}` });
  });
  return bundle;
}

export function normalizeSpeech(speech, pointer = '') {
  const bundle = empty();
  const key = required(speech.id, 'speech.id');
  const title = localized(speech.asia)?.nimeketeksti || localized(speech.tunnus) || key;
  bundle.entities.push(entity('speech', key, title, {
    text: speech.puheenvuoro ?? null, startedAt: speech.aloitushetki ?? null,
    speakerKey: speech.puhuja?.henkilonro ?? null, speaker: speech.puhuja ?? null,
    matterKey: localized(speech.asia)?.eduskuntatunnus ?? null,
    transcript: speech.poytakirjanasiankohta ?? null, status: speech.tila ?? null,
    sourceUrl: 'https://api.eduskunta.fi/api/v1/search',
  }, pointer));
  // References remain explicit attributes until both endpoints exist locally.
  // No name-based person linking and no inferred question/answer pairing.
  return bundle;
}

export function mergeBundles(bundles) {
  const result = empty();
  for (const bundle of bundles) for (const key of Object.keys(result)) result[key].push(...bundle[key]);
  return result;
}
