import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookOpenCheck, Cpu, NotebookPen, Stethoscope, FileScan, FileText, Globe2, HeartPulse, ImagePlus, Orbit, Send, Settings2, Smile, Square, Wind, X } from "lucide-react";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import type { TuesdayAction } from "../../engine/tuesdayEngine";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTuesday, type Attachment } from "../../hooks/useTuesday";
import { useUiActions } from "../../hooks/useUi";
import { compressImage, isLocalEndpoint } from "../../services/localModel";
import { wellbeingSummary, type TuesdayMessage } from "../../state/tuesdayStore";
import { Dialog } from "../shared/Dialog";
import { SurgeonReportDialog } from "../SurgeonReportDialog";
import { CheckInCard } from "./CheckInCard";
import { TuesdayMark } from "./TuesdayMark";

const SUGGESTIONS = ["How am I doing?", "I'm bored", "I'm tired", "Show me Earth"];

function ContactBar() {
  const { openContact, linkUp, data } = useTuesday();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-secondary min-h-[32px] px-2.5 text-xs" onClick={() => openContact()}>
        <Stethoscope aria-hidden="true" className="h-3.5 w-3.5" />
        Contact medical officer
      </button>
      <span className={`text-xs ${linkUp ? "text-ink-2" : "text-caution"}`}>
        {linkUp ? "Ground link up" : "No ground link"}
        {data.outbox.length ? `, ${data.outbox.length} queued` : ""}
      </span>
    </div>
  );
}

function ModelBadge() {
  const { model } = useTuesday();
  const text =
    model.state === "ready" && model.choice.chat
      ? `On-device model: ${model.choice.chat}${model.choice.medical && model.choice.medical !== model.choice.chat ? `, images: ${model.choice.medical}` : ""}`
      : model.state === "checking"
        ? "Looking for a model on this device…"
        : model.state === "off"
          ? "Onboard rules only (model turned off)"
          : "Onboard rules only: no local model running";
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
      <Cpu aria-hidden="true" className={`h-3.5 w-3.5 ${model.state === "ready" ? "text-tue" : "text-ink-3"}`} />
      {text}
    </p>
  );
}

function ActionButton({ action, onReport }: { action: TuesdayAction; onReport: () => void }) {
  const { openRecharge, setCheckIn, openContact } = useTuesday();
  const { openGuidance, openLog } = useUiActions();
  const spec =
    action.kind === "earth"
      ? { label: "Open Earth view", icon: Globe2, run: () => openRecharge("earth") }
      : action.kind === "game"
        ? { label: "Play Orbit Catch", icon: Orbit, run: () => openRecharge("game") }
        : action.kind === "breathe"
          ? { label: "Breathe for a minute", icon: Wind, run: () => openRecharge("breathe") }
          : action.kind === "checkin"
            ? { label: "Check in", icon: Smile, run: () => setCheckIn(true) }
            : action.kind === "contact"
              ? { label: "Contact medical officer", icon: Stethoscope, run: () => openContact({ priority: action.priority }) }
              : action.kind === "log"
              ? { label: `Log ${METRIC_GUIDANCE[action.metricId].shortName.toLowerCase()}`, icon: NotebookPen, run: () => openLog({ metricId: action.metricId }) }
              : action.kind === "report"
              ? { label: "Flight-surgeon report", icon: FileText, run: onReport }
              : { label: `${METRIC_GUIDANCE[action.metricId].shortName} guide`, icon: BookOpenCheck, run: () => openGuidance({ kind: "metric", id: action.metricId }) };
  return (
    <button type="button" className={`btn min-h-[32px] px-2.5 text-xs ${action.kind === "contact" && action.priority === "urgent" ? "btn-danger" : "btn-secondary"}`} onClick={spec.run}>
      <spec.icon aria-hidden="true" className={`h-3.5 w-3.5 ${action.kind === "contact" ? "" : "text-tue"}`} />
      {spec.label}
    </button>
  );
}

