import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EVENT_LABELS,
  EVENT_TYPES,
  PARENT_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  uid,
  type LifeEvent,
  type ParentLink,
  type Person,
  type Source,
  type Union,
} from "@/lib/model";
import { findDuplicates, validatePerson } from "@/lib/validation";
import { fullName } from "@/lib/relations";
import { lifeSpan } from "@/lib/dates";
import { useStore } from "@/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateInput, Field, PersonPicker, PlacePicker, selectCls } from "./FormBits";

export function blankPerson(): Person {
  return {
    id: uid(),
    firstName: "",
    lastName: "",
    gender: "unknown",
    nameVariants: [],
    parents: [],
    unions: [],
    events: [{ id: uid(), type: "birth", sourceIds: [] }],
    notes: "",
    photos: [],
    living: true,
  };
}

async function resizeImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((r, j) => {
    img.onload = r;
    img.onerror = j;
    img.src = url;
  });
  const max = 480;
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * s;
  c.height = img.height * s;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.8);
}

const STEPS = ["Osoba", "Rodzina", "Wydarzenia", "Więcej"];

export function PersonForm({ initial, isNew }: { initial: Person; isNew: boolean }) {
  const data = useStore((s) => s.data);
  const upsertPeople = useStore((s) => s.upsertPeople);
  const upsertSource = useStore((s) => s.upsertSource);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);

  // gather unions stored on partners too, so editing works from either side
  const [p, setP] = useState<Person>(() => {
    const extra: Union[] = [];
    for (const o of data.people)
      for (const u of o.unions)
        if (u.partnerId === initial.id && !initial.unions.some((x) => x.partnerId === o.id)) extra.push({ ...u, partnerId: o.id });
    return { ...initial, unions: [...initial.unions, ...extra] };
  });
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const set = <K extends keyof Person>(k: K, v: Person[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setWarnings(null);
  };
  const exclude = useMemo(() => [p.id, ...p.parents.map((l) => l.personId), ...p.unions.map((u) => u.partnerId)], [p]);

  const setParent = (i: number, patch: Partial<ParentLink> | null) =>
    set("parents", patch === null ? p.parents.filter((_, j) => j !== i) : p.parents.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const setUnion = (i: number, patch: Partial<Union> | null) =>
    set("unions", patch === null ? p.unions.filter((_, j) => j !== i) : p.unions.map((u, j) => (j === i ? { ...u, ...patch } : u)));
  const setEvent = (i: number, patch: Partial<LifeEvent> | null) =>
    set("events", patch === null ? p.events.filter((_, j) => j !== i) : p.events.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const save = (force: boolean) => {
    if (!p.firstName.trim()) {
      toast.error("Podaj imię");
      setStep(0);
      return;
    }
    const clean: Person = {
      ...p,
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      parents: p.parents.filter((l) => l.personId),
      unions: p.unions.filter((u) => u.partnerId),
      events: p.events.filter((e) => e.date || e.placeId || e.description || e.type !== "birth"),
    };
    if (!force) {
      const w = validatePerson(clean, data);
      if (isNew) {
        const d = findDuplicates(clean, data);
        if (d.length) w.unshift(`Możliwy duplikat: ${d.map((x) => `${fullName(x)} ${lifeSpan(x)}`).join(", ")}`);
      }
      if (w.length) {
        setWarnings(w);
        return;
      }
    }
    // move unions stored on partners into this person
    const partnerIds = new Set(clean.unions.map((u) => u.partnerId));
    const touched = data.people
      .filter((o) => o.id !== clean.id && o.unions.some((u) => u.partnerId === clean.id))
      .map((o) => ({ ...o, unions: o.unions.filter((u) => u.partnerId !== clean.id || !partnerIds.has(o.id)) }))
      .map((o) => ({ ...o, unions: o.unions.filter((u) => u.partnerId !== clean.id) }));
    upsertPeople([...touched, clean]);
    toast.success(isNew ? "Dodano osobę" : "Zapisano zmiany");
    navigate({ to: "/osoba/$id", params: { id: clean.id } });
  };

  const sections = [
    // 0: basic
    <section key="0" className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Dane osobowe</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię *">
          <Input className="h-11" value={p.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus={!isMobile} />
        </Field>
        <Field label="Drugie imiona">
          <Input className="h-11" value={p.middleNames ?? ""} onChange={(e) => set("middleNames", e.target.value || undefined)} />
        </Field>
        <Field label="Nazwisko">
          <Input className="h-11" value={p.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Nazwisko rodowe">
          <Input className="h-11" value={p.maidenName ?? ""} onChange={(e) => set("maidenName", e.target.value || undefined)} />
        </Field>
        <Field label="Płeć">
          <select className={selectCls} value={p.gender} onChange={(e) => set("gender", e.target.value as Person["gender"])}>
            <option value="unknown">nieznana</option>
            <option value="m">mężczyzna</option>
            <option value="f">kobieta</option>
            <option value="other">inna</option>
          </select>
        </Field>
        <Field label="Warianty imienia / nazwiska" hint="Oddziel przecinkami">
          <Input
            className="h-11"
            value={p.nameVariants.join(", ")}
            onChange={(e) => set("nameVariants", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <Switch checked={p.living} onCheckedChange={(v) => set("living", v)} />
        <span className="font-semibold">Osoba żyje</span>
      </label>
    </section>,

    // 1: family
    <section key="1" className="space-y-6">
      <div className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Rodzice</h2>
        {p.parents.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <PersonPicker value={l.personId || undefined} onChange={(id) => setParent(i, { personId: id ?? "" })} exclude={exclude} placeholder="Wybierz rodzica…" />
            <select className={selectCls} value={l.type} onChange={(e) => setParent(i, { type: e.target.value as ParentLink["type"] })} aria-label="Rodzaj rodzicielstwa">
              {Object.entries(PARENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Usuń rodzica" onClick={() => setParent(i, null)}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {p.parents.length < 4 && (
          <Button type="button" variant="outline" onClick={() => set("parents", [...p.parents, { personId: "", type: "biological" }])}>
            <Plus /> Dodaj rodzica
          </Button>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Partnerzy / małżonkowie</h2>
        {p.unions.map((u, i) => (
          <div key={u.id} className="space-y-2 rounded-xl border p-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <PersonPicker value={u.partnerId || undefined} onChange={(id) => setUnion(i, { partnerId: id ?? "" })} exclude={exclude} placeholder="Wybierz partnera…" />
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Usuń związek" onClick={() => setUnion(i, null)}>
                <Trash2 />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className={selectCls} value={u.type} onChange={(e) => setUnion(i, { type: e.target.value as Union["type"] })} aria-label="Rodzaj związku">
                <option value="marriage">małżeństwo</option>
                <option value="partnership">związek partnerski</option>
                <option value="other">inny</option>
              </select>
              <select className={selectCls} value={u.status} onChange={(e) => setUnion(i, { status: e.target.value as Union["status"] })} aria-label="Status">
                <option value="married">trwa</option>
                <option value="divorced">rozwód</option>
                <option value="widowed">owdowienie</option>
                <option value="unknown">nieznany</option>
              </select>
            </div>
            <Field label="Data zawarcia">
              <DateInput value={u.startDate} onChange={(d) => setUnion(i, { startDate: d })} />
            </Field>
            <Field label="Miejsce">
              <PlacePicker value={u.placeId} onChange={(id) => setUnion(i, { placeId: id })} />
            </Field>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => set("unions", [...p.unions, { id: uid(), partnerId: "", type: "marriage", status: "married" }])}
        >
          <Plus /> Dodaj partnera
        </Button>
      </div>
    </section>,

    // 2: events
    <section key="2" className="space-y-3">
      <h2 className="font-serif text-xl font-semibold">Wydarzenia</h2>
      {p.events.map((e, i) => (
        <div key={e.id} className="space-y-2 rounded-xl border p-3">
          <div className="flex gap-2">
            <select className={selectCls} value={e.type} onChange={(ev) => setEvent(i, { type: ev.target.value as LifeEvent["type"] })} aria-label="Rodzaj wydarzenia">
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABELS[t]}
                </option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Usuń wydarzenie" onClick={() => setEvent(i, null)}>
              <Trash2 />
            </Button>
          </div>
          <Field label="Data">
            <DateInput value={e.date} onChange={(d) => setEvent(i, { date: d })} />
          </Field>
          <Field label="Miejsce">
            <PlacePicker value={e.placeId} onChange={(id) => setEvent(i, { placeId: id })} />
          </Field>
          <Field label="Opis">
            <Input className="h-11" value={e.description ?? ""} onChange={(ev) => setEvent(i, { description: ev.target.value || undefined })} />
          </Field>
          <SourcesPicker
            sources={data.sources}
            value={e.sourceIds}
            onChange={(ids) => setEvent(i, { sourceIds: ids })}
            onAdd={(s) => {
              upsertSource(s);
              setEvent(i, { sourceIds: [...e.sourceIds, s.id] });
            }}
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => set("events", [...p.events, { id: uid(), type: "residence", sourceIds: [] }])}>
        <Plus /> Dodaj wydarzenie
      </Button>
    </section>,

    // 3: more
    <section key="3" className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Więcej</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Zawód">
          <Input className="h-11" value={p.occupation ?? ""} onChange={(e) => set("occupation", e.target.value || undefined)} />
        </Field>
        <Field label="Wyznanie">
          <Input className="h-11" value={p.religion ?? ""} onChange={(e) => set("religion", e.target.value || undefined)} />
        </Field>
      </div>
      <Field label="Notatki">
        <Textarea rows={5} value={p.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <div className="space-y-2">
        <span className="text-sm font-semibold">Zdjęcia</span>
        <div className="flex flex-wrap gap-2">
          {p.photos.map((ph, i) => (
            <div key={i} className="relative">
              <img src={ph.src} alt={ph.caption} className="size-20 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Usuń zdjęcie"
                className="absolute -right-2 -top-2 rounded-full border bg-card p-1"
                onClick={() => set("photos", p.photos.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted">
            <Plus />
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set("photos", [...p.photos, { src: await resizeImage(f), caption: "" }]);
              }}
            />
          </label>
        </div>
      </div>
      <div className="space-y-2 rounded-xl border p-3">
        <span className="text-sm font-semibold">Grób</span>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input className="h-11" placeholder="Cmentarz" value={p.grave?.cemetery ?? ""} onChange={(e) => set("grave", { cemetery: e.target.value, plot: p.grave?.plot ?? "", placeId: p.grave?.placeId })} />
          <Input className="h-11" placeholder="Kwatera / rząd / miejsce" value={p.grave?.plot ?? ""} onChange={(e) => set("grave", { cemetery: p.grave?.cemetery ?? "", plot: e.target.value, placeId: p.grave?.placeId })} />
        </div>
        <PlacePicker value={p.grave?.placeId} onChange={(id) => set("grave", { cemetery: p.grave?.cemetery ?? "", plot: p.grave?.plot ?? "", placeId: id })} />
      </div>
    </section>,
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 pb-32 md:pb-10">
      <h1 className="mb-4 font-serif text-2xl font-semibold">{isNew ? "Nowa osoba" : `Edycja: ${fullName(initial)}`}</h1>
      {isMobile && (
        <ol className="mb-4 flex gap-1" aria-label="Kroki">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`w-full rounded-lg py-2 text-xs font-semibold ${i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                aria-current={i === step ? "step" : undefined}
              >
                {s}
              </button>
            </li>
          ))}
        </ol>
      )}
      <form
        className="space-y-8 rounded-2xl border bg-card p-4 shadow-card md:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        {isMobile ? sections[step] : sections}

        {warnings && (
          <div className="space-y-2 rounded-xl border border-honey bg-accent p-3 text-sm" role="alert">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 text-honey" /> Sprawdź przed zapisem
            </div>
            <ul className="list-disc pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => save(true)}>
              Zapisz mimo to
            </Button>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => (isMobile && step > 0 ? setStep(step - 1) : history.back())}>
            {isMobile && step > 0 ? "Wstecz" : "Anuluj"}
          </Button>
          <div className="flex gap-2">
            {isMobile && step < STEPS.length - 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step + 1)}>
                Dalej
              </Button>
            )}
            <Button type="submit" size="lg">
              Zapisz
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SourcesPicker({
  sources,
  value,
  onChange,
  onAdd,
}: {
  sources: Source[];
  value: string[];
  onChange: (ids: string[]) => void;
  onAdd: (s: Source) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<Source["type"]>("parish_book");
  const [citation, setCitation] = useState("");
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold">Źródła</span>
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => {
          const on = value.includes(s.id);
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id])}
              className={`min-h-9 rounded-full border px-3 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
              aria-pressed={on}
            >
              {s.citation.slice(0, 40)}
            </button>
          );
        })}
        <button type="button" onClick={() => setAdding(!adding)} className="min-h-9 rounded-full border border-dashed px-3 text-xs text-primary">
          + nowe źródło
        </button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-2">
          <select className={`${selectCls} w-44`} value={type} onChange={(e) => setType(e.target.value as Source["type"])}>
            {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Input className="h-11 flex-1" placeholder="Opis / sygnatura" value={citation} onChange={(e) => setCitation(e.target.value)} />
          <Button
            type="button"
            onClick={() => {
              if (!citation.trim()) return;
              onAdd({ id: uid(), type, citation: citation.trim() });
              setCitation("");
              setAdding(false);
            }}
          >
            Dodaj
          </Button>
        </div>
      )}
    </div>
  );
}
