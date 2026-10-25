import * as yaml from "js-yaml";
import type { FamilyData, LifeEvent, Person, Place } from "./model";
import { SCHEMA_VERSION } from "./model";

export function toJSON(d: FamilyData) {
  return JSON.stringify(d, null, 2);
}

/** YAML with all strings quoted so dates and place names never get coerced. */
export function toYAML(d: FamilyData) {
  return yaml.dump(d, { forceQuotes: true, lineWidth: 120 } as Parameters<typeof yaml.dump>[1]);
}
export function fromYAML(s: string): unknown {
  return yaml.load(s);
}

// ---------- GEDCOM 5.5.1 ----------
const GMONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function gedDate(e: LifeEvent): string | null {
  if (!e.date) return null;
  const [y, m, d] = e.date.value.split("-");
  const v = [d ? String(parseInt(d)) : "", m ? GMONTHS[parseInt(m) - 1] : "", y].filter(Boolean).join(" ");
  const q = e.date.qualifier;
  if (q === "before") return `BEF ${v}`;
  if (q === "after") return `AFT ${v}`;
  if (q === "between" && e.date.valueEnd) return `BET ${v} AND ${e.date.valueEnd.slice(0, 4)}`;
  if (q === "about" || e.date.approx) return `ABT ${v}`;
  return v;
}

const TAGS: Partial<Record<LifeEvent["type"], string>> = {
  birth: "BIRT",
  baptism: "BAPM",
  death: "DEAT",
  burial: "BURI",
  emigration: "EMIG",
  residence: "RESI",
  occupation: "OCCU",
  military: "EVEN",
  other: "EVEN",
};

