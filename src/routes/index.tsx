import { createFileRoute } from "@tanstack/react-router";
import { TreePage } from "@/components/TreePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drzewo rodzinne — Twoja rodzina w jednym miejscu" },
      { name: "description", content: "Interaktywne drzewo genealogiczne: przodkowie, potomkowie, mapa i oś czasu Twojej rodziny." },
      { property: "og:title", content: "Drzewo rodzinne" },
      { property: "og:description", content: "Interaktywne drzewo genealogiczne Twojej rodziny." },
    ],
  }),
  component: () => <TreePage />,
});
