/** Words on the Tuesday screen. Kept here, not in components (CLAUDE.md rule 4). */
import type { TuesdayCoreState } from "../components/tuesday/TuesdayCore";

export const TUESDAY_STATE: Record<TuesdayCoreState, { word: string; hint: string }> = {
  idle: { word: "Ready", hint: "Press Talk or type" },
  listening: { word: "Listening", hint: "Say a reading or ask anything" },
  thinking: { word: "Thinking", hint: "Answering on this device" },
  speaking: { word: "Speaking", hint: "Press Stop reply to cut in" },
};

/** Example requests, shown only before the first one. */
export const TUESDAY_EXAMPLES = ["Heart rate 64", "How am I doing?", "What should I do next?"];

export const TUESDAY_COPY = {
  conversation: "Conversation",
  you: "You",
  tuesday: "Tuesday",
  saved: "Saved",
  empty: "Say a reading or ask how you're doing.",
  tryLabel: "Try",
  inputLabel: "Reading or question for Tuesday",
  inputIdle: "Type a reading or a question",
  inputListening: "Listening. You can also type here",
  send: "Send",
  talk: "Talk",
  stopListening: "Stop listening",
  micOnLabel: "Microphone on. Press to stop listening.",
  micOffLabel: "Microphone off. Press to talk to Tuesday.",
  micUnavailable: "No microphone or speech service is available. Type instead.",
  mute: "Mute",
  unmute: "Unmute",
  muteLabel: "Mute Tuesday's spoken replies",
  unmuteLabel: "Unmute Tuesday's spoken replies",
  mutedNote: "Tuesday is muted. Replies show here as text.",
  stopReply: "Stop reply",
  needsYou: "Needs you now",
  nothingNeeded: "Nothing needs you right now.",
  contactOfficer: "Contact the medical officer",
  seeReadings: "See readings",
  openTasks: "Open tasks",
  footnote: "Synthetic demonstration data. Prototype thresholds, not NASA flight rules.",
  spaceWeather: "Space weather",
  notYourDose: "environmental hazard, not your personal dose",
} as const;

export function readingsNeedingLook(count: number): string {
  if (count === 0) return "All readings inside their ranges";
  return `${count} reading${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} a look`;
}

export function tasksDone(done: number, total: number): string {
  return `${done} of ${total} tasks done today`;
}
