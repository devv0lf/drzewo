import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PersonForm, blankPerson } from "@/components/form/PersonForm";
import { useStore } from "@/store";

export const Route = createFileRoute("/osoba/nowa")({
  head: () => ({
    meta: [
      { title: "Dodaj osobę — Drzewo rodzinne" },
      { name: "description", content: "Dodaj nową osobę do drzewa rodzinnego." },
      { property: "og:title", content: "Dodaj osobę — Drzewo rodzinne" },
      { property: "og:description", content: "Dodaj nową osobę do drzewa rodzinnego." },
    ],
  }),
  component: NewPerson,
});

function NewPerson() {
  const loaded = useStore((s) => s.loaded);
  const [initial] = useState(blankPerson);
  if (!loaded) return null;
  return <PersonForm initial={initial} isNew />;
}
