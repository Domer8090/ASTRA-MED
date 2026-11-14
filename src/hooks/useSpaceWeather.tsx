import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getFallbackEvents } from "../data/fallbackDonki";
import {
  AUTO_REFRESH_AFTER_MS,
  fetchDonkiSnapshot,
  MIN_REFRESH_INTERVAL_MS,
  sanitizeSnapshot,
  sortEvents,
} from "../services/nasaDonkiApi";
import { createStorageService, STORAGE_KEYS } from "../services/storageService";
import type { DonkiEndpointResult, DonkiEvent, DonkiSnapshot, SpaceWeatherMode } from "../types/health";
import { isRecord } from "../utils/validation";
import { useOnlineStatus } from "./useOnlineStatus";

interface CacheRecord {
  snapshot: DonkiSnapshot | null;
  lastAttemptAt: string | null;
}

function sanitizeCache(raw: unknown): CacheRecord | null {
  if (!isRecord(raw)) return null;
  return {
    snapshot: raw.snapshot === null ? null : sanitizeSnapshot(raw.snapshot),
    lastAttemptAt: typeof raw.lastAttemptAt === "string" && !Number.isNaN(Date.parse(raw.lastAttemptAt)) ? raw.lastAttemptAt : null,
  };
}

export interface SpaceWeatherState {
  mode: SpaceWeatherMode;
  events: DonkiEvent[];
  /** When the shown live/cached data was fetched from NASA. */
  dataFetchedAt: string | null;
  lastAttemptAt: string | null;
  endpoints: DonkiEndpointResult[];
  loading: boolean;
  lastError: string | null;
  nextRefreshAt: number;
}

export interface RefreshOutcome {
  ok: boolean;
  message: string;
}

interface SpaceWeatherContextValue extends SpaceWeatherState {
  online: boolean;
  refresh: (opts?: { force?: boolean }) => Promise<RefreshOutcome>;
}

const SpaceWeatherContext = createContext<SpaceWeatherContextValue | null>(null);

const storage = createStorageService();

function initialState(): SpaceWeatherState {
  const cache = storage.read(STORAGE_KEYS.donkiCache, sanitizeCache, { snapshot: null, lastAttemptAt: null }).value;
  const last = cache.lastAttemptAt ? Date.parse(cache.lastAttemptAt) : 0;
  if (cache.snapshot && cache.snapshot.events.length > 0) {
    return {
      mode: "CACHED",
      events: cache.snapshot.events,
      dataFetchedAt: cache.snapshot.fetchedAt,
      lastAttemptAt: cache.lastAttemptAt,
      endpoints: cache.snapshot.endpoints,
      loading: false,
      lastError: null,
      nextRefreshAt: last + MIN_REFRESH_INTERVAL_MS,
    };
  }
  return {
    mode: "DEMO",
    events: getFallbackEvents(),
    dataFetchedAt: cache.snapshot?.fetchedAt ?? null,
    lastAttemptAt: cache.lastAttemptAt,
    endpoints: [],
    loading: false,
    lastError: null,
    nextRefreshAt: last + MIN_REFRESH_INTERVAL_MS,
  };
}

export function SpaceWeatherProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpaceWeatherState>(initialState);
  const online = useOnlineStatus();
  const stateRef = useRef(state);
  stateRef.current = state;
  const inFlight = useRef(false);

  const refresh = useCallback(async (opts: { force?: boolean } = {}): Promise<RefreshOutcome> => {
    const current = stateRef.current;
    if (inFlight.current) return { ok: false, message: "A refresh is already running." };
    if (!navigator.onLine) {
      return { ok: false, message: "The browser is offline. Showing cached or bundled fallback events." };
    }
    if (!opts.force && Date.now() < current.nextRefreshAt) {
      const mins = Math.ceil((current.nextRefreshAt - Date.now()) / 60_000);
      return { ok: false, message: `Refresh is limited to once every 10 minutes to respect NASA API rate limits. Try again in ${mins} min.` };
    }
    inFlight.current = true;
    const attemptAt = new Date().toISOString();
    setState((s) => ({ ...s, loading: true, lastError: null }));
    try {
      const { snapshot, endpoints } = await fetchDonkiSnapshot();
      const nextRefreshAt = Date.now() + MIN_REFRESH_INTERVAL_MS;
      if (!snapshot) {
        const existing = storage.read(STORAGE_KEYS.donkiCache, sanitizeCache, { snapshot: null, lastAttemptAt: null }).value;
        storage.write(STORAGE_KEYS.donkiCache, { ...existing, lastAttemptAt: attemptAt });
        const message = "NASA DONKI could not be reached. Existing events are still shown with their original labels.";
        setState((s) => ({ ...s, loading: false, endpoints, lastAttemptAt: attemptAt, lastError: message, nextRefreshAt }));
        return { ok: false, message };
      }
      const failedTypes = new Set(endpoints.filter((e) => !e.ok).map((e) => e.type));
      // Keep previously cached events for endpoint types that failed this time, labelled as cached.
      const carried =
        current.mode === "DEMO"
          ? []
          : current.events.filter((e) => failedTypes.has(e.type)).map((e) => ({ ...e, dataSource: "cached" as const }));
      const events = sortEvents([...snapshot.events, ...carried]);
      storage.write(STORAGE_KEYS.donkiCache, { snapshot: { ...snapshot, events }, lastAttemptAt: attemptAt });
      const mode: SpaceWeatherMode = failedTypes.size === 0 ? "LIVE" : "PARTIAL";
      setState({
        mode,
        events,
        dataFetchedAt: snapshot.fetchedAt,
        lastAttemptAt: attemptAt,
        endpoints,
        loading: false,
        lastError: failedTypes.size ? `${[...failedTypes].join(", ")} could not be loaded.` : null,
        nextRefreshAt,
      });
      return {
        ok: true,
        message:
          mode === "LIVE"
            ? `Loaded ${snapshot.events.length} DONKI records from the last 30 days.`
            : `Loaded ${snapshot.events.length} records. ${[...failedTypes].join(", ")} failed; showing cached data for those where available.`,
      };
    } catch {
      const message = "Space-weather refresh failed. Existing events are still shown.";
      setState((s) => ({ ...s, loading: false, lastError: message, lastAttemptAt: attemptAt }));
      return { ok: false, message };
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Optional background refresh. The console never waits for it.
  useEffect(() => {
    if (!online) return;
    const s = stateRef.current;
    const age = s.dataFetchedAt ? Date.now() - Date.parse(s.dataFetchedAt) : Infinity;
    if (age > AUTO_REFRESH_AFTER_MS && Date.now() >= s.nextRefreshAt) {
      const id = window.setTimeout(() => void refresh(), 1500);
      return () => window.clearTimeout(id);
    }
  }, [online, refresh]);

  // Once the browser is offline nothing is being updated, so live data is shown as cached.
  const value = useMemo<SpaceWeatherContextValue>(() => {
    if (online || (state.mode !== "LIVE" && state.mode !== "PARTIAL")) return { ...state, online, refresh };
    return {
      ...state,
      mode: "CACHED",
      events: state.events.map((e) => (e.dataSource === "live" ? { ...e, dataSource: "cached" as const } : e)),
      online,
      refresh,
    };
  }, [state, online, refresh]);
  return <SpaceWeatherContext.Provider value={value}>{children}</SpaceWeatherContext.Provider>;
}

export function useSpaceWeather(): SpaceWeatherContextValue {
  const v = useContext(SpaceWeatherContext);
  if (!v) throw new Error("SpaceWeatherProvider is missing");
  return v;
}
