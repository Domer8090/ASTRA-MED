import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Check, Mic, MicOff, Monitor, RotateCcw, Send, Volume2, VolumeX } from "lucide-react";
import { STATUS_TEXT_CLASS } from "../../config/theme";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useMissionStore } from "../../hooks/useMissionState";
import { useNow } from "../../hooks/useNow";
import { useTuesday } from "../../hooks/useTuesday";
import { useSyncState } from "../../hooks/useAutoSync";
import { SYNC_DEVICE_BY_ID } from "../../data/syncDevices";
import { scrollToSection } from "../navigation";
import { useTuesdaySpeech } from "../../hooks/useTuesdaySpeech";
import { useVoiceRecognition } from "../../hooks/useVoiceRecognition";
import type { ParsedVoiceResult } from "../../engine/voiceParser";
import { ALL_METRIC_IDS, BODY_SYSTEM_IDS, type FollowUpAction, type HealthStatus } from "../../types/health";
import { currentShipTime, formatMet, formatReadingStamp } from "../../utils/dates";
import { formatDelta, formatWithUnit } from "../../utils/formatting";
import { TuesdayCore, type TuesdayCoreState } from "./TuesdayCore";

interface TuesdayModeProps {
  onClose?: () => void;
  embedded?: boolean;
}

const SHORT: Record<HealthStatus, string> = { NOMINAL: "NOM", CAUTION: "CAUT", CRITICAL: "CRIT" };
const DOT: Record<HealthStatus, string> = { NOMINAL: "bg-nominal", CAUTION: "bg-caution", CRITICAL: "bg-critical" };

const CORE_LABEL: Record<TuesdayCoreState, { word: string; hint: string }> = {
  idle: { word: "READY", hint: "Press the microphone or type a reading." },
  listening: { word: "LISTENING", hint: "Say a reading, for example “heart rate 64”." },
  thinking: { word: "THINKING", hint: "Tuesday is preparing an answer on this device." },
  speaking: { word: "TUESDAY SPEAKING", hint: "Voice reply playing. Press the microphone to interrupt." },
};

const PHRASES = ["Heart rate 64", "Blood pressure 120 over 80", "Temperature 36.9", "Slept 7 hours", "Workout 60 minutes", "How am I doing"];

