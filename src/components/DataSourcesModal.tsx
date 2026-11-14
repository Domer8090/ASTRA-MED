import { useEffect, useId, useState, type FormEvent } from "react";
import { DatabaseZap, ExternalLink, HardDrive, RotateCcw, ShieldCheck } from "lucide-react";
import { ARED, describeThresholds, HYDRATION, MISSION } from "../config/thresholds";
import { ARCHIVE_PROVENANCE } from "../data/fallbackDonki";
import { SEP_DOSE_MODEL_SUMMARY } from "../data/scenarioHazards";
import { LIMITATIONS_STATEMENT, OSDR_STUDIES, REFERENCE_SOURCES } from "../data/sources";
import { useMissionState, useMissionStore } from "../hooks/useMissionState";
import { useToast } from "../hooks/useToast";
import { useUiActions, useUiState, type SourcesTab } from "../hooks/useUi";
import { usingDemoKey } from "../services/nasaDonkiApi";
import type { ThresholdProvenance } from "../types/health";
import { Dialog } from "./shared/Dialog";
import { PROVENANCE_DESCRIPTIONS, ProvenanceTag, type Provenance } from "./shared/ProvenanceTag";

const TABS: { id: SourcesTab; label: string }[] = [
  { id: "about", label: "Overview" },
  { id: "sources", label: "Data sources" },
  { id: "thresholds", label: "Thresholds" },
  { id: "labels", label: "Data labels" },
  { id: "storage", label: "Storage & settings" },
];

const PROV_TAG: Record<ThresholdProvenance, Provenance> = {
  "supplied-prototype": "SUPPLIED PROTOTYPE",
  "astra-assumption": "ASTRA ASSUMPTION",
  "mission-plan": "MISSION PLAN",
};

