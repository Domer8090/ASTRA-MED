/**
 * Gauge geometry for instrument tiles. Built from the configured thresholds so
 * presentation components never compare values with thresholds themselves.
 */
import { ARED, BLOOD_GLUCOSE, BLOOD_PRESSURE, BODY_TEMPERATURE, HEART_RATE, MOOD, SLEEP } from "../config/thresholds";
import type { MetricId } from "../types/health";

export type ZoneKind = "reference" | "nominal" | "caution" | "critical";

export interface GaugeZone {
  from: number;
  to: number;
  kind: ZoneKind;
}

export interface GaugeTrack {
  label?: string;
  min: number;
  max: number;
  zones: GaugeZone[];
  reference: [number, number] | null;
}

export function gaugeTracks(metricId: MetricId, aredTarget: number, hydrationTarget: number): GaugeTrack[] | null {
  switch (metricId) {
    case "heartRate":
      return [
        {
          min: 35,
          max: 120,
          reference: [HEART_RATE.reference.min, HEART_RATE.reference.max],
          zones: [
            { from: 35, to: HEART_RATE.cautionBelow, kind: "caution" },
            { from: HEART_RATE.cautionAbove, to: HEART_RATE.criticalAbove, kind: "caution" },
            { from: HEART_RATE.criticalAbove, to: 120, kind: "critical" },
          ],
        },
      ];
    case "bloodPressure": {
      const b = BLOOD_PRESSURE;
      return [
        {
          label: "SYS",
          min: 75,
          max: 165,
          reference: [b.reference.systolic.min, b.reference.systolic.max],
          zones: [
            { from: 75, to: b.criticalBelow.systolic, kind: "critical" },
            { from: b.criticalBelow.systolic, to: b.cautionBelow.systolic, kind: "caution" },
            { from: b.cautionAbove.systolic, to: b.criticalAbove.systolic, kind: "caution" },
            { from: b.criticalAbove.systolic, to: 165, kind: "critical" },
          ],
        },
        {
          label: "DIA",
          min: 45,
          max: 105,
          reference: [b.reference.diastolic.min, b.reference.diastolic.max],
          zones: [
            { from: 45, to: b.criticalBelow.diastolic, kind: "critical" },
            { from: b.criticalBelow.diastolic, to: b.cautionBelow.diastolic, kind: "caution" },
            { from: b.cautionAbove.diastolic, to: b.criticalAbove.diastolic, kind: "caution" },
            { from: b.criticalAbove.diastolic, to: 105, kind: "critical" },
          ],
        },
      ];
    }
    case "bloodGlucose":
      return [
        {
          min: 45,
          max: 160,
          reference: [BLOOD_GLUCOSE.reference.min, BLOOD_GLUCOSE.reference.max],
          zones: [
            { from: 45, to: BLOOD_GLUCOSE.criticalBelow, kind: "critical" },
            { from: BLOOD_GLUCOSE.criticalBelow, to: BLOOD_GLUCOSE.cautionBelow, kind: "caution" },
            { from: BLOOD_GLUCOSE.cautionAtOrAbove, to: BLOOD_GLUCOSE.criticalAtOrAbove, kind: "caution" },
            { from: BLOOD_GLUCOSE.criticalAtOrAbove, to: 160, kind: "critical" },
          ],
        },
      ];
    case "bodyTemperature":
      return [
        {
          min: 35.5,
          max: 39,
          reference: [BODY_TEMPERATURE.reference.min, BODY_TEMPERATURE.reference.max],
          zones: [
            { from: 35.5, to: BODY_TEMPERATURE.cautionBelow, kind: "caution" },
            { from: BODY_TEMPERATURE.cautionAtOrAbove, to: BODY_TEMPERATURE.criticalAtOrAbove, kind: "caution" },
            { from: BODY_TEMPERATURE.criticalAtOrAbove, to: 39, kind: "critical" },
          ],
        },
      ];
    case "sleep":
      return [
        {
          min: 3,
          max: 9,
          reference: [SLEEP.reference.min, SLEEP.reference.max],
          zones: [
            { from: 3, to: SLEEP.criticalBelow, kind: "critical" },
            { from: SLEEP.criticalBelow, to: SLEEP.cautionBelow, kind: "caution" },
          ],
        },
      ];
    case "mood":
      return [
        {
          min: 1,
          max: 5,
          reference: [MOOD.reference.min, MOOD.reference.max],
          zones: [
            { from: 1, to: MOOD.criticalAtOrBelow, kind: "critical" },
            { from: MOOD.criticalAtOrBelow, to: MOOD.cautionAtOrBelow, kind: "caution" },
          ],
        },
      ];
    case "aredMinutes":
      return [
        {
          min: 0,
          max: Math.max(90, aredTarget + 30),
          reference: [aredTarget, Math.max(90, aredTarget + 30)],
          zones: [
            { from: 0, to: aredTarget * ARED.missedFraction, kind: "critical" },
            { from: aredTarget * ARED.missedFraction, to: aredTarget, kind: "caution" },
          ],
        },
      ];
    case "hydration":
      return [
        {
          min: 0,
          max: 4,
          reference: [hydrationTarget, 4],
          zones: [{ from: 0, to: hydrationTarget, kind: "caution" }],
        },
      ];
    default:
      return null;
  }
}

