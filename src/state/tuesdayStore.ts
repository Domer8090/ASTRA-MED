/**
 * Tuesday's own local state: settings, conversation, wellbeing activity log
 * and game best score. Stored in this browser only (`astra-med:v1:tuesday`).
 * Framework-free, read through useSyncExternalStore.
 */
import type { TuesdayAction } from "../engine/tuesdayEngine";
import { DEFAULT_ENDPOINT, isLocalEndpoint } from "../services/localModel";
import { createStorageService, STORAGE_KEYS, type StorageService } from "../services/storageService";
import { ALL_METRIC_IDS, type SourceRef } from "../types/health";

export interface TuesdaySettings {
  endpoint: string;
  useModel: boolean;
  chatModel: string | null;
  medicalModel: string | null;
  voice: boolean;
}

export interface TuesdayMessage {
  id: string;
  role: "user" | "tuesday";
  text: string;
  at: string;
  /** "core" = offline rules, "model" = on-device language model. */
  via?: "core" | "model";
  model?: string;
  sources?: SourceRef[];
  actions?: TuesdayAction[];
  /** The user attached an image; the image itself is never stored. */
  attachment?: "photo" | "lab";
  /** Sentences removed by the safety filter. */
  filtered?: number;
}

export type ActivityKind = "checkin" | "earth" | "game" | "breathe";

export interface ActivityEntry {
  id: string;
  at: string;
  missionDay: number;
  kind: ActivityKind;
  minutes?: number;
  score?: number;
  mood?: number;
  energy?: number;
  /** How the crew member felt afterwards, 1–5. */
  after?: number;
}

/** A message for the medical officer kept on this device until the crew hands it over. */
export interface OutboxMessage {
  id: string;
  createdAt: string;
  missionDay: number;
  priority: "urgent" | "routine";
  text: string;
}

export interface TuesdayData {
  settings: TuesdaySettings;
  messages: TuesdayMessage[];
  activity: ActivityEntry[];
  bestScore: number;
  outbox: OutboxMessage[];
}

export const DEFAULT_TUESDAY: TuesdayData = {
  settings: { endpoint: DEFAULT_ENDPOINT, useModel: true, chatModel: null, medicalModel: null, voice: false },
  messages: [],
  activity: [],
  bestScore: 0,
  outbox: [],
};

const MAX_MESSAGES = 60;
const MAX_ACTIVITY = 300;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const s = (x: unknown, max = 4000): string | undefined => (typeof x === "string" ? x.slice(0, max) : undefined);
const n = (x: unknown, min: number, max: number): number | undefined => (typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? x : undefined);
const iso = (x: unknown): string | undefined => (typeof x === "string" && !Number.isNaN(Date.parse(x)) ? x : undefined);

const ACTION_KINDS = new Set(["earth", "game", "breathe", "checkin", "guidance", "log", "report", "contact"]);
const KINDS = new Set<ActivityKind>(["checkin", "earth", "game", "breathe"]);

function sanitizeAction(x: unknown): TuesdayAction | null {
  if (!isRecord(x) || typeof x.kind !== "string" || !ACTION_KINDS.has(x.kind)) return null;
  if (x.kind === "contact") return { kind: "contact", priority: x.priority === "urgent" ? "urgent" : "routine" };
  if (x.kind === "guidance" || x.kind === "log") {
    return typeof x.metricId === "string" && (ALL_METRIC_IDS as readonly string[]).includes(x.metricId) ? ({ kind: x.kind, metricId: x.metricId } as TuesdayAction) : null;
  }
  return { kind: x.kind } as TuesdayAction;
}

