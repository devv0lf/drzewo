# Drzewo rodzinne – plan

Warm, mobile-first Polish family tree app. Data stays in the browser (no login, no backend). Built in the spec's order; this plan covers the whole spec, delivered in phases. Phases 1–3 come first so you get a working app quickly, then 4–7.

## Phase 1 – Foundation
- Warm album theme: off-white #FBF6EE, terracotta #C2683F, olive #7A8450, honey #E0A44A, brown text, plus deep-brown dark mode. Lora headings, Nunito body, 12px corners, 44px touch targets.
- Navigation: bottom bar on mobile, top bar on desktop (Drzewo | Mapa | Oś czasu | Statystyki | Ustawienia) and a floating "+" button.
- Data model with validation (people, places, sources, events, unions, parents with types), schemaVersion, revision and migrations.
- One storage module (`load`/`save`): browser storage now, easy to swap for a PHP endpoint later. Autosave, "ostatni zapis" indicator, 30 timestamped backups.
- Demo family: ~15 people, 4 generations, Polish places, one emigration, one adoption, approximate dates. "Wyczyść dane demo" button.

## Phase 2 – Tree view (home)
- Graph layout (two parents, spouses side by side), pan/zoom with touch and wheel, fit-to-screen, minimap.
- Focus mode (3 up / 2 down, configurable), click to re-center, collapse/expand.
- Modes: ancestors, descendants, hourglass; paternal/maternal branch colours.
- Person cards: photo/initial, name, years, living marker. "Skocz do osoby" fuzzy search (maiden names, variants).

## Phase 3 – Person panel and forms
- Side panel on desktop, bottom sheet on mobile, with deep link per person. All data: timeline, residences, relatives (incl. half-siblings) as links, notes, sources, photos, grave, mini-map, Geneteka/Archiwa search buttons.
- Add/edit: steps on mobile, single page on desktop; searchable parent/partner pickers with inline "nowa osoba"; partial/approximate dates with qualifiers; repeatable events; place autocomplete (geocoding only on confirm, max 1 request/s, coordinates saved); sources picker.
- Warnings (with override): child older than parent, parent age, death before birth, ancestor cycles. Duplicate detection. Delete with confirmation and undo.

## Phase 4 – Map
- OpenStreetMap map with clustering; birth/residence/grave markers in three colours; marker → person list → panel.
- Filters (person, surname, event type, years), migration lines with time slider and play, heatmap, historical place names.

## Phase 5 – Timeline, stats, relationships
- Family timeline with optional historical backdrop (WW1, WW2, border changes).
- Statistics, "Do zbadania" list, "Dziś w historii rodziny".
- Relationship calculator "Kim jest dla mnie ta osoba?" based on the "ja" person from settings.

## Phase 6 – Import/export and settings
- JSON (main) and YAML import/export with clear error messages pointing to the failing field; GEDCOM 5.5.1 import and export.
- Backup restore screen, clear all data, privacy mode (living people shown as initials, no photos).

## Phase 7 – Finish
- Installable app with offline support (works only in the published app, not the editor preview).
- Fan chart and print layout, tree export to PNG/PDF.
- Performance pass with a generated 1000+ person tree (canvas rendering above 1000 visible cards).

## Technical notes
- The project's framework is TanStack Start, so routing uses TanStack Router instead of react-router; deep links stay the same: `/`, `/osoba/$id`, `/mapa`, `/os-czasu`, `/statystyki`, `/ustawienia`, `/kopie`.
- Libraries: zod, zustand, d3-zoom + dagre-style layout (custom layered layout for two-parent graphs), leaflet + markercluster + leaflet.heat (loaded only in the browser), js-yaml, fuse.js, html-to-image + jspdf, vite-plugin-pwa (guarded so it never registers in preview).
- All logic (relationships, validation, layout, GEDCOM, migrations) lives in `src/lib`, with unit tests for validation rules, relationship calculator, migrations and GEDCOM round-trip.
- All storage access only via `src/storage.ts`; data is loaded in the browser after page load to avoid server/browser mismatches.
