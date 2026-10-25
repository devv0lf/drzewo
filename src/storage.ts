/**
 * The ONLY persistence module. Swap the bodies of load/save for
 * fetch('/api.php') later without touching the UI.
 */
import { FamilyDataSchema, formatZodError, type FamilyData } from "./lib/model";
import { migrate } from "./lib/migrations";

const KEY = "drzewo:data";
const BACKUPS_KEY = "drzewo:backups";
const MAX_BACKUPS = 30;

export interface Backup {
  at: string;
  label: string;
  data: FamilyData;
}

export function parseData(raw: unknown): FamilyData {
  const migrated = migrate(raw);
  const res = FamilyDataSchema.safeParse(migrated);
  if (!res.success) throw new Error(formatZodError(res.error));
  return res.data;
}

export async function load(): Promise<FamilyData | null> {
  const s = localStorage.getItem(KEY);
  if (!s) return null;
  return parseData(JSON.parse(s));
}

/** Saves with optimistic concurrency: rejects if stored revision is newer than expected. */
export async function save(data: FamilyData, expectedRevision: number): Promise<FamilyData> {
  const current = localStorage.getItem(KEY);
  if (current) {
    const rev = (JSON.parse(current) as FamilyData).revision ?? 0;
    if (rev > expectedRevision) throw new Error("Dane zostały zmienione w innej karcie. Odśwież stronę.");
  }
  const next = { ...data, revision: expectedRevision + 1 };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function listBackups(): Promise<Backup[]> {
  try {
    return JSON.parse(localStorage.getItem(BACKUPS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export async function addBackup(data: FamilyData, label: string): Promise<void> {
  const list = await listBackups();
  list.unshift({ at: new Date().toISOString(), label, data });
  while (list.length > MAX_BACKUPS) list.pop();
  try {
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(list));
  } catch {
    // quota: drop oldest half and retry
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(list.slice(0, Math.ceil(list.length / 2))));
  }
}

export async function clearAll(): Promise<void> {
  localStorage.removeItem(KEY);
}

export function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
