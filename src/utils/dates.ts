import { MISSION } from "../config/thresholds";

/*
 * Mission time model
 * ------------------
 * MET (mission elapsed time) counts from the mission epoch, MISSION.epochUtc.
 * Mission day N (1-based) spans MET (N-1)/00:00:00 to (N-1)/23:59:59.
 * Ship time is UTC, so a reading taken at 06:41 ship time on day 42 is
 * MET 041/06:41:00 and has recordedAt = epoch + 41 d + 6 h 41 min.
 * The console is a replay: the top-bar MET uses the selected mission day and
 * the current UTC time of day.
 * The epoch is a fictional demo date. Real-world dates (DONKI events, the time
 * an entry was typed) are shown as local calendar dates, never as MET.
 */
const DAY_MS = 86_400_000;
export const EPOCH_MS = Date.parse(MISSION.epochUtc);

export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return MISSION.defaultDay;
  return Math.min(MISSION.totalDays, Math.max(1, Math.round(day)));
}

/** UTC instant for a mission day plus minutes after 00:00 UTC. */
export function missionDayToIso(missionDay: number, minuteOfDay = 0): string {
  return new Date(EPOCH_MS + (missionDay - 1) * DAY_MS + minuteOfDay * 60_000).toISOString();
}

/** Mission day (1-based) that contains an instant. */
export function missionDayOf(iso: string): number {
  return Math.floor((Date.parse(iso) - EPOCH_MS) / DAY_MS) + 1;
}

/** MET for an instant, DDD/HH:MM:SS (or DDD/HH:MM). */
export function formatMetStamp(iso: string, seconds = false): string {
  const ms = Date.parse(iso) - EPOCH_MS;
  if (Number.isNaN(ms) || ms < 0) return "—";
  const d = Math.floor(ms / DAY_MS);
  const rem = ms - d * DAY_MS;
  const hh = String(Math.floor(rem / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((rem % 3_600_000) / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((rem % 60_000) / 1000)).padStart(2, "0");
  return `${padDay(d)}/${hh}:${mm}${seconds ? `:${ss}` : ""}`;
}

/** Reading stamp used everywhere: "D042 06:41" (mission day + ship time UTC). */
export function formatReadingStamp(missionDay: number, iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return `D${padDay(missionDay)}`;
  const d = new Date(t);
  return `D${padDay(missionDay)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** "HH:MM" ship time to minutes after 00:00, or null when invalid. */
export function shipTimeToMinutes(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Current UTC time of day as "HH:MM". */
export function currentShipTime(now: Date = new Date()): string {
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
}

export function padDay(day: number): string {
  return String(day).padStart(3, "0");
}

/** Mission elapsed time for the selected day, using the current UTC time of day. Format DDD/HH:MM:SS. */
export function formatMet(selectedDay: number, now: Date): string {
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${padDay(selectedDay - 1)}/${hh}:${mm}:${ss}`;
}

const localDateTime = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const localTime = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const localDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function formatLocalDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "—" : localDateTime.format(t);
}

export function formatLocalTime(date: Date): string {
  return localTime.format(date);
}

export function formatLocalDate(date: Date): string {
  return localDate.format(date);
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelative(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";
  const diffSec = Math.round((t - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relative.format(diffSec, "second");
  if (abs < 3600) return relative.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(diffSec / 3600), "hour");
  return relative.format(Math.round(diffSec / 86400), "day");
}

/** YYYY-MM-DD in UTC, used for DONKI query ranges. */
export function isoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

