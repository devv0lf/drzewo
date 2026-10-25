import { Link, useNavigate } from "@tanstack/react-router";
import { TreeView } from "./TreeView";
import { PersonPanel } from "./PersonPanel";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";

export function TreePage({ personId }: { personId?: string }) {
  const loaded = useStore((s) => s.loaded);
  const data = useStore((s) => s.data);
  const meId = useStore((s) => s.settings.meId);
  const navigate = useNavigate();

  if (!loaded) return <div className="tree-grid h-full w-full animate-pulse" />;

  if (!data.people.length)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-serif text-3xl font-semibold">Twoje drzewo jest jeszcze puste</h1>
        <p className="max-w-sm text-muted-foreground">Zacznij od siebie — potem dodasz rodziców, dziadków i resztę rodziny.</p>
        <Button asChild size="lg">
          <Link to="/osoba/nowa">Dodaj pierwszą osobę</Link>
        </Button>
      </div>
    );

  const selected = personId ? data.people.find((p) => p.id === personId) : undefined;
  const focusId = selected?.id ?? (meId && data.people.some((p) => p.id === meId) ? meId : data.people[0].id);

  return (
    <div className="relative h-full">
      <TreeView focusId={focusId} selectedId={selected?.id} onSelect={(id) => navigate({ to: "/osoba/$id", params: { id } })} />
      {selected && <PersonPanel key={selected.id} person={selected} onClose={() => navigate({ to: "/" })} />}
      {personId && !selected && (
        <div className="absolute inset-x-4 top-20 rounded-xl border bg-card p-4 text-center shadow-card">
          Nie znaleziono tej osoby. <Link to="/" className="text-primary underline">Wróć do drzewa</Link>
        </div>
      )}
    </div>
  );
}
