import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AsyncState, useApi } from "./components.jsx";
import { Browse, Home, Search, Sources, Topic } from "./explore.jsx";
import { Entity, Matter, Person, Vote } from "./records.jsx";
import "./styles.css";

function App() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const status = useApi("/api/status");
  const section = path.startsWith("/edustajat")
    ? "/edustajat"
    : path.startsWith("/aihe")
      ? "/aiheet"
      : ["/paatokset", "/asiat", "/aanestykset", "/aineisto"].includes(path)
        ? "/paatokset"
        : path === "/lahteet"
          ? "/lahteet"
          : "/";
  useEffect(() => {
    document.title = `${section === "/" ? "Tutki" : { "/edustajat": "Edustajat", "/aiheet": "Aiheet", "/paatokset": "Asiat ja päätökset", "/lahteet": "Lähteet" }[section]} · Eduskuntadata`;
  }, [section]);
  let page;
  if (path === "/")
    page = (
      <AsyncState resource={status}>
        {(coverage) => <Home coverage={coverage} />}
      </AsyncState>
    );
  else if (path === "/haku") page = <Search params={params} />;
  else if (path === "/edustajat")
    page = <Browse kind="person" params={params} />;
  else if (path.startsWith("/edustajat/")) {
    let identifier;
    try {
      identifier = decodeURIComponent(path.slice("/edustajat/".length));
    } catch {
      identifier = "";
    }
    page = <Person identifier={identifier} params={params} />;
  } else if (path === "/aiheet") page = <Browse kind="topic" params={params} />;
  else if (path === "/paatokset")
    page = <Browse kind="matter" params={params} />;
  else if (path === "/aihe") page = <Topic params={params} />;
  else if (path === "/asiat") page = <Matter params={params} />;
  else if (path === "/aanestykset") page = <Vote params={params} />;
  else if (path === "/aineisto") page = <Entity params={params} />;
  else if (path === "/lahteet")
    page = (
      <AsyncState resource={status}>
        {(coverage) => <Sources coverage={coverage} />}
      </AsyncState>
    );
  else
    page = (
      <div className="empty-state">
        <h1>Sivua ei löytynyt</h1>
        <p>
          <a href="/">Palaa tutkimaan</a>
        </p>
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Siirry sisältöön
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="/">
            Eduskuntadata
          </a>
          <nav aria-label="Päänavigaatio">
            {[
              ["/", "Tutki"],
              ["/edustajat", "Edustajat"],
              ["/aiheet", "Aiheet"],
              ["/paatokset", "Päätökset"],
              ["/lahteet", "Lähteet"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                aria-current={section === href ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main
        id="main"
        className={`container ${path === "/" ? "home-main" : "page-main"}`}
      >
        {page}
      </main>
      <footer className="container site-footer">
        <a href="/">Eduskuntadata</a>
        <span>Viralliset lähteet. Omat johtopäätökset.</span>
      </footer>
    </>
  );
}

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="container empty-state" role="alert">
        <h1>Näkymää ei voitu avata</h1>
        <p>
          Päivitä sivu tai <a href="/">palaa tutkimaan</a>.
        </p>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
