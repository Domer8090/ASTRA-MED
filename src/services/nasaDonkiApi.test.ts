import { describe, expect, it } from "vitest";
import { getArchivedEvents, getArchivedEventsByType } from "../data/fallbackDonki";
import { deriveMode } from "../hooks/useSpaceWeather";
import type { DonkiEventType, DonkiTypeState } from "../types/health";
import {
  buildUrl,
  DONKI_TYPES,
  fetchAllTypes,
  fetchEndpoint,
  hostOrder,
  normalizeCme,
  normalizeFlr,
  normalizeNotification,
  normalizeSep,
  safeLink,
  sanitizeCache,
  type FetchLike,
} from "./nasaDonkiApi";

const ok = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
const fail = (status: number) => ({ ok: false, status, text: async () => "" });
const range = { startDate: "2026-10-15", endDate: "2026-11-14" };

const SAMPLE: Record<DonkiEventType, unknown[]> = {
  FLR: [{ flrID: "2026-11-10T01:33:00-FLR-001", classType: "M5.0", beginTime: "2026-11-10T01:33Z", peakTime: "2026-11-10T01:41Z", endTime: "2026-11-10T01:48Z", link: "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1" }],
  SEP: [{ sepID: "2026-11-09T13:59:00-SEP-001", eventTime: "2026-11-09T13:59Z", instruments: [{ displayName: "GOES-18: SEISS >10 MeV" }] }],
  CME: [{ activityID: "2026-11-08T05:36:00-CME-001", startTime: "2026-11-08T05:36Z", cmeAnalyses: [{ isMostAccurate: true, speed: 1200, type: "O" }] }],
  NOTIFICATION: [{ messageID: "20261108-AL-012", messageType: "CME", messageIssueTime: "2026-11-08T18:43Z", messageBody: "## Summary:\nHalo CME.\n## Notes:" }],
};

const PATH: Record<DonkiEventType, string> = { FLR: "/FLR?", SEP: "/SEP?", CME: "/CME?", NOTIFICATION: "/notifications?" };

