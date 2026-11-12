// Town and city search from Open-Meteo's free geocoding service, used for golden-hour times.

import type { Place } from "./model";

export async function searchPlaces(query: string): Promise<Place[]> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en`);
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: { name: string; latitude: number; longitude: number; admin1?: string; country_code?: string }[] };
  return (json.results ?? []).map((r) => ({
    name: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country_code].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}
