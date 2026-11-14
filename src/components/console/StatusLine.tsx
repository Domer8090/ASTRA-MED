import { useState } from "react";
import { BookOpenCheck, Clock3, FileText, Radiation, RadioTower, Stethoscope, Sun } from "lucide-react";
import { STATUS_TEXT_CLASS } from "../../config/theme";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useUiActions } from "../../hooks/useUi";
import { useMissionStore } from "../../hooks/useMissionState";
import type { HealthStatus } from "../../types/health";
import { formatMetStamp, formatReadingStamp, formatRelative, padDay } from "../../utils/dates";
import { capitalize, formatNumber } from "../../utils/formatting";
import { earthMarsLightMinutes } from "../../engine/lightTime";
import { useCmeForecast } from "../../hooks/useCmeForecast";
import { useNow } from "../../hooks/useNow";
import { useTuesday } from "../../hooks/useTuesday";
import { nextArrival } from "../../services/enlilForecast";
import { scrollToSection } from "../navigation";
import { TrendChip } from "../shared/TrendChip";
import { SurgeonReportDialog } from "../SurgeonReportDialog";
import { BasisLine } from "../shared/BasisLine";
import { ProvenanceTag } from "../shared/ProvenanceTag";
import { StatusBadge, StatusIcon } from "../shared/StatusBadge";
import { useConsoleFocus, useSelectedSystem } from "./useConsoleFocus";

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

const FRAME: Record<HealthStatus, string> = {
  NOMINAL: "border-nominal/35",
  CAUTION: "border-caution/55",
  CRITICAL: "border-critical/65",
};

/** Where the selected day sits in the scenario's story, with a way back to the demo start day. */
function ScenarioContext() {
  const { day, advisories, scenario } = useMissionModel();
  const store = useMissionStore();
  const hazardNow = advisories.find((a) => a.source === "scenario");
  const story = scenario.storyDays;
  const inStory = story ? day >= story[0] && day <= story[1] : day === scenario.focusDay;
  // Nominal mission at its start day needs no banner; the status band says everything.
  if (!story && inStory) return null;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-tile border px-4 py-2 text-sm ${story && inStory ? "border-caution/50 bg-caution/[0.06]" : "border-line-strong bg-panel"}`}
    >
      <span className="font-cond text-xs font-bold tracking-label text-ink">
        SCENARIO {scenario.code}: {scenario.name.toUpperCase()}
      </span>
      {story && inStory ? (
        <span className="text-ink">
          Story active on day {day}
          {hazardNow ? `: environmental hazard ${hazardNow.level} (${hazardNow.phase}).` : "."} {scenario.id === "cardiovascular" ? "Heart rate and blood pressure are above their caution limits." : null}
        </span>
      ) : (
        <>
          <span className="text-ink-2">
            {story
              ? day < story[0]
                ? `Day ${day} is before this scenario's event window (days ${story[0]}–${story[1]}).`
                : `Day ${day} is after this scenario's event window (days ${story[0]}–${story[1]}).`
              : `The demo for this scenario starts on day ${scenario.focusDay}. You are viewing day ${day}.`}
          </span>
          <button type="button" className="btn btn-primary min-h-[30px] px-2.5 text-xs" onClick={() => store.setSelectedDay(scenario.focusDay)}>
            Go to day {scenario.focusDay}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The console's lead band. It answers one question first: what is happening to
 * this astronaut, and what should happen next. Status, the body system to watch
 * and the single next action lead; counts and last check stay secondary.
 */
/** One-way Earth–Mars radio delay on today's real date. */
function SignalDelay() {
  const now = useNow(60_000);
  const minutes = earthMarsLightMinutes(now);
  return (
    <span
      className="flex items-center gap-1.5"
      title="One-way radio signal time between Earth and Mars on today's real date, from NASA JPL approximate planetary positions. A question to the ground and its answer take twice this, plus crew and ground response time."
    >
      <RadioTower aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="label">Earth–Mars delay today</span>
      <span className="num text-ink">{formatNumber(minutes, 1)} min</span>
      <span className="text-ink-3">one way</span>
    </span>
  );
}

/** A model-predicted CME arrival at Mars within the next three days. */
function MarsCmeNotice() {
  const { arrivals, source } = useCmeForecast();
  const now = useNow(60_000).getTime();
  const next = nextArrival(arrivals, "Mars", now, 0);
  if (!next || Date.parse(next.arrivalTime) - now > 72 * 3_600_000) return null;
  return (
    <a href="#weather" className="flex items-center gap-1.5 text-ink hover:text-cyan" onClick={(e) => { e.preventDefault(); scrollToSection("weather"); }}>
      <Sun aria-hidden="true" className="h-3.5 w-3.5 text-caution" />
      <span className="font-cond font-semibold tracking-label text-caution">CME FORECAST</span>
      <span>
        reaches Mars {formatRelative(next.arrivalTime, now)}
        {next.glancingBlow ? ", glancing blow" : ""} (NASA model, {source === "live" ? "LIVE" : "CACHED"})
      </span>
    </a>
  );
}

