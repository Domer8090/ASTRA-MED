import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { readingsNeedingLook, tasksDone, TUESDAY_COPY as T, TUESDAY_EXAMPLES, TUESDAY_STATE } from "../../data/tuesdayCopy";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useTuesday } from "../../hooks/useTuesday";
import { useTuesdaySpeech } from "../../hooks/useTuesdaySpeech";
import { useVoiceRecognition } from "../../hooks/useVoiceRecognition";
import type { ParsedVoiceResult } from "../../engine/voiceParser";
import { scrollToSection } from "../navigation";
import { FollowUpCard } from "../shared/FollowUpCard";
import { StatusBadge } from "../shared/StatusBadge";
import { TuesdayCore, type TuesdayCoreState } from "./TuesdayCore";

interface TuesdayModeProps {
  onClose?: () => void;
  embedded?: boolean;
}

/** One button for the microphone. Off: "Talk". On: a live mic and "Stop listening". */
function MicButton({ active, hearing, disabled, onClick }: { active: boolean; hearing: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? T.micOnLabel : T.micOffLabel}
      title={disabled ? T.micUnavailable : undefined}
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-control border px-3.5 text-sm font-semibold disabled:opacity-40 ${
        active ? "border-cyan bg-cyan/15 text-cyan" : "border-cyan bg-cyan text-space hover:bg-cyan/90"
      }`}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        {active && hearing ? <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-cyan/30 motion-reduce:animate-none" /> : null}
        <Mic aria-hidden="true" className="relative h-5 w-5" />
      </span>
      {active ? T.stopListening : T.talk}
    </button>
  );
}

/** Says what pressing it does ("Mute" / "Unmute"); the icon shows the current state. */
function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={muted ? T.unmuteLabel : T.muteLabel}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-control border border-line px-3 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
    >
      {muted ? <VolumeX aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4" />}
      {muted ? T.unmute : T.mute}
    </button>
  );
}

/** "Saved: …" or "Not saved: …" under a request that logged, or tried to log, a reading. */
function SavedNote({ result }: { result: ParsedVoiceResult }) {
  const saved = result.value !== undefined && !result.warning;
  return (
    <p className={`mt-1 text-xs ${saved ? "text-ink-3" : "text-caution"}`}>
      {saved ? `${T.saved}: ` : ""}
      {result.displayText}
    </p>
  );
}

const LOGS = new Set<ParsedVoiceResult["intent"]>(["log_measurement", "symptom_report"]);

/**
 * Tuesday: a conversation first. The HUD shows her state, the transcript is
 * this session's conversation, and the side shows only what needs action now.
 * Readings, tasks and weather live on Summary and Details.
 */
export function TuesdayMode({ onClose }: TuesdayModeProps) {
  const m = useMissionModel();
  const tuesday = useTuesday();
  const speech = useTuesdaySpeech();
  const [inputText, setInputText] = useState("");
  const [since] = useState(() => new Date().toISOString());
  /** Readings logged by voice this session, by the words that logged them. */
  const [saved, setSaved] = useState<ReadonlyMap<string, ParsedVoiceResult>>(new Map());
  const transcriptRef = useRef<HTMLOListElement>(null);

  const voice = useVoiceRecognition({
    onCommand: (result) => {
      if (!LOGS.has(result.intent)) return;
      setSaved((prev) => new Map(prev).set(result.rawText.trim(), result));
    },
    onToggleTuesdayMode: onClose,
  });

  const { voiceLaunch, consumeVoiceLaunch } = tuesday;
  const { startListening } = voice;
  useEffect(() => {
    if (!voiceLaunch) return;
    consumeVoiceLaunch();
    startListening();
  }, [voiceLaunch, consumeVoiceLaunch, startListening]);

  // Opening Recharge (Earth, game, breathing) ends the conversation: microphone off, speech stopped.
  const { recharge } = tuesday;
  const { stopListening } = voice;
  useEffect(() => {
    if (recharge) stopListening();
  }, [recharge, stopListening]);

  const messages = useMemo(
    () => tuesday.data.messages.filter((x) => x.at >= since && x.role !== "officer" && (x.text || x.role === "tuesday")).slice(-14),
    [tuesday.data.messages, since],
  );
  const lastText = messages.at(-1)?.text;
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastText]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    voice.executeCommand(inputText);
    setInputText("");
  };

  const flagged = Object.values(m.diagnostics).filter((d) => d.status !== "NOMINAL").length;
  const needsYou = m.followUps.filter((f) => !f.completed && f.severity !== "NOMINAL");
  const critical = needsYou.some((f) => f.severity === "CRITICAL");
  const hazard = m.advisories.find((a) => a.level !== "ALL CLEAR");
  const doneTasks = m.tasks.filter((t) => t.completed).length;
  const coreState: TuesdayCoreState = voice.isListening ? "listening" : speech.isSpeaking ? "speaking" : tuesday.busy ? "thinking" : "idle";
  const interim = voice.isListening ? voice.interimTranscript : "";

  return (
    <div className="flex flex-col gap-3">
      {/* One status line; the readings themselves are on Summary. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
        <StatusBadge status={m.overall.status} size="md" />
        <span>{readingsNeedingLook(flagged)}</span>
        {onClose ? (
          <button type="button" className="text-cyan underline-offset-2 hover:underline" onClick={onClose}>
            {T.seeReadings}
          </button>
        ) : null}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label={T.conversation} className="flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-space p-3 sm:p-4">
          <div className="flex flex-col items-center gap-1">
            <TuesdayCore state={coreState} level={voice.audioLevel} getAnalyser={voice.getAnalyser} maxSize={240} />
            <div aria-live="polite" className="text-center">
              <p className={`text-md font-semibold ${coreState === "listening" ? "text-cyan" : "text-tue"}`}>{TUESDAY_STATE[coreState].word}</p>
              <p className="text-xs text-ink-3">{TUESDAY_STATE[coreState].hint}</p>
            </div>
          </div>

          <ol ref={transcriptRef} aria-label={T.conversation} aria-live="polite" className="mx-auto flex max-h-[34vh] w-full max-w-[72ch] flex-col gap-2.5 overflow-y-auto">
            {messages.length === 0 && !interim ? <li className="py-2 text-center text-sm text-ink-3">{T.empty}</li> : null}
            {messages.map((x) => {
              const result = x.role === "user" ? saved.get(x.text.trim()) : undefined;
              return x.role === "user" ? (
                <li key={x.id} className="max-w-[85%] self-end rounded-tile border border-line bg-raised px-3 py-2 text-sm text-ink">
                  <span className="sr-only">{T.you}: </span>
                  {x.text}
                  {result ? <SavedNote result={result} /> : null}
                </li>
              ) : (
                <li key={x.id} className="max-w-[85%] self-start rounded-tile border border-tue/40 bg-tue/10 px-3 py-2 text-md text-ink">
                  <span className="sr-only">{T.tuesday}: </span>
                  {x.text || "…"}
                </li>
              );
            })}
            {interim ? <li className="max-w-[85%] self-end px-3 text-sm italic text-ink-3">{interim}</li> : null}
          </ol>

          {speech.muted ? (
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-2">
              <VolumeX aria-hidden="true" className="h-3.5 w-3.5" />
              {T.mutedNote}
            </p>
          ) : null}

          <form onSubmit={submit} className="mx-auto flex w-full max-w-[72ch] flex-wrap items-center gap-2">
            <MicButton active={voice.isActive} hearing={voice.isListening} disabled={!voice.isSupported} onClick={voice.toggleListening} />
            <label className="sr-only" htmlFor="tuesday-command">
              {T.inputLabel}
            </label>
            <input
              id="tuesday-command"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={voice.isActive ? T.inputListening : T.inputIdle}
              className="field min-h-[44px] min-w-0 flex-1 text-sm"
            />
            <button type="submit" className="btn btn-secondary min-h-[44px]" disabled={!inputText.trim()}>
              <Send aria-hidden="true" className="h-4 w-4" />
              {T.send}
            </button>
            <MuteButton muted={speech.muted} onToggle={() => speech.setMuted(!speech.muted)} />
          </form>

          {speech.isSpeaking || tuesday.busy ? (
            <button
              type="button"
              className="btn btn-ghost mx-auto min-h-[36px] px-3 text-sm"
              onClick={() => {
                tuesday.stop();
                speech.stop();
              }}
            >
              <Square aria-hidden="true" className="h-3.5 w-3.5" />
              {T.stopReply}
            </button>
          ) : null}

          {voice.error ? (
            <p role="alert" className="mx-auto w-full max-w-[72ch] rounded-control border border-caution/50 px-2.5 py-1.5 text-xs text-caution">
              {voice.error}
            </p>
          ) : null}

          {messages.length === 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-ink-3">
              <span>{T.tryLabel}:</span>
              {TUESDAY_EXAMPLES.map((p) => (
                <button key={p} type="button" className="min-h-[32px] rounded-full border border-line px-3 text-ink-2 hover:border-line-strong hover:text-ink" onClick={() => voice.executeCommand(p)}>
                  {p}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <aside aria-label={T.needsYou} className="flex flex-col gap-2 rounded-panel border border-line bg-panel p-3">
          <h3 className="text-sm font-semibold text-ink">{T.needsYou}</h3>
          {critical ? (
            <button type="button" className="btn min-h-[44px] w-full border-critical bg-critical text-sm font-semibold text-space" onClick={() => tuesday.openContact({ priority: "urgent" })}>
              {T.contactOfficer}
            </button>
          ) : null}
          {needsYou.length === 0 ? (
            <p className="text-sm text-ink-3">{T.nothingNeeded}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {needsYou.map((f) => (
                <FollowUpCard key={f.id} f={f} day={m.day} />
              ))}
            </ul>
          )}
          {hazard ? (
            <p className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2 text-xs text-ink-2">
              {T.spaceWeather}: <span className="font-semibold text-caution">{hazard.level}</span> · {T.notYourDose}
            </p>
          ) : null}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
        <span>
          {tasksDone(doneTasks, m.tasks.length)} ·{" "}
          <button type="button" className="text-cyan underline-offset-2 hover:underline" onClick={() => scrollToSection("countermeasures")}>
            {T.openTasks}
          </button>
        </span>
        <span>{T.footnote}</span>
      </div>
    </div>
  );
}
