import type { FamilyData, Person } from "./model";

export type Index = Map<string, Person>;
export const indexPeople = (data: FamilyData): Index => new Map(data.people.map((p) => [p.id, p]));

export function fullName(p: Person, privacy = false): string {
  if (privacy && p.living) return `${p.firstName[0] ?? ""}. ${p.lastName[0] ?? ""}.`;
  return [p.firstName, p.middleNames, p.lastName].filter(Boolean).join(" ");
}

export function parentsOf(p: Person, idx: Index): Person[] {
  return p.parents.map((l) => idx.get(l.personId)).filter((x): x is Person => !!x);
}

export function childrenOf(id: string, data: FamilyData): Person[] {
  return data.people.filter((c) => c.parents.some((l) => l.personId === id));
}

/** Partners in both directions (unions may be stored on either side). */
export function partnersOf(p: Person, data: FamilyData): Person[] {
  const ids = new Set(p.unions.map((u) => u.partnerId));
  for (const o of data.people) if (o.unions.some((u) => u.partnerId === p.id)) ids.add(o.id);
  ids.delete(p.id);
  return [...ids].map((id) => data.people.find((x) => x.id === id)).filter((x): x is Person => !!x);
}

export function siblingsOf(p: Person, data: FamilyData): { full: Person[]; half: Person[] } {
  const mine = new Set(p.parents.map((l) => l.personId));
  const full: Person[] = [];
  const half: Person[] = [];
  if (mine.size === 0) return { full, half };
  for (const o of data.people) {
    if (o.id === p.id) continue;
    const theirs = o.parents.map((l) => l.personId);
    const shared = theirs.filter((id) => mine.has(id)).length;
    if (shared === 0) continue;
    if (shared === mine.size && theirs.length === mine.size) full.push(o);
    else half.push(o);
  }
  return { full, half };
}

export function fatherOf(p: Person, idx: Index) {
  return parentsOf(p, idx).find((x) => x.gender === "m");
}
export function motherOf(p: Person, idx: Index) {
  return parentsOf(p, idx).find((x) => x.gender === "f");
}

/** Map ancestorId -> generations up (1 = parent). Shortest distance kept. */
export function ancestorsWithDepth(id: string, idx: Index): Map<string, number> {
  const out = new Map<string, number>();
  const queue: [string, number][] = [[id, 0]];
  while (queue.length) {
    const [cur, d] = queue.shift()!;
    const p = idx.get(cur);
    if (!p) continue;
    for (const l of p.parents) {
      if (!out.has(l.personId)) {
        out.set(l.personId, d + 1);
        queue.push([l.personId, d + 1]);
      }
    }
  }
  return out;
}

export function isAncestor(candidate: string, of: string, idx: Index): boolean {
  return ancestorsWithDepth(of, idx).has(candidate);
}

const g = (p: Person, m: string, f: string, n: string) => (p.gender === "m" ? m : p.gender === "f" ? f : n);

function greatPrefix(n: number): string {
  if (n <= 0) return "";
  if (n === 1) return "pra";
  return `${"pra".repeat(n)}`;
}

/** Polish kinship term: who is `target` for `me`. */
export function relationship(meId: string, targetId: string, data: FamilyData): string {
  if (meId === targetId) return "To Ty";
  const idx = indexPeople(data);
  const me = idx.get(meId);
  const t = idx.get(targetId);
  if (!me || !t) return "Brak danych";

  if (partnersOf(me, data).some((x) => x.id === t.id)) return g(t, "Mąż / partner", "Żona / partnerka", "Partner(ka)");

  const upMe = ancestorsWithDepth(meId, idx);
  upMe.set(meId, 0);
  const upT = ancestorsWithDepth(targetId, idx);
  upT.set(targetId, 0);

  let best: { a: number; b: number } | null = null;
  for (const [anc, a] of upMe) {
    const b = upT.get(anc);
    if (b === undefined) continue;
    if (!best || a + b < best.a + best.b) best = { a, b };
  }

  if (!best) {
    // in-law via partner
    for (const partner of partnersOf(me, data)) {
      const r = relationship(partner.id, targetId, { ...data, people: data.people });
      if (r.startsWith("Matka") || r.startsWith("Ojciec") || r.startsWith("Rodzic"))
        return g(t, "Teść", "Teściowa", "Teść(ciowa)");
      if (r.startsWith("Brat") || r.startsWith("Siostra")) return g(t, "Szwagier", "Szwagierka", "Szwagier(ka)");
    }
    for (const c of childrenOf(meId, data)) {
      if (partnersOf(c, data).some((x) => x.id === targetId)) return g(t, "Zięć", "Synowa", "Zięć / synowa");
    }
    return "Brak wspólnego przodka w drzewie";
  }

  const { a, b } = best; // a = steps up from me, b = steps up from target
  if (b === 0) {
    // target is my ancestor
    if (a === 1) return g(t, "Ojciec", "Matka", "Rodzic");
    if (a === 2) return g(t, "Dziadek", "Babcia", "Dziadek / babcia");
    return g(t, `${greatPrefix(a - 2)}dziadek`, `${greatPrefix(a - 2)}babcia`, `${greatPrefix(a - 2)}dziadek`).replace(/^./, (c) => c.toUpperCase());
  }
  if (a === 0) {
    if (b === 1) return g(t, "Syn", "Córka", "Dziecko");
    if (b === 2) return g(t, "Wnuk", "Wnuczka", "Wnuk / wnuczka");
    const pre = greatPrefix(b - 2);
    return g(t, `${pre}wnuk`, `${pre}wnuczka`, `${pre}wnuk`).replace(/^./, (c) => c.toUpperCase());
  }
  if (a === 1 && b === 1) {
    const s = siblingsOf(me, data);
    const half = s.half.some((x) => x.id === t.id);
    return g(t, half ? "Brat przyrodni" : "Brat", half ? "Siostra przyrodnia" : "Siostra", "Rodzeństwo");
  }
  if (a === 2 && b === 1) return g(t, "Wujek / stryj", "Ciocia", "Wujostwo");
  if (a >= 3 && b === 1) return g(t, `${greatPrefix(a - 2)}wujek`, `${greatPrefix(a - 2)}ciocia`, "Wujostwo").replace(/^./, (c) => c.toUpperCase());
  if (a === 1 && b === 2) return g(t, "Bratanek / siostrzeniec", "Bratanica / siostrzenica", "Dziecko rodzeństwa");
  if (a === 1 && b > 2) return `Potomek rodzeństwa (${b - 1}. pokolenie)`;
  if (a === b) {
    const deg = a - 1;
    if (deg === 1) return g(t, "Kuzyn", "Kuzynka", "Kuzyn(ka)");
    return g(t, `Kuzyn ${deg}. stopnia`, `Kuzynka ${deg}. stopnia`, `Kuzyn(ka) ${deg}. stopnia`);
  }
  return `Krewny: kuzyn ${Math.min(a, b) - 1}. stopnia, ${Math.abs(a - b)} pokol. ${a > b ? "niżej" : "wyżej"}`;
}
