/**
 * NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).
 *
 * Hosts:
 * - CCMC DONKI API, the documented base https://ccmc.gsfc.nasa.gov/DONKI-API/get/
 *   (no key, CORS *). Paths have no trailing slash; a trailing slash returns 404.
 * - api.nasa.gov/DONKI with VITE_NASA_API_KEY or DEMO_KEY.
 * Order: with DEMO_KEY, CCMC first (DEMO_KEY is quickly exhausted: HTTP 429
 * observed 2026-11-14). With a personal key, api.nasa.gov first. Each event
 * type falls back to the other host independently.
 * - Timeout per request, Promise.allSettled across endpoints, safe JSON parsing
 *   and field-by-field normalisation. External data is untrusted input.
 * - Only environment data is requested. No health data is ever sent.
 *
 * VITE_* variables are bundled into the client and are visible to anyone who
 * loads the app. A personal key here is not secret.
 */
import type {
  DonkiAttempt,
  DonkiDataSource,
  DonkiDetail,
  DonkiEndpointResult,
  DonkiEvent,
  DonkiEventType,
  DonkiHost,
} from "../types/health";
import { isoDateUtc } from "../utils/dates";
import { isRecord } from "../utils/validation";

export const DONKI_TYPES: readonly DonkiEventType[] = ["FLR", "SEP", "CME", "NOTIFICATION"] as const;
export const REQUEST_TIMEOUT_MS = 12_000;
export const MIN_REFRESH_INTERVAL_MS = 10 * 60_000;
/** Refresh on every load when online; the 10-minute throttle still applies. */
export const AUTO_REFRESH_AFTER_MS = 0;
export const LOOKBACK_DAYS = 30;

const HOSTS: Record<DonkiHost, string> = {
  "api.nasa.gov": "https://api.nasa.gov/DONKI",
  "ccmc.gsfc.nasa.gov": "https://ccmc.gsfc.nasa.gov/DONKI-API/get",
};

const PATHS: Record<DonkiEventType, string> = { FLR: "FLR", SEP: "SEP", CME: "CME", NOTIFICATION: "notifications" };

export function getApiKey(): string {
  const key = (import.meta.env?.VITE_NASA_API_KEY as string | undefined)?.trim();
  return key && /^[A-Za-z0-9_-]{6,64}$/.test(key) ? key : "DEMO_KEY";
}

export function usingDemoKey(): boolean {
  return getApiKey() === "DEMO_KEY";
}

/* ---------------- safe field access ---------------- */

const str = (x: unknown, max = 400): string | undefined =>
  typeof x === "string" && x.trim() !== "" ? x.trim().slice(0, max) : undefined;
const numOrStr = (x: unknown): string | undefined =>
  typeof x === "number" && Number.isFinite(x) ? String(x) : str(x, 40);

const ALLOWED_LINK_HOSTS = new Set(["ccmc.gsfc.nasa.gov", "kauai.ccmc.gsfc.nasa.gov", "api.nasa.gov", "www.nasa.gov", "nasa.gov", "iswa.gsfc.nasa.gov"]);

/** Only https links to known NASA hosts are rendered. */
export function safeLink(x: unknown): string | undefined {
  const s = str(x, 300);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return undefined;
    const host = u.hostname === "kauai.ccmc.gsfc.nasa.gov" ? "ccmc.gsfc.nasa.gov" : u.hostname;
    if (!ALLOWED_LINK_HOSTS.has(u.hostname)) return undefined;
    u.hostname = host;
    return u.toString();
  } catch {
    return undefined;
  }
}

