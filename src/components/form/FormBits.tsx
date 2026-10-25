import { useMemo, useState } from "react";
import { MapPin, Plus, Search, X } from "lucide-react";
import type { FuzzyDate, Person } from "@/lib/model";
import { uid } from "@/lib/model";
import { geocode, type GeoResult } from "@/lib/places";
import { fullName } from "@/lib/relations";
import { formatDateValue, lifeSpan, normalizeDateInput } from "@/lib/dates";
import { Calendar as CalendarIcon } from "lucide-react";
import { pl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function toDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const [y, m = "1", d = "1"] = v.split("-");
  return new Date(+y, +m - 1, +d);
}
function fromDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).padStart(4, "0")}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function DatePart({
  label,
  text,
  setText,
  onValue,
  placeholder,
}: {
  label: string;
  text: string;
  setText: (s: string) => void;
  onValue: (v?: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const norm = normalizeDateInput(text);
  const invalid = !!text.trim() && !norm;
  const selected = toDate(norm);
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <Input
          aria-label={label}
          placeholder={placeholder}
          className="h-11 w-40"
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            const n = normalizeDateInput(e.target.value);
            if (!e.target.value.trim()) onValue(undefined);
            else if (n) onValue(n);
          }}
          onBlur={() => norm && setText(norm)}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`${label} – wybierz z kalendarza`}>
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={pl}
              captionLayout="dropdown"
              startMonth={new Date(1500, 0)}
              endMonth={new Date(new Date().getFullYear(), 11)}
              selected={selected}
              defaultMonth={selected ?? new Date(1950, 0)}
              onSelect={(d) => {
                if (!d) return;
                const v = fromDate(d);
                setText(v);
                onValue(v);
                setOpen(false);
              }}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {invalid ? (
        <span className="block text-xs text-destructive">Nieprawidłowa data – wpisz np. 1920, 05.1920 lub 14.05.1920</span>
      ) : norm ? (
        <span className="block text-xs text-muted-foreground">{formatDateValue(norm)}</span>
      ) : null}
    </div>
  );
}

export function DateInput({ value, onChange }: { value?: FuzzyDate; onChange: (d?: FuzzyDate) => void }) {
  const q: Q = value?.qualifier ?? (value?.approx ? "about" : "exact");
  const [text, setText] = useState(value?.value ?? "");
  const [end, setEnd] = useState(value?.valueEnd ?? "");
  const emit = (v: string | undefined, qq: Q, e: string | undefined) => {
    if (!v) return onChange(undefined);
    onChange({
      value: v,
      approx: qq === "about",
      qualifier: qq === "exact" ? undefined : qq,
      valueEnd: qq === "between" ? e : undefined,
    });
  };
  return (
    <div className="flex flex-wrap items-start gap-2">
      <select
        aria-label="Dokładność daty"
        className={`${selectCls} w-32`}
        value={q}
        onChange={(e) => emit(normalizeDateInput(text), e.target.value as Q, normalizeDateInput(end))}
      >
        <option value="exact">dokładnie</option>
        <option value="about">około</option>
        <option value="before">przed</option>
        <option value="after">po</option>
        <option value="between">między</option>
      </select>
      <DatePart
        label="Data"
        placeholder="DD.MM.RRRR lub RRRR"
        text={text}
        setText={setText}
        onValue={(v) => emit(v, q, normalizeDateInput(end))}
      />
      {q === "between" && (
        <DatePart
          label="Data końcowa"
          placeholder="a… (DD.MM.RRRR)"
          text={end}
          setText={setEnd}
          onValue={(v) => emit(normalizeDateInput(text), q, v)}
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
