/**
 * Final step of `npm run desktop:prepare`: the web console has been built
 * straight into desktop/web; this removes macOS AppleDouble files (written on
 * the FAT32 volume) and checks the build is complete.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "desktop", "web");

if (!fs.existsSync(path.join(web, "index.html"))) {
  console.error("desktop/web/index.html is missing. The web build did not finish.");
  process.exit(1);
}
let removed = 0;
for (const entry of fs.readdirSync(web, { recursive: true })) {
  const name = path.basename(String(entry));
  if (name.startsWith("._") || name === ".DS_Store") {
    fs.rmSync(path.join(web, String(entry)), { force: true });
    removed++;
  }
}
for (const required of ["earth/blue-marble.jpg", "models/hand_landmarker.task", "mediapipe"]) {
  if (!fs.existsSync(path.join(web, required))) console.warn(`Warning: ${required} is missing. Run "npm run assets:fetch" for the full offline Recharge deck.`);
}
console.log(`desktop/web ready${removed ? ` (removed ${removed} AppleDouble files)` : ""}.`);