/** DONKI times look like 2024-05-09T13:59Z. Normalise to full ISO, or drop. */
function time(x: unknown): string | undefined {
  const s = str(x, 40);
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function linkedIds(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .map((l) => (isRecord(l) ? str(l.activityID, 60) : undefined))
    .filter((v): v is string => Boolean(v))
    .slice(0, 12);
}

function instruments(x: unknown): string | undefined {
  if (!Array.isArray(x)) return undefined;
  const names = x.map((i) => (isRecord(i) ? str(i.displayName, 80) : undefined)).filter(Boolean);
  return names.length ? names.slice(0, 4).join(", ") : undefined;
}

function details(pairs: [string, string | undefined][]): DonkiDetail[] {
  return pairs.filter((p): p is [string, string] => Boolean(p[1])).map(([label, value]) => ({ label, value }));
}

const NOTIFICATION_LABELS: Record<string, string> = {
  FLR: "Solar flare",
  SEP: "Solar energetic particle",
  CME: "Coronal mass ejection",
  GST: "Geomagnetic storm",
  IPS: "Interplanetary shock",
  MPC: "Magnetopause crossing",
  RBE: "Radiation belt enhancement",
  HSS: "High speed stream",
  Report: "Space weather report",
};

function notificationSummary(body: unknown): string {
  const s = typeof body === "string" ? body : "";
  const m = s.match(/## Summary:\s*([\s\S]*?)(\n## |$)/);
  return (m ? m[1]! : s).replace(/[#*`]/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
}

/* ---------------- normalisers ---------------- */

export function normalizeFlr(raw: unknown, dataSource: DonkiDataSource): DonkiEvent | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.flrID, 80);
  if (!id) return null;
  const cls = str(raw.classType, 10);
  const startTime = time(raw.beginTime);
  const peakTime = time(raw.peakTime);
  const endTime = time(raw.endTime);
  return {
    id,
    type: "FLR",
    title: cls ? `Solar flare ${cls}` : "Solar flare",
    ...(startTime ? { startTime } : {}),
    ...(peakTime ? { peakTime } : {}),
    ...(endTime ? { endTime } : {}),
    ...(cls ? { severity: `Class ${cls}` } : {}),
    description: `A solar flare${cls ? ` of class ${cls}` : ""}${str(raw.sourceLocation, 20) ? ` from ${str(raw.sourceLocation, 20)}` : ""}${numOrStr(raw.activeRegionNum) ? ` (active region ${numOrStr(raw.activeRegionNum)})` : ""}. Flare class describes X-ray brightness, not a radiation dose.`,
    ...(safeLink(raw.link) ? { sourceUrl: safeLink(raw.link)! } : {}),
    dataSource,
    details: details([
      ["Peak", peakTime],
      ["Source location", str(raw.sourceLocation, 20)],
      ["Active region", numOrStr(raw.activeRegionNum)],
      ["Instruments", instruments(raw.instruments)],
    ]),
    linkedIds: linkedIds(raw.linkedEvents),
  };
}

export function normalizeSep(raw: unknown, dataSource: DonkiDataSource): DonkiEvent | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.sepID, 80);
  if (!id) return null;
  const startTime = time(raw.eventTime);
  return {
    id,
    type: "SEP",
    title: "Solar energetic particle event",
    ...(startTime ? { startTime } : {}),
    description:
      "Elevated energetic particle flux detected near Earth. An SEP event is a radiation hazard indicator for crews; it is not a personal dose reading.",
    ...(safeLink(raw.link) ? { sourceUrl: safeLink(raw.link)! } : {}),
    dataSource,
    details: details([["Instruments", instruments(raw.instruments)]]),
    linkedIds: linkedIds(raw.linkedEvents),
  };
}

export function normalizeCme(raw: unknown, dataSource: DonkiDataSource): DonkiEvent | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.activityID, 80);
  if (!id) return null;
  const analyses = Array.isArray(raw.cmeAnalyses) ? raw.cmeAnalyses.filter(isRecord) : [];
  const best = analyses.find((a) => a.isMostAccurate === true) ?? analyses[0];
  const speed = best && typeof best.speed === "number" && Number.isFinite(best.speed) ? Math.round(best.speed) : undefined;
  const startTime = time(raw.startTime);
  const note = str(raw.note, 320);
  return {
    id,
    type: "CME",
    title: speed ? `Coronal mass ejection, ${speed.toLocaleString()} km/s` : "Coronal mass ejection",
    ...(startTime ? { startTime } : {}),
    ...(best && str(best.type, 4) ? { severity: `Speed class ${str(best.type, 4)}` } : {}),
    description: note ?? "A coronal mass ejection was observed. A CME does not by itself imply a specific radiation dose.",
    ...(safeLink(raw.link) ? { sourceUrl: safeLink(raw.link)! } : {}),
    dataSource,
    details: details([
      ["Speed", speed ? `${speed.toLocaleString()} km/s` : undefined],
      ["Speed class", best && str(best.type, 4) ? `${str(best.type, 4)} (DONKI SCORE scale: S < 500, C 500–999, O 1000–1999, R 2000–2999, ER ≥ 3000 km/s)` : undefined],
      ["Half angle", best && typeof best.halfAngle === "number" ? `${best.halfAngle}°` : undefined],
      ["Source location", str(raw.sourceLocation, 20)],
      ["Active region", numOrStr(raw.activeRegionNum)],
    ]),
    linkedIds: linkedIds(raw.linkedEvents),
  };
}

