export const CASE_ID = "HE 74/2023 vp";
export const KINDS = {
  person: "Edustaja",
  matter: "Asia",
  topic: "Aihe",
  vote: "Äänestys",
  document: "Asiakirja",
  speech: "Puheenvuoro",
  group: "Eduskuntaryhmä",
  district: "Vaalipiiri",
};
export const fi = (value) =>
  typeof value === "string" ? value : (value?.fi ?? null);
export const countOf = (coverage, kind) =>
  coverage?.counts.find((row) => row.kind === kind)?.count ?? 0;
export const number = (value) => new Intl.NumberFormat("fi-FI").format(value);
export function date(value) {
  value = fi(value);
  if (!value) return "Päivämäärä ei saatavilla";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki" }).format(
        parsed,
      );
}
export function shortTitle(entity) {
  return entity.sourceKey === CASE_ID && entity.kind === "matter"
    ? "Yleisen asumistuen muutokset"
    : entity.title;
}
export function hrefFor(entity) {
  const key = encodeURIComponent(entity.sourceKey);
  if (entity.kind === "person") return `/edustajat/${key}`;
  if (entity.kind === "matter") return `/asiat?id=${key}`;
  if (entity.kind === "vote") return `/aanestykset?id=${key}`;
  if (entity.kind === "topic") return `/aihe?id=${key}`;
  return `/aineisto?id=${encodeURIComponent(entity.id)}`;
}
export function plain(value) {
  if (!value) return "";
  return new DOMParser().parseFromString(String(value), "text/html").body
    .textContent;
}
export function selectMilestones(steps) {
  const selected = [];
  const take = (code, title, last = false) => {
    const matching = steps.filter(
      (step) => step.attributes.yleinenkasittelyvaihetunnus === code,
    );
    const step = last ? matching.at(-1) : matching[0];
    if (step) selected.push({ ...step, displayTitle: title });
  };
  take("ANTO", "Hallituksen esitys annettiin");
  take("LK", "Asia lähetettiin valiokuntiin");
  take("VKP", "Valiokuntakäsittely päättyi", true);
  take("2K", "Toinen käsittely päättyi", true);
  return selected.length ? selected : steps.slice(0, 4);
}
