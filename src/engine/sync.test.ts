import { describe, expect, it } from "vitest";
import { getMissionTelemetry } from "../data/missionTelemetry";
import { SYNC_DEVICES } from "../data/syncDevices";
import { parseBloodPressure, parseGlucose, parseHeartRate, parseTemperature, readFloat, readSfloat } from "../services/bleHealth";
import { bridgeReading, isSyncDue, summariseHeartRate, type TimedSample } from "./syncEngine";

const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe("IEEE-11073 numbers", () => {
  it("decodes SFLOAT with negative exponent", () => {
    // mantissa 1200, exponent -1 => 120.0 ; raw = 0xF4B0
    expect(readSfloat(view([0xb0, 0xf4]), 0)).toBeCloseTo(120);
  });
  it("returns null for SFLOAT NaN", () => {
    expect(readSfloat(view([0xff, 0x07]), 0)).toBeNull();
  });
  it("decodes FLOAT", () => {
    // 369 x 10^-1 = 36.9 ; mantissa 0x000171, exponent 0xFF
    expect(readFloat(view([0x71, 0x01, 0x00, 0xff]), 0)).toBeCloseTo(36.9);
  });
});

describe("GATT parsers", () => {
  it("reads 8-bit and 16-bit heart rate", () => {
    expect(parseHeartRate(view([0x00, 64]))).toEqual({ bpm: 64 });
    expect(parseHeartRate(view([0x01, 0x2c, 0x01]))).toEqual({ bpm: 300 });
  });
  it("reports missing skin contact", () => {
    expect(parseHeartRate(view([0x04, 70]))).toEqual({ bpm: 70, contact: false });
    expect(parseHeartRate(view([0x06, 70]))).toEqual({ bpm: 70, contact: true });
  });
  it("rejects a truncated heart-rate packet", () => {
    expect(parseHeartRate(view([0x01, 0x40]))).toBeNull();
  });
  it("converts Fahrenheit temperature to Celsius", () => {
    expect(parseTemperature(view([0x00, 0x71, 0x01, 0x00, 0xff]))).toBe(36.9);
    // 98.6 F = 986 x 10^-1
    expect(parseTemperature(view([0x01, 0xda, 0x03, 0x00, 0xff]))).toBe(37);
  });
  it("reads blood pressure in mmHg with pulse", () => {
    // flags: pulse present (0x04). sys 120, dia 80, MAP 93, pulse 64 (all exponent 0)
    const bp = parseBloodPressure(view([0x04, 120, 0x00, 80, 0x00, 93, 0x00, 64, 0x00]));
    expect(bp).toEqual({ systolic: 120, diastolic: 80, pulse: 64 });
  });
  it("converts blood pressure from kPa", () => {
    // 16.0 kPa = 160 x 10^-1 -> 0xF0A0 ; 10.7 kPa = 107 x 10^-1 -> 0xF06B
    const bp = parseBloodPressure(view([0x01, 0xa0, 0xf0, 0x6b, 0xf0, 0, 0]));
    expect(bp).toEqual({ systolic: 120, diastolic: 80 });
  });
  it("reads glucose in kg/L and mol/L", () => {
    const base = [0x07, 0x00, 0x08, 0x05, 0x01, 0x01, 0x07, 0x00, 0x00];
    // flags 0x02 (concentration present, kg/L), seq 5. 95 mg/dL = 0.00095 kg/L = 95 x 10^-5 -> exponent -5 (0xB), mantissa 95
    const kg = parseGlucose(view([0x02, 0x05, 0x00, ...base.slice(0, 7), 0x5f, 0xb0, 0x11]));
    expect(kg).toEqual({ sequence: 5, mgDl: 95 });
    // flags 0x06 (mol/L). 5.3 mmol/L = 0.0053 mol/L = 53 x 10^-4 -> 0xC035
    const mol = parseGlucose(view([0x06, 0x06, 0x00, ...base.slice(0, 7), 0x35, 0xc0, 0x11]));
    expect(mol).toEqual({ sequence: 6, mgDl: 95 });
  });
  it("ignores glucose records with no concentration", () => {
    expect(parseGlucose(view([0x00, 0x01, 0x00, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});

describe("sync rules", () => {
  it("is due with no previous sync and after the interval", () => {
    const now = Date.parse("2026-11-14T10:00:00Z");
    expect(isSyncDue(undefined, 5, now)).toBe(true);
    expect(isSyncDue("2026-11-14T09:56:00Z", 5, now)).toBe(false);
    expect(isSyncDue("2026-11-14T09:55:00Z", 5, now)).toBe(true);
  });
  it("summarises heart rate as a median of recent in-contact samples", () => {
    const now = 100_000;
    const samples: TimedSample[] = [60, 61, 62, 190, 63, 64].map((bpm, i) => ({ at: now - i * 1000, bpm }));
    samples.push({ at: now - 500, bpm: 20, contact: false });
    samples.push({ at: now - 60_000, bpm: 140 });
    expect(summariseHeartRate(samples, now)).toBe(63);
  });
  it("needs enough samples", () => {
    expect(summariseHeartRate([{ at: 0, bpm: 60 }], 0)).toBeNull();
  });
  it("bridge readings stay close to the synthetic day and never lower the dose", () => {
    const day = getMissionTelemetry("nominal")[41]!;
    const hr = bridgeReading("heartRate", day, "a", 0);
    expect(hr.ok && Math.abs(Number(hr.value.value) - day.heartRate) <= 2).toBe(true);
    const dose = bridgeReading("radiation", day, "a", 10);
    expect(dose.ok && Number(dose.value.value)).toBeGreaterThanOrEqual(10);
    const bp = bridgeReading("bloodPressure", day, "b", 0);
    expect(bp.ok && Number(bp.value.systolic) > Number(bp.value.diastolic)).toBe(true);
  });
  it("every catalogued device reports at least one indicator", () => {
    for (const d of SYNC_DEVICES) expect(d.metrics.length).toBeGreaterThan(0);
  });
});
