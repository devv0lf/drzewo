import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { birthYear, deathYear } from "@/lib/dates";
import { fullName } from "@/lib/relations";
import { useStore } from "@/store";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/os-czasu")({
  head: () => ({
    meta: [
      { title: "Oś czasu — Drzewo rodzinne" },
      { name: "description", content: "Kto z rodziny żył w tym samym czasie — na tle historii." },
      { property: "og:title", content: "Oś czasu rodziny" },
      { property: "og:description", content: "Życie Twojej rodziny na tle historii." },
    ],
  }),
  component: TimelinePage,
});

const HISTORY = [
  { from: 1914, to: 1918, label: "I wojna światowa" },
  { from: 1918, to: 1918, label: "Odzyskanie niepodległości" },
  { from: 1918, to: 1919, label: "Powstanie wielkopolskie" },
  { from: 1919, to: 1921, label: "Wojna polsko-bolszewicka" },
  { from: 1929, to: 1933, label: "Wielki kryzys" },
  { from: 1939, to: 1945, label: "II wojna światowa" },
  { from: 1944, to: 1944, label: "Powstanie Warszawskie" },
  { from: 1945, to: 1945, label: "Zmiana granic Polski" },
  { from: 1945, to: 1989, label: "PRL" },
  { from: 1956, to: 1956, label: "Poznański Czerwiec" },
  { from: 1968, to: 1968, label: "Marzec ’68" },
  { from: 1970, to: 1970, label: "Grudzień ’70" },
  { from: 1978, to: 1978, label: "Jan Paweł II papieżem" },
  { from: 1980, to: 1980, label: "Sierpień ’80 / Solidarność" },
  { from: 1981, to: 1983, label: "Stan wojenny" },
  { from: 1986, to: 1986, label: "Czarnobyl" },
  { from: 1989, to: 1989, label: "Upadek komunizmu" },
  { from: 1990, to: 1990, label: "Plan Balcerowicza" },
  { from: 1997, to: 1997, label: "Powódź tysiąclecia" },
  { from: 1999, to: 1999, label: "Polska w NATO" },
  { from: 2004, to: 2004, label: "Polska w UE" },
  { from: 2005, to: 2005, label: "Śmierć Jana Pawła II" },
  { from: 2007, to: 2007, label: "Schengen" },
  { from: 2010, to: 2010, label: "Smoleńsk" },
  { from: 2010, to: 2010, label: "Powódź 2010" },
  { from: 2020, to: 2022, label: "Pandemia COVID-19" },
  { from: 2022, to: 2022, label: "Wojna w Ukrainie" },
];

function TimelinePage() {
  const people = useStore((s) => s.data.people);
  const privacy = useStore((s) => s.settings.privacy);
  const [backdrop, setBackdrop] = useState(true);
  const now = new Date().getFullYear();

  const rows = useMemo(
    () =>
      people
        .map((p) => {
          const b = birthYear(p);
          if (!b) return null;
          const d = deathYear(p) ?? (p.living ? now : b + 70);
          return { p, b, d, approxEnd: !deathYear(p) && !p.living };
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .sort((a, b) => a.b - b.b),
    [people, now],
  );

  if (!rows.length)
    return <p className="p-6 text-muted-foreground">Dodaj daty urodzenia, aby zobaczyć oś czasu.</p>;

  const start = Math.floor(Math.min(...rows.map((r) => r.b)) / 10) * 10;
  const end = now;
  const span = end - start;
  const pct = (y: number) => `${((y - start) / span) * 100}%`;
  const decades = [];
  for (let y = start; y <= end; y += span > 120 ? 20 : 10) decades.push(y);

  return (
    <div className="mx-auto max-w-6xl p-4 pb-28">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Oś czasu</h1>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={backdrop} onCheckedChange={setBackdrop} /> Tło historyczne
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card p-4 shadow-card">
        <div className="relative min-w-[720px]">
          <div className="relative mb-2 h-6 border-b text-xs text-muted-foreground">
            {decades.map((y) => (
              <span key={y} className="absolute -translate-x-1/2" style={{ left: pct(y) }}>
                {y}
              </span>
            ))}
          </div>
          <div className="relative">
            {backdrop &&
              HISTORY.map((h) => (
                <div
                  key={h.label}
                  className="absolute inset-y-0 border-x border-honey/40 bg-honey/15"
                  style={{ left: pct(h.from), width: `max(2px, ${((h.to - h.from + 1) / span) * 100}%)` }}
                  title={`${h.label} (${h.from}${h.to !== h.from ? `–${h.to}` : ""})`}
                >
                  <span className="absolute -top-0 left-1 whitespace-nowrap text-[10px] font-semibold text-muted-foreground [writing-mode:vertical-rl]">
                    {h.label}
                  </span>
                </div>
              ))}
            <ul className="relative space-y-1.5 py-2">
              {rows.map(({ p, b, d, approxEnd }) => (
                <li key={p.id} className="relative h-8">
                  <Link
                    to="/osoba/$id"
                    params={{ id: p.id }}
                    className={`absolute flex h-8 items-center overflow-hidden whitespace-nowrap rounded-md px-2 text-xs font-semibold text-primary-foreground hover:opacity-90 ${
                      p.gender === "f" ? "bg-secondary" : "bg-primary"
                    } ${approxEnd ? "opacity-60" : ""}`}
                    style={{ left: pct(b), width: pct(start + Math.max(d - b, 1)) }}
                    title={`${fullName(p)} ${b}–${p.living ? "" : d}`}
                  >
                    {fullName(p, privacy)} · {privacy && p.living ? "" : `${b}–${p.living ? "" : d}`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
