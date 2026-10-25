import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, type ComponentProps } from "react";

const LeafletMap = lazy(() => import("./LeafletMap"));
export type { MapMarker, MapLine } from "./mapTypes";

export function LazyMap(props: ComponentProps<typeof LeafletMap>) {
  const fallback = <div className="h-full w-full animate-pulse rounded-xl bg-muted" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LeafletMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
