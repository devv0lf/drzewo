import { birthYear, deathYear, findEvent } from "./dates";
import type { FamilyData, Person } from "./model";
import { ancestorsWithDepth, indexPeople } from "./relations";

export function computeStats(data: FamilyData, meId?: string) {
  const surnames = new Map<string, number>();
  for (const p of data.people) {
    for (const s of new Set([p.lastName, p.maidenName].filter(Boolean) as string[])) surnames.set(s, (surnames.get(s) ?? 0) + 1);
  }
  const lifespans = data.people
    .map((p) => {
      const b = birthYear(p);
      const d = deathYear(p);
      return b && d && !p.living ? d - b : null;
    })
    .filter((x): x is number => x !== null);
  const born = data.people.filter((p) => birthYear(p)).sort((a, b) => birthYear(a)! - birthYear(b)!);
  const perGen = new Map<number, number>();
  if (meId) {
    const idx = indexPeople(data);
    for (const [, d] of ancestorsWithDepth(meId, idx)) perGen.set(d, (perGen.get(d) ?? 0) + 1);
  }
  return {
    total: data.people.length,
    living: data.people.filter((p) => p.living).length,
    surnames: [...surnames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    avgLifespan: lifespans.length ? Math.round(lifespans.reduce((s, x) => s + x, 0) / lifespans.length) : null,
    oldest: born[0] as Person | undefined,
    perGeneration: [...perGen.entries()].sort((a, b) => a[0] - b[0]),
    places: data.places.length,
  };
}

export function toResearch(data: FamilyData) {
  const out: { person: Person; missing: string[] }[] = [];
  for (const p of data.people) {
    const missing: string[] = [];
    if (!p.parents.length) missing.push("rodzice");
    if (!findEvent(p, "birth")?.date) missing.push("data urodzenia");
    if (!p.living && !findEvent(p, "death")?.date) missing.push("data śmierci");
    if (!p.events.some((e) => e.placeId)) missing.push("miejsca");
    if (!p.events.some((e) => e.sourceIds.length)) missing.push("źródła");
    if (missing.length) out.push({ person: p, missing });
  }
  return out.sort((a, b) => b.missing.length - a.missing.length);
}

/** Events whose month-day matches today. */
export function onThisDay(data: FamilyData, today = new Date()) {
  const md = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return data.people.flatMap((p) =>
    p.events.filter((e) => e.date && e.date.value.length === 10 && e.date.value.slice(5) === md).map((e) => ({ person: p, event: e })),
  );
}