export function StatusLine() {
  const { overall, primaryAction, lastReading, day, advisories, systems, trends } = useMissionModel();
  const { system: shown, priority } = useSelectedSystem();
  const { focusSystem } = useConsoleFocus();
  const { openGuidance, followPriority } = useUiActions();
  const [reportOpen, setReportOpen] = useState(false);
  const { openContact } = useTuesday();
  const watch = systems[priority.id];
  const activeHazard = advisories.find((a) => a.level !== "ALL CLEAR");
  const needsWatch = watch.status !== "NOMINAL" || Boolean(activeHazard);
  const outside = watch.diagnostics.filter((d) => d.status !== "NOMINAL").map((d, i) => {
    const n = METRIC_GUIDANCE[d.metricId].name;
    // Mid-sentence: lower-case ordinary words, keep acronyms such as PVT.
    return i === 0 || /^[A-Z]{2}/.test(n) ? n : n[0]!.toLowerCase() + n.slice(1);
  });
  const hazardLink = activeHazard?.relations.find((r) => r.id === priority.id && r.relation === "Direct");
  const watchReason = [
    outside.length ? `${capitalize(listFormat.format(outside))} outside the configured demonstration range.` : "",
    hazardLink && activeHazard ? `Directly linked to the active ${activeHazard.level} environmental hazard.` : "",
  ]
    .filter(Boolean)
    .join(" ") || `${capitalize(priority.reason)}.`;

  return (
    <div className="flex flex-col gap-2">
      <SurgeonReportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
      <ScenarioContext />
      <div data-tour="status" className={`panel overflow-hidden border ${FRAME[overall.status]}`}>
        <div className="grid gap-px bg-line md:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.7fr)]">
          <div className="flex flex-col justify-center gap-1 bg-panel px-4 py-3">
            <p className="label">Astronaut health, day {padDay(day)}</p>
            <p className={`flex items-center gap-2 font-cond text-xl font-bold tracking-status ${STATUS_TEXT_CLASS[overall.status]}`}>
              <StatusIcon status={overall.status} className="h-7 w-7" />
              {overall.status}
            </p>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-0.5" aria-label="Indicator counts">
              {(["NOMINAL", "CAUTION", "CRITICAL"] as const).map((s) => (
                <li key={s} className={`flex items-center gap-1 text-xs ${overall.counts[s] && s !== "NOMINAL" ? STATUS_TEXT_CLASS[s] : "text-ink-3"}`}>
                  <StatusIcon status={s} className="h-3 w-3" />
                  <span className="num font-semibold">{overall.counts[s]}</span>
                  <span className="font-cond font-semibold tracking-label">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-1 bg-panel px-4 py-3">
            <p className="label">{needsWatch ? "Body system to watch" : "Body systems"}</p>
            {needsWatch ? (
              <>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-cond text-lg font-bold leading-tight text-ink">{BODY_SYSTEMS[priority.id].name}</span>
                  <StatusBadge status={watch.status} />
                </p>
                <p className="text-sm text-ink-2">{watchReason}</p>
                {shown !== priority.id ? (
                  <button
                    type="button"
                    className="link self-start text-xs"
                    onClick={() => {
                      followPriority();
                      focusSystem(priority.id);
                      followPriority();
                    }}
                  >
                    Show {BODY_SYSTEMS[priority.id].shortName.toLowerCase()} on the body map
                  </button>
                ) : null}
              </>
            ) : trends[0] ? (
              <>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-cond text-lg font-bold leading-tight text-ink">{BODY_SYSTEMS[METRIC_GUIDANCE[trends[0].metricId].system].name}</span>
                  <TrendChip />
                </p>
                <p className="text-sm text-ink-2">
                  Every indicator is inside its range, but {METRIC_GUIDANCE[trends[0].metricId].name.toLowerCase()} is {trends[0].direction} toward its caution limit: about {trends[0].daysToLimit} {trends[0].daysToLimit === 1 ? "day" : "days"} at the current rate.
                </p>
              </>
            ) : (
              <p className="text-md text-ink">All five systems are inside their configured ranges.</p>
            )}
          </div>

          <div className="flex min-w-0 items-start gap-3 bg-raised px-4 py-3 md:col-span-2 xl:col-span-1">
            <div className="min-w-0 flex-1">
              <p className="label text-cyan">Next action</p>
              <p className="mt-0.5 line-clamp-3 text-md font-medium text-ink" title={primaryAction.text}>
                {primaryAction.text}
              </p>
              {primaryAction.basis ? <BasisLine basis={primaryAction.basis} inline /> : null}
            </div>
            {primaryAction.guidance ? (
              <button type="button" className="btn btn-secondary min-h-[32px] shrink-0 text-xs" onClick={() => primaryAction.guidance && openGuidance(primaryAction.guidance)}>
                <BookOpenCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Guide
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-1.5 text-xs text-ink-2">
          {activeHazard ? (
            <span className="flex items-center gap-1.5 text-caution">
              <Radiation aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="font-cond font-semibold tracking-label">HAZARD {activeHazard.level}</span>
              <span className="text-ink-2">environmental, not personal dose</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="label">Last check</span>
            {lastReading ? (
              <>
                <span className="num text-ink" title={`MET ${formatMetStamp(lastReading.recordedAt)}, ship time UTC`}>
                  {formatReadingStamp(lastReading.missionDay, lastReading.recordedAt)}
                </span>
                <ProvenanceTag kind={lastReading.source === "synthetic" ? "SYNTHETIC" : "MANUAL"} />
              </>
            ) : (
              <span>none</span>
            )}
          </span>
          <MarsCmeNotice />
          <SignalDelay />
          <button
            type="button"
            className={`btn ml-auto min-h-[32px] px-2 text-xs ${overall.status === "CRITICAL" ? "btn-danger" : "btn-ghost"}`}
            onClick={() => openContact({ priority: overall.status === "CRITICAL" ? "urgent" : "routine", report: "" })}
          >
            <Stethoscope aria-hidden="true" className="h-3.5 w-3.5" />
            Contact medical officer
          </button>
          <button type="button" className="btn btn-ghost min-h-[32px] px-2 text-xs" onClick={() => setReportOpen(true)}>
            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
            Report for flight surgeon
          </button>
        </div>
      </div>
    </div>
  );
}
