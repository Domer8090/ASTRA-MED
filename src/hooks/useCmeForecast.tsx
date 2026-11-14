import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchEnlil, sanitizeEnlilCache, type CmeArrival, type EnlilCache } from "../services/enlilForecast";
import { MIN_REFRESH_INTERVAL_MS } from "../services/nasaDonkiApi";
import { createStorageService, STORAGE_KEYS } from "../services/storageService";
import type { DonkiHost } from "../types/health";
import { useOnlineStatus } from "./useOnlineStatus";

export interface CmeForecastValue {
  arrivals: CmeArrival[];
  /** live: received this session. cached: saved from an earlier session. none: nothing loaded yet. */
  source: "live" | "cached" | "none";
  retrievedAt: string | null;
  host: DonkiHost | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const storage = createStorageService();
const EMPTY: EnlilCache = { version: 1, arrivals: [], retrievedAt: null, host: null, lastAttemptAt: null };
const read = () => storage.read(STORAGE_KEYS.enlilCache, sanitizeEnlilCache, EMPTY).value;

const CmeForecastContext = createContext<CmeForecastValue | null>(null);

/** NASA WSA-ENLIL CME arrival forecasts for Earth and Mars. Optional: the console never waits for it. */
export function CmeForecastProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<EnlilCache>(read);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnlineStatus();
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    const current = read();
    if (inFlight.current || !navigator.onLine) return;
    if (current.lastAttemptAt && Date.now() < Date.parse(current.lastAttemptAt) + MIN_REFRESH_INTERVAL_MS) return;
    inFlight.current = true;
    setLoading(true);
    const at = new Date().toISOString();
    const r = await fetchEnlil();
    const next: EnlilCache = r.ok ? { version: 1, arrivals: r.arrivals, retrievedAt: at, host: r.host, lastAttemptAt: at } : { ...current, lastAttemptAt: at };
    storage.write(STORAGE_KEYS.enlilCache, next);
    setCache(next);
    setLive(r.ok);
    setError(r.ok ? null : `CME forecast not loaded (${r.error}).`);
    setLoading(false);
    inFlight.current = false;
  }, []);

  useEffect(() => {
    if (!online) return;
    const id = window.setTimeout(() => void refresh(), 2000);
    return () => window.clearTimeout(id);
  }, [online, refresh]);

  const value = useMemo<CmeForecastValue>(
    () => ({
      arrivals: cache.arrivals,
      source: live && online ? "live" : cache.retrievedAt ? "cached" : "none",
      retrievedAt: cache.retrievedAt,
      host: cache.host,
      loading,
      error,
      refresh,
    }),
    [cache, live, online, loading, error, refresh],
  );
  return <CmeForecastContext.Provider value={value}>{children}</CmeForecastContext.Provider>;
}

export function useCmeForecast(): CmeForecastValue {
  const v = useContext(CmeForecastContext);
  if (!v) throw new Error("CmeForecastProvider is missing");
  return v;
}