/** Flat bordered section with a small caps title row. */
function Pane({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`flex min-h-0 flex-col overflow-hidden rounded-tile border border-line bg-panel ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h3 className="font-cond text-xs font-bold uppercase tracking-label text-ink-2">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Status as a square dot plus a short word. Never colour alone. */
function StatusMark({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-2xs font-semibold ${STATUS_TEXT_CLASS[status]}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      {SHORT[status]}
      <span className="sr-only">{status}</span>
    </span>
  );
}

interface LoggedVoice {
  id: string;
  at: string;
  result: ParsedVoiceResult;
}

/**
 * Tuesday mode: a procedure-style crew screen. Left, every indicator as a
 * compact status row; centre, voice logging and today's checklist; right, the
 * action queue with controls only where the crew must act. All values and
 * statuses come from the engines.
 */
export function TuesdayMode({ onClose }: TuesdayModeProps) {
  const m = useMissionModel();
  const store = useMissionStore();
  const tuesday = useTuesday();
  const speech = useTuesdaySpeech();
  const now = useNow(1000);
  const [inputText, setInputText] = useState("");
  const [log, setLog] = useState<LoggedVoice[]>([]);

  const voice = useVoiceRecognition({
    onCommand: (result) => setLog((prev) => [{ id: `v-${Date.now()}`, at: currentShipTime(), result }, ...prev].slice(0, 12)),
    onToggleTuesdayMode: onClose,
  });

  const { voiceLaunch, consumeVoiceLaunch } = tuesday;
  const { startListening } = voice;
  useEffect(() => {
    if (!voiceLaunch) return;
    consumeVoiceLaunch();
    startListening();
  }, [voiceLaunch, consumeVoiceLaunch, startListening]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    voice.executeCommand(inputText);
    setInputText("");
  };

  const open = m.followUps.filter((f) => !f.completed);
  const current = open.filter((f) => f.severity !== "NOMINAL");
  const pending = open.filter((f) => f.severity === "NOMINAL");
  const doneTasks = m.tasks.filter((t) => t.completed).length;
  const coreState: TuesdayCoreState = voice.isListening ? "listening" : speech.isSpeaking ? "speaking" : tuesday.busy ? "thinking" : "idle";
  const heard = voice.interimTranscript || voice.transcript;
  const hr = m.diagnostics.heartRate.latest;

  return (
    <div className="flex flex-col overflow-hidden rounded-panel border border-line bg-space text-ink">
      {/* Title strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-2.5">
        <div>
          <h2 className="font-cond text-md font-bold text-ink">Tuesday</h2>
          <p className="text-2xs text-ink-3">Crew companion. Voice logging, checklist and actions for day {m.day}.</p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          <Stat label="Overall">
            <StatusMark status={m.overall.status} />
          </Stat>
          <Stat label="MET">{formatMet(m.day, now)}</Stat>
          <Stat label="Ship time">{currentShipTime(now)} UTC</Stat>
          <Stat label="Checklist">
            {doneTasks}/{m.tasks.length}
          </Stat>
          <Stat label="Readiness">{m.readiness.score}/100</Stat>
        </dl>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost min-h-[36px] px-2 text-xs" onClick={speech.toggleMute} aria-pressed={!speech.muted}>
            {speech.muted ? <VolumeX aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4" />}
            {speech.muted ? "Voice replies off" : "Voice replies on"}
          </button>
          {onClose ? (
            <button type="button" className="btn btn-secondary min-h-[36px] px-2.5 text-xs" onClick={onClose}>
              <Monitor aria-hidden="true" className="h-4 w-4" />
              Classic console
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-2 p-2 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        {/* Left rail: crew status rows */}
        <div className="flex flex-col gap-2">
          <Pane title="Crew status" aside={<span className="font-mono text-2xs text-ink-3">D{m.day}</span>}>
            <ul className="divide-y divide-line-soft">
              {ALL_METRIC_IDS.map((id) => {
                const d = m.diagnostics[id];
                const delta = d.latest && d.previous ? formatDelta(id, d.latest.value, d.previous.value) : null;
                return (
                  <li key={id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-ink">{METRIC_GUIDANCE[id].shortName}</span>
                      <StatusMark status={d.status} />
                    </div>
                    <div className="mt-0.5 grid grid-cols-[1fr_auto_auto] gap-3 font-mono text-2xs tabular-nums text-ink-2">
                      <span className="truncate text-ink">{d.latest ? formatWithUnit(id, d.latest.value) : "no reading"}</span>
                      <span>{delta ?? ""}</span>
                      <span>{d.latest ? formatReadingStamp(d.latest.missionDay, d.latest.recordedAt) : ""}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Pane>
          <Pane title="Body systems">
            <ul className="divide-y divide-line-soft">
              {BODY_SYSTEM_IDS.map((id) => (
                <li key={id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                  <span className="text-ink">{BODY_SYSTEMS[id].shortName}</span>
                  <StatusMark status={m.systems[id].status} />
                </li>
              ))}
            </ul>
          </Pane>
        </div>

        {/* Centre: voice log and checklist */}
        <div className="flex flex-col gap-2">
          <Pane
            title="Voice log"
            aside={
              <span className="font-mono text-2xs text-ink-3">
                {voice.provider === "whisper" ? "Whisper on this device" : voice.provider === "browser" ? "Browser speech" : "Typing only"}
              </span>
            }
          >
            <div className="flex flex-col gap-3 p-3">
              <div className="flex flex-col items-center gap-2 rounded-tile border border-line-soft bg-space py-3">
                <TuesdayCore
                  state={coreState}
                  level={voice.audioLevel}
                  getAnalyser={voice.getAnalyser}
                  readiness={m.readiness.score / 100}
                  checklist={m.tasks.length ? doneTasks / m.tasks.length : 0}
                  stateWord={CORE_LABEL[coreState].word}
                  readouts={[
                    { label: "MET", value: formatMet(m.day, now).slice(0, 9) },
                    { label: "READINESS", value: `${m.readiness.score}/100` },
                    { label: "HEART RATE", value: hr ? formatWithUnit("heartRate", hr.value) : "—" },
                    { label: "CHECKLIST", value: `${doneTasks}/${m.tasks.length}` },
                  ]}
                  maxSize={380}
                />
                <div className="px-3 text-center" aria-live="polite">
                  <p className={`font-cond text-md font-bold tracking-status ${coreState === "listening" ? "text-cyan" : "text-tue"}`}>{CORE_LABEL[coreState].word}</p>
                  <p className="text-xs text-ink-3">{CORE_LABEL[coreState].hint}</p>
                  {heard ? <p className="mt-1 text-sm text-ink">“{heard}”</p> : null}
                  <p className="mt-1 text-2xs text-ink-3">Outer lilac arc: readiness. Inner cyan arc: today&apos;s checklist.</p>
                </div>
              </div>
              <form onSubmit={submit} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={voice.toggleListening}
                  disabled={!voice.isSupported}
                  aria-pressed={voice.isListening}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border ${voice.isListening ? "border-critical bg-critical/15 text-critical" : "border-line-strong bg-raised text-ink hover:border-cyan"} disabled:opacity-40`}
                  aria-label={voice.isListening ? "Stop listening" : "Start listening"}
                >
                  {voice.isListening ? <MicOff aria-hidden="true" className="h-5 w-5" /> : <Mic aria-hidden="true" className="h-5 w-5" />}
                </button>
                <label className="sr-only" htmlFor="tuesday-command">
                  Reading or question for Tuesday
                </label>
                <input
                  id="tuesday-command"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={voice.isListening ? "Listening. Say a reading, for example “heart rate 64”." : "Say or type a reading or a question"}
                  className="field min-h-[44px] flex-1 text-sm"
                />
                <button type="submit" className="btn btn-primary min-h-[44px]" disabled={!inputText.trim()}>
                  <Send aria-hidden="true" className="h-4 w-4" />
                  Send
                </button>
              </form>
              {voice.error ? (
                <p role="alert" className="rounded-control border border-caution/50 px-2.5 py-1.5 text-xs text-caution">
                  {voice.error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {PHRASES.map((p) => (
                  <button key={p} type="button" className="rounded-full border border-line px-2.5 py-1 font-mono text-2xs text-ink-2 hover:border-line-strong hover:text-ink" onClick={() => voice.executeCommand(p)}>
                    {p}
                  </button>
                ))}
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line font-cond uppercase tracking-label text-ink-3">
                    <th className="py-1 pr-2 font-semibold">Time</th>
                    <th className="py-1 pr-2 font-semibold">Heard</th>
                    <th className="py-1 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {log.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-2 text-ink-3">
                        Nothing logged by voice in this session.
                      </td>
                    </tr>
                  ) : (
                    log.map((e) => (
                      <tr key={e.id} className="border-b border-line-soft align-top">
                        <td className="py-1.5 pr-2 font-mono tabular-nums text-ink-2">{e.at}</td>
                        <td className="py-1.5 pr-2 text-ink-2">“{e.result.rawText}”</td>
                        <td className={`py-1.5 ${e.result.warning ? "text-caution" : "text-ink"}`}>
                          {e.result.intent === "log_measurement" ? <span className="mr-1.5 font-mono text-2xs text-nominal">LOGGED</span> : null}
                          {e.result.displayText}
                          {e.result.warning ? ` ${e.result.warning}` : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Pane>

          <Pane title={`Checklist, day ${m.day}`} aside={<span className="font-mono text-2xs text-ink-3">{doneTasks} of {m.tasks.length} done</span>}>
            <ol className="divide-y divide-line-soft">
              {m.tasks.map((t, i) => (
                <li key={t.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                  <span className="font-mono text-xs tabular-nums text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className={`text-sm ${t.completed ? "text-ink-2 line-through decoration-ink-3" : "text-ink"}`}>{t.title}</p>
                    <p className="truncate text-2xs text-ink-3">{t.targetLabel}</p>
                  </div>
                  {t.completed ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs font-semibold text-nominal">DONE</span>
                      <button type="button" className="btn btn-ghost min-h-[32px] px-2 text-2xs" onClick={() => store.setTaskCompletion(m.day, t.id, false)} aria-label={`Undo ${t.title}`}>
                        <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-secondary min-h-[32px] px-2.5 font-mono text-2xs" onClick={() => store.setTaskCompletion(m.day, t.id, true)} aria-label={`Mark ${t.title} done`}>
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      MARK DONE
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </Pane>
        </div>

        {/* Right rail: action queue */}
        <div className="flex flex-col gap-2">
          <Pane title="Action queue" aside={<span className="font-mono text-2xs text-ink-3">{open.length} open</span>}>
            <QueueGroup label="Current" empty="Nothing needs action now." items={current} day={m.day} onContact={(p) => tuesday.openContact({ priority: p })} />
            <QueueGroup label="Pending" empty="No routine follow-ups." items={pending} day={m.day} onContact={(p) => tuesday.openContact({ priority: p })} />
          </Pane>
          <SyncPane />
          <Pane title="Environment">
            <ul className="divide-y divide-line-soft">
              {m.advisories.length === 0 ? (
                <li className="px-3 py-2 text-xs text-ink-3">No environmental advisory for day {m.day}.</li>
              ) : (
                m.advisories.map((a) => (
                  <li key={a.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-ink">{a.title}</span>
                      <span className={`font-mono text-2xs font-semibold ${a.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}`}>{a.level}</span>
                    </div>
                    <p className="mt-0.5 text-2xs text-ink-3">{a.provenanceLabel}. Environmental hazard, not a personal dose.</p>
                  </li>
                ))
              )}
            </ul>
          </Pane>
          <div className="px-1 text-2xs text-ink-3">Synthetic demonstration data. Prototype thresholds, not NASA flight rules.</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-cond text-2xs uppercase tracking-label text-ink-3">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function QueueGroup({
  label,
  empty,
  items,
  day,
  onContact,
}: {
  label: string;
  empty: string;
  items: FollowUpAction[];
  day: number;
  onContact: (priority: "urgent" | "routine") => void;
}) {
  const store = useMissionStore();
  return (
    <div className="border-b border-line last:border-b-0">
      <p className="bg-raised px-3 py-1 font-cond text-2xs font-bold uppercase tracking-label text-ink-3">
        {label} <span className="font-mono">({items.length})</span>
      </p>
      {items.length === 0 ? (
        <p className="px-3 py-2 text-xs text-ink-3">{empty}</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.map((f) => {
            const steps = f.steps?.filter((s) => !s.completed) ?? [];
            const next = steps[0];
            return (
              <li key={f.id} className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-ink">{f.title}</p>
                  <StatusMark status={f.severity} />
                </div>
                <p className="mt-0.5 text-xs text-ink-2">{next ? next.text : f.action}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.severity === "CRITICAL" ? (
                    <button type="button" className="min-h-[32px] rounded-control border border-critical bg-critical px-2.5 font-mono text-2xs font-semibold text-space" onClick={() => onContact("urgent")}>
                      CONTACT MEDICAL OFFICER
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`min-h-[32px] rounded-control border px-2.5 font-mono text-2xs font-semibold ${f.severity === "CAUTION" ? "border-caution text-caution hover:bg-caution/10" : "border-line-strong text-ink hover:border-ink-3"}`}
                    onClick={() => store.setFollowUpCompletion(day, next ? next.id : f.id, true)}
                  >
                    {next ? `MARK STEP ${(f.steps?.length ?? 0) - steps.length + 1} DONE` : "MARK DONE"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Compact Auto Sync status; the full panel is the Auto Sync section. */
function SyncPane() {
  const sync = useSyncState();
  const paired = sync.settings.paired;
  return (
    <Pane title="Auto Sync" aside={<span className="font-mono text-2xs text-ink-3">every {sync.settings.intervalMinutes === 60 ? "1 h" : `${sync.settings.intervalMinutes} min`}</span>}>
      {paired.length === 0 ? (
        <p className="px-3 py-2 text-xs text-ink-3">No devices paired.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {paired.map((p) => {
            const link = sync.links[p.deviceId];
            const connected = link?.status === "connected";
            return (
              <li key={p.deviceId} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                <span className="truncate text-ink">{SYNC_DEVICE_BY_ID[p.deviceId]?.name ?? p.deviceId}</span>
                <span className={`shrink-0 font-mono text-2xs font-semibold ${connected ? "text-nominal" : "text-ink-3"}`}>
                  {connected ? (link?.liveBpm !== undefined ? `${link.liveBpm} BPM` : p.autoSync ? "AUTO" : "ON") : "OFF"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-line px-3 py-2">
        <button type="button" className="btn btn-secondary min-h-[32px] w-full text-xs" onClick={() => scrollToSection("sync")}>
          {paired.length ? "Manage devices" : "Connect a device"}
        </button>
      </div>
    </Pane>
  );
}
