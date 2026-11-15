/**
 * Standard Bluetooth health profiles over Web Bluetooth.
 *
 * Parsers follow the Bluetooth SIG GATT characteristic definitions:
 * Heart Rate Measurement 0x2A37, Temperature Measurement 0x2A1C, Blood
 * Pressure Measurement 0x2A35 and Glucose Measurement 0x2A18 (with the Record
 * Access Control Point 0x2A52). Readings never leave the device: the radio
 * link is local and values go straight into the mission store.
 *
 * Web Bluetooth exists in Chrome and Edge on desktop and Android, on a secure
 * origin (https or localhost). Safari, iPadOS and Firefox do not support it.
 */
import type { BleProfile } from "../types/health";

/* ------------------------------------------------------------ IEEE-11073 */

/** 16-bit SFLOAT: 4-bit signed exponent, 12-bit signed mantissa. Null for the reserved special values. */
export function readSfloat(view: DataView, offset: number): number | null {
  const raw = view.getUint16(offset, true);
  if (raw === 0x07ff || raw === 0x0800 || raw === 0x07fe || raw === 0x0802 || raw === 0x0801) return null;
  let mantissa = raw & 0x0fff;
  let exponent = raw >> 12;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exponent >= 0x8) exponent -= 0x10;
  return mantissa * 10 ** exponent;
}

/** 32-bit FLOAT: 8-bit signed exponent, 24-bit signed mantissa. Null for the reserved special values. */
export function readFloat(view: DataView, offset: number): number | null {
  const raw = view.getUint32(offset, true);
  let mantissa = raw & 0x00ffffff;
  if (mantissa === 0x007fffff || mantissa === 0x00800000 || mantissa === 0x007ffffe || mantissa === 0x00800002 || mantissa === 0x00800001) return null;
  let exponent = raw >>> 24;
  if (mantissa >= 0x00800000) mantissa -= 0x01000000;
  if (exponent >= 0x80) exponent -= 0x100;
  return mantissa * 10 ** exponent;
}

const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

/* --------------------------------------------------------------- Parsers */

export interface HeartRateSample {
  bpm: number;
  /** False when the sensor reports no skin contact. Undefined when it does not report contact. */
  contact?: boolean;
}

/** Heart Rate Measurement (0x2A37). */
export function parseHeartRate(view: DataView): HeartRateSample | null {
  if (view.byteLength < 2) return null;
  const flags = view.getUint8(0);
  const wide = (flags & 0x01) !== 0;
  if (wide && view.byteLength < 3) return null;
  const bpm = wide ? view.getUint16(1, true) : view.getUint8(1);
  const contactSupported = (flags & 0x04) !== 0;
  return contactSupported ? { bpm, contact: (flags & 0x02) !== 0 } : { bpm };
}

/** Temperature Measurement (0x2A1C), returned in °C. */
export function parseTemperature(view: DataView): number | null {
  if (view.byteLength < 5) return null;
  const fahrenheit = (view.getUint8(0) & 0x01) !== 0;
  const value = readFloat(view, 1);
  if (value === null) return null;
  return round(fahrenheit ? ((value - 32) * 5) / 9 : value, 1);
}

export interface BloodPressureSample {
  systolic: number;
  diastolic: number;
  pulse?: number;
}

/** Blood Pressure Measurement (0x2A35), returned in mmHg. */
export function parseBloodPressure(view: DataView): BloodPressureSample | null {
  if (view.byteLength < 7) return null;
  const flags = view.getUint8(0);
  const kpa = (flags & 0x01) !== 0;
  const sys = readSfloat(view, 1);
  const dia = readSfloat(view, 3);
  if (sys === null || dia === null) return null;
  const toMmHg = (x: number) => Math.round(kpa ? x * 7.50062 : x);
  const out: BloodPressureSample = { systolic: toMmHg(sys), diastolic: toMmHg(dia) };
  let offset = 7;
  if (flags & 0x02) offset += 7; // time stamp
  if (flags & 0x04 && view.byteLength >= offset + 2) {
    const pulse = readSfloat(view, offset);
    if (pulse !== null) out.pulse = Math.round(pulse);
  }
  return out;
}

export interface GlucoseSample {
  sequence: number;
  mgDl: number;
}

