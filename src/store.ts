import { create } from "zustand";
import { emptyData, type FamilyData, type Person, type Place, type Source } from "./lib/model";
import { makeDemoData } from "./lib/demo";
import type { TreeMode } from "./lib/layout";
import * as storage from "./storage";

export interface Settings {
  meId?: string;
  privacy: boolean;
  up: number;
  down: number;
  mode: TreeMode;
}

const SETTINGS_KEY = "drzewo:settings";

interface State {
  loaded: boolean;
  data: FamilyData;
  lastSaved?: Date;
  saveError?: string;
  settings: Settings;
  undoStack: FamilyData[];
  init: () => Promise<void>;
  commit: (next: FamilyData, label: string) => void;
  upsertPerson: (p: Person) => void;
  upsertPeople: (ps: Person[]) => void;
  deletePerson: (id: string) => void;
  upsertPlace: (p: Place) => void;
  upsertSource: (s: Source) => void;
  replaceAll: (d: FamilyData, label: string) => void;
  undo: () => void;
  setSettings: (s: Partial<Settings>) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastBackupAt = 0;

export const useStore = create<State>((set, get) => ({
  loaded: false,
  data: emptyData(),
  settings: { privacy: false, up: 3, down: 2, mode: "hourglass" },
  undoStack: [],

  init: async () => {
    if (get().loaded) return;
    let data: FamilyData | null = null;
    try {
      data = await storage.load();
    } catch (e) {
      set({ saveError: `Nie udało się wczytać danych: ${(e as Error).message}` });
    }
    let settings = get().settings;
    try {
      settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
    } catch {
      /* ignore */
    }
    if (!data) {
      data = makeDemoData();
      settings.meId ??= "tomasz";
      data = await storage.save(data, -1);
    }
    set({ data, settings, loaded: true, lastSaved: new Date() });
  },

  commit: (next, label) => {
    const prev = get().data;
    set({ data: next, undoStack: [prev, ...get().undoStack].slice(0, 20) });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const saved = await storage.save(get().data, prev.revision);
        set({ data: { ...get().data, revision: saved.revision }, lastSaved: new Date(), saveError: undefined });
        // snapshot at most every 2 minutes, plus always on destructive actions
        if (Date.now() - lastBackupAt > 120_000 || label.startsWith("!")) {
          lastBackupAt = Date.now();
          await storage.addBackup(prev, label.replace(/^!/, ""));
        }
      } catch (e) {
        set({ saveError: (e as Error).message });
      }
    }, 300);
  },

  upsertPerson: (p) => get().upsertPeople([p]),
  upsertPeople: (ps) => {
    const d = get().data;
    const ids = new Set(ps.map((p) => p.id));
    const existing = d.people.filter((x) => !ids.has(x.id));
    get().commit({ ...d, people: [...existing, ...ps] }, `Zapis: ${ps.map((p) => p.firstName).join(", ")}`);
  },
  deletePerson: (id) => {
    const d = get().data;
    const name = d.people.find((p) => p.id === id)?.firstName ?? "";
    const people = d.people
      .filter((p) => p.id !== id)
      .map((p) => ({
        ...p,
        parents: p.parents.filter((l) => l.personId !== id),
        unions: p.unions.filter((u) => u.partnerId !== id),
      }));
    get().commit({ ...d, people }, `!Przed usunięciem: ${name}`);
  },
  upsertPlace: (pl) => {
    const d = get().data;
    get().commit({ ...d, places: [...d.places.filter((x) => x.id !== pl.id), pl] }, `Miejsce: ${pl.name}`);
  },
  upsertSource: (s) => {
    const d = get().data;
    get().commit({ ...d, sources: [...d.sources.filter((x) => x.id !== s.id), s] }, "Źródło");
  },
  replaceAll: (data, label) => get().commit({ ...data, revision: get().data.revision }, `!${label}`),
  undo: () => {
    const [prev, ...rest] = get().undoStack;
    if (!prev) return;
    get().commit({ ...prev, revision: get().data.revision }, "Cofnięcie");
    set({ undoStack: rest });
  },
  setSettings: (s) => {
    const settings = { ...get().settings, ...s };
    set({ settings });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
}));
