import { useState } from "react";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useMissionStore } from "../../hooks/useMissionState";
import { useToast } from "../../hooks/useToast";
import { useTuesday } from "../../hooks/useTuesday";
import { missionDayToIso } from "../../utils/dates";

const MOOD_WORDS = ["", "Very low", "Low", "Okay", "Good", "Great"] as const;
const ENERGY_WORDS = ["", "Empty", "Low", "Steady", "Good", "Full"] as const;

function Scale({ label, words, value, onChange }: { label: string; words: readonly string[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <label
            key={v}
            className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-control border px-1 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan ${
              value === v ? "border-tue bg-tue/15 text-ink" : "border-line-strong bg-raised text-ink-2 hover:text-ink"
            }`}
          >
            <input type="radio" className="sr-only" name={label} checked={value === v} onChange={() => onChange(v)} />
            <span className="num text-md">{v}</span>
            <span className="text-2xs leading-tight">{words[v]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Mood and energy check-in. Mood is logged as the day's mood reading, so the
 * engines, charts and baseline drift use it; energy stays in Tuesday's log.
 */
export function CheckInCard() {
  const { setCheckIn, store: tStore } = useTuesday();
  const store = useMissionStore();
  const { day } = useMissionModel();
  const toast = useToast();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const save = () => {
    if (mood === null || energy === null) return;
    const now = new Date();
    const result = store.logMeasurement({
      metricId: "mood",
      value: mood,
      missionDay: day,
      recordedAt: missionDayToIso(day, now.getUTCHours() * 60 + now.getUTCMinutes()),
      notes: `Tuesday check-in. Energy ${energy}/5.${note.trim() ? ` ${note.trim().slice(0, 280)}` : ""}`,
    });
    const logged = tStore.logActivity({ kind: "checkin", missionDay: day, mood, energy });
    toast({ tone: result.persisted && logged.persisted ? "success" : "warning", title: `Check-in saved: mood ${mood}/5, energy ${energy}/5`, body: `${result.message} Status and trends are recalculated.` });
    const reply =
      mood <= 2
        ? "Thanks for being honest with me. A low day is allowed. Want to look at Earth for a few minutes, or talk to a crewmate? If it keeps up for a few days, let the behavioural-health contact know."
        : energy <= 2
          ? "Running low on energy. Keep tonight's planned sleep period, and a one-minute breathing round could help you reset."
          : mood >= 4 && energy >= 4
            ? "Love that. Good day to bank: maybe log a message for home at the next window."
            : "Steady. I'll keep an eye on how this trends against your own baseline.";
    tStore.addMessage({
      role: "tuesday",
      text: reply,
      via: "core",
      actions: mood <= 2 ? [{ kind: "earth" }, { kind: "breathe" }] : energy <= 2 ? [{ kind: "breathe" }] : [],
    });
    setCheckIn(false);
  };

  return (
    <section aria-labelledby="checkin-title" className="rounded-tile border border-tue/50 bg-panel p-3">
      <h3 id="checkin-title" className="font-cond text-md font-bold text-ink">
        Check-in for day {day}
      </h3>
      <div className="mt-2 flex flex-col gap-3">
        <Scale label="Mood" words={MOOD_WORDS} value={mood} onChange={setMood} />
        <Scale label="Energy" words={ENERGY_WORDS} value={energy} onChange={setEnergy} />
        <label className="flex flex-col gap-1 text-sm text-ink">
          Anything on your mind? <span className="text-xs text-ink-3">Optional. Saved with the reading on this device.</span>
          <textarea className="field min-h-[60px] text-sm" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" disabled={mood === null || energy === null} onClick={save}>
            Save check-in
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setCheckIn(false)}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
