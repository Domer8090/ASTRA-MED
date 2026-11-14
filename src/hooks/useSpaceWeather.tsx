import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ARCHIVE_PROVENANCE, getArchivedEventsByType } from "../data/fallbackDonki";
import {
  AUTO_REFRESH_AFTER_MS,
  DONKI_TYPES,
  fetchAllTypes,
  MIN_REFRESH_INTERVAL_MS,
  sanitizeCache,
  sortEvents,
  type DonkiCache,
} from "../services/nasaDonkiApi";
import { createStorageService, STORAGE_KEYS } from "../services/storageService";
import type { DonkiEvent, DonkiEventType, DonkiTypeState, SpaceWeatherMode } from "../types/health";
import { useOnlineStatus } from "./useOnlineStatus";

export interface RefreshOutcome {
  ok: boolean;
  message: string;
}

interface SpaceWeatherContextValue {
  mode: SpaceWeatherMode;
  /** Every event shown, each carrying its own live, cached or archived label. */
  events: DonkiEvent[];
  types: Record<DonkiEventType, DonkiTypeState>;
  /** Most recent time any type was received live in this session. */
  lastLiveAt: string | null;
  lastAttemptAt: string | null;
  loading: boolean;
  lastError: string | null;
  nextRefreshAt: number;
  online: boolean;
  refresh: () => Promise<RefreshOutcome>;
}

const SpaceWeatherContext = createContext<SpaceWeatherContextValue | null>(null);
const storage = createStorageService();
const EMPTY_CACHE: DonkiCache = { version: 2, types: {}, lastAttemptAt: null };

function readCache(): DonkiCache {
  return storage.read(STORAGE_KEYS.donkiCache, sanitizeCache, EMPTY_CACHE).value;
}

/** Start-up state: cached data per type where it exists, otherwise the bundled archive. Never live. */
function initialTypes(): Record<DonkiEventType, DonkiTypeState> {
  const cache = readCache();
  const archive = getArchivedEventsByType();
  const out = {} as Record<DonkiEventType, DonkiTypeState>;
  for (const type of DONKI_TYPES) {
    const c = cache.types[type];
    out[type] = c
      ? { type, events: c.events, source: "cached", retrievedAt: c.retrievedAt, host: c.host, rangeStart: c.rangeStart, rangeEnd: c.rangeEnd, lastAttempt: null }
      : {
          type,
          events: archive[type],
          source: "archived",
          retrievedAt: ARCHIVE_PROVENANCE.retrievedAt,
          host: "ccmc.gsfc.nasa.gov",
          rangeStart: ARCHIVE_PROVENANCE.window.start,
          rangeEnd: ARCHIVE_PROVENANCE.window.end,
          lastAttempt: null,
        };
  }
  return out;
}

/** Overall label. LIVE only when every type was received in this session and the browser is online. */
export function deriveMode(types: Record<DonkiEventType, DonkiTypeState>, online: boolean, allFailedThisSession: boolean): SpaceWeatherMode {
  const list = DONKI_TYPES.map((t) => types[t]);
  if (!online || allFailedThisSession) return "UNAVAILABLE";
  const live = list.filter((t) => t.source === "live").length;
  if (live === list.length) return "LIVE";
  if (live > 0) return "PARTIAL";
  if (list.some((t) => t.source === "cached")) return "CACHED";
  return "ARCHIVED";
}

