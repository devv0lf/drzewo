import { SCHEMA_VERSION, type FamilyData, type LifeEvent, type Person } from "./model";

type Ev = [LifeEvent["type"], string | undefined, string | undefined, boolean?, string?];

function person(
  id: string,
  firstName: string,
  lastName: string,
  gender: Person["gender"],
  events: Ev[],
  extra: Partial<Person> = {},
): Person {
  return {
    id,
    firstName,
    lastName,
    gender,
    nameVariants: [],
    parents: [],
    unions: [],
    notes: "",
    photos: [],
    living: false,
    events: events.map(([type, value, placeId, approx, description], i) => ({
      id: `${id}-e${i}`,
      type,
      date: value ? { value, approx: !!approx } : undefined,
      placeId,
      description,
      sourceIds: [],
    })),
    ...extra,
  };
}

const bio = (...ids: string[]) => ids.map((personId) => ({ personId, type: "biological" as const }));
const marr = (id: string, partnerId: string, start?: string, placeId?: string, status: "married" | "widowed" = "married") => ({
  id,
  partnerId,
  type: "marriage" as const,
  status,
  startDate: start ? { value: start, approx: false } : undefined,
  placeId,
});

/** Small demo family across 4 generations. Built lazily (no module-scope side effects). */
export function makeDemoData(): FamilyData {
  const places = [
    { id: "pl-krk", name: "Kraków", historicalNames: [], lat: 50.0614, lng: 19.9366, country: "Polska" },
    { id: "pl-wie", name: "Wieliczka", historicalNames: [], lat: 49.987, lng: 20.0647, country: "Polska" },
    { id: "pl-tar", name: "Tarnów", historicalNames: [], lat: 50.0121, lng: 20.9858, country: "Polska" },
    {
      id: "pl-lwo",
      name: "Lwiw",
      historicalNames: [{ name: "Lwów", to: "1945" }],
      lat: 49.8397,
      lng: 24.0297,
      country: "Ukraina",
    },
    { id: "pl-waw", name: "Warszawa", historicalNames: [], lat: 52.2297, lng: 21.0122, country: "Polska" },
    {
      id: "pl-gda",
      name: "Gdańsk",
      historicalNames: [{ name: "Wolne Miasto Gdańsk", from: "1920", to: "1939" }],
      lat: 54.352,
      lng: 18.6466,
      country: "Polska",
    },
    { id: "pl-chi", name: "Chicago", historicalNames: [], lat: 41.8781, lng: -87.6298, country: "USA" },
    { id: "pl-poz", name: "Poznań", historicalNames: [], lat: 52.4064, lng: 16.9252, country: "Polska" },
  ];

  const people: Person[] = [
    person("jan", "Jan", "Kowalski", "m", [["birth", "1895-03-12", "pl-wie"], ["occupation", "1920", "pl-wie", true, "Górnik w kopalni soli"], ["death", "1961-11-02", "pl-krk"], ["burial", "1961-11-05", "pl-krk"]], {
      unions: [marr("u1", "maria", "1919-06-21", "pl-wie")],
      occupation: "górnik",
      religion: "rzymskokatolickie",
      grave: { cemetery: "Cmentarz Rakowicki", plot: "kwatera XII, rząd 4", placeId: "pl-krk" },
      notes: "Pracował w kopalni soli w Wieliczce przez ponad 30 lat.",
    }),
    person("maria", "Maria", "Kowalska", "f", [["birth", "1898", "pl-tar", true], ["residence", "1919", "pl-wie"], ["residence", "1946", "pl-krk"], ["death", "1975-01-14", "pl-krk"]], {
      maidenName: "Nowak",
      nameVariants: ["Marya"],
    }),
    person("antoni", "Antoni", "Wiśniewski", "m", [["birth", "1890-08-01", "pl-lwo"], ["military", "1920", "pl-lwo", true, "Wojna polsko-bolszewicka"], ["death", "1944", "pl-lwo", true]], {
      unions: [marr("u2", "zofia", "1922-05-04", "pl-lwo", "widowed")],
      occupation: "nauczyciel",
    }),
    person("zofia", "Zofia", "Wiśniewska", "f", [["birth", "1893", "pl-lwo"], ["emigration", "1946", "pl-gda", false, "Przesiedlenie ze Lwowa"], ["death", "1970-04-30", "pl-gda"]], {
      maidenName: "Lis",
    }),
    person("stanislaw", "Stanisław", "Kowalski", "m", [["birth", "1921-02-10", "pl-wie"], ["residence", "1946", "pl-krk"], ["death", "1998-09-18", "pl-krk"]], {
      parents: bio("jan", "maria"),
      unions: [marr("u3", "helena", "1948-07-10", "pl-krk")],
      occupation: "inżynier",
    }),
    person("helena", "Helena", "Kowalska", "f", [["birth", "1924-12-24", "pl-lwo"], ["residence", "1946", "pl-gda"], ["residence", "1948", "pl-krk"], ["death", "2010-03-03", "pl-krk"]], {
      maidenName: "Wiśniewska",
      parents: bio("antoni", "zofia"),
    }),
    person("jozef", "Józef", "Kowalski", "m", [["birth", "1925-05-19", "pl-wie"], ["emigration", "1948", "pl-chi", false, "Wyjazd do USA"], ["death", "1990", "pl-chi", true]], {
      parents: bio("jan", "maria"),
      nameVariants: ["Joseph Kowalski"],
    }),
    person("anna", "Anna", "Wiśniewska", "f", [["birth", "1927", "pl-lwo"], ["residence", "1946", "pl-gda"], ["death", "2001-06-06", "pl-gda"]], {
      parents: bio("antoni", "zofia"),
    }),
    person("andrzej", "Andrzej", "Kowalski", "m", [["birth", "1950-04-15", "pl-krk"], ["residence", "1975", "pl-waw"]], {
      parents: bio("stanislaw", "helena"),
      unions: [marr("u4", "ewa", "1979-09-01", "pl-waw")],
      living: true,
    }),
    person("ewa", "Ewa", "Kowalska", "f", [["birth", "1953-10-08", "pl-poz"], ["residence", "1979", "pl-waw"]], {
      maidenName: "Zielińska",
      living: true,
    }),
    person("krystyna", "Krystyna", "Kowalska", "f", [["birth", "1955-01-27", "pl-krk"]], {
      parents: bio("stanislaw", "helena"),
      living: true,
    }),
    person("michael", "Michael", "Kowalski", "m", [["birth", "1952", "pl-chi"]], {
      parents: bio("jozef"),
      living: true,
      nameVariants: ["Michał"],
    }),
    person("tomasz", "Tomasz", "Kowalski", "m", [["birth", "1982-06-02", "pl-waw"]], {
      parents: bio("andrzej", "ewa"),
      living: true,
    }),
    person("magda", "Magdalena", "Kowalska", "f", [["birth", "1985-11-30", "pl-waw"]], {
      parents: bio("andrzej", "ewa"),
      living: true,
    }),
    person("piotr", "Piotr", "Kowalski", "m", [["birth", "1989", "pl-gda", true]], {
      parents: [
        { personId: "andrzej", type: "adoptive" },
        { personId: "ewa", type: "adoptive" },
      ],
      living: true,
      notes: "Adoptowany w 1991 roku.",
    }),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    people,
    places,
    sources: [
      { id: "s1", type: "parish_book", citation: "Księga chrztów parafii św. Klemensa w Wieliczce, 1895, nr 112" },
      { id: "s2", type: "family_story", citation: "Wspomnienia babci Heleny" },
    ],
    isDemo: true,
  };
}
