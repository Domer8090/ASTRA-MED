import { describe, expect, it } from "vitest";
import { knowledgeIndex } from "../data/knowledgeBase";
import { buildEffectiveDays } from "../services/telemetryService";
import { chooseModels, isLocalEndpoint } from "../services/localModel";
import { memoryBackend, createStorageService, STORAGE_KEYS } from "../services/storageService";
import { createTuesdayStore, sanitizeTuesday, wellbeingSummary } from "../state/tuesdayStore";
import { anomalyScore, baselineDrift, trainIsolationForest } from "./baselineEngine";
import { HAND_CONNECTIONS, handSpread, readHandPose, type Landmark } from "./gestures";
import { retrieve } from "./retrieval";
import { gaussian, mulberry32 } from "../utils/prng";
import { latLonToVector, subsolarPoint } from "./sunPosition";
import { buildMedicalMessage } from "./medicalContact";
import { hazardMap } from "./hazardMap";
import { evaluateAllMetrics } from "./diagnosticEngine";
import { evaluateBodySystems } from "./bodySystemEngine";
import { scenarioAdvisories } from "./advisoryEngine";
import { CRISIS_REPLY, detectIntent, parseLabResults, readingsInText, reportedVitalsReply, safetyFilter, SAFETY_REPLACEMENT } from "./tuesdayEngine";

describe("isolation forest", () => {
  it("scores an outlier above ordinary points", () => {
    const rows: number[][] = [];
    const rand = mulberry32(3);
    for (let i = 0; i < 200; i++) rows.push([gaussian(rand), gaussian(rand)]);
    const forest = trainIsolationForest(rows, { trees: 100, sampleSize: 32, seed: 7 });
    const outlier = anomalyScore(forest, [6, -6]);
    const ordinary = anomalyScore(forest, [0, 0]);
    expect(outlier).toBeGreaterThan(0.6);
    expect(ordinary).toBeLessThan(0.5);
  });

  it("is deterministic for a seed", () => {
    const rows = Array.from({ length: 30 }, (_, i) => [i % 5, (i * 7) % 3]);
    const a = trainIsolationForest(rows, { trees: 20, sampleSize: 16, seed: 1 });
    const b = trainIsolationForest(rows, { trees: 20, sampleSize: 16, seed: 1 });
    expect(anomalyScore(a, [9, 9])).toBe(anomalyScore(b, [9, 9]));
  });
});

describe("baseline drift", () => {
  it("never fires across the nominal and SEP missions", () => {
    for (const id of ["nominal", "sep"] as const) {
      const days = buildEffectiveDays(id, []);
      for (let d = 21; d <= 180; d++) expect(baselineDrift(days, d).state, `${id} day ${d}`).not.toBe("drift");
    }
  });

  it("flags the cardiovascular drift before CAUTION on day 112, led by heart rate", () => {
    const days = buildEffectiveDays("cardiovascular", []);
    expect(baselineDrift(days, 100).state).toBe("steady");
    const r = baselineDrift(days, 109);
    expect(r.state).toBe("drift");
    expect(r.drivers[0]!.feature).toBe("heartRate");
    expect(r.drivers[0]!.direction).toBe("higher");
    expect(r.text).toMatch(/not a diagnosis/);
  });

  it("needs enough history", () => {
    expect(baselineDrift(buildEffectiveDays("nominal", []), 10).state).toBe("insufficient");
  });
});

describe("retrieval", () => {
  it("finds the shelter protocol and sleep guidance", () => {
    const idx = knowledgeIndex();
    expect(retrieve(idx, "solar storm shelter what do I do")[0]!.doc.id).toBe("protocol:sep");
    expect(retrieve(idx, "how should I measure my sleep")[0]!.doc.id).toBe("guidance:sleep");
    expect(retrieve(idx, "I feel lonely and miss looking at earth").some((p) => p.doc.kind === "wellbeing")).toBe(true);
    expect(retrieve(idx, "zzzz qqqq")).toEqual([]);
  });
});

