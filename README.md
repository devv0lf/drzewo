# 🌳 Drzewo Rodzinne (Family Tree)

Nowoczesna, w pełni responsywna aplikacja internetowa do tworzenia, badania i wizualizacji drzew genealogicznych. Zapewnia bezpieczne przechowywanie danych w chmurze (Supabase) z izolacją użytkowników (Row Level Security), automatyczną synchronizację, generowanie kopii zapasowych oraz eksport do standardu branżowego GEDCOM.

---

## ✨ Kluczowe funkcje

### 1. Wizualizacja i nawigacja drzewa
* **Interaktywne drzewo powiązań:** Czytelny podgląd pokoleń, małżonków i linii potomków z płynnym powiększaniem (zoom) i przesuwaniem (pan).
* **Inteligentne wyszukiwanie (Fuzzy Search):** Błyskawiczne odnajdywanie osób po imieniu, nazwisku, dacie czy miejscu urodzenia dzięki silnikowi Fuse.js.
* **Obliczanie stopni pokrewieństwa:** Automatyczna analiza relacji rodzinnych między wybranymi członkami rodziny.

### 2. Zarządzanie profilami i multimedia
* **Szczegółowe profile osób:** Rejestracja dat i miejsc (urodzenia, ślubu, zgonu), notatek biograficznych oraz relacji rodzicielskich i partnerskich.
* **Optymalizacja zdjęć w przeglądarce:** Zdjęcia profilowe są automatycznie skalowane i kompresowane (JPEG max 480 px) bezpośrednio w przeglądarce przed zapisem, co eliminuje obciążenie transferu.

### 3. Moduły analityczne i geograficzne
* **🗺️ Mapa migracji (Leaflet):** Geograficzna wizualizacja miejsc urodzenia, ślubów i zgonów przodków na interaktywnej mapie.
* **⏳ Oś czasu:** Chronologiczny rejestr kluczowych wydarzeń w historii całego rodu.
* **📊 Statystyki i metryki (Recharts):** Średnia długość życia, rozkład płci, najpopularniejsze imiona i rozpiętość pokoleniowa.

### 4. Bezpieczeństwo i kopie zapasowe
* **Baza danych w chmurze (Supabase):** Dostęp do własnego drzewa z dowolnego urządzenia po zalogowaniu.
* **Row Level Security (RLS):** Dane osobowe każdego użytkownika są odizolowane na poziomie silnika PostgreSQL — żaden inny użytkownik nie ma do nich dostępu.
* **Wersjonowanie i historia:** Do 30 migawek (punktów przywracania) z ochroną przed równoległym nadpisaniem danych (`revision check`).
* **Import i eksport:** Pełna interoperacyjność z formatami **JSON**, **YAML** oraz standardem genealogicznym **GEDCOM 5.5.1**.

### 5. Nowoczesny interfejs i dostępność
* **Autorska paleta barw:** Elegancka kolorystyka oparta na odcieniach szałwii, grafitu i mięty (`#C1EDCC`, `#B0C0BC`, `#A7A7A9`, `#797270`, `#453F3C`).
* **Wsparcie dla Dark Mode:** Płynne przełączanie między motywem jasnym i ciemnym.
* **Responsywność i PWA:** Wygodna obsługa na smartfonach, tabletach i komputerach stacjonarnych.

---

## 🛠️ Architektura i technologie

* **Frontend:** [React 19](https://react.dev/), [TanStack Start v1](https://tanstack.com/start) / [TanStack Router](https://tanstack.com/router)
* **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
* **Backend & Baza danych:** [Supabase](https://supabase.com/) (PostgreSQL z RLS, Supabase Auth)
* **Walidacja danych:** [Zod](https://zod.dev/) (ścisłe schematy `FamilyDataSchema` + wbudowane migracje wstecznej kompatybilności)
* **Wizualizacja danych:** [Leaflet](https://leafletjs.com/) (mapy), [Recharts](https://recharts.org/) (wykresy)
* **Narzędzia budowania:** [Vite 8](https://vitejs.dev/), [Nitro](https://nitro.unjs.io/)

---

## 📂 Struktura katalogów

```text
├── public/                 # Statyczne zasoby (favicon, logo, manifest PWA)
├── src/
│   ├── assets/             # Grafiki i assety aplikacji
│   ├── components/         # Komponenty interfejsu użytkownika
│   │   ├── form/           # Formularze edycji osób i relacji
│   │   ├── ui/             # Komponenty bazowe (shadcn/ui)
│   │   ├── AuthGate.tsx    # Bramka logowania i autoryzacji sesji
│   │   ├── LazyMap.tsx     # Bezpieczne ładowanie mapy (SSR-safe)
│   │   ├── LeafletMap.tsx  # Implementacja mapy migracji
│   │   └── TreeView.tsx    # Silnik rysowania drzewa genealogicznego
│   ├── integrations/       # Klient i typy Supabase
│   ├── lib/                # Logika domenowa (modele, walidacja, relacje, GEDCOM)
│   ├── routes/             # Strony i routing (TanStack Router)
│   │   ├── index.tsx       # Widok główny drzewa
│   │   ├── mapa.tsx        # Widok mapy
│   │   ├── os-czasu.tsx    # Widok osi czasu
│   │   ├── statystyki.tsx  # Widok statystyk
│   │   └── ustawienia.tsx  # Import/eksport, kopie zapasowe, preferencje
│   ├── storage.ts          # Centralny moduł zapisu/odczytu (Supabase + RLS)
│   └── store.ts            # Stan aplikacji (Zustand)
```

---

## 🚀 Uruchomienie lokalne

### Wymagania wstępne
* **Node.js** w wersji 20+ lub **Bun**
* Konto w **Supabase** (z utworzonym projektem)

### 1. Klonowanie repozytorium
```bash
git clone https://github.com/twoj-uzytkownik/drzewo-rodzinne.git
cd drzewo-rodzinne
```

### 2. Instalacja zależności
```bash
npm install
```

### 3. Konfiguracja zmiennych środowiskowych
Utwórz plik `.env` w katalogu głównym:
```env
VITE_SUPABASE_URL="https://twoj-projekt.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="twoj-klucz-anon-publishable"
```

### 4. Uruchomienie serwera deweloperskiego
```bash
npm run dev
```
Aplikacja uruchomi się domyślnie pod adresem `http://localhost:8080`.

### 5. Budowanie wersji produkcyjnej
```bash
npm run build
npm run preview
```

---

## 🔒 Schemat bazy danych (Supabase SQL)

Do działania bazy wymagane są poniższe tabele z włączonym RLS:

```sql
-- Tabela głównego drzewa
CREATE TABLE public.family_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT family_trees_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.family_trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dostęp tylko dla właściciela" ON public.family_trees
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabela kopii zapasowych
CREATE TABLE public.family_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dostęp do kopii tylko dla właściciela" ON public.family_backups
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 📄 Licencja

Projekt prywatny / na własny użytek genealogiczny.
