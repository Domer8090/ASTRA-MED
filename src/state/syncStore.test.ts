import { describe, expect, it } from "vitest";
import { createStorageService, memoryBackend, STORAGE_KEYS } from "../services/storageService";
import { createMissionStore } from "./missionStore";
import { createSyncStore, sanitizeSyncSettings } from "./syncStore";

function setup() {
  const backend = memoryBackend();
  const storage = createStorageService(backend);
  const mission = createMissionStore(storage);
  return { backend, storage, mission, sync: createSyncStore(mission, storage) };
}

describe("auto sync store", () => {
  it("pairs a bridge device, stores its readings as SIM DEVICE and validates them", async () => {
    const { mission, sync } = setup();
    const r = await sync.connect("bio-monitor");
    expect(r.ok).toBe(true);
    const saved = mission.getState().measurements;
    expect(saved.map((m) => m.metricId).sort()).toEqual(["bloodPressure", "bodyTemperature", "heartRate", "sleep"]);
    expect(saved.every((m) => m.source === "device-sim")).toBe(true);
    expect(saved.every((m) => m.missionDay === mission.getState().settings.selectedDay)).toBe(true);
    expect(sync.getState().settings.paired[0]?.lastSyncAt).toBeDefined();
  });

  it("auto sync waits for the interval, then syncs again", async () => {
    const { mission, sync } = setup();
    await sync.connect("dosimeter");
    const count = () => mission.getState().measurements.length;
    expect(count()).toBe(1);
    sync.tick(Date.now() + 60_000);
    expect(count()).toBe(1);
    sync.tick(Date.now() + 5 * 60_000 + 1000);
    expect(count()).toBe(2);
    sync.setAutoSync("dosimeter", false);
    sync.tick(Date.now() + 60 * 60_000);
    expect(count()).toBe(2);
  });

  it("persists pairings and brings bridge devices back connected", async () => {
    const { mission, storage, sync } = setup();
    await sync.connect("actiwatch");
    sync.setInterval(15);
    const again = createSyncStore(mission, storage);
    expect(again.getState().settings.intervalMinutes).toBe(15);
    expect(again.getState().settings.paired.map((p) => p.deviceId)).toEqual(["actiwatch"]);
    expect(again.getState().links.actiwatch?.status).toBe("connected");
  });

  it("forget removes the pairing but keeps saved readings", async () => {
    const { mission, sync } = setup();
    await sync.connect("ared");
    sync.forget("ared");
    expect(sync.getState().settings.paired).toEqual([]);
    expect(mission.getState().measurements).toHaveLength(1);
  });

  it("Bluetooth devices report a clear error where Web Bluetooth is missing", async () => {
    const { sync } = setup();
    const r = await sync.connect("chest-strap");
    expect(r.ok).toBe(false);
    expect(sync.getState().settings.paired).toEqual([]);
  });

  it("recovers from corrupt or unknown saved data", () => {
    expect(sanitizeSyncSettings("nope")).toBeNull();
    const s = sanitizeSyncSettings({ intervalMinutes: 7, paired: [{ deviceId: "x", pairedAt: "2026-01-01T00:00:00Z" }, { deviceId: "ecg", pairedAt: "bad" }], glucoseSeen: [1, "a"] });
    expect(s).toEqual({ intervalMinutes: 5, paired: [], glucoseSeen: [1] });
    const backend = memoryBackend();
    backend.setItem(STORAGE_KEYS.autoSync, "{broken");
    const storage = createStorageService(backend);
    const sync = createSyncStore(createMissionStore(storage), storage);
    expect(sync.getState().settings.paired).toEqual([]);
  });
});