export function toGEDCOM(d: FamilyData): string {
  const places = new Map(d.places.map((p) => [p.id, p]));
  const ids = new Map(d.people.map((p, i) => [p.id, `@I${i + 1}@`]));
  const L: string[] = ["0 HEAD", "1 SOUR DRZEWO", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"];

  // families keyed by sorted parent pair
  const fams = new Map<string, { h?: string; w?: string; kids: string[]; union?: Person["unions"][0] }>();
  const famKey = (a?: string, b?: string) => [a ?? "", b ?? ""].sort().join("+");
  const byId = new Map(d.people.map((p) => [p.id, p]));
  const getFam = (a?: string, b?: string) => {
    const k = famKey(a, b);
    if (!fams.has(k)) {
      const pa = a ? byId.get(a) : undefined;
      const h = pa?.gender === "f" ? b : a;
      const w = pa?.gender === "f" ? a : b;
      fams.set(k, { h, w, kids: [] });
    }
    return fams.get(k)!;
  };
  for (const p of d.people) for (const u of p.unions) getFam(p.id, u.partnerId).union = u;
  for (const p of d.people) {
    if (!p.parents.length) continue;
    const [a, b] = p.parents.map((l) => l.personId);
    getFam(a, b).kids.push(p.id);
  }
  const famIds = new Map([...fams.keys()].map((k, i) => [k, `@F${i + 1}@`]));

  for (const p of d.people) {
    L.push(`0 ${ids.get(p.id)} INDI`);
    L.push(`1 NAME ${[p.firstName, p.middleNames].filter(Boolean).join(" ")} /${p.lastName}/`);
    if (p.maidenName) L.push(`2 _MARNM ${p.maidenName}`);
    L.push(`1 SEX ${p.gender === "m" ? "M" : p.gender === "f" ? "F" : "U"}`);
    for (const e of p.events) {
      const tag = TAGS[e.type];
      if (!tag) continue;
      L.push(`1 ${tag}${tag === "OCCU" && e.description ? " " + e.description : ""}`);
      if (tag === "EVEN") L.push(`2 TYPE ${e.description ?? e.type}`);
      const dt = gedDate(e);
      if (dt) L.push(`2 DATE ${dt}`);
      const pl = e.placeId ? places.get(e.placeId) : undefined;
      if (pl) {
        L.push(`2 PLAC ${pl.name}, ${pl.country}`);
        L.push("3 MAP", `4 LATI ${pl.lat >= 0 ? "N" : "S"}${Math.abs(pl.lat)}`, `4 LONG ${pl.lng >= 0 ? "E" : "W"}${Math.abs(pl.lng)}`);
      }
    }
    if (p.notes) L.push(`1 NOTE ${p.notes.replace(/\n/g, " ")}`);
    for (const [k, f] of fams) {
      if (f.h === p.id || f.w === p.id) L.push(`1 FAMS ${famIds.get(k)}`);
      if (f.kids.includes(p.id)) L.push(`1 FAMC ${famIds.get(k)}`);
    }
  }
  for (const [k, f] of fams) {
    L.push(`0 ${famIds.get(k)} FAM`);
    if (f.h) L.push(`1 HUSB ${ids.get(f.h)}`);
    if (f.w) L.push(`1 WIFE ${ids.get(f.w)}`);
    if (f.union?.type === "marriage") {
      L.push("1 MARR");
      if (f.union.startDate) L.push(`2 DATE ${gedDate({ date: f.union.startDate } as LifeEvent)}`);
    }
    for (const c of f.kids) L.push(`1 CHIL ${ids.get(c)}`);
  }
  L.push("0 TRLR");
  return L.join("\n");
}

const REV_TAGS: Record<string, LifeEvent["type"]> = {
  BIRT: "birth",
  CHR: "baptism",
  BAPM: "baptism",
  DEAT: "death",
  BURI: "burial",
  EMIG: "emigration",
  IMMI: "emigration",
  RESI: "residence",
  OCCU: "occupation",
  EVEN: "other",
};

function parseGedDate(s: string): LifeEvent["date"] {
  let qualifier: "before" | "after" | "about" | undefined;
  let t = s.trim().toUpperCase();
  const m = /^(ABT|ABOUT|EST|CAL|BEF|AFT)\s+/.exec(t);
  if (m) {
    qualifier = m[1] === "BEF" ? "before" : m[1] === "AFT" ? "after" : "about";
    t = t.slice(m[0].length);
  }
  if (t.startsWith("BET ")) {
    const [a, b] = t.slice(4).split(" AND ");
    const ya = /\d{4}/.exec(a)?.[0];
    const yb = /\d{4}/.exec(b ?? "")?.[0];
    if (ya) return { value: ya, approx: true, qualifier: "between", valueEnd: yb };
  }
  const parts = t.split(/\s+/);
  const y = parts.find((x) => /^\d{4}$/.test(x));
  if (!y) return undefined;
  const mon = parts.find((x) => GMONTHS.includes(x));
  const day = parts.find((x) => /^\d{1,2}$/.test(x));
  let value = y;
  if (mon) value += `-${String(GMONTHS.indexOf(mon) + 1).padStart(2, "0")}`;
  if (mon && day) value += `-${day.padStart(2, "0")}`;
  return { value, approx: qualifier === "about", qualifier };
}

export function fromGEDCOM(text: string): FamilyData {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const people = new Map<string, Person>();
  const places = new Map<string, Place>();
  const fams: { h?: string; w?: string; kids: string[]; date?: LifeEvent["date"] }[] = [];
  let cur: Person | null = null;
  let fam: (typeof fams)[0] | null = null;
  let ev: LifeEvent | null = null;
  let lastPlace: Place | null = null;

  for (const raw of lines) {
    const m = /^(\d+)\s+(@[^@]+@\s+)?(\S+)\s?(.*)$/.exec(raw.trim());
    if (!m) continue;
    const level = +m[1];
    const xref = m[2]?.trim();
    const tag = m[3];
    const val = m[4] ?? "";
    if (level === 0) {
      cur = null;
      fam = null;
      ev = null;
      if (tag === "INDI" && xref) {
        cur = {
          id: xref.replace(/@/g, ""),
          firstName: "?",
          lastName: "",
          gender: "unknown",
          nameVariants: [],
          parents: [],
          unions: [],
          events: [],
          notes: "",
          photos: [],
          living: false,
        };
        people.set(xref, cur);
      } else if (tag === "FAM") {
        fam = { kids: [] };
        fams.push(fam);
      }
      continue;
    }
    if (cur) {
      if (level === 1) {
        ev = null;
        if (tag === "NAME") {
          const nm = /^(.*?)\s*\/(.*)\/\s*$/.exec(val);
          const given = (nm ? nm[1] : val).trim().split(/\s+/);
          cur.firstName = given[0] || "?";
          if (given.length > 1) cur.middleNames = given.slice(1).join(" ");
          cur.lastName = nm ? nm[2] : "";
        } else if (tag === "SEX") cur.gender = val === "M" ? "m" : val === "F" ? "f" : "unknown";
        else if (tag === "NOTE") cur.notes += val;
        else if (REV_TAGS[tag]) {
          ev = { id: `${cur.id}-${cur.events.length}`, type: REV_TAGS[tag], sourceIds: [], description: val || undefined };
          cur.events.push(ev);
        }
      } else if (level === 2 && tag === "_MARNM") cur.maidenName = val;
      else if (ev && level === 2 && tag === "DATE") ev.date = parseGedDate(val);
      else if (ev && level === 2 && tag === "TYPE") ev.description = val;
      else if (ev && level === 2 && tag === "PLAC") {
        const name = val.split(",")[0].trim();
        let pl = [...places.values()].find((p) => p.name === name);
        if (!pl) {
          pl = { id: `pl${places.size + 1}`, name, historicalNames: [], lat: NaN, lng: NaN, country: val.split(",").slice(-1)[0].trim() };
          places.set(pl.id, pl);
        }
        ev.placeId = pl.id;
        lastPlace = pl;
      } else if (lastPlace && level === 4 && (tag === "LATI" || tag === "LONG")) {
        const n = parseFloat(val.slice(1)) * (/[SW]/.test(val[0]) ? -1 : 1);
        if (tag === "LATI") lastPlace.lat = n;
        else lastPlace.lng = n;
      }
    } else if (fam) {
      if (tag === "HUSB") fam.h = val;
      else if (tag === "WIFE") fam.w = val;
      else if (tag === "CHIL") fam.kids.push(val);
      else if (level === 2 && tag === "DATE") fam.date = parseGedDate(val);
    }
  }
  fams.forEach((f, i) => {
    const h = f.h ? people.get(f.h) : undefined;
    const w = f.w ? people.get(f.w) : undefined;
    if (h && w) h.unions.push({ id: `u${i}`, partnerId: w.id, type: "marriage", status: "unknown", startDate: f.date });
    for (const k of f.kids) {
      const c = people.get(k);
      if (!c) continue;
      for (const par of [h, w]) if (par) c.parents.push({ personId: par.id, type: "biological" });
    }
  });
  // living heuristic: no death and born within 100 years
  const now = new Date().getFullYear();
  for (const p of people.values()) {
    const b = p.events.find((e) => e.type === "birth")?.date;
    p.living = !p.events.some((e) => e.type === "death" || e.type === "burial") && !!b && now - parseInt(b.value) < 100;
  }
  const validPlaces = [...places.values()].filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
  const ok = new Set(validPlaces.map((p) => p.id));
  for (const p of people.values()) for (const e of p.events) if (e.placeId && !ok.has(e.placeId)) {
    const name = places.get(e.placeId)?.name;
    e.description = [e.description, name].filter(Boolean).join(" — ");
    e.placeId = undefined;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    people: [...people.values()],
    places: validPlaces,
    sources: [],
  };
}
