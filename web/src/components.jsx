import React, { useEffect, useState } from "react";
import { fi, date, hrefFor, KINDS, shortTitle, plain } from "./data.mjs";

export function Icon({ name = "arrow", ...props }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      ) : name === "down" ? (
        <path d="m5 9 7 7 7-7" />
      ) : name === "chevron" ? (
        <path d="m9 5 7 7-7 7" />
      ) : (
        <>
          <path d="M4 12h16" />
          <path d="m14 6 6 6-6 6" />
        </>
      )}
    </svg>
  );
}

export function useApi(url) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({
    url,
    loading: true,
    data: null,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ url, loading: true, data: null, error: null });
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw Object.assign(new Error("Tietoja ei voitu hakea."), {
            status: response.status,
          });
        return response.json();
      })
      .then((data) => setState({ url, loading: false, data, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ url, loading: false, data: null, error });
      });
    return () => controller.abort();
  }, [url, retry]);
  return {
    ...(state.url === url ? state : { loading: true, data: null, error: null }),
    retry: () => setRetry((value) => value + 1),
  };
}

export function AsyncState({
  resource,
  children,
  missing = "Tietuetta ei ole vielä tuotu tähän aineistoon.",
}) {
  if (resource.loading)
    return (
      <div className="loading-state" role="status">
        Haetaan aineistoa…
      </div>
    );
  if (resource.error)
    return (
      <div className="empty-state" role="alert">
        <h2>
          {resource.error.status === 404
            ? "Aineistoa ei ole tässä versiossa"
            : "Aineistoa ei voitu hakea"}
        </h2>
        <p>
          {resource.error.status === 404
            ? missing
            : "Yhteys palveluun ei onnistunut. Voit yrittää uudelleen."}
        </p>
        {resource.error.status !== 404 && (
          <button onClick={resource.retry}>Yritä uudelleen</button>
        )}
        <a href="/">Palaa tutkimaan</a>
      </div>
    );
  return children(resource.data);
}

export function SearchForm({ value = "", compact = false }) {
  return (
    <form
      className={`search-form ${compact ? "compact-search" : ""}`}
      action="/haku"
      method="get"
      role="search"
    >
      <label htmlFor="research-query">Mitä haluat tutkia?</label>
      <div className="search-line">
        <div className="search-field">
          <Icon name="search" />
          <input
            id="research-query"
            name="q"
            type="search"
            defaultValue={value}
            required
            maxLength={200}
            placeholder="Edustajan nimi, aihe tai asiakirjan tunnus"
          />
        </div>
        <button className="primary-button" type="submit">
          Hae
        </button>
      </div>
    </form>
  );
}

export function Breadcrumb({ children }) {
  return (
    <nav aria-label="Murupolku" className="breadcrumb">
      <a href="/">Tutki</a>
      <span aria-hidden="true">/</span>
      {children}
    </nav>
  );
}

