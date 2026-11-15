import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { MISSION } from "../config/thresholds";
import { METRIC_GUIDANCE } from "../data/metricGuidance";
import { useMissionModel } from "../hooks/useMissionModel";
import { useMissionStore } from "../hooks/useMissionState";
import { useToast } from "../hooks/useToast";
import { useUiActions, useUiState } from "../hooks/useUi";
import { cumulativeDoseAt, manualHistory } from "../services/telemetryService";
import { tasksForDay } from "../engine/readinessEngine";
import { ALL_METRIC_IDS, type GlucoseContext, type MetricId, type SymptomValue } from "../types/health";
import { currentShipTime, formatLocalDateTime, formatReadingDate } from "../utils/dates";
import { formatWithUnit, METRIC_UNITS } from "../utils/formatting";
import { entrySpec, isMetricId, validateMeasurement, type FieldErrors, type MeasurementDraft } from "../utils/validation";
import { Dialog } from "./shared/Dialog";

const NO_SYMPTOMS: SymptomValue = { blurredVision: false, headache: false, eyePressure: false, otherSymptom: false };
const SYMPTOM_FIELDS: { key: keyof SymptomValue; label: string }[] = [
  { key: "blurredVision", label: "Blurred vision" },
  { key: "eyePressure", label: "Eye pressure sensation" },
  { key: "headache", label: "Headache" },
  { key: "otherSymptom", label: "Other new symptom (describe in notes)" },
];

function emptyDraft(metricId: MetricId, day: number): MeasurementDraft {
  return {
    metricId,
    missionDay: String(day),
    shipTime: currentShipTime(),
    value: "",
    systolic: "",
    diastolic: "",
    symptoms: { ...NO_SYMPTOMS },
    glucoseContext: "fasting",
    notes: "",
  };
}

function FieldError({ id, msg }: { id: string; msg: string | undefined }) {
  return msg ? (
    <p id={id} className="mt-1 text-sm text-[#ff8aa0]">
      {msg}
    </p>
  ) : null;
}

