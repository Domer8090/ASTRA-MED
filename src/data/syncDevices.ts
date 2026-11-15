/**
 * Auto Sync device catalogue.
 *
 * Two kinds of link:
 * - Standard Bluetooth health profiles (Heart Rate 0x180D, Health Thermometer
 *   0x1809, Blood Pressure 0x1810, Glucose 0x1808). These connect for real
 *   through Web Bluetooth in Chrome or Edge.
 * - Mission hardware with proprietary links (CSA Bio-Monitor, actigraphy,
 *   ECG, dosimeter, ARED). The prototype cannot reach that hardware, so its
 *   bridge is simulated from the synthetic telemetry and labelled SIM DEVICE.
 *
 * Device descriptions are paraphrased from the linked pages. Listing a device
 * does not mean ASTRA-MED is certified or endorsed for it.
 */
import type { SyncDeviceSpec } from "../types/health";

const BLE_SPEC = { label: "Bluetooth SIG assigned numbers and GATT specifications", url: "https://www.bluetooth.com/specifications/specs/" };

export const SYNC_DEVICES: readonly SyncDeviceSpec[] = [
  {
    id: "bio-monitor",
    name: "CSA Bio-Monitor (Astroskin shirt)",
    summary: "Smart shirt and headband used on the ISS. Heart rate from ECG, blood pressure, skin temperature and sleep.",
    category: "smart-garment",
    metrics: ["heartRate", "bloodPressure", "bodyTemperature", "sleep"],
    link: { kind: "bridge" },
    pairingSteps: ["Put on the Astroskin shirt and headband.", "Start a recording on the Bio-Monitor tablet.", "Press Pair. The bridge then sends one summary each sync."],
    reference: { label: "Canadian Space Agency: Bio-Monitor", url: "https://www.csa-asc.gc.ca/eng/sciences/astroskin.asp" },
  },
  {
    id: "garmin-watch",
    name: "Garmin watch (Broadcast Heart Rate)",
    summary: "Garmin watches can broadcast live heart rate over the standard Bluetooth Heart Rate profile.",
    category: "watch",
    metrics: ["heartRate"],
    link: { kind: "ble", profile: "heart_rate" },
    pairingSteps: ["On the watch, open the heart rate widget or settings.", "Turn on Broadcast Heart Rate.", "Press Connect and pick the watch in the browser list."],
    reference: BLE_SPEC,
  },
  {
    id: "chest-strap",
    name: "Heart rate chest strap",
    summary: "Any chest strap with the standard Bluetooth Heart Rate profile. Beat-to-beat, accurate during exercise.",
    category: "chest-strap",
    metrics: ["heartRate"],
    link: { kind: "ble", profile: "heart_rate" },
    pairingSteps: ["Wet the electrodes and put the strap on.", "Make sure no other app is connected to it.", "Press Connect and pick the strap in the browser list."],
    reference: BLE_SPEC,
  },
  {
    id: "ecg",
    name: "Electrocardiograph (ECG / Holter)",
    summary: "Medical-kit ECG. Sends the averaged heart rate from the last recording.",
    category: "ecg",
    metrics: ["heartRate"],
    link: { kind: "bridge" },
    pairingSteps: ["Attach the electrodes as trained.", "Finish the recording on the ECG unit.", "Press Pair to receive the averaged heart rate."],
  },
  {
    id: "actiwatch",
    name: "Actiwatch (actigraphy)",
    summary: "Wrist actigraph worn for sleep studies in spaceflight. Sends total sleep for the last sleep period.",
    category: "watch",
    metrics: ["sleep"],
    link: { kind: "bridge" },
    pairingSteps: ["Wear the Actiwatch through the sleep period.", "Dock it or open its reader after waking.", "Press Pair to receive the sleep total."],
  },
  {
    id: "ble-bp-cuff",
    name: "Bluetooth blood pressure cuff",
    summary: "Upper-arm cuff with the standard Bluetooth Blood Pressure profile. Sends each reading when it finishes.",
    category: "meter",
    metrics: ["bloodPressure"],
    link: { kind: "ble", profile: "blood_pressure" },
    pairingSteps: ["Put the cuff on the upper arm at heart level.", "Hold the cuff's Bluetooth button until it blinks.", "Press Connect, pick the cuff, then take the reading."],
    reference: BLE_SPEC,
  },
  {
    id: "ble-thermometer",
    name: "Bluetooth thermometer",
    summary: "Thermometer with the standard Bluetooth Health Thermometer profile.",
    category: "meter",
    metrics: ["bodyTemperature"],
    link: { kind: "ble", profile: "health_thermometer" },
    pairingSteps: ["Turn the thermometer on.", "Press Connect and pick it in the browser list.", "Take the temperature. The reading arrives when it beeps."],
    reference: BLE_SPEC,
  },
  {
    id: "ble-glucose",
    name: "Bluetooth glucose meter",
    summary: "Finger-stick meter with the standard Bluetooth Glucose profile. Sends stored readings not yet saved.",
    category: "meter",
    metrics: ["bloodGlucose"],
    link: { kind: "ble", profile: "glucose" },
    pairingSteps: ["Turn the meter on in its Bluetooth or pairing mode.", "Press Connect and pick the meter. Some meters ask for a PIN shown on screen.", "Stored readings arrive automatically."],
    reference: BLE_SPEC,
  },
  {
    id: "cgm",
    name: "Continuous glucose monitor (CGM)",
    summary: "Skin sensor that reads glucose every few minutes. Its link is proprietary, so this is a bridge.",
    category: "meter",
    metrics: ["bloodGlucose"],
    link: { kind: "bridge" },
    pairingSteps: ["Apply the sensor and let it warm up as instructed.", "Press Pair to receive the latest glucose value."],
  },
  {
    id: "dosimeter",
    name: "Crew personal dosimeter",
    summary: "Active dosimeter worn by the crew member. Sends the cumulative personal dose.",
    category: "dosimeter",
    metrics: ["radiation"],
    link: { kind: "bridge" },
    pairingSteps: ["Wear the dosimeter in its usual pocket.", "Press Pair to receive the cumulative dose."],
  },
  {
    id: "ared",
    name: "ARED exercise log",
    summary: "Advanced Resistive Exercise Device session log. Sends the minutes of today's session.",
    category: "exercise",
    metrics: ["aredMinutes"],
    link: { kind: "bridge" },
    pairingSteps: ["Finish the session on ARED.", "Press Pair to receive the session minutes."],
  },
  {
    id: "pvt-tablet",
    name: "Reaction self-test tablet (PVT)",
    summary: "Psychomotor vigilance test on the crew tablet. Sends the mean reaction time.",
    category: "test",
    metrics: ["pvt"],
    link: { kind: "bridge" },
    pairingSteps: ["Complete the reaction self-test.", "Press Pair to receive the mean reaction time."],
  },
];

export const SYNC_DEVICE_BY_ID: Readonly<Record<string, SyncDeviceSpec>> = Object.fromEntries(SYNC_DEVICES.map((d) => [d.id, d]));

/** Notes stored with each synced reading. Kept short (280-character limit). */
export const SYNC_NOTE = {
  device: (name: string) => `Auto Sync from ${name}`,
  bridge: (name: string) => `Auto Sync simulated bridge: ${name}`,
} as const;