function MessageRow({ m, last, onReport }: { m: TuesdayMessage; last: boolean; onReport: () => void }) {
  if (m.role === "user") {
    return (
      <li className="ml-8 self-end rounded-tile border border-line-strong bg-raised px-3 py-2 text-sm text-ink">
        {m.attachment ? <span className="mb-1 block text-2xs font-semibold uppercase tracking-label text-ink-3">{m.attachment === "lab" ? "Lab report attached" : "Photo attached"}</span> : null}
        <span className="whitespace-pre-line">{m.text}</span>
      </li>
    );
  }
  return (
    <li className="mr-4 flex gap-2">
      <TuesdayMark className="mt-0.5 h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="rounded-tile border border-tue/30 bg-panel px-3 py-2 text-sm text-ink" aria-live={last ? "polite" : undefined}>
          <p className="whitespace-pre-line">{m.text || <span className="text-ink-3">Thinking…</span>}</p>
          {m.sources?.length ? (
            <ol className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2 text-xs text-ink-2">
              {m.sources.map((s, i) => (
                <li key={s.url}>
                  {m.via === "model" ? `[${i + 1}] ` : "Source: "}
                  <a className="link" href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <p className="mt-1 text-2xs text-ink-3">
          {m.via === "model" ? `On-device model ${m.model ?? ""}` : "Onboard rules"}
          {m.filtered ? `. Safety filter removed ${m.filtered} sentence${m.filtered === 1 ? "" : "s"}.` : ""}
        </p>
        {m.actions?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.actions.map((a, i) => (
              <ActionButton key={`${a.kind}-${i}`} action={a} onReport={onReport} />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function TodayCard() {
  const { context, data, openRecharge, setCheckIn } = useTuesday();
  const week = wellbeingSummary(data.activity, context.day);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const drift = context.drift;
  return (
    <section aria-label="Today with Tuesday" className="rounded-tile border border-line bg-panel p-3">
      <p className="text-md text-ink">
        {hello}. Day {context.day}, and you're <span className="font-semibold">{context.overall}</span>.
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-2">
        <HeartPulse aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${drift.state === "drift" ? "text-tue" : "text-ink-3"}`} />
        <span>
          <span className="font-semibold text-ink">Pattern check: </span>
          {drift.state === "drift" && drift.drivers[0] ? `${drift.unusualDays} of the last ${drift.scores.length} days look unlike your own baseline. ${drift.drivers[0].text}` : drift.text}
        </span>
      </p>
      <p className="mt-1 text-xs text-ink-3">
        Last 7 days: {week.checkIns} check-in{week.checkIns === 1 ? "" : "s"}
        {week.averageEnergy !== null ? `, average energy ${week.averageEnergy.toFixed(1)}/5` : ""}, {week.rechargeMinutes} min of recharge
        {week.averageAfter !== null ? `, feeling ${week.averageAfter.toFixed(1)}/5 afterwards` : ""}.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-primary min-h-[32px] px-2.5 text-xs" onClick={() => setCheckIn(true)}>
          <Smile aria-hidden="true" className="h-3.5 w-3.5" />
          Check in
        </button>
        <button type="button" className="btn btn-secondary min-h-[32px] px-2.5 text-xs" onClick={() => openRecharge("earth")}>
          <Globe2 aria-hidden="true" className="h-3.5 w-3.5 text-tue" />
          Earth
        </button>
        <button type="button" className="btn btn-secondary min-h-[32px] px-2.5 text-xs" onClick={() => openRecharge("game")}>
          <Orbit aria-hidden="true" className="h-3.5 w-3.5 text-tue" />
          Game
        </button>
        <button type="button" className="btn btn-secondary min-h-[32px] px-2.5 text-xs" onClick={() => openRecharge("breathe")}>
          <Wind aria-hidden="true" className="h-3.5 w-3.5 text-tue" />
          Breathe
        </button>
      </div>
    </section>
  );
}

function SettingsBox() {
  const { data, store, model, refreshModels } = useTuesday();
  const [endpoint, setEndpoint] = useState(data.settings.endpoint);
  const valid = isLocalEndpoint(endpoint);
  const names = model.installed;
  return (
    <details className="rounded-tile border border-line bg-panel px-3 py-2 text-sm">
      <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-ink">
        <Settings2 aria-hidden="true" className="h-4 w-4 text-ink-2" />
        Tuesday settings
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={data.settings.useModel} onChange={(e) => store.updateSettings({ useModel: e.target.checked })} />
          Use a language model on this device
        </label>
        <label className="flex flex-col gap-1">
          Model endpoint (Ollama, this device only)
          <input className="field text-sm" value={endpoint} aria-invalid={!valid} onChange={(e) => setEndpoint(e.target.value)} onBlur={() => valid && store.updateSettings({ endpoint })} />
          {!valid ? <span className="text-xs text-critical">Only localhost or 127.0.0.1 is allowed, so health data never leaves the device.</span> : null}
        </label>
        {names.length ? (
          <>
            <label className="flex flex-col gap-1">
              Conversation model
              <select className="field text-sm" value={model.choice.chat ?? ""} onChange={(e) => store.updateSettings({ chatModel: e.target.value || null })}>
                {names.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Image and lab-report model
              <select className="field text-sm" value={model.choice.medical ?? ""} onChange={(e) => store.updateSettings({ medicalModel: e.target.value || null })}>
                <option value="">None</option>
                {names.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <p className="text-xs text-ink-2">
          Recommended: Qwen3 8B for conversation (<code className="num">ollama pull qwen3:8b</code>) and MedGemma 1.5 4B for photos and lab reports. Without a model, Tuesday answers from onboard rules and the protocol library.
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={data.settings.voice} onChange={(e) => store.updateSettings({ voice: e.target.checked })} />
          Read replies aloud (on-device voices only)
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary min-h-[32px] text-xs" onClick={refreshModels}>
            Check for models again
          </button>
          <button type="button" className="btn btn-ghost min-h-[32px] text-xs" onClick={() => store.clearConversation()}>
            Clear conversation
          </button>
        </div>
      </div>
    </details>
  );
}

function Composer() {
  const { ask, busy, stop, model } = useTuesday();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<(Attachment & { preview: string; note: string }) | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const labRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined, kind: Attachment["kind"]) => {
    if (!file) return;
    const img = await compressImage(file, 896);
    if (!img) return;
    setPending({ kind, base64: img.base64, preview: `data:image/jpeg;base64,${img.base64}`, note: `${img.width} × ${img.height}, ${Math.round(img.bytes / 1024)} KB after on-device compression` });
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const t = text;
    const a = pending;
    if (!t.trim() && !a) return;
    setText("");
    setPending(null);
    void ask(t, a ? { kind: a.kind, base64: a.base64 } : undefined);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="btn btn-ghost min-h-[30px] border-line px-2 text-xs" disabled={busy} onClick={() => void ask(s)}>
            {s}
          </button>
        ))}
      </div>
      {pending ? (
        <div className="flex items-center gap-2 rounded-tile border border-line-strong bg-panel p-2">
          <img src={pending.preview} alt="" className="h-12 w-12 rounded-badge object-cover" />
          <div className="min-w-0 flex-1 text-xs text-ink-2">
            <p className="font-semibold text-ink">{pending.kind === "lab" ? "Lab report" : "Photo"} ready</p>
            <p>{pending.note}. Sent only to the model on this device.</p>
          </div>
          <button type="button" className="btn btn-ghost min-h-[32px] min-w-[32px] px-1" aria-label="Remove attachment" onClick={() => setPending(null)}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-1.5">
        <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onFile(e.target.files?.[0], "photo").then(() => (e.target.value = ""))} />
        <input ref={labRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0], "lab").then(() => (e.target.value = ""))} />
        <button type="button" className="btn btn-ghost min-h-[40px] min-w-[40px] px-2" aria-label="Attach a photo for visual review" title={model.choice.medical ? "Photo for visual review" : "Photo review needs MedGemma on this device"} onClick={() => photoRef.current?.click()}>
          <ImagePlus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className="btn btn-ghost min-h-[40px] min-w-[40px] px-2" aria-label="Attach a lab report to read" title="Read a lab report" onClick={() => labRef.current?.click()}>
          <FileScan aria-hidden="true" className="h-4 w-4" />
        </button>
        <label className="sr-only" htmlFor="tuesday-input">
          Message Tuesday
        </label>
        <textarea
          id="tuesday-input"
          className="field min-h-[40px] flex-1 resize-none py-2 text-sm"
          rows={1}
          placeholder="Talk to Tuesday"
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {busy ? (
          <button type="button" className="btn btn-secondary min-h-[40px]" onClick={stop}>
            <Square aria-hidden="true" className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button type="submit" className="btn btn-primary min-h-[40px]" disabled={!text.trim() && !pending}>
            <Send aria-hidden="true" className="h-4 w-4" />
            Send
          </button>
        )}
      </div>
    </form>
  );
}

/** Tuesday's conversation drawer. */
export function TuesdayPanel() {
  const { open, setOpen, data, checkIn } = useTuesday();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [reportOpen, setReportOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastText = data.messages.at(-1)?.text;

  useEffect(() => {
    const el = listRef.current?.closest(".overflow-y-auto");
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, data.messages.length, lastText, checkIn]);

  return (
    <>
      <SurgeonReportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <Dialog open={open} onClose={() => setOpen(false)} title="Tuesday" titleExtra={
          <>
            <ModelBadge />
            <ContactBar />
          </>
        } variant="drawer" modal={!desktop} labelId="tuesday-title" footer={<Composer />}>
        <div ref={listRef} className="flex flex-col gap-3 px-4 py-3">
          <TodayCard />
          <SettingsBox />
          {data.messages.length === 0 ? (
            <p className="text-sm text-ink-2">
              Hi, I'm Tuesday. I keep you company, watch your readings against your own baseline, and help you recharge. Ask me anything, or tell me how you feel.
            </p>
          ) : null}
          <ol className="flex flex-col gap-3" aria-label="Conversation">
            {data.messages.map((m, i) => (
              <MessageRow key={m.id} m={m} last={i === data.messages.length - 1} onReport={() => setReportOpen(true)} />
            ))}
          </ol>
          {checkIn ? <CheckInCard /> : null}
          <p className="text-2xs text-ink-3">Tuesday is a prototype companion, not a medical device or counsellor. Conversation and check-ins stay in this browser.</p>
        </div>
      </Dialog>
    </>
  );
}

export function TuesdayLauncher() {
  const { open, setOpen } = useTuesday();
  if (open) return null;
  return (
    <button
      type="button"
      className="fixed bottom-[88px] right-4 z-30 flex min-h-[48px] items-center gap-2 rounded-full border border-tue/60 bg-raised py-1.5 pl-2 pr-4 font-cond text-md font-semibold text-ink hover:border-tue lg:bottom-5"
      aria-haspopup="dialog"
      onClick={() => setOpen(true)}
    >
      <TuesdayMark className="h-8 w-8" />
      Tuesday
    </button>
  );
}
