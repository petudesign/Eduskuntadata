import React, { useState } from "react";
import {
  AsyncState,
  Breadcrumb,
  CoverageNotice,
  DocumentRows,
  Evidence,
  Icon,
  ResultRow,
  useApi,
  VoteList,
} from "./components.jsx";
import {
  date,
  fi,
  hrefFor,
  number,
  plain,
  selectMilestones,
  shortTitle,
} from "./data.mjs";

function Tabs({ links, selected }) {
  return (
    <nav className="tabs" aria-label="Näkymän osiot">
      {links.map(([key, label, href]) => (
        <a
          key={key}
          href={href}
          aria-current={selected === key ? "page" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
function Timeline({ steps }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? steps : selectMilestones(steps);
  return (
    <>
      <ol className="timeline">
        {visible.map((step, index) => (
          <li key={step.sourceKey}>
            <span className="step-number" aria-hidden="true">
              {index + 1}
            </span>
            <time dateTime={step.happenedOn || undefined}>
              {date(step.happenedOn)}
            </time>
            <div>
              <h3>
                {step.displayTitle ||
                  step.attributes.kasittelyvaihe ||
                  step.attributes.yleinenkasittelyvaihe ||
                  "Käsittelyvaihe"}
              </h3>
              <p>
                {plain(step.attributes.fraasi?.fraasisisalto) ||
                  "Vaiheen kuvausta ei ole lähteessä."}
              </p>
              <Evidence
                evidence={step.evidence}
                editorial={`Virallinen vaihe: ${step.attributes.kasittelyvaihe || step.attributes.yleinenkasittelyvaihe || step.attributes.yleinenkasittelyvaihetunnus}. ${step.displayTitle ? "Näytetty otsikko ja tämän näkymän vaihevalinta ovat palvelun toimituksellisia valintoja." : "Vaiheen teksti on alkuperäisestä lähteestä."}`}
              />
            </div>
          </li>
        ))}
      </ol>
      {steps.length > 4 && (
        <button
          className="disclosure-button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded
            ? "Näytä keskeiset vaiheet"
            : `Näytä kaikki ${steps.length} käsittelyvaihetta`}{" "}
          <Icon name="down" />
        </button>
      )}
      {!steps.length && <p>Käsittelyvaiheita ei ole tuotu tähän aineistoon.</p>}
    </>
  );
}

export function Matter({ params }) {
  const identifier = params.get("id") || "";
  const tab = ["votes", "documents"].includes(params.get("tab"))
    ? params.get("tab")
    : "trace";
  const resource = useApi(`/api/trace?id=${encodeURIComponent(identifier)}`);
  return (
    <AsyncState resource={resource}>
      {(data) => {
        const documents = data.related
          .filter((row) => row.predicate === "has_document")
          .map((row) => row.entity);
        const votes = data.related
          .filter((row) => row.predicate === "has_vote")
          .map((row) => row.entity);
        const mainDocs = documents
          .filter((doc) =>
            /^(HE|StVM|EV) /.test(fi(doc.attributes.identifier) || ""),
          )
          .sort(
            (a, b) =>
              ["HE", "StVM", "EV"].indexOf(
                fi(a.attributes.identifier).split(" ")[0],
              ) -
              ["HE", "StVM", "EV"].indexOf(
                fi(b.attributes.identifier).split(" ")[0],
              ),
          );
        const base = `/asiat?id=${encodeURIComponent(identifier)}`;
        return (
          <>
            <Breadcrumb>{identifier}</Breadcrumb>
            <h1>{shortTitle(data.matter)}</h1>
            <p className="page-description">{data.matter.title}</p>
            <div className="matter-meta">
              <span>{identifier}</span>
              <span>
                Eduskunnan päätös:{" "}
                {fi(data.matter.attributes.outcome)?.toLocaleLowerCase("fi") ||
                  "ei saatavilla"}
              </span>
              <span>
                {data.matter.attributes.concludedOn
                  ? `Käsittely päättyi ${date(data.matter.attributes.concludedOn)}`
                  : "Käsittelyn päättymispäivää ei ole ilmoitettu"}
              </span>
            </div>
            <Tabs
              selected={tab}
              links={[
                ["trace", "Käsittelyketju", base],
                ["votes", `Äänestykset (${votes.length})`, `${base}&tab=votes`],
                [
                  "documents",
                  `Asiakirjat (${documents.length})`,
                  `${base}&tab=documents`,
                ],
              ]}
            />
            <div className="two-columns trace-columns">
              <section>
                {tab === "trace" ? (
                  <>
                    <h2>Miten asia eteni?</h2>
                    <p className="muted">
                      Keskeiset vaiheet. Jokaisen vaiheen takana on alkuperäinen
                      lähde.
                    </p>
                    <Timeline steps={data.steps} />
                  </>
                ) : tab === "votes" ? (
                  <>
                    <h2>Asian äänestykset</h2>
                    <p>
                      Otsikot on säilytetty lähteen mukaisina. Avaa äänestys
                      nähdäksesi henkilöäänet ja asiayhteyden.
                    </p>
                    <VoteList votes={votes} />
                  </>
                ) : (
                  <>
                    <h2>Asian asiakirjat</h2>
                    <DocumentRows documents={documents} />
                  </>
                )}
                <Evidence
                  evidence={data.matter.evidence}
                  sourceUrl={data.matter.attributes.sourceUrl}
                  label="Asian lähdetiedot"
                  editorial="Lyhyt otsikko on palvelun toimituksellinen nimike. Virallinen otsikko näkyy sivun alussa."
                />
              </section>
              <aside className="source-rail">
                <h2>Mihin tämä perustuu?</h2>
                <p className="muted small-text">
                  Eduskunnan käsittelytiedot ja alkuperäiset asiakirjat.
                </p>
                <DocumentRows
                  documents={mainDocs.length ? mainDocs : documents}
                />
                <div className="notice">
                  <h3>Huomaa aineiston rajaus</h3>
                  <p>
                    Eduskuntakäsittelyn päättyminen ei yksin osoita lain
                    nykyistä voimassaoloa.
                  </p>
                </div>
                <p className="source-link">
                  <a className="text-link" href="/lahteet">
                    Katso lähdetiedot <Icon name="chevron" />
                  </a>
                </p>
                {data.related.some((row) => row.predicate === "has_topic") && (
                  <div className="topic-links">
                    <h3>Eduskunnan asiasanat</h3>
                    {data.related
                      .filter((row) => row.predicate === "has_topic")
                      .map((row) => (
                        <a key={row.entity.id} href={hrefFor(row.entity)}>
                          {row.entity.title}
                        </a>
                      ))}
                  </div>
                )}
              </aside>
            </div>
          </>
        );
      }}
    </AsyncState>
  );
}

function Ballots({ ballots }) {
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState("");
  const choices = [
    ...new Set(ballots.map((row) => row.choice ?? "Valinta puuttuu")),
  ];
  const visible = ballots.filter(
    (row) =>
      row.name
        .toLocaleLowerCase("fi")
        .includes(query.toLocaleLowerCase("fi")) &&
      (!choice || (row.choice ?? "Valinta puuttuu") === choice),
  );
  return (
    <>
      <div className="browse-form">
        <div>
          <label htmlFor="ballot-name">Edustajan nimi</label>
          <input
            id="ballot-name"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ballot-choice">Äänivalinta</label>
          <select
            id="ballot-choice"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value="">Kaikki valinnat</option>
            {choices.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      <p role="status" className="list-count">
        {visible.length} / {ballots.length} henkilöääntä
      </p>
      <div className="table-scroll">
        <table className="ballot-table">
          <caption>
            Henkilöäänet tässä äänestyksessä. Ryhmä on äänestysajankohdan ryhmä.
          </caption>
          <thead>
            <tr>
              <th scope="col">Edustaja</th>
              <th scope="col">Valinta</th>
              <th scope="col">Eduskuntaryhmä</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.personKey}>
                <th scope="row">
                  {row.personId ? (
                    <a href={`/edustajat/${encodeURIComponent(row.personKey)}`}>
                      {row.name}
                    </a>
                  ) : (
                    row.name
                  )}
                  <Evidence evidence={row.evidence} label="Äänen lähde" />
                </th>
                <td>{row.choice ?? "Valinta puuttuu"}</td>
                <td>{fi(row.attributes.groupAtVote) || "Ei ilmoitettu"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <p className="empty-state">Rajauksella ei löytynyt henkilöääniä.</p>
      )}
    </>
  );
}
export function Vote({ params }) {
  const resource = useApi(
    `/api/vote?id=${encodeURIComponent(params.get("id") || "")}`,
  );
  return (
    <AsyncState resource={resource}>
      {(data) => {
        const attributes = data.vote.attributes;
        const totals = attributes.totals || {};
        return (
          <>
            <Breadcrumb>Äänestys · {data.vote.sourceKey}</Breadcrumb>
            <p className="eyebrow">Äänestyksen alkuperäinen otsikko</p>
            <h1>{data.vote.title}</h1>
            <p className="page-description">
              {date(attributes.date)}
              {data.matter && (
                <>
                  {" "}
                  · <a href={hrefFor(data.matter)}>{shortTitle(data.matter)}</a>
                </>
              )}
            </p>
            {attributes.annulled && (
              <p className="notice">
                <strong>Lähteen mukaan tämä äänestys on mitätöity.</strong>
              </p>
            )}
            <div className="two-columns">
              <section>
                <h2>Äänestystulos</h2>
                <dl className="vote-totals">
                  {[
                    ["jaa", "Jaa"],
                    ["ei", "Ei"],
                    ["tyhjia", "Tyhjiä"],
                    ["poissa", "Poissa"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{totals[key] ?? "Ei saatavilla"}</dd>
                    </div>
                  ))}
                </dl>
                {attributes.ballotCountCheck.matches === false && (
                  <p className="notice">
                    Lähteen kokonaismäärä ja tuodut henkilöäänet poikkeavat
                    toisistaan. Tulos on tarkistettava lähteestä.
                  </p>
                )}
                <h2 className="section-heading">Miten edustajat äänestivät?</h2>
                <Ballots ballots={data.ballots} />
              </section>
              <aside>
                <div className="notice">
                  <h3>Tarkista vaihtoehtojen asiayhteys</h3>
                  <p>
                    Jaa ja ei kuvaavat valintaa tässä äänestyksessä.
                    Vaihtoehtojen tekstejä ei ole vielä poimittu tähän näkymään.
                    Tarkista ne alkuperäisestä äänestyksestä ja asian
                    asiakirjoista.
                  </p>
                  {data.matter && (
                    <a href={`${hrefFor(data.matter)}&tab=documents`}>
                      Avaa asian asiakirjat
                    </a>
                  )}
                </div>
                <Evidence
                  evidence={data.vote.evidence}
                  sourceUrl={attributes.sourceUrl}
                />
                <CoverageNotice coverage={data.coverage}>
                  Henkilöäänet kuuluvat vain tähän äänestykseen. Niistä ei
                  lasketa henkilön yleistä kantaa tai arvosanaa.
                </CoverageNotice>
              </aside>
            </div>
          </>
        );
      }}
    </AsyncState>
  );
}

export function Person({ identifier, params }) {
  const resource = useApi(`/api/people/${encodeURIComponent(identifier)}`);
  const tab = ["memberships", "speeches"].includes(params.get("tab"))
    ? params.get("tab")
    : "votes";
  return (
    <AsyncState resource={resource}>
      {(data) => {
        const base = `/edustajat/${encodeURIComponent(identifier)}`;
        return (
          <>
            <Breadcrumb>
              <a href="/edustajat">Edustajat</a>
              <span aria-hidden="true">/</span>
              {data.person.title}
            </Breadcrumb>
            <p className="eyebrow">Edustajan henkilörekisteri</p>
            <h1>{data.person.title}</h1>
            <p className="page-description">
              {data.person.attributes.mandateState ||
                "Edustajantoimen tila ei saatavilla"}
            </p>
            <Tabs
              selected={tab}
              links={[
                ["votes", `Äänestykset (${data.ballots.length})`, base],
                [
                  "speeches",
                  `Puheenvuorot (${data.speeches.length})`,
                  `${base}?tab=speeches`,
                ],
                ["memberships", "Jäsenyydet", `${base}?tab=memberships`],
              ]}
            />
            <div className="two-columns">
              <section>
                {tab === "votes" ? (
                  <>
                    <h2>Tuodut henkilöäänet</h2>
                    <p className="muted">
                      Lista kattaa tähän versioon tuodut äänestykset.
                    </p>
                    {data.ballots.map((ballot) => (
                      <ResultRow
                        key={ballot.vote.id}
                        entity={ballot.vote}
                        extra={`Äänestys · ${date(ballot.vote.attributes.date)}`}
                      >
                        <p className="ballot-choice">
                          Valinta:{" "}
                          <strong>{ballot.choice ?? "Ei saatavilla"}</strong>
                        </p>
                        <Evidence
                          evidence={ballot.evidence}
                          label="Äänen lähde"
                        />
                      </ResultRow>
                    ))}
                    {!data.ballots.length && (
                      <p className="empty-state">
                        Tähän aineistoon ei ole tuotu henkilön ääniä. Tämä ei
                        tarkoita, ettei hän olisi äänestänyt.
                      </p>
                    )}
                  </>
                ) : tab === "speeches" ? (
                  <>
                    <h2>Tuodut puheenvuorot</h2>
                    {data.speeches.map((entity) => (
                      <ResultRow
                        key={entity.id}
                        entity={entity}
                        extra={`Puheenvuoro · ${date(entity.attributes.startedAt)}`}
                      />
                    ))}
                    {!data.speeches.length && (
                      <p className="empty-state">
                        Tähän aineistoon ei ole tuotu henkilön puheenvuoroja.
                        Tämä ei osoita, ettei hän olisi puhunut.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h2>Eduskuntaryhmät ja vaalipiirit</h2>
                    {data.memberships.map((membership, index) => (
                      <article
                        className="membership-row"
                        key={`${membership.entity.id}-${index}`}
                      >
                        <p className="result-meta">
                          {membership.predicate === "member_of"
                            ? "Eduskuntaryhmä"
                            : "Vaalipiiri"}
                        </p>
                        <h3>{membership.entity.title}</h3>
                        <p>
                          {date(membership.attributes.validFrom)} –{" "}
                          {membership.attributes.validUntil
                            ? date(membership.attributes.validUntil)
                            : "päättymispäivää ei ole ilmoitettu"}
                        </p>
                        <Evidence evidence={membership.evidence} />
                      </article>
                    ))}
                    {!data.memberships.length && (
                      <p>Jäsenyyksiä ei ole saatavilla.</p>
                    )}
                  </>
                )}
              </section>
              <aside>
                <Evidence
                  evidence={data.person.evidence}
                  sourceUrl={data.person.attributes.sourceUrl}
                />
                <CoverageNotice coverage={data.coverage}>
                  Henkilörekisterin tiedot ja tuodut äänestykset ovat eri
                  laajuisia aineistoja. Äänestyslista ei ole henkilön koko
                  toimintahistoria.
                </CoverageNotice>
              </aside>
            </div>
          </>
        );
      }}
    </AsyncState>
  );
}

export function Entity({ params }) {
  const resource = useApi(
    `/api/entity?id=${encodeURIComponent(params.get("id") || "")}`,
  );
  return (
    <AsyncState resource={resource}>
      {(entity) => (
        <>
          <Breadcrumb>Aineisto</Breadcrumb>
          <p className="eyebrow">
            {fi(entity.attributes.identifier) || entity.sourceKey}
          </p>
          <h1>{entity.title}</h1>
          <p className="page-description">
            {entity.attributes.type ||
              (entity.kind === "speech" ? "Puheenvuoro" : "Lähdetietue")}
            {entity.attributes.date && ` · ${date(entity.attributes.date)}`}
          </p>
          <div className="two-columns">
            <section>
              {entity.kind === "speech" && (
                <p>
                  Puheenvuoron aika: {date(entity.attributes.startedAt)}.
                  Puhuja:{" "}
                  {entity.attributes.speaker
                    ? `${entity.attributes.speaker.kutsumanimi || entity.attributes.speaker.etunimet || ""} ${entity.attributes.speaker.sukunimi || ""}`
                    : "ei ilmoitettu"}
                  .
                </p>
              )}
              {entity.attributes.fullText || entity.attributes.text ? (
                <>
                  <h2>Alkuperäinen teksti</h2>
                  <p className="muted">
                    Teksti on lähteestä. Sen asettelua on muokattu tätä näkymää
                    varten.
                  </p>
                  <div className="document-text">
                    {plain(
                      entity.attributes.fullText || entity.attributes.text,
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-state">
                  Kokotekstiä ei ole tuotu tähän tietueeseen. Avaa alkuperäinen
                  lähde.
                </p>
              )}
            </section>
            <aside>
              <Evidence
                evidence={entity.evidence}
                sourceUrl={
                  entity.kind === "speech"
                    ? undefined
                    : entity.attributes.sourceUrl
                }
              />
              {entity.kind !== "speech" &&
                (entity.attributes.sourceUrl ||
                  entity.evidence.method === "GET") && (
                  <p>
                    <a
                      href={entity.attributes.sourceUrl || entity.evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Avaa alkuperäinen lähde <Icon />
                    </a>
                  </p>
                )}
            </aside>
          </div>
        </>
      )}
    </AsyncState>
  );
}
