import { describe, expect, it } from "vitest";
import { buildVoiceMessages, cleanSpoken, hasUnsupportedNumber, takeSentences, TUESDAY_VOICE_PROMPT } from "./tuesdayEngine";

describe("Tuesday spoken replies", () => {
  it("splits streamed text into finished sentences without breaking decimals", () => {
    expect(takeSentences("Logged 36.9 °C. That's NOMINAL. Want")).toEqual({ done: ["Logged 36.9 °C.", "That's NOMINAL."], rest: " Want" });
    expect(takeSentences("Your temperature is 36.").done).toEqual([]);
  });

  it("drops sentences with numbers the model was not given", () => {
    const given = "Body temperature 36.9 °C, NOMINAL. Heart rate 120 bpm.";
    expect(hasUnsupportedNumber("Your temperature is 36.9, all good.", given)).toBe(false);
    expect(hasUnsupportedNumber("Your heart rate is 95 bpm.", given)).toBe(true);
    expect(hasUnsupportedNumber("Try one breathing round: in for 4, out for 6.", given)).toBe(false);
  });

  it("gives the model the console result and the conversation", () => {
    const msgs = buildVoiceMessages("Mission day 42.", [], [{ role: "assistant", content: "Hey." }], "put 36.9 as my temperature", "Core temperature 36.9 Celsius logged.");
    expect(msgs[0]!.content).toContain(TUESDAY_VOICE_PROMPT);
    expect(msgs[0]!.content).toContain("Mission day 42.");
    expect(msgs[1]).toEqual({ role: "assistant", content: "Hey." });
    expect(msgs.at(-1)!.role).toBe("user");
    expect(msgs.at(-1)!.content).toMatch(/^put 36.9 as my temperature/);
    expect(msgs.at(-1)!.content).toContain("FOR THIS REPLY");
    expect(msgs.at(-1)!.content).toContain("36.9 Celsius logged");
  });

  it("removes echoed labels from spoken sentences", () => {
    expect(cleanSpoken("CONSOLE RESULT: Logged 36.9 °C. [1]")).toBe("Logged 36.9 °C.");
    expect(cleanSpoken("assistant CAUTION. Resting heart rate")).toBe("CAUTION. Resting heart rate");
  });
});
