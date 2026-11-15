/**
 * ASTRA-MED core: the same engines the web console uses, packaged behind one
 * JSON-in / JSON-out interface so any host can embed them.
 *
 * Hosts today:
 * - iPad app (SwiftUI) runs the bundle in JavaScriptCore.
 * - Desktop app (Electron, Windows and Linux) loads the full web console.
 * - `astra-core` command-line tool (Node) evaluates telemetry files.
 *
 * The core has no network access and no UI. Storage is whatever the host
 * passes in (a `StorageLike` with getItem / setItem / removeItem). Every
 * status, threshold and piece of guidance text comes from `src/engine`,
 * `src/config` and `src/data`; this file only wires them together.
 */
import { BLOOD_GLUCOSE, BLOOD_PRESSURE, BODY_TEMPERATURE, HEART_RATE, MISSION, MOOD, SLEEP } from "../config/thresholds";
import { BODY_SYSTEMS } from "../data/bodySystems";
import { getCountermeasureTasks } from "../data/countermeasureTasks";
import { getArchivedEvents } from "../data/fallbackDonki";
import { knowledgeIndex } from "../data/knowledgeBase";
import { LINK_UP_NOTE, NO_LINK_STEPS, ONBOARD_FIRST } from "../data/medicalContact";
import { GUIDANCE_DISCLAIMER, METRIC_GUIDANCE } from "../data/metricGuidance";
import { SCENARIO_ORDER, SCENARIOS, isScenarioId } from "../data/scenarios";
import { SPACEFLIGHT_HAZARDS } from "../data/spaceflightHazards";
import { donkiAdvisories, scenarioAdvisories } from "../engine/advisoryEngine";
import { baselineDrift } from "../engine/baselineEngine";
import { evaluateBodySystems } from "../engine/bodySystemEngine";
import { aggregateStatus, evaluateAllMetrics, evaluateMissionDays, type EngineInput } from "../engine/diagnosticEngine";
import { hazardMap } from "../engine/hazardMap";
import { earthMarsLightMinutes } from "../engine/lightTime";
import { buildMedicalMessage, type ContactPriority } from "../engine/medicalContact";
import { buildFollowUps, mostImportantAction } from "../engine/protocolEngine";
import { computeReadiness, tasksForDay, type ReadinessInput } from "../engine/readinessEngine";
import { buildSurgeonReport } from "../engine/reportEngine";
import { retrieve } from "../engine/retrieval";
import { subsolarPoint } from "../engine/sunPosition";
import { trendWatch } from "../engine/trendEngine";
import {
  CRISIS_REPLY,
  TUESDAY_SYSTEM_PROMPT,
  URGENT_REPLY,
  actionsFor,
  buildHealthBrief,
  buildModelMessages,
  detectIntent,
  offlineReply,
  readingsInText,
  reportedVitalsReply,
  safetyFilter,
  type TuesdayAction,
  type TuesdayContext,
} from "../engine/tuesdayEngine";
import { buildChartRows, windowRange } from "../services/chartSeries";
import { createStorageService, type StorageLike } from "../services/storageService";
import { buildEffectiveDays } from "../services/telemetryService";
import { createMissionStore } from "../state/missionStore";
import { createTuesdayStore, wellbeingSummary, type ActivityKind } from "../state/tuesdayStore";
import {
  ALL_METRIC_IDS,
  type MetricId,
  type ScenarioId,
  type SourceRef,
  type TrendWindow,
} from "../types/health";
import { currentShipTime, formatReadingStamp } from "../utils/dates";
import { formatDelta, formatWithUnit } from "../utils/formatting";
import { isMetricId, isRecord } from "../utils/validation";
import { logDraft, toLogDraft } from "./logDraft";

export type { LogDraft } from "./logDraft";

export const CORE_VERSION = "1.0.0";

export const DATA_LABEL = "SYNTHETIC";