export function normalizeNotification(raw: unknown, dataSource: DonkiDataSource): DonkiEvent | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.messageID, 80);
  if (!id) return null;
  const type = str(raw.messageType, 20) ?? "Notice";
  const startTime = time(raw.messageIssueTime);
  return {
    id,
    type: "NOTIFICATION",
    title: `${NOTIFICATION_LABELS[type] ?? type} notification`,
    ...(startTime ? { startTime } : {}),
    description: notificationSummary(raw.messageBody) || "DONKI notification. Open the source for the full message.",
    ...(safeLink(raw.messageURL) ? { sourceUrl: safeLink(raw.messageURL)! } : {}),
    dataSource,
    details: details([["Message type", type]]),
    linkedIds: [],
  };
}

const NORMALIZERS: Record<DonkiEventType, (raw: unknown, ds: DonkiDataSource) => DonkiEvent | null> = {
  FLR: normalizeFlr,
  SEP: normalizeSep,
  CME: normalizeCme,
  NOTIFICATION: normalizeNotification,
};

export function normalizeList(type: DonkiEventType, raw: unknown, dataSource: DonkiDataSource): DonkiEvent[] {
  // DONKI returns an empty body or an object with an error for "no data".
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 400)
    .map((r) => NORMALIZERS[type](r, dataSource))
    .filter((e): e is DonkiEvent => e !== null);
}

export function sortEvents(events: DonkiEvent[]): DonkiEvent[] {
  return events.toSorted((a, b) => Date.parse(b.startTime ?? "") - Date.parse(a.startTime ?? "") || a.id.localeCompare(b.id));
}

/* ---------------- fetching ---------------- */

