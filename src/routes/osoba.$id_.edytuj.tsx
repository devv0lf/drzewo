import { createFileRoute, Link } from "@tanstack/react-router";
import { PersonForm } from "@/components/form/PersonForm";
import { useStore } from "@/store";

export const Route = createFileRoute("/osoba/$id_/edytuj")({
  head: () => ({
    meta: [
      { title: "Edycja osoby — Drzewo rodzinne" },
      { name: "description", content: "Edytuj dane osoby w drzewie rodzinnym." },
      { property: "og:title", content: "Edycja osoby — Drzewo rodzinne" },
      { property: "og:description", content: "Edytuj dane osoby w drzewie rodzinnym." },
    ],
  }),
  component: EditPerson,
});

function EditPerson() {
  const { id } = Route.useParams();
  const loaded = useStore((s) => s.loaded);
  const person = useStore((s) => s.data.people.find((p) => p.id === id));
  if (!loaded) return null;
  if (!person)
    return (
      <p className="p-6">
        Nie znaleziono osoby. <Link to="/" className="text-primary underline">Wróć</Link>
      </p>
    );
  return <PersonForm key={person.id} initial={person} isNew={false} />;
}