/** Glucose Measurement (0x2A18), returned in mg/dL. Null when the record carries no concentration. */
export function parseGlucose(view: DataView): GlucoseSample | null {
  if (view.byteLength < 10) return null;
  const flags = view.getUint8(0);
  const sequence = view.getUint16(1, true);
  let offset = 10; // flags (1) + sequence (2) + base time (7)
  if (flags & 0x01) offset += 2; // time offset
  if (!(flags & 0x02) || view.byteLength < offset + 3) return null;
  const value = readSfloat(view, offset);
  if (value === null) return null;
  // Units flag: 0 = kg/L, 1 = mol/L.
  const mgDl = flags & 0x04 ? value * 1000 * 18.016 : value * 100000;
  return { sequence, mgDl: Math.round(mgDl) };
}

/* ---------------------------------------------------- Web Bluetooth layer */

interface BleCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BleCharacteristic>;
  writeValue(value: BufferSource): Promise<void>;
}
interface BleService {
  getCharacteristic(uuid: number): Promise<BleCharacteristic>;
}
interface BleServer {
  connected: boolean;
  getPrimaryService(uuid: number): Promise<BleService>;
  disconnect(): void;
}
interface BleDevice extends EventTarget {
  name?: string;
  gatt?: { connect(): Promise<BleServer> };
}
interface BluetoothApi {
  requestDevice(options: { filters: Array<{ services: number[] }> }): Promise<BleDevice>;
}

const PROFILE_UUIDS: Record<BleProfile, { service: number; measurement: number }> = {
  heart_rate: { service: 0x180d, measurement: 0x2a37 },
  health_thermometer: { service: 0x1809, measurement: 0x2a1c },
  blood_pressure: { service: 0x1810, measurement: 0x2a35 },
  glucose: { service: 0x1808, measurement: 0x2a18 },
};
const RACP = 0x2a52;

function bluetooth(): BluetoothApi | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
  return api ?? null;
}

/** Why Bluetooth cannot be used here, or null when it can. */
export function bluetoothUnavailableReason(): string | null {
  if (typeof window !== "undefined" && !window.isSecureContext) return "Bluetooth needs a secure page (https or localhost).";
  if (!bluetooth()) return "This browser has no Web Bluetooth. Use Chrome or Edge on a computer or Android tablet. Safari and iPadOS do not support it.";
  return null;
}

export type BleReading =
  | { profile: "heart_rate"; sample: HeartRateSample }
  | { profile: "health_thermometer"; celsius: number }
  | { profile: "blood_pressure"; sample: BloodPressureSample }
  | { profile: "glucose"; sample: GlucoseSample };

export interface BleConnection {
  name: string;
  disconnect(): void;
}

/**
 * Opens the browser's device picker (must run from a user gesture), connects,
 * and streams parsed readings to `onReading`. `onDisconnect` fires when the
 * link drops for any reason.
 */
export async function connectBleProfile(
  profile: BleProfile,
  onReading: (reading: BleReading) => void,
  onDisconnect: () => void,
): Promise<BleConnection> {
  const api = bluetooth();
  if (!api) throw new Error(bluetoothUnavailableReason() ?? "Web Bluetooth is not available.");
  const uuids = PROFILE_UUIDS[profile];
  const device = await api.requestDevice({ filters: [{ services: [uuids.service] }] });
  if (!device.gatt) throw new Error("The selected device has no GATT server.");
  const server = await device.gatt.connect();
  device.addEventListener("gattserverdisconnected", onDisconnect);
  const service = await server.getPrimaryService(uuids.service);
  const measurement = await service.getCharacteristic(uuids.measurement);

  measurement.addEventListener("characteristicvaluechanged", () => {
    const view = measurement.value;
    if (!view) return;
    switch (profile) {
      case "heart_rate": {
        const sample = parseHeartRate(view);
        if (sample) onReading({ profile, sample });
        break;
      }
      case "health_thermometer": {
        const celsius = parseTemperature(view);
        if (celsius !== null) onReading({ profile, celsius });
        break;
      }
      case "blood_pressure": {
        const sample = parseBloodPressure(view);
        if (sample) onReading({ profile, sample });
        break;
      }
      case "glucose": {
        const sample = parseGlucose(view);
        if (sample) onReading({ profile, sample });
        break;
      }
    }
  });
  await measurement.startNotifications();

  if (profile === "glucose") {
    // Ask the meter for every stored record: opcode 0x01 (report stored records), operator 0x01 (all).
    const racp = await service.getCharacteristic(RACP);
    await racp.startNotifications();
    await racp.writeValue(new Uint8Array([0x01, 0x01]));
  }

  return {
    name: device.name?.trim() || "Bluetooth device",
    disconnect: () => {
      device.removeEventListener("gattserverdisconnected", onDisconnect);
      if (server.connected) server.disconnect();
    },
  };
}
