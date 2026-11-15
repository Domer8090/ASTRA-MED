import { describe, expect, it } from "vitest";
import { MISSION } from "../config/thresholds";
import { getMissionTelemetry } from "../data/missionTelemetry";
import { buildEffectiveDays } from "../services/telemetryService";
import { formatMet, formatMetLong, formatMetStamp, formatMissionDate, formatReadingDate, formatReadingStamp, missionDayOf, missionDayToIso, shipTimeToMinutes } from "./dates";

describe("mission day and MET", () => {
  it("day N starts at MET (N-1)/00:00 and ends before MET N/00:00", () => {
    for (const d of [1, 42, 118, 180]) {
      expect(missionDayOf(missionDayToIso(d, 0))).toBe(d);
      expect(missionDayOf(missionDayToIso(d, 23 * 60 + 59))).toBe(d);
      expect(formatMetStamp(missionDayToIso(d, 0))).toBe(`${String(d - 1).padStart(3, "0")}/00:00`);
    }
    expect(missionDayToIso(1, 0)).toBe(new Date(MISSION.epochUtc).toISOString());
  });

  it("top-bar MET day count equals selected day minus one", () => {
    const now = new Date("2030-01-01T14:22:05Z");
    expect(formatMet(42, now)).toBe("041/14:22:05");
  });

  it("every synthetic reading timestamp falls on its own mission day", () => {
    for (const scenario of ["nominal", "cardiovascular", "sep"] as const) {
      const days = buildEffectiveDays(scenario, []);
      for (const d of days) {
        for (const r of Object.values(d.readings)) {
          if (r) expect(missionDayOf(r.recordedAt)).toBe(r.missionDay);
        }
      }
    }
    expect(getMissionTelemetry("nominal")).toHaveLength(MISSION.totalDays);
  });

  it("reading stamps and ship-time parsing agree", () => {
    expect(formatReadingStamp(42, missionDayToIso(42, 6 * 60 + 41))).toBe("D042 06:41");
    expect(shipTimeToMinutes("06:41")).toBe(401);
    expect(shipTimeToMinutes("6:41")).toBeNull();
    expect(shipTimeToMinutes("24:00")).toBeNull();
  });

  it("formats mission dates for people", () => {
    expect(formatMissionDate(1)).toBe("4 May 2026");
    expect(formatReadingDate(118, missionDayToIso(118, 6 * 60 + 43))).toBe("29 Aug 2026, 06:43");
    expect(formatMetLong(118, new Date("2026-11-15T07:39:20Z"))).toBe("117 d 07:39:20");
  });
});