function About() {
  const { openSources } = useUiActions();
  const steps = [
    {
      title: "Sense and log",
      text: "Vital signs, sleep, mood, exercise and dosimeter readings (synthetic demo telemetry or your own entries), plus NASA DONKI space-weather records fetched live when online.",
    },
    {
      title: "Deterministic triage",
      text: "A rules engine compares each reading with its configured prototype range, checks whether a change persists over several days, flags stale data and rolls the result up to five body systems. Every status keeps the rule that produced it.",
    },
    {
      title: "Guided action",
      text: "Plain-English self-checks and countermeasures, ordered by priority, each naming its source indicator, rule and scientific context or prototype assumption. Records stay on board for the flight surgeon.",
    },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-cond text-xl font-bold text-ink">ASTRA-MED: Crew Health. Mission Ready.</h3>
        <p className="mt-2 max-w-[70ch] text-base text-ink">
          <span className="font-semibold">The problem.</span> Between Mars and Earth a radio signal takes about 3 to 22 minutes each way, so a question to the flight surgeon and its answer can take most of an hour. Deep-space crews need to triage routine health questions on board, without waiting for the ground.
        </p>
      </div>

      <div id="demo-data" className="rounded-tile border border-line-strong p-4">
        <h4 className="flex items-center gap-2 font-cond text-md font-bold text-ink">
          <span className="chip-tag border-line-strong bg-raised text-ink">DEMO DATA</span>
          What is simulated and what is real
        </h4>
        <dl className="mt-2 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">Synthetic (demo)</dt>
            <dd className="mt-0.5 text-ink-2">
              180 days of health telemetry, the adherence history for days you have not marked, the XP and streaks derived from it, the countermeasure targets, and the scenario events, including the Scenario C dosimeter overlay. None of it is real astronaut data.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Real NASA data</dt>
            <dd className="mt-0.5 text-ink-2">
              DONKI space-weather records, labelled LIVE, CACHED or ARCHIVED by where they came from, and the NASA references cited with each recommendation.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Yours</dt>
            <dd className="mt-0.5 text-ink-2">
              Measurements you log (tagged MANUAL) and tasks you mark. They stay in this browser and override the demo values for that day.
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h4 className="label">How ASTRA-MED works</h4>
        <ol className="mt-2 grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-tile border border-line p-3">
              <p className="flex items-center gap-2 font-cond text-md font-bold text-ink">
                <span className="num flex h-6 w-6 items-center justify-center rounded-badge border border-cyan/60 text-xs text-cyan">{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="label">Real NASA data and references</h4>
        <ul className="mt-2 space-y-2 text-sm">
          <li className="rounded-tile border border-line p-3">
            <span className="font-semibold text-ink">Live: NASA DONKI space weather.</span>{" "}
            <span className="text-ink-2">Flares, solar energetic particle events, CMEs and notifications from the CCMC DONKI API and api.nasa.gov, labelled LIVE only after a successful request in this session. Environmental context; never a personal dose.</span>
          </li>
          <li className="rounded-tile border border-line p-3">
            <span className="font-semibold text-ink">Reference: NASA Human Research Program.</span>{" "}
            <span className="text-ink-2">Spaceflight Standard Measures and the HRP risk pages for SANS, sleep and schedules, and cardiorespiratory and musculoskeletal fitness give the scientific context shown with each recommendation.</span>
          </li>
          <li className="rounded-tile border border-line p-3">
            <span className="font-semibold text-ink">Research review: NASA OSDR studies</span>{" "}
            <span className="num text-ink">OSD-817, OSD-987, OSD-989, OSD-1018</span>
            <span className="text-ink-2">, checked against OSDR metadata. They inform the research context only and do not validate any ASTRA-MED threshold.</span>
          </li>
        </ul>
        <button type="button" className="link mt-2 text-sm" onClick={() => openSources("sources")}>
          See every source and what it is used for
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-tile border border-line p-3">
          <h4 className="label">Three-scenario demo</h4>
          <p className="mt-1 text-sm text-ink-2">
            A, nominal mission (day 42). B, cardiovascular caution (day 118). C, simulated solar particle event (days 130–134). Mission day 1 is a fictional demo epoch; day N spans MET (N−1)/00:00 to 23:59 ship time (UTC).
          </p>
        </div>
        <div className="rounded-tile border border-line p-3">
          <h4 className="label">Readiness score</h4>
          <p className="mt-1 text-sm text-ink-2">
            Engagement indicator for the countermeasure plan: 50 points for today&apos;s tasks, 20 for 7-day adherence, 15 for follow-ups done and 15 for fresh measurements. Select the score in the top bar to see today&apos;s parts. Not a medical clearance; it never hides a CAUTION or CRITICAL.
          </p>
        </div>
      </div>

      <div className="rounded-tile border border-caution/45 bg-caution/[0.06] p-4">
        <h4 className="label text-caution">Limitations</h4>
        <p className="mt-1 text-base text-ink">{LIMITATIONS_STATEMENT}</p>
      </div>
    </div>
  );
}

function Sources() {
  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {REFERENCE_SOURCES.map((s) => (
          <li key={s.url} className="rounded-tile border border-line p-3">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-start gap-1 text-base font-semibold">
              {s.title}
              <ExternalLink aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0" />
            </a>
            <p className="text-xs text-ink-3">{s.publisher}</p>
            <p className="mt-1 text-sm text-ink-2">{s.description}</p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-semibold">Used for: </span>
              {s.usedFor}
            </p>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="label">NASA OSDR studies supplied for research review</h3>
        <p className="mt-1 text-sm text-ink-2">Identifiers and titles checked against OSDR metadata on 2026-11-13. None of these studies validates ASTRA-MED's diagnostic thresholds.</p>
        <ul className="mt-2 space-y-2">
          {OSDR_STUDIES.map((s) => (
            <li key={s.id} className="rounded-tile border border-line p-3">
              <a href={`https://osdr.nasa.gov/bio/repo/data/studies/${s.id}`} target="_blank" rel="noopener noreferrer" className="link num text-sm font-semibold">
                {s.id}
              </a>
              <p className="mt-0.5 text-base text-ink">{s.title}</p>
              <p className="text-xs text-ink-3">{s.organism}</p>
              <p className="mt-1 text-sm text-ink-2">{s.summary}</p>
              <p className="mt-1 text-sm text-ink">
                <span className="font-semibold">Relevance: </span>
                {s.relevance}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-tile border border-line p-3 text-sm text-ink-2">
        <p>
          <span className="font-semibold text-ink">Scenario C dosimeter model: </span>
          {SEP_DOSE_MODEL_SUMMARY}
        </p>
      </div>
      <div className="rounded-tile border border-line p-3 text-sm text-ink-2">
        <p>
          <span className="font-semibold text-ink">Offline DONKI archive: </span>
          real archived records from {ARCHIVE_PROVENANCE.window.start} to {ARCHIVE_PROVENANCE.window.end}, retrieved from {ARCHIVE_PROVENANCE.source}. Always labelled ARCHIVED (offline fallback), never live.
        </p>
      </div>
    </div>
  );
}

function Thresholds() {
  const settings = useMissionState((s) => s.settings);
  const rows = describeThresholds(settings.aredTargetMinutes, settings.hydrationTargetLiters);
  return (
    <div>
      <p className="max-w-[72ch] text-sm text-ink-2">
        Prototype demonstration assumptions, kept in <code className="num text-ink">src/config/thresholds.ts</code>. They are not official NASA flight rules or validated clinical standards. A real deployment needs review and approval by qualified aerospace-medicine personnel.
      </p>
      <div className="mt-3 overflow-x-auto rounded-tile border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">Configured reference ranges and status rules</caption>
          <thead className="bg-panel">
            <tr>
              {["Indicator", "Reference", "CAUTION", "CRITICAL", "Provenance"].map((h) => (
                <th key={h} scope="col" className="label border-b border-line px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.indicator} className="border-b border-line align-top last:border-b-0">
                <th scope="row" className="px-3 py-2 font-semibold text-ink">
                  {r.indicator}
                  {r.note ? <p className="mt-0.5 text-xs font-normal text-ink-3">{r.note}</p> : null}
                </th>
                <td className="num px-3 py-2 text-ink-2">{r.reference}</td>
                <td className="num px-3 py-2 text-caution">{r.caution}</td>
                <td className="num px-3 py-2 text-critical">{r.critical}</td>
                <td className="px-3 py-2">
                  <ProvenanceTag kind={PROV_TAG[r.provenance]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">Stale data: each metric is flagged CAUTION when its latest reading is older than its configured window (2 days for daily vitals, 3 for glucose, 5 for PVT, 10 for the symptom check).</p>
    </div>
  );
}

function Labels() {
  const kinds: Provenance[] = ["SYNTHETIC", "MANUAL", "LIVE", "PARTIAL", "CACHED", "ARCHIVED", "UNAVAILABLE", "SCENARIO", "SUPPLIED PROTOTYPE", "ASTRA ASSUMPTION", "MISSION PLAN"];
  return (
    <dl className="divide-y divide-line rounded-tile border border-line">
      {kinds.map((k) => (
        <div key={k} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
          <dt className="w-44 shrink-0">
            <ProvenanceTag kind={k} label={k === "PARTIAL" ? "PARTIAL LIVE" : k} />
          </dt>
          <dd className="text-sm text-ink-2">{PROVENANCE_DESCRIPTIONS[k]}</dd>
        </div>
      ))}
    </dl>
  );
}

function StorageSettings() {
  const store = useMissionStore();
  const toast = useToast();
  const storage = useMissionState((s) => s.storage);
  const settings = useMissionState((s) => s.settings);
  const measurementCount = useMissionState((s) => s.measurements.length);
  const uid = useId();
  const [ared, setAred] = useState(String(settings.aredTargetMinutes));
  const [hyd, setHyd] = useState(String(settings.hydrationTargetLiters));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setAred(String(settings.aredTargetMinutes));
    setHyd(String(settings.hydrationTargetLiters));
  }, [settings.aredTargetMinutes, settings.hydrationTargetLiters]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const a = Number(ared);
    const h = Number(hyd.replace(",", "."));
    if (!Number.isInteger(a) || a < 10 || a > 180) return setError("ARED target must be a whole number of minutes from 10 to 180.");
    if (!Number.isFinite(h) || h < 0.5 || h > 5) return setError("Hydration target must be between 0.5 and 5.0 litres.");
    setError(null);
    const r = store.updatePlanTargets(a, Math.round(h * 10) / 10);
    toast({ tone: r.persisted ? "success" : "warning", title: r.message, body: "Countermeasure targets and ARED/hydration rules now use these values." });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-tile border border-line p-3">
        {storage.available ? <HardDrive aria-hidden="true" className="mt-0.5 h-4 w-4 text-nominal" /> : <DatabaseZap aria-hidden="true" className="mt-0.5 h-4 w-4 text-caution" />}
        <div className="text-sm">
          <p className="font-semibold text-ink">{storage.available ? "Saving to this browser's local storage" : "Local storage is unavailable: working in memory"}</p>
          <p className="mt-0.5 text-ink-2">
            {storage.available
              ? `${measurementCount} logged measurement${measurementCount === 1 ? "" : "s"} saved under versioned keys (astra-med:v1:*). Data stays on this device and is never sent to NASA or anyone else.`
              : "Changes work for this session but will be lost on reload. Private browsing or a storage policy may cause this."}
          </p>
          {storage.recoveredKeys.length ? <p className="mt-1 text-caution">Recovered from unreadable saved data: {storage.recoveredKeys.join(", ")}. Defaults were restored.</p> : null}
          <p className="mt-1 text-ink-3">localStorage is not encrypted and is not suitable for regulated medical records. Clearing browser data removes everything saved here.</p>
        </div>
      </div>

      <form onSubmit={save} noValidate className="rounded-tile border border-line p-3">
        <h3 className="label">Mission plan targets</h3>
        <p className="mt-1 text-sm text-ink-2">Demo values. A mission protocol sets these per crew member. ASTRA-MED never changes them on its own.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-ared`} className="label">
              ARED daily target
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input id={`${uid}-ared`} name="aredTarget" inputMode="numeric" autoComplete="off" className="field num" value={ared} onChange={(e) => setAred(e.target.value)} />
              <span className="num text-sm text-ink-2">min</span>
            </div>
            <p className="mt-1 text-xs text-ink-3">Default {ARED.defaultTargetMinutes} min (demo task only).</p>
          </div>
          <div>
            <label htmlFor={`${uid}-hyd`} className="label">
              Hydration daily plan
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input id={`${uid}-hyd`} name="hydrationTarget" inputMode="decimal" autoComplete="off" className="field num" value={hyd} onChange={(e) => setHyd(e.target.value)} />
              <span className="num text-sm text-ink-2">L</span>
            </div>
            <p className="mt-1 text-xs text-ink-3">Default {HYDRATION.defaultTargetLiters.toFixed(1)} L (demo plan).</p>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-[#ff8aa0]">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-secondary mt-3">
          Save targets
        </button>
      </form>

      <div className="rounded-tile border border-line p-3">
        <h3 className="label flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          NASA API key
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          {usingDemoKey() ? "Using DEMO_KEY, which NASA rate-limits heavily." : "Using the key from VITE_NASA_API_KEY."} Vite bundles every VITE_ variable into the page, so any key set there is visible to users and is not a secret. Put a personal key in <code className="num">.env.local</code> and never commit it.
        </p>
      </div>

      <div className="rounded-tile border border-critical/40 p-3">
        <h3 className="label text-critical">Reset demo data</h3>
        <p className="mt-1 text-sm text-ink-2">Removes every logged measurement, task record, follow-up and setting from this browser and restores the bundled baseline (scenario A, day {MISSION.defaultDay}). Cached space-weather events are kept. This cannot be undone.</p>
        {!confirming ? (
          <button type="button" className="btn btn-danger mt-3" onClick={() => setConfirming(true)}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset demo data…
          </button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm reset">
            <p className="w-full text-sm font-semibold text-ink">Delete {measurementCount} logged measurement{measurementCount === 1 ? "" : "s"} and all task progress?</p>
            <button
              type="button"
              className="btn btn-danger"
              data-autofocus
              onClick={() => {
                const r = store.resetDemoData();
                setConfirming(false);
                toast({ tone: r.persisted ? "success" : "warning", title: r.message, body: "Scenario A, mission day 42." });
              }}
            >
              Yes, reset demo data
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Keep my data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataSourcesModal() {
  const { sourcesTab } = useUiState();
  const { closeSources, openSources } = useUiActions();
  const tab = sourcesTab ?? "about";
  return (
    <Dialog open={sourcesTab !== null} onClose={closeSources} title="Overview and data sources" labelId="sources-title" widthClass="max-w-4xl">
      <div className="sticky top-0 z-10 border-b border-line bg-raised px-5 pt-2">
        <div role="tablist" aria-label="Data sources sections" className="relative -mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`src-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="src-panel"
              tabIndex={tab === t.id ? 0 : -1}
              data-autofocus={tab === t.id ? true : undefined}
              onClick={() => openSources(t.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = TABS.findIndex((x) => x.id === tab);
                const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]!;
                openSources(next.id);
                requestAnimationFrame(() => document.getElementById(`src-tab-${next.id}`)?.focus());
              }}
              className={`shrink-0 border-b-2 px-3 py-2 font-cond text-sm font-semibold ${tab === t.id ? "border-cyan text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div id="src-panel" role="tabpanel" aria-labelledby={`src-tab-${tab}`} className="px-5 py-5">
        {tab === "about" ? <About /> : tab === "sources" ? <Sources /> : tab === "thresholds" ? <Thresholds /> : tab === "labels" ? <Labels /> : <StorageSettings />}
      </div>
    </Dialog>
  );
}
