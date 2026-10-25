import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LazyMap } from "@/components/LazyMap";
import type { MapLine, MapMarker } from "@/components/mapTypes";
import { sortEvents, yearOf } from "@/lib/dates";
import { placeNameAt } from "@/lib/places";
import { fullName } from "@/lib/relations";
import { useStore } from "@/store";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { selectCls } from "@/components/form/FormBits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa rodziny — Drzewo rodzinne" },
      { name: "description", content: "Miejsca urodzenia, zamieszkania i pochówku Twoich przodków na mapie." },
      { property: "og:title", content: "Mapa rodziny" },
      { property: "og:description", content: "Gdzie żyła Twoja rodzina — na mapie." },
    ],
  }),
  component: MapPage,
});

type Kind = "birth" | "residence" | "grave";
const KINDS: { k: Kind; label: string; colorVar: string; dot: string }[] = [
  { k: "birth", label: "Narodziny", colorVar: "--paternal", dot: "bg-paternal" },
  { k: "residence", label: "Zamieszkanie", colorVar: "--maternal", dot: "bg-maternal" },
  { k: "grave", label: "Groby", colorVar: "--honey", dot: "bg-honey" },
];

function MapPage() {
  const data = useStore((s) => s.data);
  const privacy = useStore((s) => s.settings.privacy);
  const navigate = useNavigate();
  const places = useMemo(() => new Map(data.places.map((p) => [p.id, p])), [data.places]);
  const years = data.people.flatMap((p) => p.events.map((e) => yearOf(e.date)).filter((y): y is number => !!y));
  const minY = years.length ? Math.min(...years) : 1800;
  const maxY = new Date().getFullYear();

  const [kinds, setKinds] = useState<Set<Kind>>(new Set(["birth", "residence", "grave"]));
  const [surname, setSurname] = useState("");
  const [personId, setPersonId] = useState("");
  const [year, setYear] = useState(maxY);
  const [playing, setPlaying] = useState(false);
  const [lines, setLines] = useState(true);
  const [heat, setHeat] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setYear((y) => {
        if (y >= maxY) {
          setPlaying(false);
          return maxY;
        }
        return y + 2;
      });
    }, 120);
    return () => clearInterval(t);
  }, [playing, maxY]);

  const surnames = [...new Set(data.people.map((p) => p.lastName).filter(Boolean))].sort();

  const { markers, mapLines } = useMemo(() => {
    const markers: MapMarker[] = [];
    const mapLines: MapLine[] = [];
    for (const p of data.people) {
      if (privacy && p.living) continue;
      if (surname && p.lastName !== surname && p.maidenName !== surname) continue;
      if (personId && p.id !== personId) continue;
      const route: [number, number][] = [];
      for (const e of sortEvents(p.events)) {
        const y = yearOf(e.date);
        if (y && y > year) continue;
        const pl = e.placeId ? places.get(e.placeId) : undefined;
        if (!pl) continue;
        const kind: Kind | null =
          e.type === "birth" || e.type === "baptism" ? "birth" : e.type === "residence" || e.type === "emigration" ? "residence" : e.type === "burial" ? "grave" : null;
        if (kind && kind !== "grave") route.push([pl.lat, pl.lng]);
        if (!kind || !kinds.has(kind)) continue;
        markers.push({
          lat: pl.lat,
          lng: pl.lng,
          colorVar: KINDS.find((k) => k.k === kind)!.colorVar,
          title: `${fullName(p)} — ${placeNameAt(pl, e.date?.value)}${y ? ` (${y})` : ""}`,
          key: p.id,
        });
      }
      if (p.grave?.placeId && kinds.has("grave") && !p.events.some((e) => e.type === "burial")) {
        const pl = places.get(p.grave.placeId);
        if (pl) markers.push({ lat: pl.lat, lng: pl.lng, colorVar: "--honey", title: `${fullName(p)} — ${p.grave.cemetery}`, key: p.id });
      }
      if (lines && route.length > 1) mapLines.push({ points: route, colorVar: "--primary" });
    }
    return { markers, mapLines };
  }, [data.people, places, kinds, surname, personId, year, lines, privacy]);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="no-print space-y-3 border-b bg-card p-3 md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
        <h1 className="hidden font-serif text-xl font-semibold md:block">Mapa rodziny</h1>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => {
            const on = kinds.has(k.k);
            return (
              <button
                key={k.k}
                aria-pressed={on}
                onClick={() => {
                  const n = new Set(kinds);
                  if (on) n.delete(k.k);
                  else n.add(k.k);
                  setKinds(n);
                }}
                className={cn("flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold", on ? "bg-accent" : "opacity-50")}
              >
                <span className={cn("size-3 rounded-full", k.dot)} /> {k.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <select className={selectCls} value={surname} onChange={(e) => setSurname(e.target.value)} aria-label="Nazwisko">
            <option value="">Wszystkie nazwiska</option>
            {surnames.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={selectCls} value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Osoba">
            <option value="">Wszystkie osoby</option>
            {[...data.people].sort((a, b) => a.lastName.localeCompare(b.lastName)).map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p, privacy)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!playing && year >= maxY) setYear(minY);
              setPlaying(!playing);
            }}
            aria-label={playing ? "Zatrzymaj" : "Odtwórz migracje"}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted-foreground">Do roku: <b className="text-foreground">{year}</b></div>
            <Slider min={minY} max={maxY} step={1} value={[year]} onValueChange={([v]) => setYear(v)} aria-label="Rok" />
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={lines} onCheckedChange={setLines} /> Trasy
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={heat} onCheckedChange={setHeat} /> Mapa cieplna
          </label>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {data.places.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
            Dodaj miejsca urodzenia lub zamieszkania, aby zobaczyć je na mapie.
          </div>
        ) : (
          <LazyMap markers={markers} lines={mapLines} heat={heat} onMarkerClick={(id) => navigate({ to: "/osoba/$id", params: { id } })} />
        )}
      </div>
    </div>
  );
}
