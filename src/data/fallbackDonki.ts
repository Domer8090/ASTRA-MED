/**
 * Bundled DONKI archive used when no live or cached data exists.
 *
 * Real historical DONKI records from 2024-05-08 to 2024-05-16 (the May 2024
 * solar storm period), retrieved from the NASA CCMC DONKI service and trimmed by
 * scripts/build-donki-fallback.mjs. Labelled ARCHIVED and never presented as
 * live or current conditions.
 */
import raw from "./generated/donki-fallback.json";
import { normalizeList, sortEvents } from "../services/nasaDonkiApi";
import type { DonkiEvent, DonkiEventType } from "../types/health";

interface ArchiveFile {
  provenance: { source: string; endpoint: string; window: { start: string; end: string }; retrievedAt: string; note: string };
  FLR: unknown[];
  SEP: unknown[];
  CME: unknown[];
  notifications: unknown[];
}

const file = raw as ArchiveFile;

export const ARCHIVE_PROVENANCE = file.provenance;

let cached: Record<DonkiEventType, DonkiEvent[]> | null = null;

export function getArchivedEventsByType(): Record<DonkiEventType, DonkiEvent[]> {
  if (!cached) {
    cached = {
      FLR: sortEvents(normalizeList("FLR", file.FLR, "archived")),
      SEP: sortEvents(normalizeList("SEP", file.SEP, "archived")),
      CME: sortEvents(normalizeList("CME", file.CME, "archived")),
      NOTIFICATION: sortEvents(normalizeList("NOTIFICATION", file.notifications, "archived")),
    };
  }
  return cached;
}

export function getArchivedEvents(): DonkiEvent[] {
  const t = getArchivedEventsByType();
  return sortEvents([...t.FLR, ...t.SEP, ...t.CME, ...t.NOTIFICATION]);
}
