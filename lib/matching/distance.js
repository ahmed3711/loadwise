import "server-only";
import { lookupPlace, estimateRoadMiles, placeKey } from "./us-places.mjs";

// Deadhead (empty) miles from the truck to each pickup city (FR-06).
//
// With OPENROUTESERVICE_API_KEY set: real truck driving distances from
// the OpenRouteService Matrix API (one request for all pickups).
// Without a key, or if the API fails: straight-line distance x 1.2
// (the fallback rule from the proposal's risk table).

const ORS_URL = "https://api.openrouteservice.org";
const METERS_PER_MILE = 1609.344;
const MAX_DESTINATIONS = 49; // ORS allows 50 locations per matrix request

// Small in-memory cache so the same city pair isn't asked for twice
const geocodeCache = new Map();
const distanceCache = new Map();

export function distanceServiceConfigured() {
  return Boolean(process.env.OPENROUTESERVICE_API_KEY);
}

// from: { city, state }, pickups: [{ id, city, state }]
// Returns { miles: Map(id -> miles), source: "openrouteservice" | "estimate" }
export async function deadheadMilesFor(from, pickups) {
  const miles = new Map();
  const toAsk = [];

  for (const pickup of pickups) {
    const key = `${placeKey(from.city, from.state)}>${placeKey(pickup.city, pickup.state)}`;
    if (placeKey(from.city, from.state) === placeKey(pickup.city, pickup.state)) {
      miles.set(pickup.id, 0);
    } else if (distanceCache.has(key)) {
      miles.set(pickup.id, distanceCache.get(key));
    } else {
      toAsk.push({ ...pickup, key });
    }
  }

  let source = "estimate";

  if (toAsk.length > 0 && distanceServiceConfigured()) {
    try {
      await fillFromOpenRouteService(from, toAsk, miles);
      source = "openrouteservice";
    } catch (error) {
      console.warn("OpenRouteService unavailable, using estimates:", error.message);
    }
  } else if (toAsk.length === 0 && distanceServiceConfigured()) {
    source = "openrouteservice";
  }

  // Anything still missing gets the estimate
  for (const pickup of toAsk) {
    if (!miles.has(pickup.id)) {
      miles.set(pickup.id, estimateRoadMiles(from, pickup));
    }
  }

  return { miles, source };
}

async function fillFromOpenRouteService(from, pickups, miles) {
  const origin = await geocode(from.city, from.state);

  // Unique pickup places only
  const places = [...new Map(pickups.map((p) => [placeKey(p.city, p.state), p])).values()];

  for (let start = 0; start < places.length; start += MAX_DESTINATIONS) {
    const chunk = places.slice(start, start + MAX_DESTINATIONS);
    const coords = await Promise.all(chunk.map((p) => geocode(p.city, p.state)));

    const response = await fetchWithTimeout(`${ORS_URL}/v2/matrix/driving-hgv`, {
      method: "POST",
      headers: {
        Authorization: process.env.OPENROUTESERVICE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [origin, ...coords].map(([lat, lon]) => [lon, lat]), // ORS wants [lon, lat]
        sources: [0],
        destinations: chunk.map((_, index) => index + 1),
        metrics: ["distance"],
      }),
    });
    if (!response.ok) throw new Error(`Matrix API returned ${response.status}`);

    const data = await response.json();
    const row = data.distances?.[0] ?? [];
    chunk.forEach((place, index) => {
      const meters = row[index];
      if (typeof meters === "number") {
        const value = Math.round(meters / METERS_PER_MILE);
        distanceCache.set(`${placeKey(from.city, from.state)}>${placeKey(place.city, place.state)}`, value);
      }
    });
  }

  for (const pickup of pickups) {
    const value = distanceCache.get(pickup.key);
    if (value !== undefined) miles.set(pickup.id, value);
  }
}

// City -> [lat, lon]. Uses the built-in list first, then ORS geocoding.
async function geocode(city, state) {
  const key = placeKey(city, state);
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const known = lookupPlace(city, state);
  if (known?.exact) {
    geocodeCache.set(key, known.coords);
    return known.coords;
  }

  const url = new URL(`${ORS_URL}/geocode/search`);
  url.searchParams.set("api_key", process.env.OPENROUTESERVICE_API_KEY);
  url.searchParams.set("text", `${city}, ${state}`);
  url.searchParams.set("boundary.country", "US");
  url.searchParams.set("layers", "locality");
  url.searchParams.set("size", "1");

  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`Geocoding returned ${response.status}`);
  const data = await response.json();
  const [lon, lat] = data.features?.[0]?.geometry?.coordinates ?? [];
  const coords = typeof lat === "number" ? [lat, lon] : known?.coords;
  if (!coords) throw new Error(`Could not find ${city}, ${state}`);
  geocodeCache.set(key, coords);
  return coords;
}

async function fetchWithTimeout(url, options = {}, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}