describe("tuesday safety", () => {
  it("removes medication, dose, diagnosis and exercise-change sentences", () => {
    const r = safetyFilter("Your heart rate is up. Take 200 mg ibuprofen. You probably have an infection. Skip your ARED session today. Drink water.");
    expect(r.removed).toBe(3);
    expect(r.text).not.toMatch(/ibuprofen|infection|Skip/);
    expect(r.text).toMatch(/Drink water/);
    expect(r.text).toContain(SAFETY_REPLACEMENT);
  });

  it("keeps 'not a diagnosis' and strips thinking blocks", () => {
    const r = safetyFilter("<think>hidden</think>This is a projection, not a diagnosis.");
    expect(r).toEqual({ text: "This is a projection, not a diagnosis.", removed: 0 });
  });

  it("routes intents, crisis first", () => {
    expect(detectIntent("I'm so bored")).toBe("bored");
    expect(detectIntent("i feel exhausted")).toBe("tired");
    expect(detectIntent("how am I doing today?")).toBe("status");
    expect(detectIntent("show me earth")).toBe("earth");
    expect(detectIntent("I'm bored and I want to hurt myself")).toBe("crisis");
    expect(CRISIS_REPLY).toMatch(/crewmate/);
  });

  it("parses lab JSON defensively", () => {
    expect(parseLabResults('noise {"results":[{"analyte":"Glucose","value":"92","unit":"mg/dL","referenceRange":"70-99","flag":"NORMAL"},{"analyte":"","value":"1"}]}')).toEqual([
      { analyte: "Glucose", value: "92", unit: "mg/dL", referenceRange: "70-99", flag: "normal" },
    ]);
    expect(parseLabResults("no json")).toBeNull();
  });
});

describe("local model", () => {
  it("accepts only loopback endpoints", () => {
    expect(isLocalEndpoint("http://localhost:11434")).toBe(true);
    expect(isLocalEndpoint("http://127.0.0.1:11434")).toBe(true);
    expect(isLocalEndpoint("https://api.example.com")).toBe(false);
    expect(isLocalEndpoint("http://localhost.evil.com")).toBe(false);
    expect(isLocalEndpoint("file:///etc")).toBe(false);
  });

  it("prefers Qwen3 for chat and MedGemma for images", () => {
    expect(chooseModels(["llama3.1:8b", "qwen3:8b", "medgemma1.5:4b"])).toEqual({ chat: "qwen3:8b", medical: "medgemma1.5:4b" });
    expect(chooseModels(["nomic-embed-text", "llama3.1:8b"])).toEqual({ chat: "llama3.1:8b", medical: null });
    expect(chooseModels(["a", "b"], { chat: "b" }).chat).toBe("b");
  });
});

describe("tuesday store", () => {
  it("rejects a remote endpoint from storage and drops bad entries", () => {
    const d = sanitizeTuesday({ settings: { endpoint: "https://evil.example" }, messages: [{ id: "1", role: "x" }], activity: [{ id: "a", at: "2026-01-01T00:00:00Z", missionDay: 4, kind: "earth", minutes: 3 }] })!;
    expect(d.settings.endpoint).toBe("http://localhost:11434");
    expect(d.messages).toEqual([]);
    expect(d.activity).toHaveLength(1);
  });

  it("persists activity and summarises the last week", () => {
    const backend = memoryBackend();
    const store = createTuesdayStore(createStorageService(backend));
    store.logActivity({ kind: "checkin", missionDay: 40, mood: 4, energy: 2 });
    const { entry } = store.logActivity({ kind: "game", missionDay: 41, minutes: 1, score: 120 });
    store.rateActivity(entry.id, 4);
    store.logActivity({ kind: "earth", missionDay: 30, minutes: 9 });
    expect(JSON.parse(backend.data[STORAGE_KEYS.tuesday]!).bestScore).toBe(120);
    store.logActivity({ kind: "game", missionDay: 41, minutes: 0, score: 500 }, false);
    expect(store.getState().bestScore).toBe(120);
    expect(wellbeingSummary(store.getState().activity, 42)).toEqual({ checkIns: 1, averageEnergy: 2, rechargeMinutes: 1, sessions: 2, averageAfter: 4 });
  });
});

