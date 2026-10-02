import React from "react";
import {
  AsyncState,
  Breadcrumb,
  CoverageNotice,
  Evidence,
  Icon,
  ResultRow,
  SearchForm,
  useApi,
} from "./components.jsx";
import {
  CASE_ID,
  countOf,
  date,
  fi,
  hrefFor,
  KINDS,
  number,
  shortTitle,
} from "./data.mjs";

export function Home({ coverage }) {
  const record = useApi(`/api/trace?id=${encodeURIComponent(CASE_ID)}`);
  return (
    <>
      <section className="home-hero">
        <h1>Löydä päätöksen tausta.</h1>
        <p className="hero-description">
          Tutki edustajia, äänestyksiä ja asiakirjoja. Tarkista tiedot
          alkuperäisestä lähteestä.
        </p>
        <SearchForm />
        <p className="examples">
          Kokeile: <a href="/haku?q=asumistuki">asumistuki</a>
          <a href="/haku?q=Riikka+Purra">Riikka Purra</a>
          <a href={`/asiat?id=${encodeURIComponent(CASE_ID)}`}>{CASE_ID}</a>
        </p>
      </section>
      <div className="two-columns home-columns">
        <section>
          <h2>Aloita tästä asiasta</h2>
          <AsyncState resource={record}>
            {(data) => (
              <article className="featured-matter">
                <div className="feature-meta">
                  <span>
                    {data.matter.sourceKey} ·{" "}
                    {date(data.matter.attributes.introducedOn)}
                  </span>
                </div>
                <h3>
                  <a href={hrefFor(data.matter)}>{shortTitle(data.matter)}</a>
                </h3>
                <p>
                  Hallituksen esitys yleisestä asumistuesta annetun lain
                  muuttamisesta.
                </p>
                <p className="outcome">
                  Eduskunnan päätös:{" "}
                  {fi(data.matter.attributes.outcome)?.toLocaleLowerCase(
                    "fi",
                  ) || "ei saatavilla"}
                </p>
                <div className="feature-facts">
                  <span>
                    {
                      data.related.filter(
                        (row) => row.predicate === "has_document",
                      ).length
                    }{" "}
                    asiakirjaa
                  </span>
                  <span>
                    {
                      data.related.filter((row) => row.predicate === "has_vote")
                        .length
                    }{" "}
                    äänestystä
                  </span>
                  <span>Lähde: Eduskunta</span>
                </div>
                <a className="text-link" href={hrefFor(data.matter)}>
                  Avaa käsittelyketju <Icon />
                </a>
              </article>
            )}
          </AsyncState>
          <div className="home-note">
            <h3>Katso, mistä äänestettiin</h3>
            <p>
              Jaa tai ei kertoo valinnasta kyseisessä äänestyksessä. Tarkista
              aina otsikko ja vaihtoehtojen asiayhteys.
            </p>
          </div>
        </section>
        <aside className="coverage-rail">
          <h2>Aineisto tässä versiossa</h2>
          <div>
            <p className="coverage-amount">
              {number(countOf(coverage, "person"))} henkilötietuetta
            </p>
            <p>
              Nykyisiä ja entisiä edustajia. Henkilörekisterin määrä ei ole
              nykyisten kansanedustajien määrä.
            </p>
          </div>
          <div>
            <h3>
              {countOf(coverage, "matter") === 1
                ? "Yhden asian käsittelyketju"
                : `${number(countOf(coverage, "matter"))} tuodun asian käsittelyketjua`}
            </h3>
            <p>
              {record.loading
                ? "Haetaan käsittelyaineistoa…"
                : record.data?.matter
                  ? "Asumistukiesityksen asiakirjat ja äänestykset vuodelta 2023."
                  : record.error?.status === 404
                    ? "Esimerkkiasian aineistoa ei ole vielä tuotu tähän versioon."
                    : "Käsittelyaineiston saatavuutta ei voitu tarkistaa."}
            </p>
          </div>
          <a className="text-link" href="/lahteet">
            Katso lähteet ja kattavuus <Icon />
          </a>
          {coverage?.recentImports?.[0]?.status === "failed" && (
            <p className="notice">
              Viimeisin päivitys epäonnistui. Aiempi aineisto on käytössä.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

export function Search({ params }) {
  const query = params.get("q")?.trim() || "";
  const kind = params.get("kind") || "";
  const resource = useApi(
    `/api/search?q=${encodeURIComponent(query)}${kind ? `&kind=${encodeURIComponent(kind)}` : ""}`,
  );
  const filterUrl = (value) =>
    `/haku?q=${encodeURIComponent(query)}${value ? `&kind=${value}` : ""}`;
  return (
    <>
      <Breadcrumb>Haku</Breadcrumb>
      <h1>Hae aineistosta</h1>
      <SearchForm value={query} compact />
      <nav className="filter-links" aria-label="Hakutulosten tyyppi">
        {[
          ["", "Kaikki"],
          ["person", "Edustajat"],
          ["matter", "Asiat"],
          ["topic", "Aiheet"],
          ["vote", "Äänestykset"],
          ["document", "Asiakirjat"],
          ["speech", "Puheenvuorot"],
        ].map(([value, label]) => (
          <a
            key={value}
            href={filterUrl(value)}
            aria-current={kind === value ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      {!query ? (
        <p className="empty-state">
          Kirjoita edustajan nimi, aihe tai asiakirjan tunnus.
        </p>
      ) : (
        <AsyncState resource={resource}>
          {(data) => (
            <div className="two-columns">
              <section>
                <h2>Tulokset haulle ”{query}”</h2>
                <p className="muted">
                  {data.results.length === 50
                    ? "Näytetään ensimmäiset 50 tulosta. Rajaa hakua."
                    : `${data.results.length} tulosta tuodussa aineistossa.`}
                </p>
                {!data.results.length && (
                  <div className="empty-state">
                    <h3>Hakua vastaavaa aineistoa ei löytynyt</h3>
                    <p>
                      Kokeile lyhyempää hakusanaa tai poista tyyppirajaus. Haku
                      etsii kaikki kirjoittamasi sanat tietueen tekstistä.
                    </p>
                  </div>
                )}
                {data.results.map((entity) => (
                  <ResultRow key={entity.id} entity={entity} />
                ))}
              </section>
              <CoverageNotice coverage={data.coverage} />
            </div>
          )}
        </AsyncState>
      )}
    </>
  );
}

const browseConfig = {
  person: [
    "Edustajat",
    "Tutki henkilörekisteriä ja edustajien tähän versioon tuotuja äänestyksiä.",
    "/edustajat",
  ],
  topic: [
    "Aiheet",
    "Eduskunnan lähdeaineiston asiasanat yhdistävät aiheet käsiteltäviin asioihin.",
    "/aiheet",
  ],
  matter: [
    "Päätökset ja asiat",
    "Seuraa asian etenemistä esityksestä eduskunnan päätökseen.",
    "/paatokset",
  ],
};
export function Browse({ kind, params }) {
  const [title, description, path] = browseConfig[kind];
  const query = params.get("q") || "";
  const state = kind === "person" ? (params.get("state") ?? "Nykyinen") : "";
  const offset = Number(params.get("offset") || 0);
  const resource = useApi(
    `/api/browse?${new URLSearchParams({ kind, q: query, state, offset: String(offset) })}`,
  );
  const pageUrl = (next) =>
    `${path}?${new URLSearchParams({ q: query, state, offset: String(next) })}`;
  return (
    <>
      <Breadcrumb>{title}</Breadcrumb>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
      <form action={path} className="browse-form">
        <div>
          <label htmlFor="browse-name">
            {kind === "person" ? "Edustajan nimi" : "Hakusana"}
          </label>
          <input
            id="browse-name"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={200}
          />
        </div>
        {kind === "person" && (
          <div>
            <label htmlFor="mandate-state">Edustajantoimen tila</label>
            <select id="mandate-state" name="state" defaultValue={state}>
              <option value="">Kaikki</option>
              <option>Nykyinen</option>
              <option>Entinen</option>
              <option>Keskeytynyt</option>
            </select>
          </div>
        )}
        <button type="submit">Näytä</button>
      </form>
      <AsyncState resource={resource}>
        {(data) => (
          <div className="two-columns">
            <section>
              <p className="list-count">
                {number(data.total)}{" "}
                {kind === "person"
                  ? "henkilöä"
                  : kind === "topic"
                    ? "aihetta"
                    : "asiaa"}{" "}
                tässä aineistossa
              </p>
              {!data.results.length && (
                <div className="empty-state">
                  <h2>Tuloksia ei löytynyt</h2>
                  <p>Muuta hakusanaa tai rajausta.</p>
                </div>
              )}
              {data.results.map((entity) => (
                <ResultRow key={entity.id} entity={entity} />
              ))}
              <nav className="pagination" aria-label="Tulosten sivutus">
                {offset > 0 && (
                  <a href={pageUrl(Math.max(0, offset - data.pageSize))}>
                    ← Edelliset
                  </a>
                )}
                <span>
                  {data.total > 0
                    ? `${offset + 1}–${Math.min(offset + data.results.length, data.total)} / ${number(data.total)}`
                    : "0 tulosta"}
                </span>
                {offset + data.pageSize < data.total && (
                  <a href={pageUrl(offset + data.pageSize)}>Seuraavat →</a>
                )}
              </nav>
            </section>
            <CoverageNotice coverage={data.coverage}>
              {kind === "person"
                ? "Henkilörekisteri sisältää nykyisiä ja entisiä edustajia. Äänet ja puheet kattavat vain erikseen tuodun aineiston."
                : "Tässä versiossa on asumistukiesityksen HE 74/2023 vp aineisto. Lista ei kata muita eduskunnan asioita."}
            </CoverageNotice>
          </div>
        )}
      </AsyncState>
    </>
  );
}

export function Topic({ params }) {
  const resource = useApi(
    `/api/topic?id=${encodeURIComponent(params.get("id") || "")}`,
  );
  return (
    <AsyncState resource={resource}>
      {(data) => (
        <>
          <Breadcrumb>Aihe</Breadcrumb>
          <p className="eyebrow">
            Eduskunnan asiasana · {data.topic.attributes.vocabulary}
          </p>
          <h1>{data.topic.title}</h1>
          <div className="two-columns">
            <section>
              <h2>Aiheeseen liittyvät asiat</h2>
              {data.matters.map((row) => (
                <React.Fragment key={row.matter.id}>
                  <ResultRow entity={row.matter} />
                  <Evidence
                    evidence={row.evidence}
                    editorial="Yhteys perustuu Eduskunnan ilmoittamaan asiasanaan, ei palvelun tekemään tulkintaan."
                  />
                </React.Fragment>
              ))}
              {!data.matters.length && (
                <p>Tähän aiheeseen ei ole tuotu asioita.</p>
              )}
              <Evidence evidence={data.topic.evidence} />
            </section>
            <CoverageNotice coverage={data.coverage} />
          </div>
        </>
      )}
    </AsyncState>
  );
}

export function Sources({ coverage }) {
  const completed = coverage?.recentImports?.find(
    (run) => run.status === "complete",
  );
  return (
    <>
      <Breadcrumb>Lähteet</Breadcrumb>
      <h1>Lähteet ja kattavuus</h1>
      <p className="page-description">
        Näe, mihin tiedot perustuvat ja mitä tässä versiossa voi tutkia.
      </p>
      <div className="two-columns">
        <section>
          <h2>Eduskunnan avoin data</h2>
          <p>
            Henkilötiedot, asiat, asiakirjat, käsittelyvaiheet ja äänestykset
            tulevat Eduskunnan rajapinnasta. Jokaisen tietueen lähde on
            avattavissa sen omalla sivulla.
          </p>
          <a
            className="text-link"
            href="https://api.eduskunta.fi/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Avaa Eduskunnan rajapinta <Icon />
          </a>
          <p>
            Lisenssi:{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>
            . Tuottaja: Eduskunta. Tietoja on järjestetty ja esitystapaa
            muokattu.
          </p>
          <h2 className="section-heading">Mitä aineistoon kuuluu?</h2>
          <p>
            Henkilörekisteri sisältää myös entisiä edustajia. Asian
            käsittelyaineisto kattaa tässä versiossa asumistukiesityksen{" "}
            <a href={`/asiat?id=${encodeURIComponent(CASE_ID)}`}>{CASE_ID}</a>,
            ja sen käsittelyyn liittyvät tuodut asiakirjat ja äänestykset.
            Tietuemäärät näkyvät alla. Puheenvuorot ovat erillisiä
            hakunäytteitä; niitä ei ole kerätty kattavasti esimerkkiasiasta.
          </p>
          <dl className="coverage-table">
            {(coverage?.counts || []).map((row) => (
              <div key={row.kind}>
                <dt>{KINDS[row.kind]}</dt>
                <dd>{number(row.count)} tietuetta</dd>
              </div>
            ))}
            <div>
              <dt>Henkilöäänet</dt>
              <dd>{number(coverage?.ballots || 0)}</dd>
            </div>
          </dl>
          <p>
            Viimeisin onnistunut tuonti:{" "}
            {completed ? date(completed.finished_at) : "ei kirjattua tuontia"}.
            Tämä on noutoaika; lähteen oma tapahtuma-aika näytetään erikseen.
          </p>
          <h2 className="section-heading">Miten tietoja käsitellään?</h2>
          <p>
            <strong>Virallinen tieto:</strong> lähteen nimet, päivämäärät,
            asiakirjat ja henkilöäänet säilytetään.{" "}
            <strong>Johdettu tieto:</strong> esimerkiksi lukumäärät lasketaan
            tuoduista tietueista. <strong>Toimituksellinen teksti:</strong>{" "}
            asumistukiasian lyhyt otsikko ja aikajanan valitut otsikot on
            nimetty lukemisen helpottamiseksi. Virallinen teksti löytyy niiden
            yhteydestä.
          </p>
          <p>
            Tässä versiossa ei käytetä tekoälyn tuottamia yhteenvetoja.
            Henkilöitä ei pisteytetä, eikä yksittäisestä äänestä päätellä
            henkilön motiivia.
          </p>
        </section>
        <aside>
          <CoverageNotice coverage={coverage}>
            Puuttuva tietue ei osoita, ettei toimintaa olisi ollut.
            Äänestysvaihtoehtojen selitteet on tarkistettava alkuperäisistä
            asiakirjoista.
          </CoverageNotice>
          <h3 className="section-heading">Muita lähteitä ei ole yhdistetty</h3>
          <p>
            Lakien nykyistä voimassaoloa, avoimuusrekisterin toimintailmoituksia
            ja vaalirahoitusta ei vielä näytetä. Niistä ei tehdä tässä
            palvelussa väitteitä.
          </p>
        </aside>
      </div>
    </>
  );
}