export function SpaceWeatherProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState(initialTypes);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastAttemptAt, setLastAttemptAt] = useState<string | null>(() => readCache().lastAttemptAt);
  const [allFailed, setAllFailed] = useState(false);
  const online = useOnlineStatus();
  const typesRef = useRef(types);
  useEffect(() => {
    typesRef.current = types;
  }, [types]);
  const inFlight = useRef(false);
  const nextRefreshAt = lastAttemptAt ? Date.parse(lastAttemptAt) + MIN_REFRESH_INTERVAL_MS : 0;

  const refresh = useCallback(async (): Promise<RefreshOutcome> => {
    if (inFlight.current) return { ok: false, message: "A refresh is already running." };
    if (!navigator.onLine) return { ok: false, message: "The browser is offline. Cached or archived events stay visible, each with its label." };
    const last = readCache().lastAttemptAt;
    if (last && Date.now() < Date.parse(last) + MIN_REFRESH_INTERVAL_MS) {
      const mins = Math.ceil((Date.parse(last) + MIN_REFRESH_INTERVAL_MS - Date.now()) / 60_000);
      return { ok: false, message: `Refresh is limited to once every 10 minutes to respect NASA API limits. Try again in ${mins} min.` };
    }
    inFlight.current = true;
    setLoading(true);
    setLastError(null);
    try {
      const { outcomes, range, at } = await fetchAllTypes();
      const cache = readCache();
      const next = { ...typesRef.current };
      const failed: DonkiEventType[] = [];
      for (const o of outcomes) {
        const type = o.result.type;
        const attempt = { at, ok: o.result.ok, attempts: o.result.attempts, ...(o.result.error ? { error: o.result.error } : {}) };
        if (o.result.ok) {
          next[type] = { type, events: sortEvents(o.events), source: "live", retrievedAt: at, host: o.result.host ?? null, rangeStart: range.startDate, rangeEnd: range.endDate, lastAttempt: attempt };
          cache.types[type] = { events: o.events, retrievedAt: at, host: o.result.host ?? null, rangeStart: range.startDate, rangeEnd: range.endDate };
        } else {
          failed.push(type);
          next[type] = { ...next[type], lastAttempt: attempt };
        }
      }
      cache.lastAttemptAt = at;
      storage.write(STORAGE_KEYS.donkiCache, cache);
      setTypes(next);
      setLastAttemptAt(at);
      const allBad = failed.length === DONKI_TYPES.length;
      setAllFailed(allBad);
      if (allBad) {
        const msg = "NASA DONKI could not be reached for any event type. Cached or archived events stay visible with their labels.";
        setLastError(msg);
        return { ok: false, message: msg };
      }
      if (failed.length) {
        const msg = `${failed.join(", ")} could not be loaded; those types keep their cached or archived data.`;
        setLastError(msg);
        return { ok: true, message: `Loaded ${DONKI_TYPES.length - failed.length} of 4 event types live. ${msg}` };
      }
      const total = outcomes.reduce((n, o) => n + o.events.length, 0);
      return { ok: true, message: `Loaded all 4 event types live: ${total} DONKI records from ${range.startDate} to ${range.endDate}.` };
    } catch {
      const msg = "Space-weather refresh failed. Existing events stay visible with their labels.";
      setLastError(msg);
      setAllFailed(true);
      return { ok: false, message: msg };
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  // Optional background refresh; the console never waits for it.
  useEffect(() => {
    if (!online) return;
    const list = DONKI_TYPES.map((t) => typesRef.current[t]);
    const newest = Math.max(...list.filter((t) => t.source !== "archived").map((t) => Date.parse(t.retrievedAt ?? "") || 0), 0);
    const last = readCache().lastAttemptAt;
    const throttled = last ? Date.now() < Date.parse(last) + MIN_REFRESH_INTERVAL_MS : false;
    if (Date.now() - newest > AUTO_REFRESH_AFTER_MS && !throttled) {
      const id = window.setTimeout(() => void refresh(), 1500);
      return () => window.clearTimeout(id);
    }
  }, [online, refresh]);

  const value = useMemo<SpaceWeatherContextValue>(() => {
    // Offline: nothing is updating, so this session's live data is shown as cached.
    const shown = online
      ? types
      : (Object.fromEntries(
          DONKI_TYPES.map((t) => {
            const s = types[t];
            return [t, s.source === "live" ? { ...s, source: "cached" as const, events: s.events.map((e) => ({ ...e, dataSource: "cached" as const })) } : s];
          }),
        ) as Record<DonkiEventType, DonkiTypeState>);
    const liveTimes = DONKI_TYPES.map((t) => types[t]).filter((t) => t.source === "live").map((t) => t.retrievedAt ?? "");
    return {
      mode: deriveMode(shown, online, allFailed),
      events: sortEvents(DONKI_TYPES.flatMap((t) => shown[t].events)),
      types: shown,
      lastLiveAt: liveTimes.length ? liveTimes.toSorted().at(-1) ?? null : null,
      lastAttemptAt,
      loading,
      lastError,
      nextRefreshAt,
      online,
      refresh,
    };
  }, [types, online, allFailed, lastAttemptAt, loading, lastError, nextRefreshAt, refresh]);

  return <SpaceWeatherContext.Provider value={value}>{children}</SpaceWeatherContext.Provider>;
}

export function useSpaceWeather(): SpaceWeatherContextValue {
  const v = useContext(SpaceWeatherContext);
  if (!v) throw new Error("SpaceWeatherProvider is missing");
  return v;
}
