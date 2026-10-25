import { useMemo, useState } from "react";
import { MapPin, Plus, Search, X } from "lucide-react";
import type { FuzzyDate, Person } from "@/lib/model";
import { uid } from "@/lib/model";
import { geocode, type GeoResult } from "@/lib/places";
import { fullName } from "@/lib/relations";
import { lifeSpan } from "@/lib/dates";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePeopleSearch } from "../PersonSearch";

export const selectCls =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

type Q = "exact" | "about" | "before" | "after" | "between";
export function DateInput({ value, onChange }: { value?: FuzzyDate; onChange: (d?: FuzzyDate) => void }) {
  const q: Q = value?.qualifier ?? (value?.approx ? "about" : "exact");
  const [text, setText] = useState(value?.value ?? "");
  const [end, setEnd] = useState(value?.valueEnd ?? "");
  const valid = (s: string) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(s);
  const emit = (t: string, qq: Q, e: string) => {
    if (!t) return onChange(undefined);
    if (!valid(t)) return;
    onChange({
      value: t,
      approx: qq === "about",
      qualifier: qq === "exact" ? undefined : qq,
      valueEnd: qq === "between" && valid(e) ? e : undefined,
    });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Dokładność daty" className={`${selectCls} w-32`} value={q} onChange={(e) => emit(text, e.target.value as Q, end)}>
        <option value="exact">dokładnie</option>
        <option value="about">około</option>
        <option value="before">przed</option>
        <option value="after">po</option>
        <option value="between">między</option>
      </select>
      <Input
        aria-label="Data"
        placeholder="RRRR lub RRRR-MM-DD"
        inputMode="numeric"
        className="h-11 w-40"
        value={text}
        aria-invalid={!!text && !valid(text)}
        onChange={(e) => {
          setText(e.target.value);
          emit(e.target.value, q, end);
        }}
      />
      {q === "between" && (
        <Input
          aria-label="Data końcowa"
          placeholder="a RRRR"
          className="h-11 w-32"
          value={end}
          onChange={(e) => {
            setEnd(e.target.value);
            emit(text, q, e.target.value);
          }}
        />
      )}
    </div>
  );
}

export function PersonPicker({
  value,
  onChange,
  exclude,
  placeholder = "Wybierz osobę…",
  newDefaults,
}: {
  value?: string;
  onChange: (id?: string) => void;
  exclude: string[];
  placeholder?: string;
  newDefaults?: Partial<Person>;
}) {
  const people = useStore((s) => s.data.people);
  const upsertPerson = useStore((s) => s.upsertPerson);
  const fuse = usePeopleSearch(people);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = people.find((p) => p.id === value);
  const results = useMemo(() => {
    const list = q.trim() ? fuse.search(q).map((r) => r.item) : people;
    return list.filter((p) => !exclude.includes(p.id)).slice(0, 8);
  }, [q, fuse, people, exclude]);

  if (selected)
    return (
      <div className="flex h-11 items-center justify-between rounded-md border bg-card px-3 text-sm">
        <span>
          {fullName(selected)} <span className="text-muted-foreground">{lifeSpan(selected)}</span>
        </span>
        <button type="button" aria-label="Usuń wybór" onClick={() => onChange(undefined)} className="p-2">
          <X className="size-4" />
        </button>
      </div>
    );

  const createNew = () => {
    const [firstName, ...rest] = q.trim().split(/\s+/);
    if (!firstName) return;
    const p: Person = {
      id: uid(),
      firstName,
      lastName: rest.join(" "),
      gender: "unknown",
      nameVariants: [],
      parents: [],
      unions: [],
      events: [],
      notes: "",
      photos: [],
      living: false,
      ...newDefaults,
    };
    upsertPerson(p);
    onChange(p.id);
    setQ("");
  };

  return (
    <div className="relative">
      <Input
        className="h-11"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover shadow-card">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(p.id)}
                className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm hover:bg-accent"
              >
                {fullName(p)} <span className="text-xs text-muted-foreground">{lifeSpan(p)}</span>
              </button>
            </li>
          ))}
          {q.trim() && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={createNew}
                className="flex min-h-11 w-full items-center gap-2 border-t px-3 text-left text-sm font-semibold text-primary hover:bg-accent"
              >
                <Plus className="size-4" /> Dodaj nową osobę „{q.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function PlacePicker({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const places = useStore((s) => s.data.places);
  const upsertPlace = useStore((s) => s.upsertPlace);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const selected = places.find((p) => p.id === value);
  const local = q.trim()
    ? places.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.historicalNames.some((h) => h.name.toLowerCase().includes(q.toLowerCase())))
    : [];

  if (selected)
    return (
      <div className="flex h-11 items-center justify-between rounded-md border bg-card px-3 text-sm">
        <span className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> {selected.name}
          <span className="text-muted-foreground">{selected.country}</span>
        </span>
        <button type="button" aria-label="Usuń miejsce" onClick={() => onChange(undefined)} className="p-2">
          <X className="size-4" />
        </button>
      </div>
    );

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setErr("");
    try {
      setResults(await geocode(q.trim()));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          className="h-11"
          placeholder="Miejscowość…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setResults(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <Button type="button" variant="outline" className="h-11" onClick={search} disabled={busy || !q.trim()}>
          <Search /> {busy ? "Szukam…" : "Szukaj"}
        </Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {(local.length > 0 || results) && (
        <ul className="overflow-hidden rounded-xl border bg-popover text-sm">
          {local.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onChange(p.id)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-accent">
                <MapPin className="size-4 text-secondary" /> {p.name} <span className="text-muted-foreground">(zapisane)</span>
              </button>
            </li>
          ))}
          {results?.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  const id = uid();
                  upsertPlace({ id, name: r.name, historicalNames: [], lat: r.lat, lng: r.lng, country: r.country });
                  onChange(id);
                }}
                className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-1 text-left hover:bg-accent"
              >
                <span className="font-semibold">{r.name}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{r.displayName}</span>
              </button>
            </li>
          ))}
          {results && results.length === 0 && <li className="px-3 py-2 text-muted-foreground">Nic nie znaleziono.</li>}
        </ul>
      )}
    </div>
  );
}
