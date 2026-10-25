import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { lifeSpan } from "@/lib/dates";
import type { Person } from "@/lib/model";
import { fullName } from "@/lib/relations";
import { useStore } from "@/store";

export function usePeopleSearch(people: Person[]) {
  return useMemo(
    () =>
      new Fuse(people, {
        keys: ["firstName", "lastName", "maidenName", "middleNames", "nameVariants"],
        threshold: 0.35,
        ignoreDiacritics: true,
      }),
    [people],
  );
}

export function PersonSearch({
  onPick,
  placeholder = "Szukaj osoby…",
  exclude = [],
}: {
  onPick: (id: string) => void;
  placeholder?: string;
  exclude?: string[];
}) {
  const people = useStore((s) => s.data.people);
  const fuse = usePeopleSearch(people);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return fuse
      .search(q.trim())
      .map((r) => r.item)
      .filter((p) => !exclude.includes(p.id))
      .slice(0, 8);
  }, [q, fuse, exclude]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            onPick(results[0].id);
            setQ("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border bg-card pl-9 pr-3 text-sm shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-card" role="listbox">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p.id);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span>
                  {fullName(p)}
                  {p.maidenName && <span className="text-muted-foreground"> z d. {p.maidenName}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{lifeSpan(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
