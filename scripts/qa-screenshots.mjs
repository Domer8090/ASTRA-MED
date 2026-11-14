#!/usr/bin/env node
/**
 * QA screenshots via the Chrome DevTools Protocol (no extra dependencies).
 * Prerequisite: npm run build && npm run preview  (serves http://localhost:4173)
 * Usage: node scripts/qa-screenshots.mjs [baseUrl] [outDir]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? "docs/qa";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  // name, width, height, path, selector (null = viewport), mobile
  ["01-console-scenario-a", 1440, 1000, "?scenario=nominal&day=42", null],
  ["02-console-scenario-b", 1440, 1000, "?scenario=cardiovascular&day=118#system-cardiovascular", null],
  ["03-console-scenario-c", 1440, 1000, "?scenario=sep&day=131#system-immuneRadiation", null],
  ["04-trends-scenario-b", 1440, 1000, "?scenario=cardiovascular&day=124#system-cardiovascular", "#trends"],
  ["05-trends-scenario-c", 1440, 1000, "?scenario=sep&day=133#system-immuneRadiation", "#trends"],
  ["06-system-intel-c", 1440, 1000, "?scenario=sep&day=131#system-musculoskeletal", "#intel"],
  ["07-countermeasures", 1440, 1000, "?scenario=cardiovascular&day=118", "#countermeasures"],
  ["08-alerts-events", 1440, 1000, "?scenario=cardiovascular&day=118", "#alerts"],
  ["09-space-weather-c", 1440, 1000, "?scenario=sep&day=131", "#weather"],
  ["10-guidance-drawer", 1440, 1000, "?scenario=cardiovascular&day=118#guide-heartRate", null],
  ["11-log-measurement", 1440, 1000, "?scenario=nominal&day=42#log-bloodPressure", null],
  ["12-data-sources", 1440, 1000, "?scenario=nominal&day=42#sources-sources", null],
  ["13-thresholds", 1440, 1000, "?scenario=nominal&day=42#sources-thresholds", null],
  ["14-mobile-console-c", 390, 844, "?scenario=sep&day=131", "main", true],
  ["15-mobile-guidance", 390, 844, "?scenario=cardiovascular&day=118#guide-bloodPressure", null, true],
  ["16-tablet-console-b", 820, 1180, "?scenario=cardiovascular&day=118", null],
];

const profile = mkdtempSync(join(tmpdir(), "astra-qa-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket(await cdpTarget());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
for (const [name, width, height, path, selector, mobile] of SHOTS) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: Boolean(mobile) });
  await send("Network.clearBrowserCookies").catch(() => {});
  await send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  await evaluate("try { localStorage.clear() } catch (e) {}");
  await send("Page.navigate", { url: `${BASE}/${path}` });
  await sleep(4500); // render, fonts, lazy chart chunk, background DONKI fetch
  let clip;
  if (selector) {
    const measure = `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: Math.min(r.height, 2600) }; })()`;
    let rect = await evaluate(measure);
    if (rect) {
      // Make the viewport tall enough that the whole element is painted (content-visibility, lazy layers).
      await send("Emulation.setDeviceMetricsOverride", { width, height: Math.ceil(rect.y + rect.height + 40), deviceScaleFactor: 1, mobile: Boolean(mobile) });
      await sleep(900);
      rect = await evaluate(measure);
      clip = { ...rect, scale: 1 };
    }
  }
  const shot = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(shot.data, "base64"));
  console.log(`${name}.png${clip ? ` (${Math.round(clip.width)}x${Math.round(clip.height)})` : ` (${width}x${height})`}`);
}
ws.close();
chrome.kill();
await sleep(300);
rmSync(profile, { recursive: true, force: true });
