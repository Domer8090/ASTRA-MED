import { Activity, ArrowRight, Check, ChevronRight, CloudSun, ListChecks, Plus, TrendingUp, X } from "lucide-react";
import { METRIC_GUIDANCE } from "../../data/metricGuidance";
import { SUMMARY_COPY, SUMMARY_HEADLINE, SUMMARY_RINGS } from "../../data/summaryCopy";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useMissionStore } from "../../hooks/useMissionState";
import { useOnboarding } from "../../hooks/useOnboarding";
import { useSpaceWeather } from "../../hooks/useSpaceWeather";
import { useToast } from "../../hooks/useToast";
import { useUiActions } from "../../hooks/useUi";
import { PRIMARY_METRIC_IDS, type HealthStatus, type MetricId } from "../../types/health";
import { formatLocalDateTime, formatMissionDate, formatReadingDate } from "../../utils/dates";
import { formatMetricValue, METRIC_UNITS } from "../../utils/formatting";
import { scrollToSection } from "../navigation";
import { BasisLine } from "../shared/BasisLine";
import { ProvenanceTag } from "../shared/ProvenanceTag";
import { RangeBar } from "../shared/RangeBar";
import { StatusBadge, StatusIcon } from "../shared/StatusBadge";
import { gaugeTracks, rangeText } from "../../engine/gauges";
import { topIssues, type SummaryIssue } from "../../engine/summaryIssues";
import type { EnvironmentAdvisory } from "../../types/health";

const BAR_DAYS = 14;
const BAR_CLASS: Record<HealthStatus, string> = { NOMINAL: "bg-nominal", CAUTION: "bg-caution", CRITICAL: "bg-critical" };
const CARD = "rounded-panel border border-line bg-panel";
/** Card colour follows the engine status: amber fill for CAUTION, red fill for CRITICAL. The badge still carries text and icon. */
const STATUS_CARD: Record<HealthStatus, string> = {
  NOMINAL: CARD,
  CAUTION: "rounded-panel border-2 border-caution bg-caution/[0.24]",
  CRITICAL: "rounded-panel border-2 border-critical bg-critical/[0.24]",
};