function sanitizeMessage(x: unknown): TuesdayMessage | null {
  if (!isRecord(x)) return null;
  const id = s(x.id, 80);
  const text = s(x.text);
  const at = iso(x.at);
  if (!id || text === undefined || !at || (x.role !== "user" && x.role !== "tuesday")) return null;
  const m: TuesdayMessage = { id, role: x.role, text, at };
  if (x.via === "core" || x.via === "model") m.via = x.via;
  const model = s(x.model, 120);
  if (model) m.model = model;
  if (Array.isArray(x.sources)) {
    m.sources = x.sources
      .filter(isRecord)
      .map((r) => ({ label: s(r.label, 200) ?? "", url: s(r.url, 400) ?? "" }))
      .filter((r) => r.label && /^https:\/\//.test(r.url))
      .slice(0, 6);
  }
  if (Array.isArray(x.actions)) m.actions = x.actions.map(sanitizeAction).filter((a): a is TuesdayAction => a !== null).slice(0, 4);
  if (x.attachment === "photo" || x.attachment === "lab") m.attachment = x.attachment;
  const filtered = n(x.filtered, 0, 99);
  if (filtered) m.filtered = filtered;
  return m;
}

function sanitizeActivity(x: unknown): ActivityEntry | null {
  if (!isRecord(x)) return null;
  const id = s(x.id, 80);
  const at = iso(x.at);
  const missionDay = n(x.missionDay, 1, 10_000);
  if (!id || !at || missionDay === undefined || typeof x.kind !== "string" || !KINDS.has(x.kind as ActivityKind)) return null;
  const e: ActivityEntry = { id, at, missionDay, kind: x.kind as ActivityKind };
  const minutes = n(x.minutes, 0, 600);
  const score = n(x.score, 0, 1_000_000);
  const mood = n(x.mood, 1, 5);
  const energy = n(x.energy, 1, 5);
  const after = n(x.after, 1, 5);
  if (minutes !== undefined) e.minutes = minutes;
  if (score !== undefined) e.score = score;
  if (mood !== undefined) e.mood = mood;
  if (energy !== undefined) e.energy = energy;
  if (after !== undefined) e.after = after;
  return e;
}

function sanitizeOutbox(x: unknown): OutboxMessage | null {
  if (!isRecord(x)) return null;
  const id = s(x.id, 80);
  const createdAt = iso(x.createdAt);
  const missionDay = n(x.missionDay, 1, 10_000);
  const text = s(x.text, 8000);
  if (!id || !createdAt || missionDay === undefined || !text || (x.priority !== "urgent" && x.priority !== "routine")) return null;
  return { id, createdAt, missionDay, priority: x.priority, text };
}

export function sanitizeTuesday(raw: unknown): TuesdayData | null {
  if (!isRecord(raw)) return null;
  const st = isRecord(raw.settings) ? raw.settings : {};
  const endpoint = s(st.endpoint, 200);
  return {
    settings: {
      endpoint: endpoint && isLocalEndpoint(endpoint) ? endpoint : DEFAULT_ENDPOINT,
      useModel: typeof st.useModel === "boolean" ? st.useModel : DEFAULT_TUESDAY.settings.useModel,
      chatModel: s(st.chatModel, 120) ?? null,
      medicalModel: s(st.medicalModel, 120) ?? null,
      voice: st.voice === true,
    },
    messages: Array.isArray(raw.messages) ? raw.messages.map(sanitizeMessage).filter((m): m is TuesdayMessage => m !== null).slice(-MAX_MESSAGES) : [],
    activity: Array.isArray(raw.activity) ? raw.activity.map(sanitizeActivity).filter((a): a is ActivityEntry => a !== null).slice(-MAX_ACTIVITY) : [],
    bestScore: n(raw.bestScore, 0, 1_000_000) ?? 0,
    outbox: Array.isArray(raw.outbox) ? raw.outbox.map(sanitizeOutbox).filter((m): m is OutboxMessage => m !== null).slice(-20) : [],
  };
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function createTuesdayStore(storage: StorageService = createStorageService()) {
  let state = storage.read(STORAGE_KEYS.tuesday, sanitizeTuesday, DEFAULT_TUESDAY).value;
  let persisted = storage.available;
  const listeners = new Set<() => void>();

  function commit(next: TuesdayData): boolean {
    state = next;
    persisted = storage.write(STORAGE_KEYS.tuesday, next);
    listeners.forEach((l) => l());
    return persisted;
  }

  return {
    getState: () => state,
    isPersisted: () => persisted,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    updateSettings(patch: Partial<TuesdaySettings>): boolean {
      const settings = { ...state.settings, ...patch };
      if (!isLocalEndpoint(settings.endpoint)) settings.endpoint = state.settings.endpoint;
      return commit({ ...state, settings });
    },
    addMessage(m: Omit<TuesdayMessage, "id" | "at">): TuesdayMessage {
      const msg: TuesdayMessage = { ...m, id: newId(), at: new Date().toISOString() };
      commit({ ...state, messages: [...state.messages, msg].slice(-MAX_MESSAGES) });
      return msg;
    },
    updateMessage(id: string, patch: Partial<Omit<TuesdayMessage, "id">>, persist = true): void {
      const messages = state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
      if (persist) commit({ ...state, messages });
      else {
        state = { ...state, messages };
        listeners.forEach((l) => l());
      }
    },
    clearConversation(): boolean {
      return commit({ ...state, messages: [] });
    },
    /** `countsForBest` marks an Orbit Catch round; other games keep their own scoring. */
    logActivity(e: Omit<ActivityEntry, "id" | "at">, countsForBest = e.kind === "game"): { entry: ActivityEntry; persisted: boolean } {
      const entry: ActivityEntry = { ...e, id: newId(), at: new Date().toISOString() };
      const bestScore = countsForBest && e.score !== undefined ? Math.max(state.bestScore, e.score) : state.bestScore;
      const ok = commit({ ...state, activity: [...state.activity, entry].slice(-MAX_ACTIVITY), bestScore });
      return { entry, persisted: ok };
    },
    queueMessage(m: Omit<OutboxMessage, "id" | "createdAt">): boolean {
      return commit({ ...state, outbox: [...state.outbox, { ...m, id: newId(), createdAt: new Date().toISOString() }].slice(-20) });
    },
    removeQueued(id: string): boolean {
      return commit({ ...state, outbox: state.outbox.filter((m) => m.id !== id) });
    },
    rateActivity(id: string, after: number): boolean {
      return commit({ ...state, activity: state.activity.map((a) => (a.id === id ? { ...a, after } : a)) });
    },
  };
}

export type TuesdayStore = ReturnType<typeof createTuesdayStore>;

export interface WellbeingSummary {
  checkIns: number;
  averageEnergy: number | null;
  rechargeMinutes: number;
  sessions: number;
  /** Mean change in self-rating after a recharge session, when rated. */
  averageAfter: number | null;
}

/** Last seven mission days of Tuesday activity ending on `day`. */
export function wellbeingSummary(activity: readonly ActivityEntry[], day: number): WellbeingSummary {
  const recent = activity.filter((a) => a.missionDay > day - 7 && a.missionDay <= day);
  const checks = recent.filter((a) => a.kind === "checkin");
  const energies = checks.map((a) => a.energy).filter((v): v is number => v !== undefined);
  const sessions = recent.filter((a) => a.kind !== "checkin");
  const afters = sessions.map((a) => a.after).filter((v): v is number => v !== undefined);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null);
  return {
    checkIns: checks.length,
    averageEnergy: mean(energies),
    rechargeMinutes: Math.round(sessions.reduce((t, a) => t + (a.minutes ?? 0), 0)),
    sessions: sessions.length,
    averageAfter: mean(afters),
  };
}