export function Evidence({
  evidence,
  sourceUrl,
  editorial,
  label = "Näytä lähde",
}) {
  if (!evidence) return null;
  return (
    <details className="evidence">
      <summary>
        <Icon name="down" />
        {label}
      </summary>
      <div className="evidence-content">
        <p>
          <strong>{evidence.producer}</strong> · {evidence.dataset}
        </p>
        {editorial && <p>{editorial}</p>}
        <p>
          Haettu {date(evidence.lastRetrievedAt)}. Tiedot on järjestetty
          palvelun näyttöä varten.
        </p>
        {sourceUrl || evidence.method === "GET" ? (
          <a
            className="text-link"
            href={sourceUrl || evidence.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Avaa alkuperäinen lähde
            {(!sourceUrl || sourceUrl.includes("api.eduskunta.fi")) &&
              " (JSON)"}{" "}
            <Icon />
          </a>
        ) : (
          <p>
            Aineisto haettiin hakupyynnöllä. Tarkka pyyntö ja aineiston kohta
            ovat teknisissä lähdetiedoissa.{" "}
            <a
              href="https://api.eduskunta.fi/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Avaa rajapinnan kuvaus
            </a>
            .
          </p>
        )}
        <p className="small-text">
          Lisenssi:{" "}
          <a
            href={evidence.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {evidence.license}
          </a>
          . Tuottaja mainittu; esitystapaa on muokattu.
        </p>
        <details className="technical-details">
          <summary>Tekniset lähdetiedot</summary>
          <dl>
            <dt>Lähdeosoite</dt>
            <dd>{evidence.url}</dd>
            <dt>Menetelmä</dt>
            <dd>{evidence.method}</dd>
            <dt>Aineiston kohta</dt>
            <dd>
              <code>{evidence.pointer || "(koko vastaus)"}</code>
            </dd>
            <dt>SHA-256</dt>
            <dd>
              <code>{evidence.sha256}</code>
            </dd>
            {evidence.requestBody && (
              <>
                <dt>Hakupyyntö</dt>
                <dd>
                  <pre>{JSON.stringify(evidence.requestBody, null, 2)}</pre>
                </dd>
              </>
            )}
          </dl>
        </details>
      </div>
    </details>
  );
}

export function ResultRow({ entity, extra, children }) {
  return (
    <article className="result-row">
      <div>
        <p className="result-meta">
          {extra || KINDS[entity.kind]}
          {entity.kind !== "person" &&
            entity.kind !== "topic" &&
            ` · ${fi(entity.attributes.identifier) || entity.sourceKey}`}
        </p>
        <h3>
          <a href={hrefFor(entity)}>{shortTitle(entity)}</a>
        </h3>
        {entity.kind === "person" && (
          <p className="muted">
            {entity.attributes.mandateState ||
              "Edustajantoimen tila puuttuu lähteestä"}
          </p>
        )}
        {entity.excerpt && <p className="excerpt">{plain(entity.excerpt)}</p>}
        {children}
      </div>
      <a
        className="row-arrow"
        href={hrefFor(entity)}
        aria-label={`Avaa ${shortTitle(entity)}`}
      >
        <Icon name="chevron" />
      </a>
    </article>
  );
}

export function CoverageNotice({ coverage, children }) {
  const latest = coverage?.recentImports?.[0];
  return (
    <aside className="notice">
      <h3>Huomaa aineiston rajaus</h3>
      <p>
        {children ||
          "Näytetään vain tähän versioon tuotu aineisto. Puuttuva tietue ei tarkoita, ettei toimintaa olisi ollut."}
      </p>
      {latest?.status === "failed" && (
        <p>
          Viimeisin päivitys epäonnistui. Näytössä on aiemmin onnistuneesti
          tuotu aineisto.
        </p>
      )}
      {latest?.status === "running" && (
        <p>
          Aineiston päivitys on käynnissä. Näytössä on aiemmin tuotu aineisto.
        </p>
      )}
      <a href="/lahteet">Katso lähteet ja kattavuus</a>
    </aside>
  );
}

export function DocumentRows({ documents }) {
  return (
    <div className="document-rows">
      {documents.map((doc) => (
        <article key={doc.id}>
          <a href={hrefFor(doc)}>
            <span>
              <strong>{fi(doc.attributes.identifier) || doc.sourceKey}</strong>
              <span>{doc.attributes.type || "Asiakirja"}</span>
            </span>
            <Icon name="chevron" />
          </a>
        </article>
      ))}
    </div>
  );
}

export function VoteList({ votes }) {
  return (
    <div>
      {votes.map((vote) => (
        <ResultRow
          key={vote.id}
          entity={vote}
          extra={`Äänestys · ${date(vote.attributes.date)}`}
        >
          {vote.attributes.annulled && (
            <p>
              <strong>Lähteen mukaan mitätöity äänestys.</strong>
            </p>
          )}
        </ResultRow>
      ))}
    </div>
  );
}
