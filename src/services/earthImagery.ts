/**
 * NASA Earth imagery for Tuesday's Earth view.
 *
 * - Bundled with the app (works with no network): NASA GIBS Blue Marble Next
 *   Generation and VIIRS city lights, 4096 x 2048 equirectangular, saved by
 *   `npm run assets:fetch` into public/earth.
 * - Optional, only when a ground link is available: the latest EPIC full-disc
 *   photo from DSCOVR. Deep-space crews have no internet; this simply stays
 *   hidden when it cannot load.
 *
 * No health data is sent. Failures fall back to a drawn globe and never throw.
 */

function loadImage(url: string, timeoutMs = 8_000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

export interface EarthTextures {
  day: HTMLImageElement | HTMLCanvasElement;
  night: HTMLImageElement | HTMLCanvasElement | null;
  source: "bundled" | "drawn";
}

function drawnGlobe(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d")!;
  g.fillStyle = "#10345a";
  g.fillRect(0, 0, width, height);
  g.strokeStyle = "rgba(185,166,255,0.35)";
  g.lineWidth = 1;
  for (let lon = 0; lon <= 360; lon += 30) {
    const x = (lon / 360) * width;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, height);
    g.stroke();
  }
  for (let lat = 0; lat <= 180; lat += 30) {
    const y = (lat / 180) * height;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(width, y);
    g.stroke();
  }
  return c;
}

/** Load the bundled day and night textures without copying decoded images to canvases. */
export async function loadEarthTextures(): Promise<EarthTextures> {
  const base = import.meta.env.BASE_URL;
  const [day, lights] = await Promise.all([loadImage(`${base}earth/blue-marble.jpg`), loadImage(`${base}earth/city-lights.jpg`)]);
  return {
    day: day ?? drawnGlobe(2048, 1024),
    night: lights,
    source: day ? "bundled" : "drawn",
  };
}

export interface EpicImage {
  url: string;
  date: string;
  lat: number;
  lon: number;
}

/** Most recent EPIC natural-colour image, or null. */
export async function fetchLatestEpic(): Promise<EpicImage | null> {
  try {
    const res = await fetch("https://epic.gsfc.nasa.gov/api/natural", { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const list: unknown = await res.json();
    if (!Array.isArray(list) || !list.length) return null;
    const item = list[list.length - 1] as { image?: unknown; date?: unknown; centroid_coordinates?: { lat?: unknown; lon?: unknown } };
    if (typeof item.image !== "string" || !/^[\w-]+$/.test(item.image) || typeof item.date !== "string") return null;
    const day = item.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const [y, m, d] = day.split("-");
    const lat = Number(item.centroid_coordinates?.lat);
    const lon = Number(item.centroid_coordinates?.lon);
    return {
      url: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${d}/jpg/${item.image}.jpg`,
      date: item.date,
      lat: Number.isFinite(lat) ? lat : 0,
      lon: Number.isFinite(lon) ? lon : 0,
    };
  } catch {
    return null;
  }
}

/** Places a crew member might look for: agency centres and a few cities. */
export const EARTH_PLACES = [
  { id: "houston", name: "Houston", detail: "NASA Johnson Space Center", lat: 29.56, lon: -95.09 },
  { id: "florida", name: "Cape Canaveral", detail: "Kennedy Space Center", lat: 28.57, lon: -80.65 },
  { id: "montreal", name: "Longueuil", detail: "Canadian Space Agency", lat: 45.52, lon: -73.39 },
  { id: "cologne", name: "Cologne", detail: "ESA European Astronaut Centre", lat: 50.84, lon: 7.12 },
  { id: "tsukuba", name: "Tsukuba", detail: "JAXA Tsukuba Space Center", lat: 36.07, lon: 140.13 },
  { id: "starcity", name: "Star City", detail: "Cosmonaut training centre", lat: 55.88, lon: 38.11 },
  { id: "bengaluru", name: "Bengaluru", detail: "ISRO headquarters", lat: 12.97, lon: 77.59 },
  { id: "nairobi", name: "Nairobi", detail: "Kenya", lat: -1.29, lon: 36.82 },
  { id: "saopaulo", name: "São Paulo", detail: "Brazil", lat: -23.55, lon: -46.63 },
  { id: "sydney", name: "Sydney", detail: "Australia", lat: -33.87, lon: 151.21 },
  { id: "everest", name: "Mount Everest", detail: "Himalaya", lat: 27.99, lon: 86.93 },
  { id: "sahara", name: "Eye of the Sahara", detail: "Richat Structure, Mauritania", lat: 21.12, lon: -11.4 },
] as const;

export type EarthPlace = (typeof EARTH_PLACES)[number];