describe("hand pose", () => {
  const hand = (tipSpread: number, pinchGap: number): Landmark[] => {
    const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
    lm[0] = { x: 0.5, y: 0.9 };
    lm[9] = { x: 0.5, y: 0.7 };
    for (const [tip, joint] of [[8, 6], [12, 10], [16, 14], [20, 18]] as const) {
      lm[joint] = { x: 0.5, y: 0.75 };
      lm[tip] = { x: 0.5, y: 0.9 - tipSpread };
    }
    lm[4] = { x: lm[8]!.x + pinchGap, y: lm[8]!.y };
    return lm;
  };

  it("reads open hand, fist and pinch with hysteresis", () => {
    expect(readHandPose(hand(0.35, 0.2))).toMatchObject({ open: true, extended: 4, pinch: false });
    expect(readHandPose(hand(0.05, 0.2))!.fist).toBe(true);
    expect(readHandPose(hand(0.35, 0.02))!.pinch).toBe(true);
    // 0.08 / 0.2 = 0.4: off when starting, still on once pinching.
    expect(readHandPose(hand(0.35, 0.08))!.pinch).toBe(false);
    expect(readHandPose(hand(0.35, 0.08), true)!.pinch).toBe(true);
    expect(readHandPose([])).toBeNull();
  });

  it("mirrors the cursor", () => {
    const lm = hand(0.35, 0.2);
    lm[8] = { x: 0.2, y: 0.3 };
    expect(readHandPose(lm)!.cursor).toEqual({ x: 0.8, y: 0.3 });
  });
});

