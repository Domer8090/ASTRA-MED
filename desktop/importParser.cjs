/**
 * Reads a readings file chosen by the user (JSON or CSV) into plain rows.
 * Rows are validated later, in the renderer, by the same entry rules as the
 * crew console (src/core/logDraft.ts). Nothing here trusts the file.
 */
"use strict";

const MAX_ROWS = 5000;
const MAX_BYTES = 5 * 1024 * 1024;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  const header = (lines.shift() || "").split(",").map((h) => h.trim());
  if (!header.includes("metricId")) throw new Error("The CSV header must include metricId, missionDay and shipTime.");
  return lines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    header.forEach((h, i) => {
      if (h) row[h] = cells[i] ?? "";
    });
    return row;
  });
}

/** Returns { rows } or throws an Error with a message fit to show the user. */
function parseReadings(buffer, fileName) {
  if (buffer.length > MAX_BYTES) throw new Error("The file is larger than 5 MB. Split it into smaller files.");
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  let rows;
  if (/\.csv$/i.test(fileName)) rows = parseCsv(text);
  else {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("The file is not valid JSON.");
    }
    rows = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.measurements) ? parsed.measurements : null;
    if (!rows) throw new Error('Expected a list of readings, or an object with a "measurements" list.');
  }
  if (rows.length > MAX_ROWS) throw new Error(`The file has ${rows.length} rows; the limit is ${MAX_ROWS}.`);
  return { rows: rows.map((r) => (r && typeof r === "object" && !Array.isArray(r) ? r : {})) };
}

module.exports = { parseReadings, parseCsv };
