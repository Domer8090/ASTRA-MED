#!/usr/bin/env node
/**
 * Live DONKI integration check. Requests each event type independently from each
 * host and reports HTTP status, record count, JSON shape and timestamp validity.
 * Usage: node scripts/check-donki.mjs [lookbackDays]
 */
const days = Number(process.argv[2] ?? 30);
const end = new Date();
const start = new Date(end.getTime() - days * 86400000);
const d = (x) => x.toISOString().slice(0, 10);
const key = process.env.VITE_NASA_API_KEY || "DEMO_KEY";
const types = { FLR: ["FLR", "beginTime"], SEP: ["SEP", "eventTime"], CME: ["CME", "startTime"], notifications: ["notifications", "messageIssueTime"] };
const hosts = {
  "ccmc.gsfc.nasa.gov/DONKI-API/get": (p, q) => `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${p}?${q}`,
  "api.nasa.gov/DONKI": (p, q) => `https://api.nasa.gov/DONKI/${p}?${q}&api_key=${key}`,
};
console.log(`Range ${d(start)} to ${d(end)} (UTC), key ${key === "DEMO_KEY" ? "DEMO_KEY" : "personal"}`);
for (const [name, [path, timeField]] of Object.entries(types)) {
  for (const [host, url] of Object.entries(hosts)) {
    const q = `startDate=${d(start)}&endDate=${d(end)}${name === "notifications" ? "&type=all" : ""}`;
    const t0 = Date.now();
    try {
      const res = await fetch(url(path, q), { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      let detail = "";
      if (res.ok) {
        const json = text.trim() ? JSON.parse(text) : [];
        if (!Array.isArray(json)) detail = "NOT A LIST";
        else {
          const times = json.map((r) => r?.[timeField]).filter(Boolean);
          const bad = times.filter((t) => Number.isNaN(Date.parse(t))).length;
          const newest = times.sort().at(-1) ?? "-";
          detail = `${json.length} records, ${times.length} with ${timeField}, ${bad} unparseable, newest ${newest}`;
        }
      }
      console.log(`${name.padEnd(13)} ${host.padEnd(32)} HTTP ${res.status} ${String(Date.now() - t0).padStart(5)} ms ${detail}`);
    } catch (e) {
      console.log(`${name.padEnd(13)} ${host.padEnd(32)} ERROR ${e.message}`);
    }
  }
}
