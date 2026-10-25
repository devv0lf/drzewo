/**
 * The ONLY persistence module. Data lives in Supabase (per signed-in user).
 */
import { supabase } from "@/integrations/supabase/client";
import { FamilyDataSchema, formatZodError, type FamilyData } from "./lib/model";
import { migrate } from "./lib/migrations";

const LEGACY_KEY = "drzewo:data";
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

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Zaloguj się, aby zapisywać dane.");
  return data.user.id;
}

export async function load(): Promise<FamilyData | null> {
  const uid = await userId();
  const { data, error } = await supabase.from("family_trees").select("data, revision").eq("user_id", uid).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return parseData({ ...(data.data as object), revision: data.revision });
  // First sign-in: move any tree previously kept in this browser to the cloud.
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    const parsed = parseData(JSON.parse(legacy));
    const saved = await save(parsed, parsed.revision ?? 0);
    localStorage.removeItem(LEGACY_KEY);
    return saved;
  }
  return null;
}

/** Saves with optimistic concurrency: rejects if stored revision is newer than expected. */
export async function save(data: FamilyData, expectedRevision: number): Promise<FamilyData> {
  const uid = await userId();
  const { data: cur, error: e1 } = await supabase.from("family_trees").select("revision").eq("user_id", uid).maybeSingle();
  if (e1) throw new Error(e1.message);
  if (cur && cur.revision > expectedRevision)
    throw new Error("Dane zostały zmienione na innym urządzeniu lub karcie. Odśwież stronę.");
  const next = { ...data, revision: expectedRevision + 1 };
  const { error } = await supabase
    .from("family_trees")
    .upsert({ user_id: uid, data: next as never, revision: next.revision });
  if (error) throw new Error(error.message);
  return next;
}

export async function listBackups(): Promise<Backup[]> {
  const { data, error } = await supabase
    .from("family_backups")
    .select("label, data, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_BACKUPS);
  if (error) return [];
  return data.map((b) => ({ at: b.created_at, label: b.label, data: b.data as unknown as FamilyData }));
}

export async function addBackup(data: FamilyData, label: string): Promise<void> {
  const uid = await userId();
  await supabase.from("family_backups").insert({ user_id: uid, label, data: data as never });
  const { data: old } = await supabase
    .from("family_backups")
    .select("id")
    .order("created_at", { ascending: false })
    .range(MAX_BACKUPS, MAX_BACKUPS + 100);
  if (old?.length) await supabase.from("family_backups").delete().in("id", old.map((o) => o.id));
}

export async function clearAll(): Promise<void> {
  const uid = await userId();
  await supabase.from("family_trees").delete().eq("user_id", uid);
}

export function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
