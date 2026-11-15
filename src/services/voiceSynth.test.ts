import { describe, expect, it } from "vitest";
import { speechChunks } from "./voiceSynth";

const words = (s: string) => s.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);

describe("speech chunks", () => {
  it("keeps every word of a long reply", () => {
    const reply =
      "Today you're CRITICAL. Resting heart rate, Body temperature are outside the configured demonstration range. Next: Repeat the measurement using the instructions. If it is confirmed, follow the mission-approved cardiovascular protocol. Record symptoms and contact the medical officer when communication is available.";
    const chunks = speechChunks(reply);
    expect(words(chunks.join(" "))).toEqual(words(reply));
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(220);
  });

  it("splits a single very long sentence without losing words", () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ") + ", and then " + Array.from({ length: 40 }, (_, i) => `more${i}`).join(" ") + ".";
    const chunks = speechChunks(long);
    expect(chunks.length).toBeGreaterThan(1);
    expect(words(chunks.join(" "))).toEqual(words(long));
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(220);
  });

  it("drops citation marks and markdown, nothing else", () => {
    expect(speechChunks("Sleep **matters** [1]. Keep the plan.")).toEqual(["Sleep matters. Keep the plan."]);
  });
});
