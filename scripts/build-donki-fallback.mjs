#!/usr/bin/env node
/**
 * Builds the bundled offline DONKI fallback from a real archived window.
 *
 * Source: NASA CCMC DONKI web service (https://ccmc.gsfc.nasa.gov/DONKI/WS/get/...).
 * Default window: 2024-05-08 to 2024-05-16 (the May 2024 solar storm period).
 * Output is trimmed raw DONKI JSON; the app normalises it at runtime with the
 * same code that normalises live responses, and labels it DEMO / OFFLINE FALLBACK.
 *
 * Usage: node scripts/build-donki-fallback.mjs [startDate] [endDate]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const start = process.argv[2] ?? "2024-05-08";
const end = process.argv[3] ?? "2024-05-16";
const base = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get";

async function get(path) {
  const url = `${base}/${path}${path.includes("?") ? "&" : "?"}startDate=${start}&endDate=${end}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function summary(body) {
  if (typeof body !== "string") return "";
  const m = body.match(/## Summary:\s*([\s\S]*?)(\n## |$)/);
  return (m ? m[1] : body).replace(/\s+/g, " ").trim().slice(0, 700);
}

const [flr, sep, cme, notifications] = await Promise.all([
  get("FLR"),
  get("SEP"),
  get("CME"),
  get("notifications?type=all"),
]);

const flrTrim = flr
  .filter((f) => typeof f.classType === "string" && (f.classType.startsWith("X") || Number(f.classType.slice(1)) >= 5))
  .map(({ flrID, beginTime, peakTime, endTime, classType, sourceLocation, activeRegionNum, link, linkedEvents, instruments }) => ({
    flrID, beginTime, peakTime, endTime, classType, sourceLocation, activeRegionNum, link, linkedEvents, instruments,
  }));

const sepTrim = sep.map(({ sepID, eventTime, instruments, linkedEvents, link }) => ({ sepID, eventTime, instruments, linkedEvents, link }));

const cmeTrim = cme
  .map((c) => {
    const best = (c.cmeAnalyses ?? []).find((a) => a.isMostAccurate) ?? (c.cmeAnalyses ?? [])[0];
    return {
      activityID: c.activityID,
      startTime: c.startTime,
      sourceLocation: c.sourceLocation,
      activeRegionNum: c.activeRegionNum,
      note: typeof c.note === "string" ? c.note.slice(0, 500) : "",
      link: c.link,
      linkedEvents: c.linkedEvents,
      cmeAnalyses: best ? [{ isMostAccurate: true, speed: best.speed, type: best.type, halfAngle: best.halfAngle, latitude: best.latitude, longitude: best.longitude }] : [],
    };
  })
  .filter((c) => (c.cmeAnalyses[0]?.speed ?? 0) >= 700);

const notifTrim = notifications
  .filter((n) => n.messageType !== "Report")
  .map((n) => ({ messageType: n.messageType, messageID: n.messageID, messageURL: n.messageURL, messageIssueTime: n.messageIssueTime, messageBody: summary(n.messageBody) }))
  .slice(0, 60);

const out = {
  provenance: {
    source: "NASA CCMC DONKI web service",
    endpoint: base,
    window: { start, end },
    retrievedAt: new Date().toISOString(),
    note: "Archived real DONKI records, trimmed for size. Bundled as offline demonstration fallback; never live data.",
  },
  FLR: flrTrim,
  SEP: sepTrim,
  CME: cmeTrim,
  notifications: notifTrim,
};

const text = JSON.stringify(out, null, 0);
for (const p of ["src/data/generated/donki-fallback.json", "public/offline/donki-fallback.json"]) {
  const file = resolve(root, p);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}
console.log(`FLR ${flrTrim.length}, SEP ${sepTrim.length}, CME ${cmeTrim.length}, notifications ${notifTrim.length}, ${text.length} bytes`);
