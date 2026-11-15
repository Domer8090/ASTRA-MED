import { useMemo } from "react";
import { Globe2, Orbit, Radiation, RadioTower, Users, Wind, type LucideIcon } from "lucide-react";
import { HRP_HAZARDS_URL, type HazardId } from "../data/spaceflightHazards";
import { hazardMap, type HazardAction } from "../engine/hazardMap";
import { earthMarsLightMinutes } from "../engine/lightTime";
import { useConsoleFocus } from "./console/useConsoleFocus";
import { useMissionModel } from "../hooks/useMissionModel";
import { useTuesday } from "../hooks/useTuesday";
import { useUiActions } from "../hooks/useUi";
import { wellbeingSummary } from "../state/tuesdayStore";
import { scrollToSection } from "./navigation";
import { StatusBadge } from "./shared/StatusBadge";
import { InfoTip } from "./shared/InfoTip";

const ICONS: Record<HazardId, LucideIcon> = {
  radiation: Radiation,
  isolation: Users,
  distance: RadioTower,
  gravity: Orbit,
  environment: Wind,
};

/** The five hazards of human spaceflight, each tied to what ASTRA-MED watches today. */
export function HazardMap() {
  const m = useMissionModel();
  const { linkUp, data, setOpen, openContact } = useTuesday();
  const { openGuidance } = useUiActions();
  const { focusSystem } = useConsoleFocus();
  const week = wellbeingSummary(data.activity, m.day);

  const cards = useMemo(
    () =>
      hazardMap({
        systems: m.systems,
        diagnostics: m.diagnostics,
        advisories: m.advisories,
        drift: m.drift,
        linkUp,
        signalDelayMinutes: earthMarsLightMinutes(new Date()),
        queuedMessages: data.outbox.length,
        checkInsThisWeek: week.checkIns,
        rechargeMinutesThisWeek: week.rechargeMinutes,
      }),
    [m.systems, m.diagnostics, m.advisories, m.drift, linkUp, data.outbox.length, week.checkIns, week.rechargeMinutes],
  );

  const run = (a: HazardAction) => {
    if (a.kind === "weather") scrollToSection("weather");
    else if (a.kind === "tuesday") setOpen(true);
    else if (a.kind === "contact") openContact({ report: "" });
    else if (a.kind === "system") {
      focusSystem(a.id);
      scrollToSection("overview");
    } else openGuidance({ kind: "metric", id: a.metricId });
  };

  return (
    <section id="hazards" aria-labelledby="hazards-title" className="panel scroll-mt-[var(--sticky-offset)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="hazards-title" className="flex items-center gap-1 font-cond text-lg font-bold text-ink">
          Five hazards of human spaceflight
          <InfoTip label="Five hazards">
            What ASTRA-MED watches for each NASA Human Research Program hazard on day {m.day}. Statuses come from the same engine as the console; the mapping is ASTRA-MED&apos;s own.
          </InfoTip>
        </h2>
        <a className="link text-xs" href={HRP_HAZARDS_URL} target="_blank" rel="noreferrer">
          NASA Human Research Program
        </a>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => {
          const Icon = ICONS[c.id];
          return (
            <li key={c.id} className="flex flex-col gap-2 rounded-tile border border-line bg-raised p-3">
              <div className="flex items-start gap-2">
                <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${c.id === "isolation" ? "text-tue" : "text-cyan"}`} />
                <h3 className="font-cond text-md font-bold leading-tight text-ink">{c.name}</h3>
                <InfoTip label={c.name} className="-mt-0.5 ml-auto">{c.note}</InfoTip>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {c.status ? <StatusBadge status={c.status} /> : null}
                {c.chip ? <span className={`chip-tag ${c.chip.startsWith("NO") || c.chip.startsWith("HAZARD") ? "border-caution/60 text-caution" : "border-line-strong text-ink-2"}`}>{c.chip}</span> : null}
              </div>
              <ul className="flex flex-col gap-0.5 text-sm text-ink">
                {c.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button type="button" className="btn btn-secondary mt-auto min-h-[32px] self-start px-2.5 text-xs" onClick={() => run(c.action)}>
                {c.id === "isolation" ? <Globe2 aria-hidden="true" className="h-3.5 w-3.5 text-tue" /> : null}
                {c.actionLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
