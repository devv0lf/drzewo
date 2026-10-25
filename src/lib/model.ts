import { z } from "zod";

export const SCHEMA_VERSION = 1;

const partialDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "Data musi mieć format RRRR, RRRR-MM lub RRRR-MM-DD");

export const FuzzyDateSchema = z.object({
  value: partialDate,
  approx: z.boolean().default(false),
  qualifier: z.enum(["before", "after", "about", "between"]).optional(),
  valueEnd: partialDate.optional(),
});

export const EVENT_TYPES = [
  "birth",
  "baptism",
  "marriage",
  "military",
  "emigration",
  "residence",
  "occupation",
  "burial",
  "death",
  "other",
] as const;

export const EventSchema = z.object({
  id: z.string(),
  type: z.enum(EVENT_TYPES),
  date: FuzzyDateSchema.optional(),
  placeId: z.string().optional(),
  description: z.string().optional(),
  sourceIds: z.array(z.string()).default([]),
});

export const ParentLinkSchema = z.object({
  personId: z.string(),
  type: z.enum(["biological", "adoptive", "step", "foster"]),
});

export const UnionSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  type: z.enum(["marriage", "partnership", "other"]),
  status: z.enum(["married", "divorced", "widowed", "unknown"]),
  startDate: FuzzyDateSchema.optional(),
  endDate: FuzzyDateSchema.optional(),
  placeId: z.string().optional(),
});

export const PersonSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, "Imię jest wymagane"),
  middleNames: z.string().optional(),
  lastName: z.string().default(""),
  maidenName: z.string().optional(),
  nameVariants: z.array(z.string()).default([]),
  gender: z.enum(["m", "f", "other", "unknown"]),
  parents: z.array(ParentLinkSchema).default([]),
  unions: z.array(UnionSchema).default([]),
  events: z.array(EventSchema).default([]),
  occupation: z.string().optional(),
  religion: z.string().optional(),
  notes: z.string().default(""),
  photos: z.array(z.object({ src: z.string(), caption: z.string().default("") })).default([]),
  living: z.boolean().default(false),
  grave: z
    .object({ cemetery: z.string().default(""), plot: z.string().default(""), placeId: z.string().optional() })
    .optional(),
});

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  historicalNames: z
    .array(z.object({ name: z.string(), from: z.string().optional(), to: z.string().optional() }))
    .default([]),
  lat: z.number(),
  lng: z.number(),
  country: z.string().default(""),
});

export const SourceSchema = z.object({
  id: z.string(),
  type: z.enum(["birth_record", "parish_book", "family_story", "document", "website"]),
  citation: z.string(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export const FamilyDataSchema = z.object({
  schemaVersion: z.number().int(),
  revision: z.number().int().default(0),
  people: z.array(PersonSchema),
  places: z.array(PlaceSchema).default([]),
  sources: z.array(SourceSchema).default([]),
  isDemo: z.boolean().optional(),
});

export type FuzzyDate = z.infer<typeof FuzzyDateSchema>;
export type LifeEvent = z.infer<typeof EventSchema>;
export type EventType = LifeEvent["type"];
export type ParentLink = z.infer<typeof ParentLinkSchema>;
export type Union = z.infer<typeof UnionSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type FamilyData = z.infer<typeof FamilyDataSchema>;

export const EVENT_LABELS: Record<EventType, string> = {
  birth: "Narodziny",
  baptism: "Chrzest",
  marriage: "Ślub",
  military: "Służba wojskowa",
  emigration: "Emigracja",
  residence: "Zamieszkanie",
  occupation: "Praca",
  burial: "Pochówek",
  death: "Śmierć",
  other: "Inne",
};

export const PARENT_TYPE_LABELS: Record<ParentLink["type"], string> = {
  biological: "biologiczny",
  adoptive: "adopcyjny",
  step: "przybrany",
  foster: "zastępczy",
};

export const SOURCE_TYPE_LABELS: Record<Source["type"], string> = {
  birth_record: "Akt urodzenia",
  parish_book: "Księga parafialna",
  family_story: "Opowieść rodzinna",
  document: "Dokument",
  website: "Strona internetowa",
};

export function emptyData(): FamilyData {
  return { schemaVersion: SCHEMA_VERSION, revision: 0, people: [], places: [], sources: [] };
}

export function uid(): string {
  return crypto.randomUUID();
}

/** Human-readable path for zod errors, e.g. "people[3].events[0].date.value". */
export function formatZodError(err: z.ZodError): string {
  const issue = err.issues[0];
  const path = issue.path
    .map((p, i) => (typeof p === "number" ? `[${p}]` : i === 0 ? String(p) : `.${String(p)}`))
    .join("");
  return `${path || "(dokument)"}: ${issue.message}`;
}
