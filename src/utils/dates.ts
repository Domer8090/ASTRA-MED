import { MISSION } from "../config/thresholds";

const DAY_MS = 86_400_000;
const EPOCH_MS = Date.parse(MISSION.epochUtc);

export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return MISSION.defaultDay;
  return Math.min(MISSION.totalDays, Math.max(1, Math.round(day)));
}

/** UTC instant for a mission day plus minutes after 00:00 UTC. */
export function missionDayToIso(missionDay: number, minuteOfDay = 0): string {
  return new Date(EPOCH_MS + (missionDay - 1) * DAY_MS + minuteOfDay * 60_000).toISOString();
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

const utcClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
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

/** "07:14Z" style ship-time stamp. */
export function formatUtcClock(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "—" : `${utcClock.format(t)}Z`;
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

/** Convert a value from <input type="datetime-local"> (local wall time) to ISO UTC. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Current time as a value for <input type="datetime-local">. */
export function nowAsLocalInput(now: Date = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}
