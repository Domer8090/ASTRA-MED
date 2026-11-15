/**
 * Auto Sync state. Framework-free, read through useSyncExternalStore.
 *
 * Persisted (`astra-med:v1:auto-sync`): which devices are paired, auto sync on
 * or off per device, the interval, and glucose records already saved.
 * In memory only: live Bluetooth links, the heart-rate stream and the activity
 * log. Bluetooth links cannot survive a reload; the panel offers Reconnect.
 *
 * Every reading goes through `logDraft`, so devices obey the same entry rules
 * as the crew form. Nothing here sends data anywhere.
 */
import { logDraft, type LogDraft } from "../core/logDraft";
import { getMissionTelemetry } from "../data/missionTelemetry";
import { SYNC_DEVICE_BY_ID, SYNC_NOTE } from "../data/syncDevices";
import { bridgeReading, isSyncDue, summariseHeartRate, SYNC_INTERVALS, type TimedSample } from "../engine/syncEngine";
import { connectBleProfile, type BleConnection, type BleReading } from "../services/bleHealth";
import { createStorageService, STORAGE_KEYS, type StorageService } from "../services/storageService";
import { buildEffectiveDays, cumulativeDoseAt } from "../services/telemetryService";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { formatWithUnit } from "../utils/formatting";
import type { MeasurementValue, MetricId, PairedDevice, SyncDeviceSpec, SyncInterval, SyncSettings } from "../types/health";
import { currentShipTime } from "../utils/dates";
import { isRecord } from "../utils/validation";
import type { MissionStore } from "./missionStore";

export type LinkStatus = "idle" | "connecting" | "connected" | "lost";

export interface LiveLink {
  status: LinkStatus;
  /** Latest heart rate from a streaming device, for display only. */
  liveBpm?: number;
  error?: string;
}

export interface SyncLogEntry {
  id: string;
  at: string;
  deviceId: string;
  ok: boolean;
  text: string;
}

export interface SyncState {
  settings: SyncSettings;
  links: Readonly<Record<string, LiveLink>>;
  log: readonly SyncLogEntry[];
  persisted: boolean;
}

export interface SyncResult {
  ok: boolean;
  message: string;
}

const DEFAULT_SYNC: SyncSettings = { intervalMinutes: 5, paired: [], glucoseSeen: [] };
const MAX_LOG = 30;
const MAX_SAMPLES = 120;

function isIso(x: unknown): x is string {
  return typeof x === "string" && Number.isFinite(Date.parse(x));
}

export function sanitizeSyncSettings(raw: unknown): SyncSettings | null {
  if (!isRecord(raw)) return null;
  const interval = SYNC_INTERVALS.includes(raw.intervalMinutes as SyncInterval) ? (raw.intervalMinutes as SyncInterval) : DEFAULT_SYNC.intervalMinutes;
  const paired: PairedDevice[] = [];
  if (Array.isArray(raw.paired)) {
    for (const p of raw.paired) {
      if (!isRecord(p) || typeof p.deviceId !== "string" || !SYNC_DEVICE_BY_ID[p.deviceId] || !isIso(p.pairedAt)) continue;
      if (paired.some((x) => x.deviceId === p.deviceId)) continue;
      const out: PairedDevice = { deviceId: p.deviceId, pairedAt: p.pairedAt, autoSync: p.autoSync !== false };
      if (isIso(p.lastSyncAt)) out.lastSyncAt = p.lastSyncAt;
      if (typeof p.hardwareName === "string" && p.hardwareName.length <= 80) out.hardwareName = p.hardwareName;
      paired.push(out);
    }
  }
  const glucoseSeen = Array.isArray(raw.glucoseSeen) ? raw.glucoseSeen.filter((n): n is number => Number.isInteger(n)).slice(-500) : [];
  return { intervalMinutes: interval, paired, glucoseSeen };
}

