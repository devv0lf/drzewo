// Browser-only: import via React.lazy behind <ClientOnly>.
import L from "leaflet";
import { useEffect, useRef } from "react";

export interface MapMarker {
  lat: number;
  lng: number;
  /** CSS variable name, e.g. "--paternal" */
  colorVar: string;
  title: string;
  key: string;
}
export interface MapLine {
  points: [number, number][];
  colorVar: string;
}

function cssColor(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#C2683F";
}

export default function LeafletMap({
  markers,
  lines = [],
  onMarkerClick,
  heat = false,
  className = "h-full w-full",
}: {
  markers: MapMarker[];
  lines?: MapLine[];
  onMarkerClick?: (key: string) => void;
  heat?: boolean;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([51.9, 19.1], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors",
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const ln of lines) {
      if (ln.points.length < 2) continue;
      L.polyline(ln.points, { color: cssColor(ln.colorVar), weight: 2.5, opacity: 0.75, dashArray: "6 6" }).addTo(g);
    }
    // group markers at the same spot so a single click lists everyone
    const grouped = new Map<string, MapMarker[]>();
    for (const mk of markers) {
      const k = `${mk.lat.toFixed(4)},${mk.lng.toFixed(4)},${mk.colorVar}`;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(mk);
    }
    for (const list of grouped.values()) {
      const mk = list[0];
      const n = list.length;
      const color = cssColor(mk.colorVar);
      if (heat) {
        L.circle([mk.lat, mk.lng], { radius: 6000 + n * 6000, stroke: false, fillColor: color, fillOpacity: 0.25 }).addTo(g);
        continue;
      }
      const c = L.circleMarker([mk.lat, mk.lng], {
        radius: 7 + Math.min(n, 8) * 1.5,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }).addTo(g);
      const div = document.createElement("div");
      div.style.fontFamily = "Nunito, sans-serif";
      for (const x of list) {
        const b = document.createElement("button");
        b.textContent = x.title;
        b.style.cssText = "display:block;padding:6px 2px;text-align:left;width:100%;min-height:32px;cursor:pointer";
        b.onclick = () => clickRef.current?.(x.key);
        div.appendChild(b);
      }
      c.bindPopup(div);
      c.bindTooltip(n > 1 ? `${n} osób` : mk.title);
    }
    if (!fitted.current && markers.length) {
      const b = L.latLngBounds(markers.map((x) => [x.lat, x.lng] as [number, number]));
      m.fitBounds(b, { padding: [30, 30], maxZoom: 9 });
      fitted.current = true;
    }
  }, [markers, lines, heat]);

  return <div ref={el} className={className} />;
}
