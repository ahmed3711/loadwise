// Approximate coordinates [latitude, longitude] for common freight cities
// and the centre of every state. Used to estimate empty (deadhead) miles:
// straight-line distance x 1.2 (the fallback rule from the proposal).
// Real truck routing (OpenRouteService) is planned for the next milestone.

export const CITY_COORDS = {
  "anchorage|AK": [61.22, -149.9],
  "birmingham|AL": [33.52, -86.8], "huntsville|AL": [34.73, -86.59], "mobile|AL": [30.69, -88.04], "montgomery|AL": [32.37, -86.3],
  "fort smith|AR": [35.39, -94.4], "little rock|AR": [34.75, -92.29],
  "phoenix|AZ": [33.45, -112.07], "tucson|AZ": [32.22, -110.97],
  "bakersfield|CA": [35.37, -119.02], "fresno|CA": [36.74, -119.79], "long beach|CA": [33.77, -118.19],
  "los angeles|CA": [34.05, -118.24], "oakland|CA": [37.8, -122.27], "ontario|CA": [34.06, -117.65],
  "riverside|CA": [33.95, -117.4], "sacramento|CA": [38.58, -121.49], "san diego|CA": [32.72, -117.16],
  "san francisco|CA": [37.77, -122.42], "san jose|CA": [37.34, -121.89], "stockton|CA": [37.96, -121.29],
  "colorado springs|CO": [38.83, -104.82], "denver|CO": [39.74, -104.99],
  "hartford|CT": [41.76, -72.69],
  "washington|DC": [38.91, -77.04],
  "wilmington|DE": [39.74, -75.55],
  "fort lauderdale|FL": [26.12, -80.14], "jacksonville|FL": [30.33, -81.66], "lakeland|FL": [28.04, -81.95],
  "miami|FL": [25.76, -80.19], "orlando|FL": [28.54, -81.38], "tallahassee|FL": [30.44, -84.28], "tampa|FL": [27.95, -82.46],
  "atlanta|GA": [33.75, -84.39], "augusta|GA": [33.47, -81.97], "dalton|GA": [34.77, -84.97],
  "gainesville|GA": [34.3, -83.82], "macon|GA": [32.84, -83.63], "savannah|GA": [32.08, -81.09],
  "honolulu|HI": [21.31, -157.86],
  "cedar rapids|IA": [41.98, -91.67], "davenport|IA": [41.52, -90.58], "des moines|IA": [41.59, -93.62],
  "boise|ID": [43.62, -116.2],
  "chicago|IL": [41.88, -87.63], "joliet|IL": [41.53, -88.08], "peoria|IL": [40.69, -89.59],
  "rockford|IL": [42.27, -89.09], "springfield|IL": [39.78, -89.65],
  "fort wayne|IN": [41.08, -85.14], "gary|IN": [41.59, -87.35], "indianapolis|IN": [39.77, -86.16],
  "kansas city|KS": [39.11, -94.63], "wichita|KS": [37.69, -97.34],
  "lexington|KY": [38.04, -84.5], "louisville|KY": [38.25, -85.76],
  "baton rouge|LA": [30.45, -91.15], "new orleans|LA": [29.95, -90.07], "shreveport|LA": [32.53, -93.75],
  "boston|MA": [42.36, -71.06], "worcester|MA": [42.26, -71.8],
  "baltimore|MD": [39.29, -76.61],
  "portland|ME": [43.66, -70.26],
  "detroit|MI": [42.33, -83.05], "grand rapids|MI": [42.96, -85.67], "lansing|MI": [42.73, -84.56],
  "duluth|MN": [46.79, -92.1], "minneapolis|MN": [44.98, -93.27], "st paul|MN": [44.95, -93.09],
  "kansas city|MO": [39.1, -94.58], "springfield|MO": [37.21, -93.29], "st louis|MO": [38.63, -90.2],
  "jackson|MS": [32.3, -90.18],
  "billings|MT": [45.78, -108.5],
  "charlotte|NC": [35.23, -80.84], "greensboro|NC": [36.07, -79.79], "raleigh|NC": [35.78, -78.64],
  "fargo|ND": [46.88, -96.79],
  "lincoln|NE": [40.81, -96.7], "omaha|NE": [41.26, -95.93],
  "manchester|NH": [42.99, -71.45],
  "edison|NJ": [40.52, -74.41], "elizabeth|NJ": [40.66, -74.21], "newark|NJ": [40.74, -74.17],
  "albuquerque|NM": [35.08, -106.65],
  "las vegas|NV": [36.17, -115.14], "reno|NV": [39.53, -119.81],
  "albany|NY": [42.65, -73.75], "buffalo|NY": [42.89, -78.88], "new york|NY": [40.71, -74.01],
  "rochester|NY": [43.16, -77.61], "syracuse|NY": [43.05, -76.15],
  "cincinnati|OH": [39.1, -84.51], "cleveland|OH": [41.5, -81.69], "columbus|OH": [39.96, -83.0],
  "dayton|OH": [39.76, -84.19], "toledo|OH": [41.65, -83.54],
  "oklahoma city|OK": [35.47, -97.52], "tulsa|OK": [36.15, -95.99],
  "eugene|OR": [44.05, -123.09], "portland|OR": [45.52, -122.68],
  "allentown|PA": [40.6, -75.49], "harrisburg|PA": [40.27, -76.88], "philadelphia|PA": [39.95, -75.17],
  "pittsburgh|PA": [40.44, -80.0], "scranton|PA": [41.41, -75.66],
  "providence|RI": [41.82, -71.41],
  "charleston|SC": [32.78, -79.93], "columbia|SC": [34.0, -81.03], "greenville|SC": [34.85, -82.4],
  "sioux falls|SD": [43.55, -96.73],
  "chattanooga|TN": [35.05, -85.31], "knoxville|TN": [35.96, -83.92], "memphis|TN": [35.15, -90.05], "nashville|TN": [36.16, -86.78],
  "amarillo|TX": [35.22, -101.83], "austin|TX": [30.27, -97.74], "corpus christi|TX": [27.8, -97.4],
  "dallas|TX": [32.78, -96.8], "el paso|TX": [31.76, -106.49], "fort worth|TX": [32.76, -97.33],
  "houston|TX": [29.76, -95.37], "laredo|TX": [27.51, -99.51], "lubbock|TX": [33.58, -101.86],
  "san antonio|TX": [29.42, -98.49], "waco|TX": [31.55, -97.15],
  "salt lake city|UT": [40.76, -111.89],
  "norfolk|VA": [36.85, -76.29], "richmond|VA": [37.54, -77.44], "roanoke|VA": [37.27, -79.94],
  "burlington|VT": [44.48, -73.21],
  "seattle|WA": [47.61, -122.33], "spokane|WA": [47.66, -117.43], "tacoma|WA": [47.25, -122.44],
  "green bay|WI": [44.51, -88.01], "madison|WI": [43.07, -89.4], "milwaukee|WI": [43.04, -87.91],
  "charleston|WV": [38.35, -81.63],
  "cheyenne|WY": [41.14, -104.82],
};