/** Three concentric progress rings, outermost first. */
function Rings({ rings }: { rings: { value: number; className: string }[] }) {
  const size = 168;
  const stroke = 16;
  const gap = 4;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32 shrink-0 -rotate-90 sm:h-40 sm:w-40 md:h-44 md:w-44" aria-hidden="true">
      {rings.map((r, i) => {
        const radius = size / 2 - stroke / 2 - i * (stroke + gap);
        const circ = 2 * Math.PI * radius;
        const frac = Math.max(0, Math.min(1, r.value));
        return (
          <g key={i} className={r.className}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circ * frac} ${circ}`}
              className="transition-[stroke-dasharray] duration-[var(--duration-slow)] ease-[var(--ease-smooth-out)]"
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Last two weeks as small bars, coloured by that day's status. The status word sits on the card, so colour is never alone. */
function MiniBars({ metricId }: { metricId: MetricId }) {
  const m = useMissionModel();
  const from = Math.max(1, m.day - BAR_DAYS + 1);
  const values: { day: number; v: number | null; status: HealthStatus }[] = [];
  for (let d = from; d <= m.day; d++) {
    const raw = m.days[d - 1]?.readings[metricId]?.value;
    const v = typeof raw === "number" ? raw : raw && "systolic" in raw ? raw.systolic : null;
    values.push({ day: d, v, status: m.metricDayStatus[metricId][d - 1] ?? "NOMINAL" });
  }
  const nums = values.map((x) => x.v).filter((v): v is number => v !== null);
  const lo = Math.min(...nums);
  const span = Math.max(...nums) - lo || 1;
  return (
    <div aria-hidden="true">
      <div className="flex h-14 items-end gap-[3px]">
        {values.map((x) => (
          <div key={x.day} className="flex h-full flex-1 items-end rounded-full bg-line-soft">
            {x.v !== null ? <div className={`w-full rounded-full ${BAR_CLASS[x.status]} ${x.day === m.day ? "" : "opacity-70"}`} style={{ height: `${25 + ((x.v - lo) / span) * 75}%` }} /> : null}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-2xs text-ink-3">
        <span>{formatMissionDate(from)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Value({ metricId, big = false }: { metricId: MetricId; big?: boolean }) {
  const d = useMissionModel().diagnostics[metricId];
  const unit = METRIC_UNITS[metricId];
  return (
    <span className="flex items-baseline gap-1">
      <span className={`font-mono font-semibold tabular-nums text-ink ${big ? "text-[34px] leading-none" : "text-xl"}`}>{d.latest ? formatMetricValue(metricId, d.latest.value) : "—"}</span>
      {unit ? <span className={`font-semibold text-ink-2 ${big ? "text-sm uppercase" : "text-sm"}`}>{unit}</span> : null}
    </span>
  );
}

/** The configured range for a reading, from the gauge geometry (never compared here). */
function useTracks(metricId: MetricId) {
  const settings = useMissionModel().settings;
  return gaugeTracks(metricId, settings.aredTargetMinutes, settings.hydrationTargetLiters, settings);
}

/** When a reading was taken, bold and readable: "Day 118 · 29 Aug 2026, 06:43". */
function ReadingDate({ metricId }: { metricId: MetricId }) {
  const d = useMissionModel().diagnostics[metricId];
  return <p className="text-sm font-semibold text-ink-2">{d.latest ? formatReadingDate(d.latest.missionDay, d.latest.recordedAt) : "No reading yet"}</p>;
}

/** Top-four card for a reading outside its range: big value, date, labelled range bar, two weeks of bars. */
function ReadingIssue({ metricId }: { metricId: MetricId }) {
  const m = useMissionModel();
  const { openGuidance, openLog } = useUiActions();
  const tracks = useTracks(metricId);
  const d = m.diagnostics[metricId];
  const name = METRIC_GUIDANCE[metricId].shortName;
  return (
    <article className={`${STATUS_CARD[d.status]} flex flex-col gap-3 p-5`} aria-label={`${name}: ${d.status}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xl font-semibold text-ink">{name}</h4>
          <ReadingDate metricId={metricId} />
        </div>
        <StatusBadge status={d.status} size="md" />
      </header>
      <Value metricId={metricId} big />
      {tracks ? <RangeBar tracks={tracks} value={d.latest?.value} unit={METRIC_UNITS[metricId]} /> : <MiniBars metricId={metricId} />}
      <p className="text-base text-ink-2">{d.summary}</p>
      <div className="mt-auto flex gap-2">
        <button type="button" className="btn btn-secondary min-h-[44px] flex-1 px-2 text-sm" onClick={() => openLog({ metricId, day: m.day })}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add reading
        </button>
        <button type="button" className="btn btn-ghost min-h-[44px] flex-1 px-2 text-sm" onClick={() => openGuidance({ kind: "metric", id: metricId })}>
          What to do
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

/** When a space-weather advisory applies: mission days and dates, or the real-world date for live DONKI events. */
function advisoryWhen(a: EnvironmentAdvisory): string {
  if (a.missionDayRange) {
    const [from, to] = a.missionDayRange;
    return from === to ? formatMissionDate(from) : `${formatMissionDate(from)} – ${formatMissionDate(to)}`;
  }
  return a.startTime ? `Started ${formatLocalDateTime(a.startTime)} (real-world date, near Earth)` : "Date not given";
}

function IssueCard({ issue }: { issue: SummaryIssue }) {
  const m = useMissionModel();
  const { openGuidance } = useUiActions();
  const tag = "flex items-center gap-1.5 text-sm font-semibold";
  switch (issue.kind) {
    case "reading":
      return <ReadingIssue metricId={issue.metricId} />;
    case "allClear":
      return (
        <article className={`${CARD} flex flex-col gap-3 border-nominal/45 p-5`}>
          <StatusBadge status="NOMINAL" size="md" className="self-start" />
          <h4 className="text-xl font-semibold text-ink">{SUMMARY_COPY.allClearTitle}</h4>
          <p className="text-base text-ink-2">{SUMMARY_COPY.allClearBody}</p>
          <p className="text-sm font-semibold text-ink-2">{formatMissionDate(m.day)}</p>
        </article>
      );
    case "weather": {
      const a = issue.advisory;
      return (
        <article className={`${CARD} flex flex-col gap-3 border-caution/50 p-5`}>
          <header className="flex items-start justify-between gap-2">
            <p className={`${tag} text-blue`}>
              <CloudSun aria-hidden="true" className="h-5 w-5" />
              {SUMMARY_COPY.weatherTitle}
            </p>
            <StatusBadge status={a.severity} size="md" />
          </header>
          <h4 className="text-xl font-semibold text-ink">{a.title}</h4>
          <p className="text-2xl font-semibold text-caution">{a.level}</p>
          <p className="text-base font-semibold text-ink">
            <span className="text-ink-3">{SUMMARY_COPY.weatherWhen}: </span>
            {advisoryWhen(a)}
          </p>
          <p className="text-base text-ink-2">{a.nextStep}</p>
          <p className="text-xs text-ink-3">{SUMMARY_COPY.weatherNote}</p>
          <button type="button" className="mt-auto flex min-h-[44px] items-center gap-1 self-start text-sm text-cyan hover:underline" onClick={() => scrollToSection("weather")}>
            Open space weather
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </article>
      );
    }
    case "trend": {
      const t = issue.trend;
      return (
        <article className={`${CARD} flex flex-col gap-3 p-5`}>
          <p className={`${tag} text-cyan`}>
            <TrendingUp aria-hidden="true" className="h-5 w-5" />
            {SUMMARY_COPY.trendTag}
          </p>
          <h4 className="text-xl font-semibold text-ink">{METRIC_GUIDANCE[t.metricId].shortName}</h4>
          <p className="flex items-baseline gap-2">
            <span className="num text-[34px] font-semibold leading-none text-ink">{t.daysToLimit}</span>
            <span className="text-base text-ink-2">{SUMMARY_COPY.trendDays}</span>
          </p>
          <p className="text-base text-ink-2">{t.text}</p>
          <button type="button" className="btn btn-ghost mt-auto min-h-[44px] self-start px-2 text-sm" onClick={() => openGuidance({ kind: "metric", id: t.metricId })}>
            What to do
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </article>
      );
    }
    case "drift":
      return (
        <article className={`${CARD} flex flex-col gap-3 p-5`}>
          <p className={`${tag} text-tue`}>
            <Activity aria-hidden="true" className="h-5 w-5" />
            {SUMMARY_COPY.driftTag}
          </p>
          <h4 className="text-xl font-semibold text-ink">{SUMMARY_COPY.driftTitle}</h4>
          <p className="text-base text-ink-2">{issue.drift.drivers[0]?.text ?? issue.drift.text}</p>
        </article>
      );
    case "tasks":
      return (
        <article className={`${CARD} flex flex-col gap-3 p-5`}>
          <p className={`${tag} text-cyan`}>
            <ListChecks aria-hidden="true" className="h-5 w-5" />
            {SUMMARY_COPY.tasksLeftTitle}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="num text-[34px] font-semibold leading-none text-ink">{issue.left.length}</span>
            <span className="text-base text-ink-2">of {issue.total} left</span>
          </p>
          <p className="text-base text-ink">
            <span className="text-ink-3">{SUMMARY_COPY.tasksNext}: </span>
            {issue.left[0]?.title}
          </p>
          <button type="button" className="mt-auto flex min-h-[44px] items-center gap-1 self-start text-sm text-cyan hover:underline" onClick={() => scrollToSection("countermeasures")}>
            Open tasks
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </article>
      );
  }
}

/** One reading as a tappable row: name, date, value, range and status. */
function ReadingRow({ metricId }: { metricId: MetricId }) {
  const d = useMissionModel().diagnostics[metricId];
  const { openGuidance } = useUiActions();
  const tracks = useTracks(metricId);
  const name = METRIC_GUIDANCE[metricId].shortName;
  const range = rangeText(tracks, METRIC_UNITS[metricId]);
  return (
    <li>
      <button type="button" onClick={() => openGuidance({ kind: "metric", id: metricId })} className="flex min-h-[72px] w-full items-center gap-3 px-5 py-3 text-left hover:bg-raised/60" aria-label={`${name}, ${d.status}${range ? `, in range ${range}` : ""}. Explain this reading.`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg text-ink">{name}</span>
          <span className="block text-sm font-semibold text-ink-2">{d.latest ? formatReadingDate(d.latest.missionDay, d.latest.recordedAt) : "No reading yet"}</span>
        </span>
        <span className="flex flex-col items-end">
          <Value metricId={metricId} />
          {range ? (
            <span className="text-sm text-ink-2">
              In range <span className="num font-semibold text-nominal">{range}</span>
            </span>
          ) : null}
        </span>
        <StatusBadge status={d.status} />
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-3" />
      </button>
    </li>
  );
}

function WelcomeCard() {
  const { showWelcome, dismissWelcome, startTour } = useOnboarding();
  const { openSources } = useUiActions();
  if (!showWelcome) return null;
  return (
    <section aria-label="Welcome" className="flex flex-wrap items-center gap-3 rounded-panel border border-cyan/40 bg-cyan/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{SUMMARY_COPY.welcomeTitle}</p>
        <p className="text-sm text-ink-2">{SUMMARY_COPY.welcomeBody}</p>
      </div>
      <button type="button" className="btn btn-primary min-h-[40px]" onClick={startTour}>
        Take the 1-minute tour
      </button>
      <button type="button" className="btn btn-secondary min-h-[40px]" onClick={() => openSources("about")}>
        About this demo
      </button>
      <button type="button" className="btn btn-ghost min-h-[40px] px-2" onClick={dismissWelcome} aria-label="Dismiss welcome">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </section>
  );
}

function TasksCard() {
  const m = useMissionModel();
  const store = useMissionStore();
  const toast = useToast();
  return (
    <section aria-labelledby="summary-tasks" data-tour="summary-tasks" className={`${CARD} flex flex-col overflow-hidden`}>
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h3 id="summary-tasks" className="text-md font-semibold text-ink">{SUMMARY_COPY.tasksTitle}</h3>
        <span className="font-mono text-xs text-ink-2">
          {m.readiness.completedTasks} of {m.readiness.totalTasks}
        </span>
      </header>
      <ul className="divide-y divide-line-soft">
        {m.tasks.map((t) => (
          <li key={t.id}>
            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2 hover:bg-raised/60 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan">
              <input
                type="checkbox"
                className="sr-only"
                checked={t.completed}
                onChange={() => {
                  const r = store.setTaskCompletion(m.day, t.id, !t.completed);
                  if (!r.persisted) toast({ tone: "warning", title: "Not saved", body: r.message });
                }}
              />
              <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${t.completed ? "border-nominal bg-nominal text-space" : "border-line-strong"}`}>
                {t.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
              </span>
              <span className={`min-w-0 flex-1 text-sm ${t.completed ? "text-ink-3 line-through" : "text-ink"}`}>{t.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-auto flex min-h-[44px] items-center justify-center gap-1 border-t border-line text-sm text-cyan hover:bg-raised/60" onClick={() => scrollToSection("countermeasures")}>
        All tasks, streak and points
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </section>
  );
}

function WeatherCard() {
  const m = useMissionModel();
  const { mode } = useSpaceWeather();
  const first = m.advisories[0];
  return (
    <section aria-labelledby="summary-weather" className={`${CARD} flex flex-col gap-2 p-4`}>
      <header className="flex items-center justify-between gap-2">
        <h3 id="summary-weather" className="flex items-center gap-2 text-md font-semibold text-ink">
          <CloudSun aria-hidden="true" className="h-5 w-5 text-blue" />
          {SUMMARY_COPY.weatherTitle}
        </h3>
        <ProvenanceTag kind={mode} />
      </header>
      <p className="text-sm font-semibold text-ink-2">{formatMissionDate(m.day)}</p>
      {first ? (
        <>
          <p className="text-lg font-semibold text-ink">
            {first.title}: <span className={first.level === "ALL CLEAR" ? "text-nominal" : "text-caution"}>{first.level}</span>
          </p>
          <p className="text-base font-semibold text-ink">
            <span className="text-ink-3">{SUMMARY_COPY.weatherWhen}: </span>
            {advisoryWhen(first)}
          </p>
          <p className="text-base text-ink-2">{first.nextStep}</p>
        </>
      ) : (
        <p className="text-lg text-ink">{SUMMARY_COPY.weatherClearLong}</p>
      )}
      {m.advisories.length > 1 ? <p className="text-sm text-ink-2">+{m.advisories.length - 1} more</p> : null}
      <p className="text-sm text-ink-3">{SUMMARY_COPY.weatherNote}</p>
      <button type="button" className="mt-auto flex min-h-[40px] items-center gap-1 self-start text-sm text-cyan hover:underline" onClick={() => scrollToSection("weather")}>
        Open space weather
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </section>
  );
}

/**
 * Summary: the everyday view. One status sentence, three rings, the one next
 * step, readings (problems first, the rest as rows), today's tasks and space
 * weather. Everything comes from the engines; Details has the rest.
 */
export function SummaryDashboard() {
  const m = useMissionModel();
  const { openGuidance, openLog } = useUiActions();
  const headline = SUMMARY_HEADLINE[m.overall.status];
  const r = m.readiness;
  const ared = m.diagnostics.aredMinutes.latest;
  const exerciseToday = ared && ared.missionDay === m.day && typeof ared.value === "number" ? Math.round(ared.value) : 0;
  const exerciseTarget = m.settings.aredTargetMinutes;
  const rings = [
    { key: "readiness", ...SUMMARY_RINGS.readiness, value: r.score / 100, text: `${r.score}`, ring: "text-blue" },
    { key: "checklist", ...SUMMARY_RINGS.checklist, value: r.totalTasks ? r.completedTasks / r.totalTasks : 0, text: `${r.completedTasks}/${r.totalTasks}`, ring: "text-cyan" },
    { key: "exercise", ...SUMMARY_RINGS.exercise, value: exerciseTarget ? exerciseToday / exerciseTarget : 0, text: `${exerciseToday}/${exerciseTarget} min`, ring: "text-nominal" },
  ];
  const action = m.primaryAction;
  // The status box already says when everything is in range, so the list shows only things to act on.
  const issues = topIssues({ diagnostics: m.diagnostics, metricIds: PRIMARY_METRIC_IDS, advisories: m.advisories, trends: m.trends, drift: m.drift, tasks: m.tasks }).filter((x) => x.kind !== "allClear");
  // Every reading as a row, anything flagged first.
  const readings = [...PRIMARY_METRIC_IDS].sort((a, b) => rank(m.diagnostics[b].status) - rank(m.diagnostics[a].status));

  return (
    <div className="flex flex-col gap-3">
      <WelcomeCard />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section aria-labelledby="summary-status" data-tour="summary-status" className={`${STATUS_CARD[m.overall.status]} flex flex-col gap-4 p-5`}>
          <StatusBadge status={m.overall.status} size="md" className="self-start" />
          <div>
            <h3 id="summary-status" className="text-2xl font-bold text-ink">{headline.title}</h3>
            <p className="mt-1 max-w-[60ch] text-base text-ink-2">{headline.body}</p>
            <p className="mt-1 text-sm font-semibold text-ink-2">{formatMissionDate(m.day)}</p>
          </div>
          <div className="flex items-center gap-5 sm:gap-6">
            <Rings rings={rings.map((x) => ({ value: x.value, className: x.ring }))} />
            <dl className="flex flex-col gap-3">
              {rings.map((x) => (
                <div key={x.key} title={x.hint}>
                  <dt className="text-sm font-semibold text-ink">{x.label}</dt>
                  <dd className={`font-mono text-lg font-semibold leading-tight tabular-nums sm:text-2xl ${x.ring}`}>{x.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="summary-next" data-tour="summary-next" className={`${CARD} flex flex-col gap-3 p-5`}>
          <h3 id="summary-next" className="text-lg font-semibold text-ink">Do this next</h3>
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${action.severity === "NOMINAL" ? "bg-nominal/15 text-nominal" : action.severity === "CAUTION" ? "bg-caution/15 text-caution" : "bg-critical/15 text-critical"}`}>
              <StatusIcon status={action.severity} className="h-5 w-5" />
            </span>
            <p className="text-xl font-semibold leading-snug text-ink">{action.text}</p>
          </div>
          {action.basis ? (
            <p className="flex items-center gap-1 text-xs text-ink-3">
              Why this step <BasisLine basis={action.basis} />
            </p>
          ) : null}
          {action.guidance ? (
            <button type="button" className="btn btn-primary mt-auto min-h-[44px] self-start" onClick={() => action.guidance && openGuidance(action.guidance)}>
              Show me how
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </section>
      </div>

      {issues.length ? (
      <section aria-labelledby="summary-top" data-tour="summary-top" className="flex flex-col gap-3">
        <div>
          <h3 id="summary-top" className="text-2xl font-bold text-ink">{SUMMARY_COPY.topTitle}</h3>
          <p className="text-base text-ink-2">{SUMMARY_COPY.topHint}</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {issues.map((issue, i) => (
            <li key={`${issue.kind}-${i}`} className="flex [&>article]:flex-1">
              <IssueCard issue={issue} />
            </li>
          ))}
        </ol>
      </section>
      ) : null}

      <section aria-labelledby="summary-readings" data-tour="summary-readings" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="summary-readings" className="text-2xl font-bold text-ink">{SUMMARY_COPY.readingsTitle}</h3>
          <button type="button" className="btn btn-secondary ml-auto min-h-[40px] text-sm" onClick={() => openLog({ day: m.day })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add reading
          </button>
        </div>
        <div className={`${CARD} overflow-hidden`}>
          <ul className="grid divide-y divide-line-soft lg:grid-cols-2 lg:divide-y-0">
            {readings.map((id) => (
              <ReadingRow key={id} metricId={id} />
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <TasksCard />
        <WeatherCard />
      </div>

      <button type="button" className={`${CARD} flex min-h-[56px] items-center justify-between gap-3 px-5 py-3 text-left hover:border-line-strong`} onClick={() => scrollToSection("details")}>
        <span>
          <span className="block font-semibold text-ink">{SUMMARY_COPY.details}</span>
          <span className="block text-xs text-ink-3">{SUMMARY_COPY.detailsHint}</span>
        </span>
        <ChevronRight aria-hidden="true" className="h-5 w-5 text-ink-2" />
      </button>
    </div>
  );
}

function rank(s: HealthStatus): number {
  return s === "CRITICAL" ? 2 : s === "CAUTION" ? 1 : 0;
}
