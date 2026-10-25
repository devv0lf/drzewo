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

/**
 * Normalizes user-typed dates to ISO-like partial form (RRRR, RRRR-MM, RRRR-MM-DD).
 * Accepts Polish order (DD.MM.RRRR, DD-MM-RRRR, DD/MM/RRRR, MM.RRRR) and ISO.
 * Returns undefined when the input is not a valid calendar date.
 */
export function normalizeDateInput(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const check = (y: number, m?: number, d?: number): string | undefined => {
    if (y < 1 || y > 9999) return undefined;
    if (m === undefined) return String(y).padStart(4, "0");
    if (m < 1 || m > 12) return undefined;
    if (d === undefined) return `${String(y).padStart(4, "0")}-${pad(m)}`;
    const max = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (d < 1 || d > max) return undefined;
    return `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;
  };
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})$/))) return check(+m[1]);
  if ((m = s.match(/^(\d{4})[-./](\d{1,2})$/))) return check(+m[1], +m[2]);
  if ((m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/))) return check(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-./](\d{4})$/))) return check(+m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/))) return check(+m[3], +m[2], +m[1]);
  return undefined;
}

/** Human-readable Polish preview of a normalized date value. */
export function formatDateValue(v: string): string {
  return fmtValue(v);
}