// Rough centre of each state, used when a city isn't in the list above
export const STATE_CENTERS = {
  AL: [32.8, -86.8], AK: [61.4, -152.3], AZ: [34.2, -111.7], AR: [34.9, -92.4], CA: [37.2, -119.5],
  CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5], DC: [38.9, -77.0], FL: [28.6, -82.4],
  GA: [32.7, -83.4], HI: [20.8, -156.3], ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3],
  IA: [42.1, -93.5], KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.1, -92.0], ME: [45.4, -69.2],
  MD: [39.0, -76.8], MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3], MS: [32.7, -89.7],
  MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6], NH: [43.7, -71.6],
  NJ: [40.2, -74.7], NM: [34.4, -106.1], NY: [42.9, -75.5], NC: [35.6, -79.4], ND: [47.5, -100.5],
  OH: [40.3, -82.8], OK: [35.6, -97.5], OR: [43.9, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.5],
  SC: [33.9, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7],
  VT: [44.1, -72.7], VA: [37.5, -78.9], WA: [47.4, -120.5], WV: [38.6, -80.6], WI: [44.6, -89.9],
  WY: [43.0, -107.6],
};

// "St. Louis" / "Saint Louis" / "st louis" all become "st louis|MO"
export function placeKey(city, state) {
  const clean = String(city ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^saint /, "st ");
  return `${clean}|${String(state ?? "").toUpperCase()}`;
}

// Returns { coords: [lat, lon], exact: true/false } or null for an unknown state
export function lookupPlace(city, state) {
  const exact = CITY_COORDS[placeKey(city, state)];
  if (exact) return { coords: exact, exact: true };
  const center = STATE_CENTERS[String(state ?? "").toUpperCase()];
  return center ? { coords: center, exact: false } : null;
}

// Straight-line ("as the crow flies") distance in miles
export function haversineMiles([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Road distance estimate = straight line x 1.2 (proposal fallback rule)
export function estimateRoadMiles(from, to) {
  if (placeKey(from.city, from.state) === placeKey(to.city, to.state)) return 0;
  const a = lookupPlace(from.city, from.state);
  const b = lookupPlace(to.city, to.state);
  if (!a || !b) return 0;
  return Math.round(haversineMiles(a.coords, b.coords) * 1.2);
}
