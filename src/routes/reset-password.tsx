import { createFileRoute } from "@tanstack/react-router";

// Ekran nowego hasła renderuje AuthGate (wykrywa tę ścieżkę); po zapisie wraca na "/".
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nowe hasło — Drzewo rodzinne" },
      { name: "description", content: "Ustaw nowe hasło do swojego drzewa rodzinnego." },
      { property: "og:title", content: "Nowe hasło — Drzewo rodzinne" },
      { property: "og:description", content: "Ustaw nowe hasło do swojego drzewa rodzinnego." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
