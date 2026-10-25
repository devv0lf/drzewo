import type { FuzzyDate, LifeEvent, Person } from "./model";

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export function yearOf(d?: FuzzyDate): number | undefined {
  if (!d) return undefined;
  return parseInt(d.value.slice(0, 4), 10);
}

/** Sortable numeric key (YYYYMMDD with unknown parts = 0). */
export function dateKey(d?: FuzzyDate): number {
  if (!d) return Number.POSITIVE_INFINITY;
  const [y, m = "0", day = "0"] = d.value.split("-");
  return parseInt(y) * 10000 + parseInt(m) * 100 + parseInt(day);
}

function fmtValue(v: string): string {
  const [y, m, d] = v.split("-");
  if (d) return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`;
  if (m) return `${MONTHS[parseInt(m) - 1]} ${y}`;
  return y;
}

export function formatDate(d?: FuzzyDate): string {
  if (!d) return "";
  const base = fmtValue(d.value);
  switch (d.qualifier) {
    case "before":
      return `przed ${base}`;
    case "after":
      return `po ${base}`;
    case "about":
      return `ok. ${base}`;
    case "between":
      return `między ${base} a ${d.valueEnd ? fmtValue(d.valueEnd) : "?"}`;
  }
  return d.approx ? `ok. ${base}` : base;
}

export function findEvent(p: Person, type: LifeEvent["type"]): LifeEvent | undefined {
  return p.events.find((e) => e.type === type);
}

export function birthYear(p: Person) {
  return yearOf(findEvent(p, "birth")?.date ?? findEvent(p, "baptism")?.date);
}
export function deathYear(p: Person) {
  return yearOf(findEvent(p, "death")?.date ?? findEvent(p, "burial")?.date);
}

export function lifeSpan(p: Person): string {
  const b = birthYear(p);
  const d = deathYear(p);
  if (!b && !d) return p.living ? "" : "";
  if (p.living) return b ? `ur. ${b}` : "";
  return `${b ?? "?"}–${d ?? "?"}`;
}

export function sortEvents(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => dateKey(a.date) - dateKey(b.date));
}