/** Display-only reference lines for charts. Statuses never come from here. */
const CHART_LINES: Partial<Record<MetricId, { reference: [number, number] | null; caution: number[]; critical: number[]; provenance: string }>> = {
  heartRate: { reference: [HEART_RATE.reference.min, HEART_RATE.reference.max], caution: [HEART_RATE.cautionBelow, HEART_RATE.cautionAbove], critical: [HEART_RATE.criticalAbove], provenance: HEART_RATE.provenance },
  bloodPressure: {
    reference: [BLOOD_PRESSURE.reference.diastolic.min, BLOOD_PRESSURE.reference.systolic.max],
    caution: [BLOOD_PRESSURE.cautionAbove.systolic, BLOOD_PRESSURE.cautionAbove.diastolic],
    critical: [BLOOD_PRESSURE.criticalAbove.systolic, BLOOD_PRESSURE.criticalAbove.diastolic],
    provenance: BLOOD_PRESSURE.provenance,
  },
  bloodGlucose: { reference: [BLOOD_GLUCOSE.reference.min, BLOOD_GLUCOSE.reference.max], caution: [BLOOD_GLUCOSE.cautionBelow, BLOOD_GLUCOSE.cautionAtOrAbove], critical: [BLOOD_GLUCOSE.criticalBelow, BLOOD_GLUCOSE.criticalAtOrAbove], provenance: BLOOD_GLUCOSE.provenance },
  bodyTemperature: { reference: [BODY_TEMPERATURE.reference.min, BODY_TEMPERATURE.reference.max], caution: [BODY_TEMPERATURE.cautionAtOrAbove], critical: [BODY_TEMPERATURE.criticalAtOrAbove], provenance: BODY_TEMPERATURE.provenance },
  sleep: { reference: [SLEEP.reference.min, SLEEP.reference.max], caution: [SLEEP.cautionBelow], critical: [SLEEP.criticalBelow], provenance: SLEEP.provenance },
  mood: { reference: [MOOD.reference.min, MOOD.reference.max], caution: [MOOD.cautionAtOrBelow], critical: [MOOD.criticalAtOrBelow], provenance: MOOD.provenance },
};

/** Which chart row keys belong to which metric. */
const SERIES_KEYS: Record<MetricId, string[]> = {
  heartRate: ["heartRate"],
  bloodPressure: ["systolic", "diastolic"],
  bloodGlucose: ["bloodGlucose"],
  bodyTemperature: ["bodyTemperature"],
  sleep: ["sleep"],
  mood: ["mood"],
  aredMinutes: ["aredMinutes"],
  radiation: ["cumulativeDose", "dailyDose"],
  pvt: ["pvt"],
  hydration: ["hydration"],
  symptoms: [],
};

/** Chart row keys whose manual-entry twin does not follow the `<key>Manual` pattern. */
const MANUAL_KEYS: Record<string, string> = { aredMinutes: "aredManual", cumulativeDose: "cumulativeManual", dailyDose: "cumulativeManual" };


function uniqueSources(list: (SourceRef | null)[]): SourceRef[] {
  const seen = new Set<string>();
  return list.filter((s): s is SourceRef => s !== null && !seen.has(s.url) && Boolean(seen.add(s.url)));
}