export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function fetchJson(fetchImpl: FetchLike, url: string, timeoutMs: number): Promise<{ json: unknown; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new HttpError(res.status);
    const text = await res.text();
    if (text.trim() === "") return { json: [], status: res.status };
    try {
      return { json: JSON.parse(text) as unknown, status: res.status };
    } catch (err) {
      throw new Error("Response was not valid JSON", { cause: err });
    }
  } catch (err) {
    if (controller.signal.aborted) throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)} s`, { cause: err });
    throw err instanceof Error ? err : new Error("Network error", { cause: err });
  } finally {
    clearTimeout(timer);
  }
}

export function hostOrder(): DonkiHost[] {
  return usingDemoKey() ? ["ccmc.gsfc.nasa.gov", "api.nasa.gov"] : ["api.nasa.gov", "ccmc.gsfc.nasa.gov"];
}

export function buildUrl(host: DonkiHost, type: DonkiEventType, startDate: string, endDate: string, apiKey: string): string {
  const params = new URLSearchParams({ startDate, endDate });
  if (type === "NOTIFICATION") params.set("type", "all");
  if (host === "api.nasa.gov") params.set("api_key", apiKey);
  return `${HOSTS[host]}/${PATHS[type]}?${params.toString()}`;
}

export interface EndpointOutcome {
  result: DonkiEndpointResult;
  events: DonkiEvent[];
}

/** Fetch one event type, trying each host in order. Never throws. */
export async function fetchEndpoint(
  type: DonkiEventType,
  range: { startDate: string; endDate: string },
  options: { fetchImpl?: FetchLike; timeoutMs?: number; hosts?: DonkiHost[] } = {},
): Promise<EndpointOutcome> {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const attempts: DonkiAttempt[] = [];
  for (const host of options.hosts ?? hostOrder()) {
    try {
      const { json, status } = await fetchJson(fetchImpl, buildUrl(host, type, range.startDate, range.endDate, getApiKey()), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
      if (!Array.isArray(json)) throw new Error("Response was not a list of records");
      const events = normalizeList(type, json, "live");
      attempts.push({ host, status });
      return { result: { type, ok: true, host, count: events.length, attempts }, events };
    } catch (err) {
      attempts.push({
        host,
        ...(err instanceof HttpError ? { status: err.status } : {}),
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }
  return {
    result: { type, ok: false, count: 0, error: attempts.map((a) => `${a.host}: ${a.error ?? "failed"}`).join("; "), attempts },
    events: [],
  };
}

export function queryRange(now: Date, lookbackDays = LOOKBACK_DAYS): { startDate: string; endDate: string } {
  return { startDate: isoDateUtc(new Date(now.getTime() - lookbackDays * 86_400_000)), endDate: isoDateUtc(now) };
}

/** Fetch all four types independently and in parallel. One failure never blocks the others. */
export async function fetchAllTypes(options: {
  now?: Date;
  lookbackDays?: number;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
} = {}): Promise<{ outcomes: EndpointOutcome[]; range: { startDate: string; endDate: string }; at: string }> {
  const now = options.now ?? new Date();
  const range = queryRange(now, options.lookbackDays);
  const settled = await Promise.allSettled(
    DONKI_TYPES.map((t) => fetchEndpoint(t, range, { ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}), ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}) })),
  );
  const outcomes = settled.map((s, i) =>
    s.status === "fulfilled" ? s.value : { result: { type: DONKI_TYPES[i]!, ok: false, count: 0, error: "Unexpected failure", attempts: [] }, events: [] },
  );
  return { outcomes, range, at: now.toISOString() };
}

/* ---------------- cache (v2: one entry per event type) ---------------- */

const EVENT_TYPES = new Set<string>(DONKI_TYPES);
const HOST_SET = new Set<string>(["api.nasa.gov", "ccmc.gsfc.nasa.gov"]);

export interface CachedTypeEntry {
  events: DonkiEvent[];
  retrievedAt: string;
  host: DonkiHost | null;
  rangeStart: string | null;
  rangeEnd: string | null;
}

export interface DonkiCache {
  version: 2;
  types: Partial<Record<DonkiEventType, CachedTypeEntry>>;
  lastAttemptAt: string | null;
}

function sanitizeEvent(x: unknown): DonkiEvent | null {
  if (!isRecord(x) || typeof x.id !== "string" || !EVENT_TYPES.has(x.type as string) || typeof x.title !== "string") return null;
  const e: DonkiEvent = {
    id: x.id.slice(0, 80),
    type: x.type as DonkiEventType,
    title: x.title.slice(0, 160),
    description: typeof x.description === "string" ? x.description.slice(0, 800) : "",
    dataSource: "cached",
    details: Array.isArray(x.details)
      ? x.details.filter((d): d is DonkiDetail => isRecord(d) && typeof d.label === "string" && typeof d.value === "string").slice(0, 8)
      : [],
    linkedIds: Array.isArray(x.linkedIds) ? x.linkedIds.filter((s): s is string => typeof s === "string").slice(0, 12) : [],
  };
  for (const k of ["startTime", "peakTime", "endTime"] as const) {
    const v = x[k];
    if (typeof v === "string" && !Number.isNaN(Date.parse(v))) e[k] = v;
  }
  if (typeof x.severity === "string") e.severity = x.severity.slice(0, 40);
  const link = safeLink(x.sourceUrl);
  if (link) e.sourceUrl = link;
  return e;
}

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

/**
 * Validates the stored cache. Every event read back is labelled `cached`,
 * whatever it was when saved. Accepts the older v1 single-snapshot shape.
 */
export function sanitizeCache(x: unknown): DonkiCache | null {
  if (!isRecord(x)) return null;
  const out: DonkiCache = { version: 2, types: {}, lastAttemptAt: isIso(x.lastAttemptAt) ? x.lastAttemptAt : null };
  if (x.version === 2 && isRecord(x.types)) {
    for (const [type, entry] of Object.entries(x.types)) {
      if (!EVENT_TYPES.has(type) || !isRecord(entry) || !Array.isArray(entry.events) || !isIso(entry.retrievedAt)) continue;
      out.types[type as DonkiEventType] = {
        events: entry.events.map(sanitizeEvent).filter((e): e is DonkiEvent => e !== null && e.type === type).slice(0, 400),
        retrievedAt: entry.retrievedAt,
        host: HOST_SET.has(entry.host as string) ? (entry.host as DonkiHost) : null,
        rangeStart: typeof entry.rangeStart === "string" ? entry.rangeStart : null,
        rangeEnd: typeof entry.rangeEnd === "string" ? entry.rangeEnd : null,
      };
    }
    return out;
  }
  // v1: { snapshot: { events, fetchedAt, endpoints } }
  if (isRecord(x.snapshot) && Array.isArray(x.snapshot.events) && isIso(x.snapshot.fetchedAt)) {
    const events = x.snapshot.events.map(sanitizeEvent).filter((e): e is DonkiEvent => e !== null);
    for (const type of DONKI_TYPES) {
      out.types[type] = { events: events.filter((e) => e.type === type), retrievedAt: x.snapshot.fetchedAt, host: null, rangeStart: null, rangeEnd: null };
    }
  }
  return out;
}
