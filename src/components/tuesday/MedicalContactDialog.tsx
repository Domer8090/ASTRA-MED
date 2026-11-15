import { useId, useMemo, useState } from "react";
import { Copy, Download, Inbox, RadioTower, Trash2, TriangleAlert, WifiOff } from "lucide-react";
import { LINK_UP_NOTE, NO_LINK_STEPS, ONBOARD_FIRST } from "../../data/medicalContact";
import { missionSignalMinutes } from "../../utils/dates";
import { buildMedicalMessage, type ContactPriority } from "../../engine/medicalContact";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useToast } from "../../hooks/useToast";
import { useTuesday } from "../../hooks/useTuesday";
import { currentShipTime } from "../../utils/dates";
import { Dialog } from "../shared/Dialog";
import { Segmented } from "../shared/Segmented";

function saveText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Contact the medical officer. With a ground link the crew copies a prepared
 * message into mission comms; without one, Tuesday lists the on-board steps
 * and queues the message on this device for the next contact.
 */
export function MedicalContactDialog() {
  const { contact, closeContact } = useTuesday();
  return (
    <Dialog open={contact !== null} onClose={closeContact} title="Contact the medical officer" widthClass="max-w-3xl" labelId="contact-title">
      {contact ? <ContactBody key={`${contact.priority}-${contact.report}`} initialPriority={contact.priority} initialReport={contact.report} /> : null}
    </Dialog>
  );
}

function ContactBody({ initialPriority, initialReport }: { initialPriority: ContactPriority; initialReport: string }) {
  const { linkUp, simulatedLos, setSimulatedLos, store, data, closeContact } = useTuesday();
  const m = useMissionModel();
  const toast = useToast();
  const uid = useId();
  const [priority, setPriority] = useState<ContactPriority>(initialPriority);
  const [report, setReport] = useState(initialReport);
  const [actionsTaken, setActionsTaken] = useState("");
  const delay = missionSignalMinutes(m.day);

  const text = useMemo(
    () =>
      buildMedicalMessage({
        day: m.day,
        shipTime: currentShipTime(),
        priority,
        overall: m.overall.status,
        diagnostics: m.diagnostics,
        trends: m.trends,
        drift: m.drift,
        advisories: m.advisories,
        report,
        actionsTaken,
        linkUp,
        signalDelayMinutes: delay,
      }),
    [m.day, priority, m.overall.status, m.diagnostics, m.trends, m.drift, m.advisories, report, actionsTaken, linkUp, delay],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ tone: "success", title: "Message copied", body: "Paste it into the mission's messaging system. ASTRA-MED does not send it." });
    } catch {
      toast({ tone: "warning", title: "Could not copy", body: "Use Save .txt instead." });
    }
  };

  const queue = () => {
    const ok = store.queueMessage({ missionDay: m.day, priority, text });
    toast({ tone: ok ? "success" : "warning", title: ok ? "Queued for the next contact" : "Queued for this session only", body: ok ? "It stays on this device until you hand it over." : "This browser is not saving data." });
    closeContact();
  };

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className={`flex items-start gap-3 rounded-tile border px-3 py-2 ${linkUp ? "border-line-strong bg-panel" : "border-caution/60 bg-caution/[0.06]"}`} role="status">
        {linkUp ? <RadioTower aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-cyan" /> : <WifiOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-caution" />}
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-ink">{linkUp ? "Ground link up" : "No ground link (loss of signal)"}</p>
          <p className="text-ink-2">
            {linkUp
              ? `One-way signal delay today is ${delay.toFixed(1)} min, so the earliest possible reply is about ${Math.round(delay * 2)} min away.`
              : "Messages are kept on this device and handed over at the next contact. Decisions are made on board until then."}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-2">
          <input type="checkbox" checked={simulatedLos} onChange={(e) => setSimulatedLos(e.target.checked)} />
          Simulate loss of signal
        </label>
      </div>

      <Segmented<ContactPriority>
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={[
          { value: "urgent", label: "Urgent" },
          { value: "routine", label: "Routine" },
        ]}
      />

      {priority === "urgent" || !linkUp ? (
        <section aria-labelledby={`${uid}-first`} className="rounded-tile border border-critical/50 bg-critical/[0.05] p-3">
          <h3 id={`${uid}-first`} className="flex items-center gap-2 font-cond text-md font-bold text-ink">
            <TriangleAlert aria-hidden="true" className="h-4 w-4 text-critical" />
            {linkUp ? "Do these now, on board" : "No link: do these on board"}
          </h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
            {(priority === "urgent" ? ONBOARD_FIRST : []).concat(linkUp ? [] : NO_LINK_STEPS).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-ink">
        What is happening?
        <textarea className="field min-h-[72px] text-sm" value={report} maxLength={1200} onChange={(e) => setReport(e.target.value)} placeholder="Symptoms, when they started, readings you took" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        What have you done so far?
        <textarea className="field min-h-[56px] text-sm" value={actionsTaken} maxLength={800} onChange={(e) => setActionsTaken(e.target.value)} placeholder="Repeated the measurement, rested, told a crewmate…" />
      </label>

      <details className="rounded-tile border border-line bg-panel px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Preview the message</summary>
        <pre className="num mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-ink-2">{text}</pre>
      </details>

      <div className="flex flex-wrap gap-2">
        {linkUp ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => void copy()}>
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copy for mission comms
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => saveText(text, `astra-med-day-${m.day}-medical-officer.txt`)}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Save .txt
            </button>
            <button type="button" className="btn btn-ghost" onClick={queue}>
              Queue instead
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={queue}>
            <Inbox aria-hidden="true" className="h-4 w-4" />
            Queue for next contact
          </button>
        )}
      </div>
      {linkUp ? <p className="text-xs text-ink-3">{LINK_UP_NOTE}</p> : null}

      {data.outbox.length ? (
        <section aria-labelledby={`${uid}-queue`} className="border-t border-line pt-3">
          <h3 id={`${uid}-queue`} className="font-cond text-sm font-bold text-ink">
            Queued on this device ({data.outbox.length})
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {data.outbox.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2 rounded-tile border border-line bg-panel px-3 py-2 text-sm">
                <span className={`chip-tag ${q.priority === "urgent" ? "border-critical/60 text-critical" : "border-line-strong text-ink-2"}`}>{q.priority}</span>
                <span className="num text-xs text-ink-2">Day {q.missionDay}, {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {q.reviewed ? <span className="chip-tag border-nominal/50 text-nominal">Reviewed by medical officer</span> : null}
                <span className="ml-auto flex gap-1">
                  {linkUp ? (
                    <button
                      type="button"
                      className="btn btn-secondary min-h-[30px] px-2 text-xs"
                      onClick={() =>
                        void navigator.clipboard.writeText(q.text).then(
                          () => toast({ tone: "success", title: "Queued message copied", body: "Remove it once it is sent." }),
                          () => saveText(q.text, `astra-med-queued-${q.id.slice(0, 8)}.txt`),
                        )
                      }
                    >
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-ghost min-h-[30px] px-2 text-xs" aria-label={`Remove queued message from day ${q.missionDay}`} onClick={() => store.removeQueued(q.id)}>
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    {linkUp ? "Sent" : "Remove"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
