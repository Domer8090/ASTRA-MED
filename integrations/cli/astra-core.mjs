#!/usr/bin/env node
/**
 * astra-core: run the ASTRA-MED engines on a telemetry file, with no UI and
 * no network. Meant for ground systems and test pipelines that want the same
 * statuses the crew console shows.
 *
 *   node integrations/cli/astra-core.mjs evaluate <file.json|file.csv> [--scenario nominal|cardiovascular|sep] [--day N] [--full]
 *   node integrations/cli/astra-core.mjs report   <file.json|file.csv> [--scenario …] [--day N]
 *   node integrations/cli/astra-core.mjs methods
 *
 * Input schema: integrations/schema/measurement-input.schema.json.
 * Build the core first: npm run core:build
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = process.env.ASTRA_CORE_BUNDLE ?? path.resolve(here, "../../dist-core/astra-core.js");

function fail(msg, code = 1) {
  process.stderr.write(`astra-core: ${msg}\n`);
  process.exit(code);
}

function loadCore() {
  if (!fs.existsSync(bundle)) fail(`core bundle not found at ${bundle}. Run "npm run core:build".`);
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(bundle, "utf8"), ctx, { filename: "astra-core.js" });
  return ctx.AstraCore;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  const header = lines.shift()?.split(",").map((h) => h.trim()) ?? [];
  return lines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    row.missionDay = Number(row.missionDay);
    return row;
  });
}

function readInput(file) {
  if (!file) fail("give an input file (.json or .csv).");
  const text = fs.readFileSync(file, "utf8");
  if (file.toLowerCase().endsWith(".csv")) return { measurements: parseCsv(text) };
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? { measurements: parsed } : parsed;
}

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const [command, file] = process.argv.slice(2);
const AstraCore = loadCore();
const core = AstraCore.create(AstraCore.memoryStorage());
const call = (method, args = {}) => {
  const r = JSON.parse(core.call(method, JSON.stringify(args)));
  if (!r.ok) fail(r.error);
  return r.result;
};

if (command === "methods") {
  process.stdout.write(`${JSON.stringify({ coreVersion: AstraCore.version, methods: core.methods }, null, 2)}\n`);
  process.exit(0);
}
if (command !== "evaluate" && command !== "report") fail("command must be evaluate, report or methods.", 2);

const input = readInput(file);
const scenario = flag("scenario") ?? input.scenario ?? "nominal";
call("setScenario", { scenarioId: scenario });
const results = (input.measurements ?? []).map((m, i) => ({ index: i, metricId: m.metricId, missionDay: m.missionDay, ...call("logMeasurement", m) }));
const lastDay = Math.max(0, ...results.filter((r) => r.ok).map((r) => r.missionDay));
const day = Number(flag("day") ?? input.day ?? (lastDay || 0));
if (day) call("setDay", { day });

if (command === "report") {
  process.stdout.write(`${call("report")}\n`);
  process.exit(results.some((r) => !r.ok) ? 3 : 0);
}

const snap = call("snapshot");
const out = process.argv.includes("--full")
  ? { input: results, snapshot: snap }
  : {
      coreVersion: snap.coreVersion,
      dataLabel: snap.dataLabel,
      thresholds: "Prototype demonstration thresholds. Not NASA flight rules.",
      scenario: snap.scenario.id,
      day: snap.day,
      overall: snap.overall,
      metrics: snap.metrics.map((m) => ({ id: m.id, status: m.status, value: m.value, summary: m.summary, nextStep: m.recommendedNextStep, rules: m.rules })),
      systems: snap.systems.map((s) => ({ id: s.id, status: s.status })),
      trends: snap.trends.map((t) => t.text),
      drift: { state: snap.drift.state, text: snap.drift.text },
      primaryAction: snap.primaryAction.text,
      input: results,
    };
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
// Exit 3 when any input row was rejected, so pipelines notice.
process.exit(results.some((r) => !r.ok) ? 3 : 0);