/** In-memory storage for hosts that do not pass one (tests, one-shot CLI runs). */
export function memoryStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function createAstraCore(backend: StorageLike = memoryStorage(), options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());
  const storage = createStorageService(backend);
  const mission = createMissionStore(storage);
  const tuesday = createTuesdayStore(storage);
  const archived = getArchivedEvents();

  /** Everything the engines derive for the selected day, same wiring as the web console. */
  function model() {
    const { settings, measurements, completions, followUps: followUpLog } = mission.getState();
    const { scenarioId, selectedDay: day, aredTargetMinutes, hydrationTargetLiters } = settings;
    const days = buildEffectiveDays(scenarioId, measurements);
    const engineInput: EngineInput = { days, settings: { aredTargetMinutes, hydrationTargetLiters }, evaluatedAt: now().toISOString() };
    const missionDays = evaluateMissionDays(engineInput);
    const diagnostics = evaluateAllMetrics(engineInput, day);
    const advisories = [...scenarioAdvisories(scenarioId, day), ...donkiAdvisories(archived, now().getTime())];
    const overall = aggregateStatus(diagnostics, advisories);
    const systems = evaluateBodySystems(diagnostics, advisories);
    const taskDefinitions = getCountermeasureTasks(aredTargetMinutes, hydrationTargetLiters);
    const readinessInput: ReadinessInput = { scenarioId, tasks: taskDefinitions, days, completions, aredTargetMinutes, hydrationTargetLiters };
    const tasks = tasksForDay(readinessInput, day);
    const followUps = buildFollowUps({
      day,
      diagnostics,
      advisories,
      yesterdayTasks: day > 1 ? tasksForDay(readinessInput, day - 1) : [],
      taskDefinitions,
      log: followUpLog,
    });
    const readiness = computeReadiness(readinessInput, day, followUps, diagnostics);
    const trends = trendWatch(days, day, diagnostics);
    const drift = baselineDrift(days, day);
    const primaryAction = mostImportantAction(followUps, tasks, day);
    return { settings, day, days, missionDays, diagnostics, advisories, overall, systems, tasks, followUps, readiness, trends, drift, primaryAction, readinessInput, measurements };
  }

  type Model = ReturnType<typeof model>;

  function tuesdayContext(m: Model): TuesdayContext {
    const activity = tuesday.getState().activity;
    const recentEnergy = [...activity].reverse().find((a) => a.kind === "checkin" && a.energy !== undefined)?.energy ?? null;
    return {
      day: m.day,
      overall: m.overall.status,
      diagnostics: m.diagnostics,
      systems: m.systems,
      advisories: m.advisories,
      trends: m.trends,
      drift: m.drift,
      primaryAction: m.primaryAction.text,
      lightMinutes: earthMarsLightMinutes(now()),
      recentEnergy,
    };
  }

  function snapshot(args: { linkUp?: boolean } = {}) {
    const m = model();
    const linkUp = args.linkUp ?? false;
    const delay = earthMarsLightMinutes(now());
    const scenario = SCENARIOS[m.settings.scenarioId];
    const td = tuesday.getState();
    const wellbeing = wellbeingSummary(td.activity, m.day);
    const metrics = ALL_METRIC_IDS.map((id) => {
      const d = m.diagnostics[id];
      const g = METRIC_GUIDANCE[id];
      return {
        id,
        name: g.name,
        shortName: g.shortName,
        unit: g.unit,
        system: g.system,
        status: d.status,
        summary: d.summary,
        explanation: d.explanation,
        recommendedNextStep: d.recommendedNextStep,
        freshness: d.freshness,
        persistenceDays: d.persistenceDays,
        value: d.latest ? formatWithUnit(id, d.latest.value) : null,
        delta: d.latest && d.previous ? formatDelta(id, d.latest.value, d.previous.value) : null,
        recordedAt: d.latest ? formatReadingStamp(d.latest.missionDay, d.latest.recordedAt) : null,
        source: d.latest?.source ?? null,
        notes: d.notes,
        rules: d.triggeredRules,
        basis: d.basis,
        guidance: {
          whatItMeasures: g.whatItMeasures,
          whyItMatters: g.whyItMatters,
          deviceRequired: g.deviceRequired,
          howToMeasure: g.howToMeasure,
          microgravityEffects: g.microgravityEffects,
          whenToRepeat: g.whenToRepeat,
          whatToRecord: g.whatToRecord,
          nextStep: g.nextStep,
          reference: g.reference,
        },
      };
    });
    const hazards = hazardMap({
      systems: m.systems,
      diagnostics: m.diagnostics,
      advisories: m.advisories,
      drift: m.drift,
      linkUp,
      signalDelayMinutes: delay,
      queuedMessages: td.outbox.length,
      checkInsThisWeek: wellbeing.checkIns,
      rechargeMinutesThisWeek: wellbeing.rechargeMinutes,
    });
    return {
      coreVersion: CORE_VERSION,
      dataLabel: DATA_LABEL,
      disclaimer: GUIDANCE_DISCLAIMER,
      mission: { name: MISSION.name, shortName: MISSION.shortName, crewId: MISSION.crewId, crewLabel: MISSION.crewLabel, totalDays: MISSION.totalDays },
      day: m.day,
      shipTime: currentShipTime(now()),
      signalDelayMinutes: delay,
      settings: m.settings,
      storage: mission.getState().storage,
      scenario: { id: scenario.id, code: scenario.code, name: scenario.name, summary: scenario.summary, focusDay: scenario.focusDay, events: scenario.events },
      scenarios: SCENARIO_ORDER.map((id) => ({ id, code: SCENARIOS[id].code, name: SCENARIOS[id].name, summary: SCENARIOS[id].summary, focusDay: SCENARIOS[id].focusDay })),
      overall: { status: m.overall.status, counts: m.overall.counts, advisoryCount: m.overall.advisoryCount, drivers: m.overall.drivers.map((d) => d.metricId) },
      dayStatus: m.missionDays.overall,
      metrics,
      systems: Object.values(m.systems).map((s) => ({
        id: s.id,
        name: BODY_SYSTEMS[s.id].name,
        shortName: BODY_SYSTEMS[s.id].shortName,
        status: s.status,
        metrics: BODY_SYSTEMS[s.id].metrics,
        whyItMatters: BODY_SYSTEMS[s.id].whyItMatters,
        observations: s.observations,
        recommendedNextStep: s.recommendedNextStep,
      })),
      advisories: m.advisories.map((a) => ({
        id: a.id,
        source: a.source,
        level: a.level,
        severity: a.severity,
        phase: a.phase,
        title: a.title,
        summary: a.summary,
        whyItMatters: a.whyItMatters,
        nextStep: a.nextStep,
        provenanceLabel: a.provenanceLabel,
        actions: a.actions.map((x) => x.text),
      })),
      tasks: m.tasks,
      followUps: m.followUps,
      readiness: m.readiness,
      primaryAction: m.primaryAction,
      trends: m.trends,
      drift: { state: m.drift.state, text: m.drift.text, unusualDays: m.drift.unusualDays, latestScore: m.drift.latestScore, scores: m.drift.scores, drivers: m.drift.drivers },
      hazards,
      hazardInfo: SPACEFLIGHT_HAZARDS,
      contactSteps: { onboardFirst: ONBOARD_FIRST, noLink: NO_LINK_STEPS, linkUpNote: LINK_UP_NOTE },
      wellbeing,
      sun: subsolarPoint(now()),
      tuesday: { messages: td.messages, outbox: td.outbox, bestScore: td.bestScore, persisted: tuesday.isPersisted() },
    };
  }

  /** Chart series for one metric over a trend window. Days after the selected day have no values. */
  function series(args: { metricId: MetricId; window: TrendWindow }) {
    const m = model();
    const range = windowRange(m.day, args.window, MISSION.totalDays);
    const rows = buildChartRows(m.days, m.day, range);
    const keys = SERIES_KEYS[args.metricId];
    return {
      metricId: args.metricId,
      range,
      keys,
      points: rows.map((r) => ({
        day: r.day,
        status: m.missionDays.byMetric[args.metricId][r.day - 1] ?? "NOMINAL",
        values: Object.fromEntries(keys.map((k) => [k, typeof r[k] === "number" ? r[k] : null])),
        manual: keys.some((k) => {
          const manualKey = MANUAL_KEYS[k] ?? `${k}Manual`;
          return typeof r[manualKey] === "number" || typeof r[manualKey.replace(/Manual$/, "Tuesday")] === "number";
        }),
      })),
      lines: CHART_LINES[args.metricId] ?? null,
      events: SCENARIOS[m.settings.scenarioId].events.filter((e) => e.metrics.includes(args.metricId) && e.endDay >= range[0] && e.startDay <= range[1]),
    };
  }

  function logMeasurement(raw: unknown) {
    const draft = toLogDraft(raw);
    if (!draft) return { ok: false as const, errors: { value: "Unknown indicator." } };
    const saved = logDraft(mission, draft);
    if (!saved.ok) return saved;
    return { ...saved, status: model().diagnostics[draft.metricId].status };
  }

  /** Tuesday's answer with no language model: the same fixed replies and onboard guidance as the web console. */
  function tuesdayAsk(args: { text: string }) {
    const question = args.text.trim().slice(0, 1200);
    if (!question) return null;
    const m = model();
    const ctx = tuesdayContext(m);
    tuesday.addMessage({ role: "user", text: question });
    const intent = detectIntent(question);
    let text: string;
    let actions: TuesdayAction[];
    let sources: SourceRef[] = [];
    let fixed = false;
    if (intent === "crisis") {
      text = CRISIS_REPLY;
      actions = actionsFor("crisis", ctx);
      fixed = true;
    } else {
      const vitals = reportedVitalsReply(readingsInText(question));
      if (vitals || intent === "urgent") {
        const r = vitals ?? { text: URGENT_REPLY, actions: actionsFor("urgent", ctx) };
        text = r.text;
        actions = r.actions;
        fixed = true;
      } else {
        const passages = retrieve(knowledgeIndex(), question, 4);
        const r = offlineReply(intent, ctx, passages);
        text = r.text;
        actions = r.actions;
        sources = uniqueSources(passages.slice(0, 1).map((p) => p.doc.source));
      }
    }
    const msg = tuesday.addMessage({ role: "tuesday", text, via: "core", actions, sources });
    return { intent, fixed, message: msg };
  }

  /**
   * Prompt for an on-device model (Apple Foundation Models on iPad, Ollama on
   * desktop). Returns null when the question must get a fixed reply instead.
   */
  function tuesdayModelPrompt(args: { text: string }) {
    const question = args.text.trim().slice(0, 1200);
    const intent = detectIntent(question);
    if (!question || intent === "crisis" || intent === "urgent" || reportedVitalsReply(readingsInText(question))) return null;
    const m = model();
    const passages = retrieve(knowledgeIndex(), question, 4);
    const history = tuesday
      .getState()
      .messages.filter((x) => x.text && !x.attachment && x.role !== "officer")
      .slice(-8)
      .map((x) => ({ role: x.role === "user" ? ("user" as const) : ("assistant" as const), content: x.text }));
    const messages = buildModelMessages(buildHealthBrief(tuesdayContext(m)), passages, history, question);
    return { intent, system: TUESDAY_SYSTEM_PROMPT, messages, sources: uniqueSources(passages.map((p) => p.doc.source)), hasPassages: passages.length > 0 };
  }

  /** Stores a model answer after the safety filter. The raw answer is never stored. */
  function tuesdayRecordModelAnswer(args: { question: string; answer: string; model: string; hasPassages: boolean; sources: SourceRef[] }) {
    const m = model();
    const ctx = tuesdayContext(m);
    const filtered = safetyFilter(args.answer);
    if (!args.hasPassages) filtered.text = filtered.text.replace(/\s?\[\d+\]/g, "");
    tuesday.addMessage({ role: "user", text: args.question.trim().slice(0, 1200) });
    const text = filtered.text || "I don't have a good answer for that. If it's about your health, contact the medical officer when communication is available.";
    return tuesday.addMessage({
      role: "tuesday",
      text,
      via: "model",
      model: args.model.slice(0, 80),
      actions: actionsFor(detectIntent(args.question), ctx),
      sources: args.sources,
      ...(filtered.removed ? { filtered: filtered.removed } : {}),
    });
  }

  function report() {
    const m = model();
    return buildSurgeonReport({
      day: m.day,
      scenario: SCENARIOS[m.settings.scenarioId],
      overall: m.overall,
      systems: m.systems,
      diagnostics: m.diagnostics,
      trends: m.trends,
      advisories: m.advisories,
      followUps: m.followUps,
      readiness: m.readiness,
      days: m.days,
      generatedAt: now().toISOString().slice(0, 16).replace("T", " "),
      signalDelayMinutes: earthMarsLightMinutes(now()),
      drift: m.drift,
    });
  }

  function medicalMessage(args: { priority: ContactPriority; report: string; actionsTaken: string; linkUp: boolean }) {
    const m = model();
    return buildMedicalMessage({
      day: m.day,
      shipTime: currentShipTime(now()),
      priority: args.priority,
      overall: m.overall.status,
      diagnostics: m.diagnostics,
      trends: m.trends,
      drift: m.drift,
      advisories: m.advisories,
      report: args.report.slice(0, 1200),
      actionsTaken: args.actionsTaken.slice(0, 800),
      linkUp: args.linkUp,
      signalDelayMinutes: earthMarsLightMinutes(now()),
    });
  }

  const ACTIVITY_KINDS: readonly ActivityKind[] = ["checkin", "earth", "game", "breathe"];

  const handlers: Record<string, (a: Record<string, unknown>) => unknown> = {
    snapshot: (a) => snapshot({ linkUp: a.linkUp === true }),
    series: (a) => series({ metricId: isMetricId(a.metricId) ? a.metricId : "heartRate", window: ([7, 30, 90, 180] as const).find((w) => w === a.window) ?? 30 }),
    setDay: (a) => (mission.setSelectedDay(Number(a.day)), true),
    setScenario: (a) => (isScenarioId(a.scenarioId) ? mission.setScenario(a.scenarioId as ScenarioId) : { ok: false, persisted: false, message: "Unknown scenario." }),
    logMeasurement: (a) => logMeasurement(a),
    deleteMeasurement: (a) => mission.deleteMeasurement(String(a.id)),
    measurements: () => mission.getState().measurements.filter((x) => x.source !== "synthetic"),
    setTaskCompletion: (a) => mission.setTaskCompletion(Number(a.day), String(a.taskId), a.completed === true),
    setFollowUpCompletion: (a) => mission.setFollowUpCompletion(Number(a.day), String(a.id), a.completed === true),
    updatePlanTargets: (a) => mission.updatePlanTargets(Number(a.aredTargetMinutes), Number(a.hydrationTargetLiters)),
    resetDemoData: () => mission.resetDemoData(),
    tuesdayAsk: (a) => tuesdayAsk({ text: String(a.text ?? "") }),
    tuesdayModelPrompt: (a) => tuesdayModelPrompt({ text: String(a.text ?? "") }),
    tuesdayRecordModelAnswer: (a) =>
      tuesdayRecordModelAnswer({
        question: String(a.question ?? ""),
        answer: String(a.answer ?? ""),
        model: String(a.model ?? "on-device model"),
        hasPassages: a.hasPassages === true,
        sources: Array.isArray(a.sources) ? (a.sources.filter((s) => isRecord(s) && typeof s.label === "string" && typeof s.url === "string") as SourceRef[]) : [],
      }),
    safetyFilter: (a) => safetyFilter(String(a.text ?? "")),
    clearConversation: () => tuesday.clearConversation(),
    logActivity: (a) => {
      const kind = ACTIVITY_KINDS.find((k) => k === a.kind);
      if (!kind) return { persisted: false };
      const num = (x: unknown, lo: number, hi: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : undefined);
      const entry = {
        kind,
        missionDay: mission.getState().settings.selectedDay,
        ...(num(a.minutes, 0, 600) !== undefined ? { minutes: num(a.minutes, 0, 600) } : {}),
        ...(num(a.score, 0, 1_000_000) !== undefined ? { score: num(a.score, 0, 1_000_000) } : {}),
        ...(num(a.mood, 1, 5) !== undefined ? { mood: num(a.mood, 1, 5) } : {}),
        ...(num(a.energy, 1, 5) !== undefined ? { energy: num(a.energy, 1, 5) } : {}),
      };
      return { persisted: tuesday.logActivity(entry).persisted };
    },
    queueMessage: (a) =>
      tuesday.queueMessage({ missionDay: mission.getState().settings.selectedDay, priority: a.priority === "urgent" ? "urgent" : "routine", text: String(a.text ?? "").slice(0, 6000) }),
    removeQueued: (a) => tuesday.removeQueued(String(a.id)),
    report: () => report(),
    medicalMessage: (a) =>
      medicalMessage({ priority: a.priority === "urgent" ? "urgent" : "routine", report: String(a.report ?? ""), actionsTaken: String(a.actionsTaken ?? ""), linkUp: a.linkUp === true }),
  };

  return {
    snapshot,
    series,
    logMeasurement,
    tuesdayAsk,
    tuesdayModelPrompt,
    tuesdayRecordModelAnswer,
    report,
    medicalMessage,
    mission,
    tuesday,
    /** Names accepted by `call`. */
    methods: Object.keys(handlers),
    /**
     * Single entry point for hosts that bridge strings (JavaScriptCore, IPC).
     * Returns `{"ok":true,"result":…}` or `{"ok":false,"error":"…"}`. Never throws.
     */
    call(method: string, argsJson = "{}"): string {
      try {
        const handler = handlers[method];
        if (!handler) return JSON.stringify({ ok: false, error: `Unknown method: ${method}` });
        const parsed: unknown = argsJson ? JSON.parse(argsJson) : {};
        const result = handler(isRecord(parsed) ? parsed : {});
        return JSON.stringify({ ok: true, result: result ?? null });
      } catch (e) {
        return JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Core error" });
      }
    },
  };
}

export type AstraCore = ReturnType<typeof createAstraCore>;
