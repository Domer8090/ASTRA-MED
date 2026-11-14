import { describe, expect, it } from "vitest";
import { getFallbackEvents } from "../data/fallbackDonki";
import { fetchDonkiSnapshot, normalizeCme, normalizeFlr, normalizeNotification, safeLink, sanitizeSnapshot, type FetchLike } from "./nasaDonkiApi";

const ok = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
const fail = (status: number) => ({ ok: false, status, text: async () => "" });

describe("DONKI normalisation", () => {
  it("handles missing optional fields", () => {
    const e = normalizeFlr({ flrID: "2024-05-08T01:33:00-FLR-001" }, "live");
    expect(e?.title).toBe("Solar flare");
    expect(e?.severity).toBeUndefined();
    expect(normalizeFlr({ classType: "X1" }, "live")).toBeNull();
    expect(normalizeFlr(null, "live")).toBeNull();
  });

  it("keeps source-supplied class and never invents a dose", () => {
    const e = normalizeFlr({ flrID: "a", classType: "X5.8", beginTime: "2024-05-11T01:10Z" }, "live");
    expect(e?.severity).toBe("Class X5.8");
    expect(e?.description).toMatch(/not a radiation dose/);
    expect(JSON.stringify(e)).not.toMatch(/mSv/);
  });

  it("uses the most accurate CME analysis", () => {
    const e = normalizeCme({ activityID: "c", cmeAnalyses: [{ isMostAccurate: false, speed: 400 }, { isMostAccurate: true, speed: 1200, type: "O" }] }, "live");
    expect(e?.title).toMatch(/1,200 km\/s/);
    expect(e?.severity).toBe("Type O");
  });

  it("extracts the notification summary and strips markup", () => {
    const e = normalizeNotification({ messageID: "m", messageType: "SEP", messageBody: "## Header\n## Summary:\n\nProton **flux** rising.\n\n## Notes:\nx" }, "live");
    expect(e?.description).toBe("Proton flux rising.");
    expect(e?.title).toBe("Solar energetic particle notification");
  });

  it("only allows https links to NASA hosts", () => {
    expect(safeLink("https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1")).toBeDefined();
    expect(safeLink("https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1")).toMatch(/^https:\/\/ccmc\.gsfc\.nasa\.gov/);
    expect(safeLink("javascript:alert(1)")).toBeUndefined();
    expect(safeLink("http://ccmc.gsfc.nasa.gov/x")).toBeUndefined();
    expect(safeLink("https://evil.example.com/x")).toBeUndefined();
  });

  it("bundled fallback is real archived data labelled fallback", () => {
    const events = getFallbackEvents();
    expect(events.length).toBeGreaterThan(20);
    expect(events.every((e) => e.dataSource === "fallback")).toBe(true);
    expect(new Set(events.map((e) => e.type))).toEqual(new Set(["FLR", "SEP", "CME", "NOTIFICATION"]));
  });
});

describe("DONKI fetching", () => {
  it("falls back per endpoint to CCMC and tolerates partial failure", async () => {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      if (url.includes("api.nasa.gov") && url.includes("/FLR")) return fail(404);
      if (url.includes("/SEP")) return fail(503);
      if (url.includes("/FLR")) return ok([{ flrID: "f1", classType: "M5.0", beginTime: "2026-11-10T00:00Z" }]);
      if (url.includes("/CME")) return ok([{ activityID: "c1", startTime: "2026-11-09T00:00Z" }]);
      return ok([]);
    };
    const { snapshot, endpoints } = await fetchDonkiSnapshot({ now: new Date("2026-11-13T00:00:00Z"), fetchImpl });
    expect(snapshot).not.toBeNull();
    expect(endpoints.find((e) => e.type === "FLR")).toMatchObject({ ok: true, host: "ccmc.gsfc.nasa.gov", count: 1 });
    expect(endpoints.find((e) => e.type === "SEP")?.ok).toBe(false);
    expect(endpoints.find((e) => e.type === "CME")).toMatchObject({ ok: true, host: "api.nasa.gov" });
    expect(snapshot!.events.map((e) => e.id)).toEqual(["f1", "c1"]);
    expect(calls.some((u) => u.includes("api_key=DEMO_KEY"))).toBe(true);
    expect(calls.filter((u) => u.includes("ccmc")).every((u) => !u.includes("api_key"))).toBe(true);
    // Query range is dynamic, not hardcoded.
    expect(calls[0]).toMatch(/startDate=2026-10-14&endDate=2026-11-13/);
  });

  it("returns null when every endpoint fails, without throwing", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("Failed to fetch");
    };
    const { snapshot, endpoints } = await fetchDonkiSnapshot({ fetchImpl });
    expect(snapshot).toBeNull();
    expect(endpoints.every((e) => !e.ok)).toBe(true);
  });

  it("times out slow endpoints", async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const { endpoints } = await fetchDonkiSnapshot({ fetchImpl, timeoutMs: 20 });
    expect(endpoints[0]?.error).toMatch(/Timed out/);
  });

  it("rejects malformed JSON safely", async () => {
    const fetchImpl: FetchLike = async () => ({ ok: true, status: 200, text: async () => "<html>" });
    const { snapshot } = await fetchDonkiSnapshot({ fetchImpl });
    expect(snapshot).toBeNull();
  });

  it("re-labels cached events and drops invalid ones", () => {
    const s = sanitizeSnapshot({
      fetchedAt: "2026-11-13T00:00:00Z",
      events: [{ id: "a", type: "FLR", title: "x", dataSource: "live", sourceUrl: "javascript:x" }, { id: 3 }],
    });
    expect(s?.events).toHaveLength(1);
    expect(s?.events[0]?.dataSource).toBe("cached");
    expect(s?.events[0]?.sourceUrl).toBeUndefined();
    expect(sanitizeSnapshot("garbage")).toBeNull();
  });
});
