/**
 * Copies the core bundle (dist-core/astra-core.js) into the iPad app's
 * resources so the Xcode project builds without Node.js installed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "dist-core", "astra-core.js");
const dest = path.join(root, "ios", "AstraMed", "Resources", "astra-core.js");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied core bundle to ${path.relative(root, dest)}`);