describe("sun position", () => {
  it("puts the subsolar point near the tropic at the June solstice and near the equator at an equinox", () => {
    const june = subsolarPoint(new Date("2026-06-21T12:00:00Z"));
    expect(june.lat).toBeCloseTo(23.4, 0);
    expect(Math.abs(june.lon)).toBeLessThan(3);
    const march = subsolarPoint(new Date("2026-03-20T18:00:00Z"));
    expect(Math.abs(march.lat)).toBeLessThan(0.5);
    expect(march.lon).toBeGreaterThan(-95);
    expect(march.lon).toBeLessThan(-85);
  });

  it("maps longitude 0 on the equator to +X, matching three.js sphere UVs", () => {
    const [x, y, z] = latLonToVector(0, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
    expect(latLonToVector(90, 0)[1]).toBeCloseTo(1);
  });
});

describe("typed readings", () => {
  it("treats 250 bpm as CRITICAL with a fixed urgent reply, not games", () => {
    const text = "Yeah, that is boring too. Also my heart rate is elevated. 250 bpm is that good or bad?";
    expect(detectIntent(text)).toBe("symptom");
    const v = readingsInText(text);
    expect(v).toEqual([expect.objectContaining({ metricId: "heartRate", value: "250 bpm", level: "CRITICAL", outsideDeviceRange: true })]);
    const r = reportedVitalsReply(v)!;
    expect(r.text).toMatch(/CRITICAL/);
    expect(r.text).toMatch(/urgent channel/);
    expect(r.actions.map((a) => a.kind)).toEqual(["contact", "log", "guidance"]);
    expect(r.actions[0]).toEqual({ kind: "contact", priority: "urgent" });
  });

  it("reads blood pressure, temperature and glucose, and stays quiet for in-range values", () => {
    expect(readingsInText("bp 160/100").map((v) => v.level)).toEqual(["CRITICAL"]);
    expect(readingsInText("temperature 37.8")[0]).toMatchObject({ metricId: "bodyTemperature", level: "CAUTION" });
    expect(readingsInText("glucose 120 mg/dL")[0]).toMatchObject({ level: "CAUTION" });
    expect(reportedVitalsReply(readingsInText("my pulse is 62"))).toBeNull();
    expect(readingsInText("I'm bored")).toEqual([]);
  });

  it("sends red-flag symptoms to the urgent reply", () => {
    expect(detectIntent("I'm bored and I have chest pain")).toBe("urgent");
    expect(detectIntent("my heart is racing")).toBe("urgent");
  });
});

describe("medical officer message and hazard map", () => {
  const engine = (scenario: "nominal" | "cardiovascular" | "sep", day: number) => {
    const days = buildEffectiveDays(scenario, []);
    const input = { days, settings: { aredTargetMinutes: 60, hydrationTargetLiters: 2.5 }, evaluatedAt: "2026-11-14T00:00:00Z" };
    const diagnostics = evaluateAllMetrics(input, day);
    const advisories = scenarioAdvisories(scenario, day);
    return { days, diagnostics, advisories, systems: evaluateBodySystems(diagnostics, advisories), drift: baselineDrift(days, day) };
  };

  it("builds an urgent message with the crew report, flagged readings and a loss-of-signal note", () => {
    const e = engine("cardiovascular", 118);
    const text = buildMedicalMessage({
      day: 118,
      shipTime: "08:15",
      priority: "urgent",
      overall: "CAUTION",
      diagnostics: e.diagnostics,
      trends: [],
      drift: e.drift,
      advisories: e.advisories,
      report: "Heart pounding since 07:50.",
      actionsTaken: "Rested 10 min, repeated.",
      linkUp: false,
      signalDelayMinutes: 11,
    });
    expect(text).toMatch(/^URGENT: MESSAGE FOR THE MEDICAL OFFICER/);
    expect(text).toMatch(/loss of signal/);
    expect(text).toContain("Heart pounding since 07:50.");
    expect(text).toMatch(/Resting heart rate: 88\sbpm, CAUTION/);
    expect(text).toMatch(/No diagnosis or treatment/);
  });

  it("maps all five hazards with engine statuses and the ground link", () => {
    const e = engine("sep", 131);
    const cards = hazardMap({ systems: e.systems, diagnostics: e.diagnostics, advisories: e.advisories, drift: e.drift, linkUp: false, signalDelayMinutes: 11, queuedMessages: 1, checkInsThisWeek: 2, rechargeMinutesThisWeek: 9 });
    expect(cards.map((c) => c.id)).toEqual(["radiation", "isolation", "distance", "gravity", "environment"]);
    expect(cards[0]).toMatchObject({ status: "CAUTION", chip: "HAZARD WARNING" });
    expect(cards[1]!.action).toEqual({ kind: "tuesday" });
    expect(cards[2]).toMatchObject({ status: null, chip: "NO GROUND LINK", action: { kind: "contact" } });
    expect(cards[2]!.facts[1]).toMatch(/1 message queued/);
    const nominal = engine("nominal", 42);
    expect(hazardMap({ ...nominal, linkUp: true, signalDelayMinutes: 11, queuedMessages: 0, checkInsThisWeek: 0, rechargeMinutesThisWeek: 0 }).filter((c) => c.status && c.status !== "NOMINAL")).toEqual([]);
  });
});

describe("two hands and the ground loop", () => {
  it("measures the spread between two hand cursors and draws a 21-point skeleton", () => {
    const pose = (x: number, y: number) => ({ cursor: { x, y }, pinch: true, extended: 4, open: false, fist: false, palmSize: 0.2 });
    expect(handSpread(pose(0.2, 0.5), pose(0.5, 0.9))).toBeCloseTo(0.5);
    const points = new Set(HAND_CONNECTIONS.flat());
    expect(points.size).toBe(21);
  });

  it("keeps officer replies and the reviewed flag through storage", () => {
    const backend = memoryBackend();
    const store = createTuesdayStore(createStorageService(backend));
    store.queueMessage({ missionDay: 118, priority: "urgent", text: "URGENT: test" });
    const id = store.getState().outbox[0]!.id;
    store.markReviewed(id);
    store.addMessage({ role: "officer", text: "Rest and repeat." });
    store.updateSettings({ hands: 2, handIntroSeen: true });
    const reread = sanitizeTuesday(JSON.parse(backend.data[STORAGE_KEYS.tuesday]!))!;
    expect(reread.outbox[0]).toMatchObject({ id, reviewed: true });
    expect(reread.messages.at(-1)).toMatchObject({ role: "officer", text: "Rest and repeat." });
    expect(reread.settings).toMatchObject({ hands: 2, handIntroSeen: true });
  });
});

describe("health brief values", () => {
  it("lists the latest value of each indicator for the model", async () => {
    const { createAstraCore, memoryStorage } = await import("../core/astraCore");
    const core = createAstraCore(memoryStorage(), { now: () => new Date("2026-11-14T12:00:00Z") });
    const prompt = JSON.parse(core.call("tuesdayModelPrompt", JSON.stringify({ text: "how did I sleep" }))).result as { messages: { role: string; content: string }[] };
    const system = prompt.messages[0]!.content;
    expect(system).toMatch(/Latest readings: .*Daily sleep [\d.]+ h \(day \d+, NOMINAL\)/);
  });
});
