import { createFileRoute } from "@tanstack/react-router";
import { TreePage } from "@/components/TreePage";

export const Route = createFileRoute("/osoba/$id")({
  head: () => ({
    meta: [
      { title: "Osoba — Drzewo rodzinne" },
      { name: "description", content: "Wszystkie dane osoby z drzewa rodzinnego: wydarzenia, miejsca i rodzina." },
      { property: "og:title", content: "Osoba — Drzewo rodzinne" },
      { property: "og:description", content: "Dane osoby z drzewa rodzinnego." },
    ],
  }),
  component: PersonRoute,
});

function PersonRoute() {
  const { id } = Route.useParams();
  return <TreePage personId={id} />;
}
