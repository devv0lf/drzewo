import { Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { Children, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatDate, lifeSpan, sortEvents } from "@/lib/dates";
import { EVENT_LABELS, PARENT_TYPE_LABELS, SOURCE_TYPE_LABELS, type Person } from "@/lib/model";
import { childrenOf, fullName, indexPeople, partnersOf, relationship, siblingsOf } from "@/lib/relations";
import { placeNameAt } from "@/lib/places";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LazyMap } from "./LazyMap";

export function PersonPanel({ person, onClose }: { person: Person; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const settings = useStore((s) => s.settings);
  const deletePerson = useStore((s) => s.deletePerson);
  const undo = useStore((s) => s.undo);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const privacy = settings.privacy && person.living;

  const idx = useMemo(() => indexPeople(data), [data]);
  const places = useMemo(() => new Map(data.places.map((p) => [p.id, p])), [data.places]);
  const sources = useMemo(() => new Map(data.sources.map((s) => [s.id, s])), [data.sources]);
  const events = sortEvents(person.events);
  const residences = events.filter((e) => ["birth", "residence", "emigration"].includes(e.type) && e.placeId);
  const children = childrenOf(person.id, data);
  const partners = partnersOf(person, data);
  const sibs = siblingsOf(person, data);
  const rel = settings.meId ? relationship(settings.meId, person.id, data) : null;
  const birthPlace = events.find((e) => e.type === "birth")?.placeId;
  const birthPlaceName = birthPlace ? places.get(birthPlace)?.name : "";

  const route = residences.map((e) => places.get(e.placeId!)).filter((p): p is NonNullable<typeof p> => !!p);
  const mapMarkers = useMemo(
    () =>
      route.map((p, i) => ({
        lat: p.lat,
        lng: p.lng,
        colorVar: i === 0 ? "--paternal" : "--maternal",
        title: p.name,
        key: `${p.id}-${i}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [person.id, data.places, person.events],
  );
  const mapLines = useMemo(() => [{ points: route.map((p) => [p.lat, p.lng] as [number, number]), colorVar: "--primary" }], [mapMarkers]); // eslint-disable-line react-hooks/exhaustive-deps
  const allSourceIds = [...new Set(person.events.flatMap((e) => e.sourceIds))];

  const PersonLink = ({ p, note }: { p: Person; note?: string }) => (
    <li>
      <Link
        to="/osoba/$id"
        params={{ id: p.id }}
        className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 hover:bg-accent"
      >
        <span className="font-semibold">{fullName(p, settings.privacy)}</span>
        <span className="text-xs text-muted-foreground">
          {note && <span className="mr-2 rounded bg-muted px-1.5 py-0.5">{note}</span>}
          {settings.privacy && p.living ? "" : lifeSpan(p)}
        </span>
      </Link>
    </li>
  );

  return (
    <aside
      className="no-print fixed inset-x-0 bottom-0 z-40 flex max-h-[78dvh] flex-col rounded-t-2xl border bg-card shadow-card animate-in slide-in-from-bottom duration-300 md:absolute md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-2xl md:slide-in-from-right"
      aria-label={`Dane osoby: ${fullName(person, settings.privacy)}`}
    >
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border md:hidden" aria-hidden />
      <div className="flex items-start gap-3 border-b p-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-serif text-2xl text-primary-foreground">
          {!privacy && person.photos[0] ? <img src={person.photos[0].src} alt="" className="size-full object-cover" /> : person.firstName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl font-semibold leading-tight">{fullName(person, settings.privacy)}</h2>
          {!privacy && person.maidenName && <p className="text-sm text-muted-foreground">z domu {person.maidenName}</p>}
          <p className="text-sm text-muted-foreground">
            {privacy ? "osoba żyjąca" : lifeSpan(person)} {person.living && !privacy && "· żyje"}
          </p>
          {rel && <p className="mt-1 inline-block rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-primary">{rel}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Edytuj" onClick={() => navigate({ to: "/osoba/$id/edytuj", params: { id: person.id } })}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Zamknij" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 text-sm">
        {!privacy && (
          <>
            <Section title="Wydarzenia">
              {events.length === 0 && <Empty>Brak wydarzeń. Dodaj datę urodzenia w edycji.</Empty>}
              <ol className="relative space-y-3 border-l-2 border-border pl-4">
                {events.map((e) => {
                  const pl = e.placeId ? places.get(e.placeId) : undefined;
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[23px] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                      <div className="font-semibold">
                        {EVENT_LABELS[e.type]} {e.date && <span className="font-normal text-muted-foreground">· {formatDate(e.date)}</span>}
                      </div>
                      {pl && <div>{placeNameAt(pl, e.date?.value)}</div>}
                      {e.description && <div className="text-muted-foreground">{e.description}</div>}
                      {e.sourceIds.length > 0 && (
                        <div className="text-xs text-muted-foreground">Źródła: {e.sourceIds.map((id) => sources.get(id)?.citation).filter(Boolean).join("; ")}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>

            {route.length > 0 && (
              <Section title="Miejsca życia">
                <ol className="mb-3 space-y-1">
                  {residences.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <span>{placeNameAt(places.get(e.placeId!)!, e.date?.value)}</span>
                      <span className="text-muted-foreground">{formatDate(e.date)}</span>
                    </li>
                  ))}
                </ol>
                <div className="h-48 overflow-hidden rounded-xl border">
                  <LazyMap key={person.id} markers={mapMarkers} lines={mapLines} />
                </div>
              </Section>
            )}
          </>
        )}

        <Section title="Rodzina">
          {person.parents.length + partners.length + children.length + sibs.full.length + sibs.half.length === 0 && (
            <Empty>Brak powiązań rodzinnych.</Empty>
          )}
          <Group label="Rodzice">
            {person.parents.map((l) => {
              const p = idx.get(l.personId);
              return p ? <PersonLink key={p.id} p={p} note={l.type !== "biological" ? PARENT_TYPE_LABELS[l.type] : undefined} /> : null;
            })}
          </Group>
          <Group label="Partnerzy">
            {partners.map((p) => (
              <PersonLink key={p.id} p={p} />
            ))}
          </Group>
          <Group label="Dzieci">
            {children.map((c) => {
              const t = c.parents.find((l) => l.personId === person.id)?.type;
              return <PersonLink key={c.id} p={c} note={t && t !== "biological" ? PARENT_TYPE_LABELS[t] : undefined} />;
            })}
          </Group>
          <Group label="Rodzeństwo">
            {sibs.full.map((p) => (
              <PersonLink key={p.id} p={p} />
            ))}
            {sibs.half.map((p) => (
              <PersonLink key={p.id} p={p} note="przyrodnie" />
            ))}
          </Group>
        </Section>

        {!privacy && (
          <>
            {(person.occupation || person.religion) && (
              <Section title="Informacje">
                {person.occupation && <p>Zawód: {person.occupation}</p>}
                {person.religion && <p>Wyznanie: {person.religion}</p>}
                {person.nameVariants.length > 0 && <p>Warianty imienia: {person.nameVariants.join(", ")}</p>}
              </Section>
            )}
            {person.notes && (
              <Section title="Notatki">
                <p className="whitespace-pre-wrap">{person.notes}</p>
              </Section>
            )}
            {person.photos.length > 0 && (
              <Section title="Zdjęcia">
                <div className="grid grid-cols-3 gap-2">
                  {person.photos.map((ph, i) => (
                    <figure key={i}>
                      <img src={ph.src} alt={ph.caption || "Zdjęcie"} className="aspect-square w-full rounded-lg object-cover" />
                      {ph.caption && <figcaption className="mt-1 text-xs text-muted-foreground">{ph.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </Section>
            )}
            {person.grave && (person.grave.cemetery || person.grave.plot) && (
              <Section title="Grób">
                <p>{person.grave.cemetery}</p>
                <p className="text-muted-foreground">{person.grave.plot}</p>
              </Section>
            )}
            {allSourceIds.length > 0 && (
              <Section title="Źródła">
                <ul className="space-y-1">
                  {allSourceIds.map((id) => {
                    const s = sources.get(id);
                    return s ? (
                      <li key={id}>
                        <span className="text-xs text-muted-foreground">{SOURCE_TYPE_LABELS[s.type]}:</span> {s.citation}
                      </li>
                    ) : null;
                  })}
                </ul>
              </Section>
            )}
          </>
        )}

        <Section title="Szukaj w archiwach">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a
                href={`https://geneteka.genealodzy.pl/index.php?op=gt&lang=pol&w=&rid=B&search_lastname=${encodeURIComponent(person.maidenName || person.lastName)}&search_name=${encodeURIComponent(person.firstName)}`}
                target="_blank"
                rel="noreferrer"
              >
                Szukaj w Geneteka <ExternalLink />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://www.szukajwarchiwach.gov.pl/wyszukiwarka?q=${encodeURIComponent([person.maidenName || person.lastName, birthPlaceName].filter(Boolean).join(" "))}`}
                target="_blank"
                rel="noreferrer"
              >
                Szukaj w Archiwach <ExternalLink />
              </a>
            </Button>
          </div>
        </Section>

        <Button variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}>
          <Trash2 /> Usuń osobę
        </Button>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć {fullName(person)}?</AlertDialogTitle>
            <AlertDialogDescription>Powiązania z rodziną też zostaną usunięte. Możesz to cofnąć.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deletePerson(person.id);
                onClose();
                toast("Usunięto osobę", { action: { label: "Cofnij", onClick: () => undo() } });
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-serif text-base font-semibold text-primary">{title}</h3>
      {children}
    </section>
  );
}
function Group({ label, children }: { label: string; children: ReactNode }) {
  const items = Children.toArray(children);
  if (!items.length) return null;
  return (
    <div className="mb-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <ul>{items}</ul>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}
