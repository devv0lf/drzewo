import { describe, expect, it } from "vitest";
import { makeDemoData } from "@/lib/demo";
import { relationship } from "@/lib/relations";
import { validatePerson } from "@/lib/validation";
import { fromGEDCOM, toGEDCOM } from "@/lib/formats";
import { migrate } from "@/lib/migrations";
import { layoutTree } from "@/lib/layout";

const d = makeDemoData();

describe("relationship", () => {
  it("father", () => expect(relationship("tomasz", "andrzej", d)).toBe("Ojciec"));
  it("great-grandfather", () => expect(relationship("tomasz", "jan", d)).toBe("Pradziadek"));
  it("sister", () => expect(relationship("tomasz", "magda", d)).toBe("Siostra"));
  it("aunt", () => expect(relationship("tomasz", "krystyna", d)).toBe("Ciocia"));
  it("cousin of father", () => expect(relationship("andrzej", "michael", d)).toBe("Kuzyn"));
});

describe("in-laws", () => {
  const base = {
    nameVariants: [], unions: [], events: [], notes: "", photos: [], living: true,
  };
  const data = {
    ...d,
    people: [
      { ...base, id: "dad", firstName: "Ojciec", lastName: "", gender: "m" as const, parents: [] },
      { ...base, id: "me", firstName: "Ja", lastName: "", gender: "m" as const, parents: [{ personId: "dad", type: "biological" as const }] },
      { ...base, id: "sis", firstName: "Siostra", lastName: "", gender: "f" as const, parents: [{ personId: "dad", type: "biological" as const }],
        unions: [{ id: "u1", partnerId: "bil", type: "marriage" as const, status: "married" as const }] },
      { ...base, id: "bil", firstName: "Mąż", lastName: "", gender: "m" as const, parents: [] },
      { ...base, id: "wife", firstName: "Żona", lastName: "", gender: "f" as const, parents: [],
        unions: [{ id: "u2", partnerId: "me", type: "marriage" as const, status: "married" as const }] },
    ],
  };
  it("sister's husband is szwagier, without infinite loop", () => expect(relationship("me", "bil", data)).toBe("Szwagier"));
  it("brother's wife sees husband's sister as szwagierka", () => expect(relationship("wife", "sis", data)).toBe("Szwagierka"));
  it("wife's view of sister's husband", () => expect(relationship("wife", "bil", data)).toBe("Szwagier"));
});

describe("validation", () => {
  it("death before birth", () => {
    const p = { ...d.people.find((x) => x.id === "jan")! };
    p.events = [
      { id: "a", type: "birth", date: { value: "1900", approx: false }, sourceIds: [] },
      { id: "b", type: "death", date: { value: "1890", approx: false }, sourceIds: [] },
    ];
    expect(validatePerson(p, d)).toContain("Data śmierci jest wcześniejsza niż data urodzenia.");
  });
  it("own ancestor cycle", () => {
    const jan = { ...d.people.find((x) => x.id === "jan")!, parents: [{ personId: "tomasz", type: "biological" as const }] };
    expect(validatePerson(jan, d).some((w) => w.startsWith("Cykl"))).toBe(true);
  });
});

describe("formats", () => {
  it("GEDCOM round-trip keeps people and parents", () => {
    const back = fromGEDCOM(toGEDCOM(d));
    expect(back.people).toHaveLength(15);
    expect(back.people.filter((p) => p.parents.length).length).toBe(d.people.filter((p) => p.parents.length).length);
  });
  it("migrates unversioned documents to v1", () => {
    expect((migrate({ people: [] }) as { schemaVersion: number }).schemaVersion).toBe(1);
  });
  it("layout shows focus with ancestors", () => {
    const l = layoutTree(d, { focusId: "tomasz", up: 3, down: 2, mode: "hourglass", collapsed: new Set() });
    expect(l.nodes.some((n) => n.id === "jan")).toBe(true);
  });
});
