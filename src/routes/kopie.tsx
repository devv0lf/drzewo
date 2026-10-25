import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listBackups, type Backup } from "@/storage";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/kopie")({
  head: () => ({
    meta: [
      { title: "Kopie zapasowe — Drzewo rodzinne" },
      { name: "description", content: "Przywróć wcześniejszą wersję drzewa rodzinnego." },
      { property: "og:title", content: "Kopie zapasowe — Drzewo rodzinne" },
      { property: "og:description", content: "Przywróć wcześniejszą wersję drzewa." },
    ],
  }),
  component: BackupsPage,
});

function BackupsPage() {
  const [list, setList] = useState<Backup[]>([]);
  const replaceAll = useStore((s) => s.replaceAll);
  useEffect(() => {
    void listBackups().then(setList);
  }, []);
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-28">
      <h1 className="font-serif text-2xl font-semibold">Przywróć kopię</h1>
      {list.length === 0 && <p className="text-muted-foreground">Nie ma jeszcze kopii. Powstają automatycznie podczas pracy.</p>}
      <ul className="divide-y rounded-2xl border bg-card shadow-card">
        {list.map((b) => (
          <li key={b.at} className="flex items-center justify-between gap-2 p-3">
            <div>
              <div className="font-semibold">{new Date(b.at).toLocaleString("pl-PL")}</div>
              <div className="text-xs text-muted-foreground">{b.label} · {b.data.people.length} osób</div>
            </div>
            <Button variant="outline" onClick={() => { replaceAll(b.data, "Przed przywróceniem kopii"); toast.success("Przywrócono kopię"); }}>
              Przywróć
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