export function MeasurementForm() {
  const { log } = useUiState();
  const { closeLog } = useUiActions();
  const { day, days, measurements, readinessInput } = useMissionModel();
  const store = useMissionStore();
  const toast = useToast();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [draft, setDraft] = useState<MeasurementDraft>(() => emptyDraft("heartRate", day));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<string>("");

  // Reset the form whenever it opens.
  useEffect(() => {
    if (log) {
      setDraft(emptyDraft(log.metricId, log.day ?? day));
      setErrors({});
      setStatus("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  const g = METRIC_GUIDANCE[draft.metricId];
  const unit = METRIC_UNITS[draft.metricId];
  const spec = entrySpec(draft.metricId);
  const history = useMemo(() => manualHistory(measurements, draft.metricId).toReversed().slice(0, 6), [measurements, draft.metricId]);

  const set = <K extends keyof MeasurementDraft>(k: K, v: MeasurementDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const dayNum = Number(draft.missionDay);
    const laterDoses = measurements
      .filter((m) => m.metricId === "radiation" && m.missionDay > dayNum && typeof m.value === "number")
      .map((m) => m.value as number);
    const result = validateMeasurement(draft, {
      previousCumulativeDose: cumulativeDoseAt(days, dayNum - 1),
      nextManualDose: laterDoses.length ? Math.min(...laterDoses) : null,
    });
    if (!result.ok) {
      setErrors(result.errors);
      setStatus("Check the highlighted fields.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const linked = tasksForDay(readinessInput, result.missionDay).find((t) => t.linkedMetric === draft.metricId);
    const saved = store.logMeasurement({
      linkedTaskComplete: Boolean(linked?.completed),
      metricId: draft.metricId,
      value: result.value,
      missionDay: result.missionDay,
      recordedAt: result.recordedAt,
      ...(result.notes ? { notes: result.notes } : {}),
      ...(result.glucoseContext ? { glucoseContext: result.glucoseContext } : {}),
    });
    if (!saved.ok) {
      setStatus(saved.message);
      return;
    }
    setErrors({});
    if (result.missionDay !== day) store.setSelectedDay(result.missionDay);
    toast({
      tone: saved.persisted ? "success" : "warning",
      title: `${g.name} saved: ${formatWithUnit(draft.metricId, result.value)}`,
      body: `${saved.message} Status, charts and readiness are recalculated.${saved.completedTaskTitle ? ` "${saved.completedTaskTitle}" marked complete.` : ""}`,
      ...(saved.measurement
        ? {
            action: {
              label: "Undo",
              onClick: () => {
                if (saved.measurement) store.deleteMeasurement(saved.measurement.id);
              },
            },
          }
        : {}),
    });
    closeLog();
  };

  const err = (k: keyof FieldErrors) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${uid}-${k}-err` } : {});

  return (
    <Dialog
      open={log !== null}
      onClose={closeLog}
      title="Log measurement"
      labelId="log-title"
      widthClass="max-w-xl"
      titleExtra={<p className="mt-1 text-sm text-ink-2">Saved only in this browser. History is never overwritten.</p>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-2" role="status" aria-live="polite">
            {status}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={closeLog}>
              Cancel
            </button>
            <button type="submit" form={`${uid}-form`} className="btn btn-primary">
              Save measurement
            </button>
          </div>
        </div>
      }
    >
      <form id={`${uid}-form`} ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4 px-5 py-4">
        <div>
          <label htmlFor={`${uid}-metric`} className="label">
            Metric
          </label>
          <select
            id={`${uid}-metric`}
            name="metric"
            data-autofocus
            className="field mt-1"
            value={draft.metricId}
            onChange={(e) => {
              const v = e.target.value;
              if (isMetricId(v)) {
                setDraft((d) => ({ ...emptyDraft(v, Number(d.missionDay) || day), shipTime: d.shipTime, missionDay: d.missionDay }));
                setErrors({});
              }
            }}
          >
            {ALL_METRIC_IDS.map((m) => (
              <option key={m} value={m}>
                {METRIC_GUIDANCE[m].name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-ink-2">
            Device: {g.deviceRequired}
          </p>
        </div>

        {draft.metricId === "bloodPressure" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-sys`} className="label">
                Systolic (top number)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input id={`${uid}-sys`} name="systolic" inputMode="numeric" autoComplete="off" placeholder="e.g. 118…" className="field num" value={draft.systolic} onChange={(e) => set("systolic", e.target.value)} {...err("systolic")} />
                <span className="num text-sm text-ink-2">mmHg</span>
              </div>
              <FieldError id={`${uid}-systolic-err`} msg={errors.systolic} />
            </div>
            <div>
              <label htmlFor={`${uid}-dia`} className="label">
                Diastolic (bottom number)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input id={`${uid}-dia`} name="diastolic" inputMode="numeric" autoComplete="off" placeholder="e.g. 76…" className="field num" value={draft.diastolic} onChange={(e) => set("diastolic", e.target.value)} {...err("diastolic")} />
                <span className="num text-sm text-ink-2">mmHg</span>
              </div>
              <FieldError id={`${uid}-diastolic-err`} msg={errors.diastolic} />
            </div>
          </div>
        ) : draft.metricId === "symptoms" ? (
          <fieldset>
            <legend className="label">Symptoms noticed now</legend>
            <div className="mt-1.5 grid gap-2">
              {SYMPTOM_FIELDS.map((s) => (
                <label key={s.key} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-tile border border-line px-3 py-2 hover:border-line-strong">
                  <input
                    type="checkbox"
                    name={s.key}
                    className="h-4 w-4 accent-[#42D9F5]"
                    checked={draft.symptoms[s.key]}
                    onChange={(e) => set("symptoms", { ...draft.symptoms, [s.key]: e.target.checked })}
                  />
                  <span className="text-base text-ink">{s.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-ink-2">Leave all unticked to record a check with no symptoms. This check cannot diagnose SANS.</p>
          </fieldset>
        ) : (
          <div>
            <label htmlFor={`${uid}-value`} className="label">
              {draft.metricId === "radiation" ? "Cumulative dosimeter reading" : g.name}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id={`${uid}-value`}
                name="value"
                inputMode="decimal"
                autoComplete="off"
                placeholder={spec ? `${spec.min}–${spec.max}…` : ""}
                className="field num"
                value={draft.value}
                onChange={(e) => set("value", e.target.value)}
                {...err("value")}
              />
              <span className="num min-w-[3.5rem] text-sm text-ink-2">{unit}</span>
            </div>
            <FieldError id={`${uid}-value-err`} msg={errors.value} />
            {draft.metricId === "radiation" ? (
              <p className="mt-1 text-sm text-ink-2">
                Enter the cumulative value shown on your dosimeter. Previous day: <span className="num">{cumulativeDoseAt(days, Number(draft.missionDay) - 1).toFixed(2)} mSv</span>.
              </p>
            ) : null}
          </div>
        )}

        {draft.metricId === "bloodGlucose" ? (
          <fieldset>
            <legend className="label">Timing context</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(["fasting", "post-meal", "other"] as GlucoseContext[]).map((c) => (
                <label key={c} className="flex min-h-[36px] cursor-pointer items-center gap-2 rounded-tile border border-line px-3 hover:border-line-strong">
                  <input type="radio" name="glucoseContext" className="accent-[#42D9F5]" checked={draft.glucoseContext === c} onChange={() => set("glucoseContext", c)} />
                  <span className="text-base capitalize text-ink">{c.replace("-", " ")}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <div>
            <label htmlFor={`${uid}-day`} className="label">
              Mission day
            </label>
            <input
              id={`${uid}-day`}
              name="missionDay"
              type="number"
              min={1}
              max={MISSION.totalDays}
              inputMode="numeric"
              className="field num mt-1"
              value={draft.missionDay}
              onChange={(e) => set("missionDay", e.target.value)}
              {...err("missionDay")}
            />
            <FieldError id={`${uid}-missionDay-err`} msg={errors.missionDay} />
          </div>
          <div>
            <label htmlFor={`${uid}-time`} className="label">
              Ship time (UTC)
            </label>
            <input
              id={`${uid}-time`}
              name="shipTime"
              type="time"
              className="field num mt-1"
              value={draft.shipTime}
              onChange={(e) => set("shipTime", e.target.value)}
              {...err("recordedAt")}
            />
            <p className="mt-1 text-2xs text-ink-3">Stored as MET on mission day {draft.missionDay || "?"}. The real time you typed it is kept separately.</p>
            <FieldError id={`${uid}-recordedAt-err`} msg={errors.recordedAt} />
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-notes`} className="label">
            Notes <span className="normal-case tracking-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id={`${uid}-notes`}
            name="notes"
            rows={2}
            maxLength={300}
            placeholder="Posture, device, symptoms…"
            className="field mt-1 resize-y"
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            {...err("notes")}
          />
          <FieldError id={`${uid}-notes-err`} msg={errors.notes} />
        </div>

        <div>
          <h3 className="label">Your recent {g.shortName.toLowerCase()} entries</h3>
          {history.length === 0 ? (
            <p className="mt-1 text-sm text-ink-2">No manual entries yet. Charts use synthetic demo telemetry until you log one.</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-line rounded-tile border border-line">
              {history.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="min-w-0 text-sm">
                    <span className="num text-ink">{formatWithUnit(m.metricId, m.value)}</span>
                    <span className="num ml-2 text-ink-2">{formatReadingDate(m.missionDay, m.recordedAt)}</span>
                    {m.enteredAt ? <span className="ml-2 text-2xs text-ink-3">entered {formatLocalDateTime(m.enteredAt)}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-[32px] px-2 text-xs"
                    aria-label={`Remove entry ${formatWithUnit(m.metricId, m.value)} on day ${m.missionDay}`}
                    onClick={() => {
                      const r = store.deleteMeasurement(m.id);
                      setStatus(r.message);
                    }}
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Dialog>
  );
}