describe("DONKI endpoints, tested independently", () => {
  it("uses the documented CCMC base with no trailing slash, and the key only on api.nasa.gov", () => {
    expect(buildUrl("ccmc.gsfc.nasa.gov", "FLR", "2026-10-15", "2026-11-14", "DEMO_KEY")).toBe("https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate=2026-10-15&endDate=2026-11-14");
    expect(buildUrl("ccmc.gsfc.nasa.gov", "NOTIFICATION", "a", "b", "K")).toBe("https://ccmc.gsfc.nasa.gov/DONKI-API/get/notifications?startDate=a&endDate=b&type=all");
    expect(buildUrl("api.nasa.gov", "SEP", "a", "b", "K")).toBe("https://api.nasa.gov/DONKI/SEP?startDate=a&endDate=b&api_key=K");
    expect(hostOrder()).toEqual(["ccmc.gsfc.nasa.gov", "api.nasa.gov"]);
  });

  it.each(DONKI_TYPES)("%s: success is parsed with ISO timestamps and labelled live", async (type) => {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      return url.includes(PATH[type]) ? ok(SAMPLE[type]) : fail(500);
    };
    const o = await fetchEndpoint(type, range, { fetchImpl });
    expect(o.result).toMatchObject({ type, ok: true, host: "ccmc.gsfc.nasa.gov", count: 1 });
    expect(o.result.attempts).toEqual([{ host: "ccmc.gsfc.nasa.gov", status: 200 }]);
    expect(calls).toHaveLength(1);
    const e = o.events[0]!;
    expect(e.dataSource).toBe("live");
    expect(e.type).toBe(type);
    expect(e.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it.each(DONKI_TYPES)("%s: failure on CCMC falls back to api.nasa.gov, and both failing is reported per host", async (type) => {
    const fb = await fetchEndpoint(type, range, { fetchImpl: async (url) => (url.includes("ccmc") ? fail(503) : ok(SAMPLE[type])) });
    expect(fb.result).toMatchObject({ ok: true, host: "api.nasa.gov" });
    expect(fb.result.attempts.map((a) => [a.host, a.status])).toEqual([["ccmc.gsfc.nasa.gov", 503], ["api.nasa.gov", 200]]);
    const both = await fetchEndpoint(type, range, { fetchImpl: async (url) => (url.includes("ccmc") ? fail(404) : fail(429)) });
    expect(both.result.ok).toBe(false);
    expect(both.result.error).toMatch(/ccmc.gsfc.nasa.gov: HTTP 404; api.nasa.gov: HTTP 429/);
    expect(both.events).toEqual([]);
  });

  it("an empty list is a valid live result (quiet period)", async () => {
    const o = await fetchEndpoint("SEP", range, { fetchImpl: async () => ok([]) });
    expect(o.result).toMatchObject({ ok: true, count: 0 });
  });

  it("rejects non-list JSON, malformed JSON and timeouts", async () => {
    expect((await fetchEndpoint("FLR", range, { fetchImpl: async () => ok({ error: "x" }) })).result.ok).toBe(false);
    expect((await fetchEndpoint("FLR", range, { fetchImpl: async () => ({ ok: true, status: 200, text: async () => "<html>" }) })).result.error).toMatch(/not valid JSON/);
    const slow: FetchLike = (_u, init) => new Promise((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
    expect((await fetchEndpoint("FLR", range, { fetchImpl: slow, timeoutMs: 20 })).result.error).toMatch(/Timed out/);
  });

  it("one failing type never blocks the others; the range is computed from today", async () => {
    const fetchImpl: FetchLike = async (url) => (url.includes("/SEP?") ? fail(500) : ok(SAMPLE[(Object.keys(PATH) as DonkiEventType[]).find((t) => url.includes(PATH[t]))!]));
    const { outcomes, range: r } = await fetchAllTypes({ now: new Date("2026-11-14T05:00:00Z"), fetchImpl });
    expect(r).toEqual({ startDate: "2026-10-15", endDate: "2026-11-14" });
    expect(outcomes.map((o) => [o.result.type, o.result.ok])).toEqual([["FLR", true], ["SEP", false], ["CME", true], ["NOTIFICATION", true]]);
  });
});

describe("normalisation", () => {
  it("handles missing optional fields and never invents a dose", () => {
    expect(normalizeFlr({ flrID: "a" }, "live")?.severity).toBeUndefined();
    expect(normalizeFlr({ classType: "X1" }, "live")).toBeNull();
    expect(normalizeSep({ sepID: "s" }, "live")?.startTime).toBeUndefined();
    const f = normalizeFlr({ flrID: "a", classType: "X5.8", beginTime: "2024-05-11T01:10Z" }, "live");
    expect(f?.severity).toBe("Class X5.8");
    expect(JSON.stringify(f)).not.toMatch(/mSv/);
    expect(normalizeCme({ activityID: "c", cmeAnalyses: [{ isMostAccurate: false, speed: 400 }, { isMostAccurate: true, speed: 1200, type: "O" }] }, "live")?.title).toMatch(/1,200 km\/s/);
    expect(normalizeCme({ activityID: "c", cmeAnalyses: [{ isMostAccurate: true, speed: 1200, type: "O" }] }, "live")?.severity).toBe("Speed class O");
    expect(normalizeNotification({ messageID: "m", messageType: "SEP", messageBody: "## Summary:\n\nProton **flux** rising.\n\n## Notes:\nx" }, "live")?.description).toBe("Proton flux rising.");
    expect(normalizeFlr({ flrID: "a", beginTime: "not a date" }, "live")?.startTime).toBeUndefined();
  });

  it("only allows https links to NASA hosts", () => {
    expect(safeLink("https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1")).toBeDefined();
    expect(safeLink("javascript:alert(1)")).toBeUndefined();
    expect(safeLink("http://ccmc.gsfc.nasa.gov/x")).toBeUndefined();
    expect(safeLink("https://evil.example.com/x")).toBeUndefined();
  });

  it("bundled archive is real historical data labelled archived, for all four types", () => {
    const byType = getArchivedEventsByType();
    for (const t of DONKI_TYPES) expect(byType[t].length).toBeGreaterThan(0);
    expect(getArchivedEvents().every((e) => e.dataSource === "archived")).toBe(true);
    expect(getArchivedEvents().every((e) => !e.startTime || e.startTime.startsWith("2024-05"))).toBe(true);
  });
});

describe("cache and labels", () => {
  it("cached events are always re-labelled cached; invalid entries are dropped; v1 is migrated", () => {
    const v2 = sanitizeCache({
      version: 2,
      lastAttemptAt: "2026-11-14T05:00:00Z",
      types: { FLR: { retrievedAt: "2026-11-14T05:00:00Z", host: "ccmc.gsfc.nasa.gov", events: [{ id: "a", type: "FLR", title: "x", dataSource: "live", sourceUrl: "javascript:x" }, { id: 3 }] } },
    });
    expect(v2?.types.FLR?.events).toHaveLength(1);
    expect(v2?.types.FLR?.events[0]?.dataSource).toBe("cached");
    expect(v2?.types.FLR?.events[0]?.sourceUrl).toBeUndefined();
    const v1 = sanitizeCache({ snapshot: { fetchedAt: "2026-11-13T00:00:00Z", events: [{ id: "c", type: "CME", title: "CME" }] } });
    expect(v1?.types.CME?.events).toHaveLength(1);
    expect(sanitizeCache("garbage")).toBeNull();
  });

  const state = (sources: Record<DonkiEventType, DonkiTypeState["source"]>) =>
    Object.fromEntries(DONKI_TYPES.map((t) => [t, { type: t, events: [], source: sources[t], retrievedAt: null, host: null, rangeStart: null, rangeEnd: null, lastAttempt: null }])) as unknown as Record<DonkiEventType, DonkiTypeState>;

  it("LIVE only when every type was received this session; otherwise PARTIAL, CACHED, ARCHIVED or UNAVAILABLE", () => {
    const all = (s: DonkiTypeState["source"]) => state({ FLR: s, SEP: s, CME: s, NOTIFICATION: s });
    expect(deriveMode(all("live"), true, false)).toBe("LIVE");
    expect(deriveMode(state({ FLR: "live", SEP: "cached", CME: "live", NOTIFICATION: "archived" }), true, false)).toBe("PARTIAL");
    expect(deriveMode(all("cached"), true, false)).toBe("CACHED");
    expect(deriveMode(all("archived"), true, false)).toBe("ARCHIVED");
    expect(deriveMode(all("live"), false, false)).toBe("UNAVAILABLE");
    expect(deriveMode(all("cached"), true, true)).toBe("UNAVAILABLE");
  });
});