export function createSyncStore(mission: MissionStore, storage: StorageService = createStorageService()) {
  const read = storage.read(STORAGE_KEYS.autoSync, sanitizeSyncSettings, DEFAULT_SYNC);
  // Bridge devices are always reachable in the simulation, so they come back connected after a reload.
  const initialLinks: Record<string, LiveLink> = {};
  for (const p of read.value.paired) if (SYNC_DEVICE_BY_ID[p.deviceId]?.link.kind === "bridge") initialLinks[p.deviceId] = { status: "connected" };
  let state: SyncState = { settings: read.value, links: initialLinks, log: [], persisted: storage.available };
  const listeners = new Set<() => void>();
  const connections = new Map<string, BleConnection>();
  const hrSamples = new Map<string, TimedSample[]>();

  function emit(next: Partial<SyncState>) {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  }

  function saveSettings(settings: SyncSettings): boolean {
    const ok = storage.write(STORAGE_KEYS.autoSync, settings);
    emit({ settings, persisted: ok });
    return ok;
  }

  function setLink(deviceId: string, link: LiveLink) {
    emit({ links: { ...state.links, [deviceId]: link } });
  }

  function addLog(deviceId: string, ok: boolean, text: string) {
    const entry: SyncLogEntry = { id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, at: currentShipTime(), deviceId, ok, text };
    emit({ log: [entry, ...state.log].slice(0, MAX_LOG) });
  }

  function markSynced(deviceId: string) {
    const paired = state.settings.paired.map((p) => (p.deviceId === deviceId ? { ...p, lastSyncAt: new Date().toISOString() } : p));
    saveSettings({ ...state.settings, paired });
  }

  /** Validates and stores one reading. Returns a human sentence for the activity log. */
  function store(spec: SyncDeviceSpec, draft: Omit<LogDraft, "missionDay" | "shipTime" | "source" | "notes">, simulated: boolean): SyncResult {
    const { selectedDay } = mission.getState().settings;
    const result = logDraft(mission, {
      ...draft,
      missionDay: selectedDay,
      shipTime: currentShipTime(),
      source: simulated ? "device-sim" : "device",
      notes: simulated ? SYNC_NOTE.bridge(spec.name) : SYNC_NOTE.device(spec.name),
    });
    if (!result.ok) {
      const reason = Object.values(result.errors)[0] ?? "Reading rejected.";
      return { ok: false, message: reason };
    }
    if (!result.persisted) return { ok: true, message: "Saved for this session only: browser storage is unavailable." };
    return { ok: true, message: result.completedTaskTitle ? `Saved. Completed “${result.completedTaskTitle}”.` : "Saved." };
  }

  function describe(metricId: MetricId, draft: { value?: string; systolic?: string; diastolic?: string }): string {
    const value: MeasurementValue =
      metricId === "bloodPressure" ? { systolic: Number(draft.systolic), diastolic: Number(draft.diastolic) } : Number(draft.value);
    return `${METRIC_GUIDANCE[metricId].shortName} ${formatWithUnit(metricId, value)}`;
  }

  function syncBridge(spec: SyncDeviceSpec): SyncResult {
    const { scenarioId, selectedDay } = mission.getState().settings;
    const telemetry = getMissionTelemetry(scenarioId)[selectedDay - 1];
    const days = buildEffectiveDays(scenarioId, mission.getState().measurements);
    const previousDose = cumulativeDoseAt(days, selectedDay - 1);
    const seed = `${spec.id}:${selectedDay}:${Date.now()}`;
    const parts: string[] = [];
    let anyOk = false;
    for (const metricId of spec.metrics) {
      const r = bridgeReading(metricId, telemetry, seed, previousDose);
      if (!r.ok) {
        parts.push(r.reason);
        continue;
      }
      const saved = store(spec, r.value, true);
      anyOk ||= saved.ok;
      parts.push(`${describe(metricId, r.value)}: ${saved.message}`);
    }
    const message = parts.join(" ");
    addLog(spec.id, anyOk, message);
    if (anyOk) markSynced(spec.id);
    return { ok: anyOk, message };
  }

  function syncHeartRate(spec: SyncDeviceSpec): SyncResult {
    const bpm = summariseHeartRate(hrSamples.get(spec.id) ?? [], Date.now());
    if (bpm === null) {
      const message = "Not enough heart-rate data in the last 30 seconds. Check the strap or watch is worn and broadcasting.";
      addLog(spec.id, false, message);
      return { ok: false, message };
    }
    const draft = { metricId: "heartRate" as const, value: String(bpm) };
    const saved = store(spec, draft, false);
    const message = `${describe("heartRate", draft)} (30 s median): ${saved.message}`;
    addLog(spec.id, saved.ok, message);
    if (saved.ok) markSynced(spec.id);
    return { ok: saved.ok, message };
  }

  /** Discrete instrument readings (cuff, thermometer, glucose meter) are stored as they arrive when auto sync is on. */
  function onDiscreteReading(spec: SyncDeviceSpec, reading: BleReading) {
    const paired = state.settings.paired.find((p) => p.deviceId === spec.id);
    let draft: { metricId: MetricId; value?: string; systolic?: string; diastolic?: string } | null = null;
    if (reading.profile === "blood_pressure") draft = { metricId: "bloodPressure", systolic: String(reading.sample.systolic), diastolic: String(reading.sample.diastolic) };
    if (reading.profile === "health_thermometer") draft = { metricId: "bodyTemperature", value: reading.celsius.toFixed(1) };
    if (reading.profile === "glucose") {
      if (state.settings.glucoseSeen.includes(reading.sample.sequence)) return;
      draft = { metricId: "bloodGlucose", value: String(reading.sample.mgDl) };
    }
    if (!draft) return;
    if (!paired?.autoSync) {
      addLog(spec.id, false, `${describe(draft.metricId, draft)} received. Auto sync is off, so it was not saved.`);
      return;
    }
    const saved = store(spec, draft, false);
    addLog(spec.id, saved.ok, `${describe(draft.metricId, draft)}: ${saved.message}`);
    if (saved.ok) {
      if (reading.profile === "glucose") saveSettings({ ...state.settings, glucoseSeen: [...state.settings.glucoseSeen, reading.sample.sequence].slice(-500) });
      markSynced(spec.id);
    }
  }

  function disconnectLink(deviceId: string) {
    connections.get(deviceId)?.disconnect();
    connections.delete(deviceId);
    hrSamples.delete(deviceId);
    setLink(deviceId, { status: "idle" });
  }

  function addPaired(spec: SyncDeviceSpec, hardwareName?: string) {
    if (state.settings.paired.some((p) => p.deviceId === spec.id)) {
      if (hardwareName) saveSettings({ ...state.settings, paired: state.settings.paired.map((p) => (p.deviceId === spec.id ? { ...p, hardwareName } : p)) });
      return;
    }
    const entry: PairedDevice = { deviceId: spec.id, pairedAt: new Date().toISOString(), autoSync: true, ...(hardwareName ? { hardwareName } : {}) };
    saveSettings({ ...state.settings, paired: [...state.settings.paired, entry] });
  }

  return {
    getState: (): SyncState => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Bridge devices pair at once. Bluetooth devices open the browser picker (call from a click). */
    async connect(deviceId: string): Promise<SyncResult> {
      const spec = SYNC_DEVICE_BY_ID[deviceId];
      if (!spec) return { ok: false, message: "Unknown device." };
      if (spec.link.kind === "bridge") {
        addPaired(spec);
        setLink(spec.id, { status: "connected" });
        addLog(spec.id, true, "Paired through the simulated mission bridge.");
        return syncBridge(spec);
      }
      const profile = spec.link.profile;
      setLink(spec.id, { status: "connecting" });
      try {
        connections.get(spec.id)?.disconnect();
        const conn = await connectBleProfile(
          profile,
          (reading) => {
            if (reading.profile === "heart_rate") {
              const list = hrSamples.get(spec.id) ?? [];
              list.push({ at: Date.now(), bpm: reading.sample.bpm, ...(reading.sample.contact !== undefined ? { contact: reading.sample.contact } : {}) });
              hrSamples.set(spec.id, list.slice(-MAX_SAMPLES));
              setLink(spec.id, { status: "connected", liveBpm: reading.sample.bpm });
            } else {
              onDiscreteReading(spec, reading);
            }
          },
          () => {
            connections.delete(spec.id);
            setLink(spec.id, { status: "lost", error: "Connection lost. Bring the device closer and press Reconnect." });
            addLog(spec.id, false, "Bluetooth connection lost.");
          },
        );
        connections.set(spec.id, conn);
        addPaired(spec, conn.name);
        setLink(spec.id, { status: "connected" });
        addLog(spec.id, true, `Connected to ${conn.name} over Bluetooth.`);
        return { ok: true, message: `Connected to ${conn.name}.` };
      } catch (cause) {
        const cancelled = cause instanceof Error && cause.name === "NotFoundError";
        const message = cancelled ? "No device chosen." : cause instanceof Error ? cause.message : "Could not connect.";
        setLink(spec.id, { status: "idle", error: message });
        if (!cancelled) addLog(spec.id, false, message);
        return { ok: false, message };
      }
    },

    disconnect(deviceId: string): void {
      disconnectLink(deviceId);
    },

    /** Removes the pairing. Readings already saved stay in the mission record. */
    forget(deviceId: string): boolean {
      disconnectLink(deviceId);
      const links = { ...state.links };
      delete links[deviceId];
      emit({ links });
      return saveSettings({ ...state.settings, paired: state.settings.paired.filter((p) => p.deviceId !== deviceId) });
    },

    setAutoSync(deviceId: string, autoSync: boolean): boolean {
      return saveSettings({ ...state.settings, paired: state.settings.paired.map((p) => (p.deviceId === deviceId ? { ...p, autoSync } : p)) });
    },

    setInterval(intervalMinutes: SyncInterval): boolean {
      return saveSettings({ ...state.settings, intervalMinutes });
    },

    /** Sync one device now, regardless of the interval. */
    syncNow(deviceId: string): SyncResult {
      const spec = SYNC_DEVICE_BY_ID[deviceId];
      if (!spec) return { ok: false, message: "Unknown device." };
      if (spec.link.kind === "bridge") return syncBridge(spec);
      if (!connections.has(deviceId)) return { ok: false, message: "Not connected. Press Reconnect first." };
      if (spec.link.profile === "heart_rate") return syncHeartRate(spec);
      return { ok: true, message: "This instrument sends each reading when you take it. Take a reading now." };
    },

    /** Called on a timer. Syncs every paired device that has auto sync on and is due. */
    tick(now = Date.now()): void {
      for (const p of state.settings.paired) {
        if (!p.autoSync || !isSyncDue(p.lastSyncAt, state.settings.intervalMinutes, now)) continue;
        const spec = SYNC_DEVICE_BY_ID[p.deviceId];
        if (!spec) continue;
        if (spec.link.kind === "bridge") {
          if (state.links[spec.id]?.status === "connected") syncBridge(spec);
        } else if (spec.link.profile === "heart_rate" && connections.has(spec.id)) {
          syncHeartRate(spec);
        }
      }
    },

    dispose(): void {
      for (const c of connections.values()) c.disconnect();
      connections.clear();
    },
  };
}

export type SyncStore = ReturnType<typeof createSyncStore>;
