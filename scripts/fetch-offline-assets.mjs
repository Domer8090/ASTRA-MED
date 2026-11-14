#!/usr/bin/env node
/**
 * Downloads the files Tuesday's Recharge deck needs to run with no network,
 * into public/ so they ship with the app:
 *
 *   public/earth/blue-marble.jpg   NASA GIBS BlueMarble_NextGeneration, 4096 x 2048, equirectangular
 *   public/earth/city-lights.jpg   NASA GIBS VIIRS_CityLights_2012, 4096 x 2048
 *   public/models/hand_landmarker.task   MediaPipe Hand Landmarker (float16)
 *
 * The MediaPipe WebAssembly runtime is not downloaded; vite.config.ts copies
 * it from node_modules. NASA imagery is public domain. Run: npm run assets:fetch
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&CRS=EPSG:4326&BBOX=-90,-180,90,180&FORMAT=image/jpeg&WIDTH=4096&HEIGHT=2048";

const FILES = [
  { path: "public/earth/blue-marble.jpg", url: `${GIBS}&LAYERS=BlueMarble_NextGeneration`, type: "image/jpeg", min: 200_000 },
  { path: "public/earth/city-lights.jpg", url: `${GIBS}&LAYERS=VIIRS_CityLights_2012`, type: "image/jpeg", min: 100_000 },
  {
    path: "public/models/hand_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    type: null,
    min: 5_000_000,
  },
];

const force = process.argv.includes("--force");

for (const f of FILES) {
  const target = join(root, f.path);
  if (!force) {
    try {
      if ((await stat(target)).size >= f.min) {
        console.log(`kept     ${f.path}`);
        continue;
      }
    } catch {
      // Missing: download below.
    }
  }
  const res = await fetch(f.url, { signal: AbortSignal.timeout(120_000) });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || (f.type && !type.startsWith(f.type))) throw new Error(`${f.path}: HTTP ${res.status} ${type}`);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length < f.min) throw new Error(`${f.path}: only ${body.length} bytes; the source returned an empty or error image`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
  console.log(`saved    ${f.path} (${Math.round(body.length / 1024)} KB)`);
}
