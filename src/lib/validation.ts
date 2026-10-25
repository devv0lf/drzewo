import { birthYear, deathYear } from "./dates";
import type { FamilyData, Person } from "./model";
import { indexPeople, isAncestor } from "./relations";

/** Warnings for a draft person against the rest of the tree. User may override. */
export function validatePerson(draft: Person, data: FamilyData): string[] {
  const warnings: string[] = [];
  const others = data.people.filter((p) => p.id !== draft.id);
  const idx = indexPeople({ ...data, people: [...others, draft] });
  const b = birthYear(draft);
  const d = deathYear(draft);

  if (b && d && d < b) warnings.push("Data śmierci jest wcześniejsza niż data urodzenia.");
  if (b && d && d - b > 120) warnings.push("Osoba żyła ponad 120 lat — sprawdź daty.");

  for (const link of draft.parents) {
    if (link.personId === draft.id) {
      warnings.push("Osoba nie może być swoim rodzicem.");
      continue;
    }
    const parent = idx.get(link.personId);
    if (!parent) continue;
    const pb = birthYear(parent);
    if (link.type === "biological" && pb && b) {
      const age = b - pb;
      if (age <= 0) warnings.push(`Dziecko jest starsze lub w tym samym wieku co rodzic (${parent.firstName}).`);
      else if (age < 13) warnings.push(`${parent.firstName} miał(a) tylko ${age} lat w chwili narodzin dziecka.`);
      else if (age > 70) warnings.push(`${parent.firstName} miał(a) aż ${age} lat w chwili narodzin dziecka.`);
    }
    const pd = deathYear(parent);
    if (link.type === "biological" && pd && b && b > pd + 1 && parent.gender !== "f")
      warnings.push(`${parent.firstName} zmarł przed narodzinami dziecka.`);
    if (isAncestor(draft.id, link.personId, idx))
      warnings.push(`Cykl: ${parent.firstName} jest już potomkiem tej osoby.`);
  }

  if (draft.parents.filter((l) => l.type === "biological").length > 2)
    warnings.push("Więcej niż dwoje rodziców biologicznych.");

  for (const u of draft.unions) {
    if (u.partnerId === draft.id) warnings.push("Osoba nie może być swoim partnerem.");
    if (isAncestor(u.partnerId, draft.id, idx) || isAncestor(draft.id, u.partnerId, idx))
      warnings.push("Partner jest przodkiem lub potomkiem tej osoby.");
  }
  return [...new Set(warnings)];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");

/** Possible duplicates: same first + last (or maiden) name and birth year within 3 years. */
export function findDuplicates(draft: Person, data: FamilyData): Person[] {
  const b = birthYear(draft);
  return data.people.filter((p) => {
    if (p.id === draft.id) return false;
    if (norm(p.firstName) !== norm(draft.firstName)) return false;
    const ln = [p.lastName, p.maidenName].filter(Boolean).map((x) => norm(x!));
    const dn = [draft.lastName, draft.maidenName].filter(Boolean).map((x) => norm(x!));
    if (!ln.some((x) => dn.includes(x))) return false;
    const pb = birthYear(p);
    return !b || !pb || Math.abs(b - pb) <= 3;
  });
}
