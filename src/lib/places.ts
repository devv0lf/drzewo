import type { Place } from "./model";

/** Name valid at a given date (historical name if one covers that year). */
export function placeNameAt(p: Place, date?: string): string {
  if (!date) return p.name;
  const y = parseInt(date.slice(0, 4));
  const h = p.historicalNames.find((n) => (!n.from || parseInt(n.from) <= y) && (!n.to || y <= parseInt(n.to)));
  return h ? `${h.name} (dziś ${p.name})` : p.name;
}

export interface GeoResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  country: string;
}

let lastCall = 0;
/** Nominatim search, throttled to max 1 request/second. Only call on explicit user action. */
export async function geocode(q: string): Promise<GeoResult[]> {
  const wait = Math.max(0, lastCall + 1100 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=pl&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Wyszukiwarka miejsc jest niedostępna");
  const json = (await res.json()) as {
    name: string;
    display_name: string;
    lat: string;
    lon: string;
    address?: { country?: string };
  }[];
  return json.map((r) => ({
    name: r.name || r.display_name.split(",")[0],
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    country: r.address?.country ?? "",
  }));
}
