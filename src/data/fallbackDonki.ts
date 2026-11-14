/**
 * Bundled offline DONKI fallback.
 *
 * Real archived DONKI records from 2024-05-08 to 2024-05-16 (May 2024 solar
 * storm period), retrieved from the NASA CCMC DONKI web service and trimmed by
 * scripts/build-donki-fallback.mjs. Shown only as DEMO / OFFLINE FALLBACK and
 * never presented as live or current conditions.
 */
import raw from "./generated/donki-fallback.json";
import { normalizeList, sortEvents } from "../services/nasaDonkiApi";
import type { DonkiEvent } from "../types/health";

interface FallbackFile {
  provenance: { source: string; endpoint: string; window: { start: string; end: string }; retrievedAt: string; note: string };
  FLR: unknown[];
  SEP: unknown[];
  CME: unknown[];
  notifications: unknown[];
}

const file = raw as FallbackFile;

export const FALLBACK_PROVENANCE = file.provenance;

let cached: DonkiEvent[] | null = null;

export function getFallbackEvents(): DonkiEvent[] {
  if (!cached) {
    cached = sortEvents([
      ...normalizeList("FLR", file.FLR, "fallback"),
      ...normalizeList("SEP", file.SEP, "fallback"),
      ...normalizeList("CME", file.CME, "fallback"),
      ...normalizeList("NOTIFICATION", file.notifications, "fallback"),
    ]);
  }
  return cached;
}
