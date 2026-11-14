/**
 * NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).
 *
 * - Primary host: api.nasa.gov with VITE_NASA_API_KEY, falling back to DEMO_KEY.
 * - Per-endpoint fallback to the official CCMC host, which serves the same
 *   catalogue without a key. (Checked 2026-11-13: api.nasa.gov/DONKI/FLR
 *   returned HTTP 404 while CCMC served FLR.)
 * - Timeout per request, Promise.allSettled across endpoints, safe JSON parsing
 *   and field-by-field normalisation. External data is untrusted input.
 * - Only environment data is requested. No health data is ever sent.
 *
 * VITE_* variables are bundled into the client and are visible to anyone who
 * loads the app. A personal key here is not secret.
 */
import type {
  DonkiDataSource,
  DonkiDetail,
  DonkiEndpointResult,
  DonkiEvent,
  DonkiEventType,
  DonkiHost,
  DonkiSnapshot,
} from "../types/health";
import { isoDateUtc } from "../utils/dates";
import { isRecord } from "../utils/validation";

export const DONKI_TYPES: readonly DonkiEventType[] = ["FLR", "SEP", "CME", "NOTIFICATION"] as const;
export const REQUEST_TIMEOUT_MS = 12_000;
export const MIN_REFRESH_INTERVAL_MS = 10 * 60_000;
export const AUTO_REFRESH_AFTER_MS = 30 * 60_000;
export const LOOKBACK_DAYS = 30;

const HOSTS: Record<DonkiHost, string> = {
  "api.nasa.gov": "https://api.nasa.gov/DONKI",
  "ccmc.gsfc.nasa.gov": "https://ccmc.gsfc.nasa.gov/DONKI/WS/get",
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
    ...(best && str(best.type, 4) ? { severity: `Type ${str(best.type, 4)}` } : {}),
    description: note ?? "A coronal mass ejection was observed. A CME does not by itself imply a specific radiation dose.",
    ...(safeLink(raw.link) ? { sourceUrl: safeLink(raw.link)! } : {}),
    dataSource,
    details: details([
      ["Speed", speed ? `${speed.toLocaleString()} km/s` : undefined],
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

async function fetchJson(fetchImpl: FetchLike, url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.trim() === "") return [];
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error("Response was not valid JSON");
    }
  } catch (err) {
    if (controller.signal.aborted) throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)} s`, { cause: err });
    throw err instanceof Error ? err : new Error("Network error", { cause: err });
  } finally {
    clearTimeout(timer);
  }
}

function buildUrl(host: DonkiHost, type: DonkiEventType, startDate: string, endDate: string, apiKey: string): string {
  const params = new URLSearchParams({ startDate, endDate });
  if (type === "NOTIFICATION") params.set("type", "all");
  if (host === "api.nasa.gov") params.set("api_key", apiKey);
  return `${HOSTS[host]}/${PATHS[type]}?${params.toString()}`;
}

interface EndpointOutcome {
  result: DonkiEndpointResult;
  events: DonkiEvent[];
}

async function fetchEndpoint(fetchImpl: FetchLike, type: DonkiEventType, startDate: string, endDate: string, timeoutMs: number): Promise<EndpointOutcome> {
  const errors: string[] = [];
  for (const host of ["api.nasa.gov", "ccmc.gsfc.nasa.gov"] as const) {
    try {
      const raw = await fetchJson(fetchImpl, buildUrl(host, type, startDate, endDate, getApiKey()), timeoutMs);
      const events = normalizeList(type, raw, "live");
      return { result: { type, ok: true, host, count: events.length }, events };
    } catch (err) {
      errors.push(`${host}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }
  return { result: { type, ok: false, count: 0, error: errors.join("; ") }, events: [] };
}

/**
 * Fetches all four event types. Never throws. Returns null when every endpoint
 * failed, so the caller keeps cached or fallback data.
 */
export async function fetchDonkiSnapshot(options: {
  now?: Date;
  lookbackDays?: number;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
} = {}): Promise<{ snapshot: DonkiSnapshot | null; endpoints: DonkiEndpointResult[] }> {
  const now = options.now ?? new Date();
  const start = new Date(now.getTime() - (options.lookbackDays ?? LOOKBACK_DAYS) * 86_400_000);
  const startDate = isoDateUtc(start);
  const endDate = isoDateUtc(now);
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const settled = await Promise.allSettled(
    DONKI_TYPES.map((t) => fetchEndpoint(fetchImpl, t, startDate, endDate, options.timeoutMs ?? REQUEST_TIMEOUT_MS)),
  );
  const outcomes: EndpointOutcome[] = settled.map((s, i) =>
    s.status === "fulfilled" ? s.value : { result: { type: DONKI_TYPES[i]!, ok: false, count: 0, error: "Unexpected failure" }, events: [] },
  );
  const endpoints = outcomes.map((o) => o.result);
  if (!endpoints.some((e) => e.ok)) return { snapshot: null, endpoints };
  return {
    snapshot: {
      events: sortEvents(outcomes.flatMap((o) => o.events)),
      fetchedAt: now.toISOString(),
      rangeStart: startDate,
      rangeEnd: endDate,
      endpoints,
    },
    endpoints,
  };
}

/* ---------------- cache validation ---------------- */

const EVENT_TYPES = new Set<string>(DONKI_TYPES);

function sanitizeEvent(x: unknown): DonkiEvent | null {
  if (!isRecord(x) || typeof x.id !== "string" || !EVENT_TYPES.has(x.type as string) || typeof x.title !== "string") return null;
  const e: DonkiEvent = {
    id: x.id.slice(0, 80),
    type: x.type as DonkiEventType,
    title: x.title.slice(0, 160),
    description: typeof x.description === "string" ? x.description.slice(0, 800) : "",
    dataSource: "cached",
    details: Array.isArray(x.details)
      ? x.details
          .filter((d): d is DonkiDetail => isRecord(d) && typeof d.label === "string" && typeof d.value === "string")
          .slice(0, 8)
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

/** Validates a cached snapshot. Cached events are always re-labelled `cached`. */
export function sanitizeSnapshot(x: unknown): DonkiSnapshot | null {
  if (!isRecord(x) || !Array.isArray(x.events) || typeof x.fetchedAt !== "string" || Number.isNaN(Date.parse(x.fetchedAt))) return null;
  return {
    events: x.events.map(sanitizeEvent).filter((e): e is DonkiEvent => e !== null).slice(0, 600),
    fetchedAt: x.fetchedAt,
    rangeStart: typeof x.rangeStart === "string" ? x.rangeStart : "",
    rangeEnd: typeof x.rangeEnd === "string" ? x.rangeEnd : "",
    endpoints: Array.isArray(x.endpoints)
      ? x.endpoints
          .filter((r): r is DonkiEndpointResult => isRecord(r) && EVENT_TYPES.has(r.type as string) && typeof r.ok === "boolean")
          .map((r) => ({ type: r.type, ok: r.ok, count: typeof r.count === "number" ? r.count : 0, ...(r.host ? { host: r.host } : {}), ...(r.error ? { error: String(r.error).slice(0, 200) } : {}) }))
      : [],
  };
}
