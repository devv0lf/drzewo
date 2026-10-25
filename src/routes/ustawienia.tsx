import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import { useStore } from "@/store";
import { downloadFile, parseData } from "@/storage";
import { fromGEDCOM, fromYAML, toGEDCOM, toJSON, toYAML } from "@/lib/formats";
import { emptyData, type FamilyData } from "@/lib/model";
import { makeDemoData } from "@/lib/demo";
import { fullName } from "@/lib/relations";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { selectCls } from "@/components/form/FormBits";

export const Route = createFileRoute("/ustawienia")({
  head: () => ({
    meta: [
      { title: "Ustawienia — Drzewo rodzinne" },
      { name: "description", content: "Import i eksport danych, kopie zapasowe i prywatność." },
      { property: "og:title", content: "Ustawienia — Drzewo rodzinne" },
      { property: "og:description", content: "Import, eksport, kopie zapasowe i prywatność." },
    ],
  }),
  component: SettingsPage,
});

/** Privacy mode export: living people reduced to initials, no photos/notes. */
function anonymize(d: FamilyData): FamilyData {
  return {
    ...d,
    people: d.people.map((p) =>
      p.living
        ? { ...p, firstName: `${p.firstName[0]}.`, lastName: `${p.lastName[0] ?? ""}.`, middleNames: undefined, maidenName: undefined, photos: [], notes: "", events: [], nameVariants: [] }
        : p,
    ),
  };
}

function SettingsPage() {
  const data = useStore((s) => s.data);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const replaceAll = useStore((s) => s.replaceAll);
  const undo = useStore((s) => s.undo);
  const fileRef = useRef<HTMLInputElement>(null);

  const out = () => (settings.privacy ? anonymize(data) : data);
  const stamp = new Date().toISOString().slice(0, 10);

  const onFile = async (f: File) => {
    try {
      const text = await f.text();
      const name = f.name.toLowerCase();
      const parsed = name.endsWith(".ged")
        ? fromGEDCOM(text)
        : parseData(name.endsWith(".yaml") || name.endsWith(".yml") ? fromYAML(text) : JSON.parse(text));
      replaceAll({ ...parsed, isDemo: false }, `Przed importem ${f.name}`);
      toast.success(`Zaimportowano ${parsed.people.length} osób`, { action: { label: "Cofnij", onClick: undo } });
    } catch (e) {
      toast.error(`Błąd importu: ${(e as Error).message}`, { duration: 10000 });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-28">
      <h1 className="font-serif text-2xl font-semibold">Ustawienia</h1>

      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="font-serif text-lg font-semibold text-primary">Ja</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Kim jesteś w drzewie? (do obliczania pokrewieństwa)</span>
          <select className={selectCls} value={settings.meId ?? ""} onChange={(e) => setSettings({ meId: e.target.value || undefined })}>
            <option value="">— nie wybrano —</option>
            {[...data.people].sort((a, b) => a.firstName.localeCompare(b.firstName)).map((p) => (
              <option key={p.id} value={p.id}>{fullName(p)}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <Switch checked={settings.privacy} onCheckedChange={(privacy) => setSettings({ privacy })} />
          <span><b>Tryb prywatny</b> — ukrywa dane i zdjęcia żyjących osób (także w eksporcie)</span>
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="font-serif text-lg font-semibold text-primary">Plik z danymi</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fileRef.current?.click()}>Importuj plik</Button>
          <input ref={fileRef} type="file" accept=".json,.yaml,.yml,.ged" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => downloadFile(`drzewo-${stamp}.json`, toJSON(out()), "application/json")}>Eksportuj plik (JSON)</Button>
          <Button variant="outline" onClick={() => downloadFile(`drzewo-${stamp}.yaml`, toYAML(out()), "text/yaml")}>YAML</Button>
          <Button variant="outline" onClick={() => downloadFile(`drzewo-${stamp}.ged`, toGEDCOM(out()), "text/plain")}>GEDCOM</Button>
          <Button variant="outline" onClick={() => window.print()}>Drukuj / PDF</Button>
        </div>
        <p className="text-xs text-muted-foreground">Import przyjmuje JSON, YAML i GEDCOM 5.5.1. Przed importem tworzona jest kopia zapasowa.</p>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="font-serif text-lg font-semibold text-primary">Kopie i dane</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/kopie">Przywróć kopię</Link></Button>
          {data.isDemo && (
            <Button variant="outline" onClick={() => { replaceAll(emptyData(), "Przed wyczyszczeniem demo"); toast("Usunięto dane demo", { action: { label: "Cofnij", onClick: undo } }); }}>
              Wyczyść dane demo
            </Button>
          )}
          <Button variant="outline" onClick={() => { replaceAll(makeDemoData(), "Przed wczytaniem demo"); setSettings({ meId: "tomasz" }); }}>Wczytaj demo</Button>
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm("Na pewno usunąć wszystkie dane? Kopia zapasowa zostanie zachowana.")) {
                replaceAll(emptyData(), "Przed usunięciem wszystkiego");
                toast("Usunięto wszystkie dane", { action: { label: "Cofnij", onClick: undo } });
              }
            }}
          >
            Usuń wszystkie dane
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Rewizja danych: {data.revision}. Dane są zapisywane automatycznie w tej przeglądarce.</p>
      </section>
    </div>
  );
}
