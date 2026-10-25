import { SCHEMA_VERSION } from "./model";

type Raw = Record<string, unknown> & { schemaVersion?: number };

/** Ordered migrations: key N upgrades a document from version N to N+1. */
const MIGRATIONS: Record<number, (d: Raw) => Raw> = {
  // 0 -> 1: documents without a version get defaults
  0: (d) => ({ ...d, schemaVersion: 1, revision: d['revision'] ?? 0, sources: d['sources'] ?? [] }),
};

export function migrate(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  let d = input as Raw;
  let v = typeof d.schemaVersion === "number" ? d.schemaVersion : 0;
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`Brak migracji z wersji ${v}`);
    d = m(d);
    v = d.schemaVersion as number;
  }
  if (v > SCHEMA_VERSION) throw new Error(`Plik pochodzi z nowszej wersji aplikacji (wersja ${v}).`);
  return d;
}
