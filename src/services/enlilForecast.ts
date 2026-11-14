/**
 * Model-predicted CME arrivals at Earth and Mars from NASA CCMC's WSA-ENLIL
 * runs, published through DONKI (`WSAEnlilSimulations`).
 *
 * These are forecasts, not observations. ENLIL reports planets and spacecraft,
 * not the fictional Ares ship, so Mars stands in for a Mars transit.
 * Environmental context only: never a personal dose, never a health status.
 */
import { fetchJson, getApiKey, hostOrder, safeLink, type FetchLike } from "./nasaDonkiApi";
import { isoDateUtc } from "../utils/dates";
import type { DonkiHost } from "../types/health";

export type ForecastLocation = "Earth" | "Mars";

export interface CmeArrival {
  location: ForecastLocation;
  arrivalTime: string;
  glancingBlow: boolean;
  cmeId: string | null;
  cmeSpeedKms: number | null;
  modelRunAt: string | null;
  simulationId: string;
  link?: string;
}

export interface EnlilCache {
  version: 1;
  arrivals: CmeArrival[];
  retrievedAt: string | null;
  host: DonkiHost | null;
  lastAttemptAt: string | null;
}

export const ENLIL_LOOKBACK_DAYS = 10;

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Normalise raw ENLIL runs. For each CME and location only the latest model run is kept. */
export function parseEnlil(raw: unknown): CmeArrival[] {
  if (!Array.isArray(raw)) return [];
  const best = new Map<string, CmeArrival>();
  for (const item of raw) {
    const sim = obj(item);
    if (!sim || typeof sim.simulationID !== "string") continue;
    const modelRunAt = isIso(sim.modelCompletionTime) ? new Date(sim.modelCompletionTime).toISOString() : null;
    const inputs = Array.isArray(sim.cmeInputs) ? sim.cmeInputs.map(obj).filter((x): x is Record<string, unknown> => x !== null) : [];
    const main = inputs.find((c) => c.isMostAccurate === true) ?? inputs[0];
    const cmeId = typeof main?.CMEID === "string" ? main.CMEID : null;
    const speed = typeof main?.speed === "number" && Number.isFinite(main.speed) ? main.speed : null;
    const link = safeLink(sim.link);
    const add = (location: ForecastLocation, time: unknown, glancing: unknown) => {
      if (!isIso(time)) return;
      const a: CmeArrival = {
        location,
        arrivalTime: new Date(time).toISOString(),
        glancingBlow: glancing === true,
        cmeId,
        cmeSpeedKms: speed,
        modelRunAt,
        simulationId: sim.simulationID as string,
        ...(link ? { link } : {}),
      };
      const key = `${cmeId ?? a.simulationId}:${location}`;
      const prev = best.get(key);
      if (!prev || (a.modelRunAt ?? "") > (prev.modelRunAt ?? "")) best.set(key, a);
    };
    add("Earth", sim.estimatedShockArrivalTime, sim.isEarthGB);
    const impacts = Array.isArray(sim.impactList) ? sim.impactList : [];
    for (const imp of impacts) {
      const i = obj(imp);
      if (i?.location === "Mars") add("Mars", i.arrivalTime, i.isGlancingBlow);
    }
  }
  return [...best.values()].toSorted((x, y) => x.arrivalTime.localeCompare(y.arrivalTime));
}

/** The next arrival at a location that has not passed more than `graceHours` ago. */
export function nextArrival(arrivals: readonly CmeArrival[], location: ForecastLocation, now: number, graceHours = 12): CmeArrival | undefined {
  return arrivals.find((a) => a.location === location && Date.parse(a.arrivalTime) >= now - graceHours * 3_600_000);
}

/** The most recent predicted arrival at a location that is already in the past. */
export function lastArrival(arrivals: readonly CmeArrival[], location: ForecastLocation, now: number): CmeArrival | undefined {
  return arrivals.filter((a) => a.location === location && Date.parse(a.arrivalTime) < now).at(-1);
}

const BASE: Record<DonkiHost, string> = {
  "ccmc.gsfc.nasa.gov": "https://ccmc.gsfc.nasa.gov/DONKI-API/get/WSAEnlilSimulations",
  "api.nasa.gov": "https://api.nasa.gov/DONKI/WSAEnlilSimulations",
};

export function enlilUrl(host: DonkiHost, now: Date): string {
  const params = new URLSearchParams({
    startDate: isoDateUtc(new Date(now.getTime() - ENLIL_LOOKBACK_DAYS * 86_400_000)),
    endDate: isoDateUtc(now),
  });
  if (host === "api.nasa.gov") params.set("api_key", getApiKey());
  return `${BASE[host]}?${params.toString()}`;
}

/** Fetch recent ENLIL runs, trying each host in order. Never throws. */
export async function fetchEnlil(options: { now?: Date; fetchImpl?: FetchLike; timeoutMs?: number } = {}): Promise<
  { ok: true; arrivals: CmeArrival[]; host: DonkiHost } | { ok: false; error: string }
> {
  const now = options.now ?? new Date();
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const errors: string[] = [];
  for (const host of hostOrder()) {
    try {
      const { json } = await fetchJson(fetchImpl, enlilUrl(host, now), options.timeoutMs ?? 15_000);
      if (!Array.isArray(json)) throw new Error("Response was not a list of model runs");
      return { ok: true, arrivals: parseEnlil(json), host };
    } catch (err) {
      errors.push(`${host}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }
  return { ok: false, error: errors.join("; ") };
}

export function sanitizeEnlilCache(x: unknown): EnlilCache | null {
  const c = obj(x);
  if (!c || c.version !== 1 || !Array.isArray(c.arrivals)) return null;
  const arrivals = c.arrivals
    .map(obj)
    .filter((a): a is Record<string, unknown> => a !== null)
    .filter((a) => (a.location === "Earth" || a.location === "Mars") && isIso(a.arrivalTime) && typeof a.simulationId === "string")
    .map((a) => {
      const link = safeLink(a.link);
      return {
        location: a.location as ForecastLocation,
        arrivalTime: a.arrivalTime as string,
        glancingBlow: a.glancingBlow === true,
        cmeId: typeof a.cmeId === "string" ? a.cmeId : null,
        cmeSpeedKms: typeof a.cmeSpeedKms === "number" && Number.isFinite(a.cmeSpeedKms) ? a.cmeSpeedKms : null,
        modelRunAt: isIso(a.modelRunAt) ? a.modelRunAt : null,
        simulationId: a.simulationId as string,
        ...(link ? { link } : {}),
      };
    });
  const host = c.host === "ccmc.gsfc.nasa.gov" || c.host === "api.nasa.gov" ? c.host : null;
  return { version: 1, arrivals, retrievedAt: isIso(c.retrievedAt) ? c.retrievedAt : null, host, lastAttemptAt: isIso(c.lastAttemptAt) ? c.lastAttemptAt : null };
}
