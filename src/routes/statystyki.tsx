import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { computeStats, onThisDay, toResearch } from "@/lib/stats";
import { formatDate, lifeSpan } from "@/lib/dates";
import { EVENT_LABELS } from "@/lib/model";
import { fullName } from "@/lib/relations";
import { useStore } from "@/store";

export const Route = createFileRoute("/statystyki")({
  head: () => ({
    meta: [
      { title: "Statystyki — Drzewo rodzinne" },
      { name: "description", content: "Nazwiska, długość życia, pokolenia i lista rzeczy do zbadania." },
      { property: "og:title", content: "Statystyki rodziny" },
      { property: "og:description", content: "Liczby i ciekawostki o Twojej rodzinie." },
    ],
  }),
  component: StatsPage,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <h2 className="mb-3 font-serif text-lg font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

function StatsPage() {
  const data = useStore((s) => s.data);
  const meId = useStore((s) => s.settings.meId);
  const s = useMemo(() => computeStats(data, meId), [data, meId]);
  const research = useMemo(() => toResearch(data), [data]);
  const today = useMemo(() => onThisDay(data), [data]);
  const maxSurname = s.surnames[0]?.[1] ?? 1;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-28">
      <h1 className="font-serif text-2xl font-semibold">Statystyki</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Osoby", s.total],
          ["Żyjące", s.living],
          ["Średnia długość życia", s.avgLifespan ? `${s.avgLifespan} lat` : "—"],
          ["Miejsca", s.places],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="font-serif text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Dziś w historii rodziny">
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">Dziś nie przypada żadna rocznica.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {today.map(({ person, event }) => (
                <li key={event.id}>
                  <Link to="/osoba/$id" params={{ id: person.id }} className="font-semibold hover:text-primary">{fullName(person)}</Link> — {EVENT_LABELS[event.type].toLowerCase()}, {formatDate(event.date)}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Najczęstsze nazwiska">
          <ul className="space-y-2 text-sm">
            {s.surnames.map(([n, c]) => (
              <li key={n} className="flex items-center gap-2">
                <span className="w-28 truncate">{n}</span>
                <span className="h-3 rounded-full bg-primary" style={{ width: `${(c / maxSurname) * 60}%` }} />
                <span className="text-muted-foreground">{c}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Najstarszy przodek">
          {s.oldest ? (
            <Link to="/osoba/$id" params={{ id: s.oldest.id }} className="font-semibold hover:text-primary">
              {fullName(s.oldest)} <span className="font-normal text-muted-foreground">{lifeSpan(s.oldest)}</span>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Brak dat urodzenia.</p>
          )}
        </Card>
        <Card title="Przodkowie w pokoleniach">
          {s.perGeneration.length === 0 ? (
            <p className="text-sm text-muted-foreground">Wybierz siebie w ustawieniach, aby zobaczyć pokolenia.</p>
          ) : (
            <ul className="text-sm">
              {s.perGeneration.map(([g, c]) => (
                <li key={g}>
                  {g}. pokolenie wstecz: <b>{c}</b> z {2 ** g} możliwych
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title={`Do zbadania (${research.length})`}>
        <ul className="divide-y text-sm">
          {research.map(({ person, missing }) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link to="/osoba/$id/edytuj" params={{ id: person.id }} className="font-semibold hover:text-primary">{fullName(person)}</Link>
              <span className="flex flex-wrap gap-1">
                {missing.map((m) => (
                  <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">brak: {m}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
