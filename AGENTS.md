<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All persistence goes only through `src/storage.ts` (load/save/backups) so it can be swapped for a server API without touching UI.
- Domain logic (relationships, validation, layout, GEDCOM/YAML, migrations, stats) lives in `src/lib`; UI components stay presentational.
- Leaflet is imported only in `src/components/LeafletMap.tsx`, loaded via `LazyMap` (React.lazy + ClientOnly) because it touches `window` at import.
- Store data is loaded in the browser in `__root` useEffect; views render a placeholder until `loaded` to avoid hydration mismatches.
