import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Compass, DatabaseZap, ExternalLink, HardDrive, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { ARED, describeThresholds, HYDRATION, MISSION, PLAN_SLIDERS, PVT, RADIATION } from "../config/thresholds";
import { gaugeTracks, rangeText } from "../engine/gauges";
import { ARCHIVE_PROVENANCE } from "../data/fallbackDonki";
import { SEP_DOSE_MODEL_SUMMARY } from "../data/scenarioHazards";
import { LIMITATIONS_STATEMENT, OSDR_STUDIES, REFERENCE_SOURCES } from "../data/sources";
import { useMissionState, useMissionStore } from "../hooks/useMissionState";
import { useToast } from "../hooks/useToast";
import { useOnboarding } from "../hooks/useOnboarding";
import { formatSignalDelay, missionSignalMinutes } from "../utils/dates";
import { useUiActions, useUiState, type SourcesTab } from "../hooks/useUi";
import { usingDemoKey } from "../services/nasaDonkiApi";
import type { ThresholdProvenance } from "../types/health";
import { Dialog } from "./shared/Dialog";
import { StatusBadge } from "./shared/StatusBadge";
import { STATUS_KEY } from "../data/aboutCopy";
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
  const { openSources, closeSources } = useUiActions();
  const { startTour } = useOnboarding();
  const day = useMissionState((st) => st.settings.selectedDay);
  const signal = missionSignalMinutes(day);
  const shown = formatSignalDelay(signal);
  const reply = formatSignalDelay(signal * 2);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <h3 className="font-cond text-2xl font-bold text-ink">ASTRA-MED</h3>
          <p className="mt-1 text-lg text-ink">Checks crew health on board, without waiting for Earth.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            closeSources();
            startTour();
          }}
        >
          <Compass aria-hidden="true" className="h-4 w-4" />
          Take the 1-minute tour
        </button>

        <div className="space-y-2 text-base text-ink">
          <p>On the way to Mars, a message to Earth takes minutes to arrive, and a reply twice as long. So the crew checks health on board first.</p>
          <p>You log vitals, sleep, mood and exercise. Each reading is marked NOMINAL, CAUTION or CRITICAL, with the rule behind it.</p>
        </div>

        <div className="rounded-tile border border-line p-4">
          <h4 className="text-base font-semibold text-ink">Before you start</h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base text-ink-2">
            <li>
              Demo readings are <ProvenanceTag kind="SYNTHETIC" />. They are not real astronaut data.
            </li>
            <li>Thresholds are prototype values, not NASA flight rules.</li>
            <li>Your health data stays in this browser.</li>
            <li>It works offline. NASA space-weather data loads when you are online.</li>
            <li>It does not diagnose or prescribe treatment.</li>
          </ul>
        </div>
      </div>

      <aside aria-label="At a glance" className="space-y-3">
        <div className="rounded-tile border border-line bg-raised p-4">
          <p className="text-sm text-ink-2">Ship to Earth signal, mission day {day}</p>
          <p className="num mt-1 text-4xl font-semibold text-cyan">
            {shown.value}
            <span className="ml-1.5 text-base font-normal text-ink-2">{shown.unit} one way</span>
          </p>
          <p className="mt-1 text-sm text-ink-2">
            A reply takes about <span className="num text-ink">{reply.value}</span> {reply.unit}. Near zero at launch, longer as the ship nears Mars.
          </p>
        </div>

        <div className="rounded-tile border border-line bg-raised p-4">
          <h4 className="text-base font-semibold text-ink">What the statuses mean</h4>
          <ul className="mt-3 space-y-3">
            {STATUS_KEY.map((k) => (
              <li key={k.status} className="flex flex-col gap-1">
                <StatusBadge status={k.status} className="self-start" />
                <span className="text-sm text-ink-2">{k.meaning}</span>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="More in this window" className="flex flex-col gap-2 rounded-tile border border-line bg-raised p-4">
          <button type="button" className="btn btn-secondary min-h-[44px] justify-start" onClick={() => openSources("thresholds")}>
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Change limits
          </button>
          <button type="button" className="btn btn-secondary min-h-[44px] justify-start" onClick={() => openSources("sources")}>
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            See all data sources
          </button>
        </nav>
      </aside>
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
          real archived records from {ARCHIVE_PROVENANCE.window.start} to {ARCHIVE_PROVENANCE.window.end}, retrieved from {ARCHIVE_PROVENANCE.source}. Always labelled ARCHIVED (offline fallback),
          never live.
        </p>
      </div>
    </div>
  );
}

const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`;
const fmtStep = (v: number, step: number) => (step < 1 ? v.toFixed(1) : String(v));

/** A limit card: name, current value, the slider and its ends, one line of context. */
function LimitCard(props: { title: string; value: string; unit: string; hint: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-tile border border-line bg-raised px-4 pb-3 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h5 className="text-base font-semibold text-ink">{props.title}</h5>
        <p className="num whitespace-nowrap text-xl font-semibold text-cyan sm:text-2xl">
          {props.value}
          <span className="ml-1 text-sm font-normal text-ink-2">{props.unit}</span>
        </p>
      </div>
      {props.children}
      <p className="mt-1 text-sm text-ink-2">{props.hint}</p>
    </div>
  );
}

function Ends({ min, max }: { min: number; max: number }) {
  return (
    <div className="num -mt-1 flex justify-between text-xs text-ink-3" aria-hidden="true">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  );
}

/** One thumb. It only sets a value; the engine decides what the value means. */
function LimitSlider(props: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  const { label, value, min, max, step, unit, onChange } = props;
  return (
    <>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range"
        style={{ "--pct": pct(value, min, max) } as CSSProperties}
        aria-valuetext={`${fmtStep(value, step)} ${unit}`}
      />
      <Ends min={min} max={max} />
    </>
  );
}

/** Two thumbs on one track for a band: green between them, amber outside. */
function BandSlider(props: { label: string; lo: number; hi: number; min: number; max: number; step: number; gap: number; unit: string; onChange: (lo: number, hi: number) => void }) {
  const { label, lo, hi, min, max, step, gap, unit, onChange } = props;
  return (
    <>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-caution/50" aria-hidden="true">
          <div className="absolute inset-y-0 rounded-full bg-nominal" style={{ left: pct(lo, min, max), right: `calc(100% - ${pct(hi, min, max)})` }} />
        </div>
        <input
          type="range"
          aria-label={`${label}, fastest`}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange(Math.min(Number(e.target.value), hi - gap), hi)}
          className="range range-overlay"
          aria-valuetext={`${lo} ${unit}`}
        />
        <input
          type="range"
          aria-label={`${label}, slowest`}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo + gap))}
          className="range range-overlay"
          aria-valuetext={`${hi} ${unit}`}
        />
      </div>
      <Ends min={min} max={max} />
    </>
  );
}

const ADJUSTABLE = new Set(["Cumulative radiation", "PVT reaction time", "ARED resistive exercise", "Hydration"]);

function Thresholds() {
  const store = useMissionStore();
  const settings = useMissionState((s) => s.settings);
  const uid = useId();
  const [note, setNote] = useState<string | null>(null);
  const set = (patch: Parameters<typeof store.updateLimits>[0]) => {
    const r = store.updateLimits(patch);
    setNote(r.persisted ? "Saved. Readings rechecked." : "Not saved: this browser is not storing data.");
  };
  const radiationRange = rangeText(gaugeTracks("radiation", settings.aredTargetMinutes, settings.hydrationTargetLiters, settings), "mSv");
  const fixed = describeThresholds(settings).filter((r) => !ADJUSTABLE.has(r.indicator));
  const { ared, hyd } = { ared: PLAN_SLIDERS.aredMinutes, hyd: PLAN_SLIDERS.hydrationLiters };
  return (
    <div className="space-y-6">
      <section aria-labelledby={`${uid}-adj`} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 id={`${uid}-adj`} className="text-lg font-semibold text-ink">
              Limits you can change
            </h4>
            <p className="text-sm text-ink-2">Prototype limits, not NASA flight rules. Changes save on this device.</p>
          </div>
          <div className="flex items-center gap-3">
            <p role="status" className="text-sm text-nominal">
              {note}
            </p>
            <button
              type="button"
              className="btn btn-secondary min-h-[44px]"
              onClick={() =>
                set({
                  radiationLimitMsv: RADIATION.limit.default,
                  pvtMinMs: PVT.range.min,
                  pvtMaxMs: PVT.range.max,
                  aredTargetMinutes: ARED.defaultTargetMinutes,
                  hydrationTargetLiters: HYDRATION.defaultTargetLiters,
                })
              }
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <LimitCard
            title="Radiation dose limit"
            value={String(settings.radiationLimitMsv)}
            unit="mSv"
            hint={
              <>
                In range <span className="num text-nominal">{radiationRange}</span>. CAUTION from {Math.round(RADIATION.cautionFraction * 100)}%, CRITICAL at the limit.
              </>
            }
          >
            <LimitSlider label="Radiation dose limit" value={settings.radiationLimitMsv} {...RADIATION.limit} unit="mSv" onChange={(v) => set({ radiationLimitMsv: v })} />
          </LimitCard>
          <LimitCard
            title="PVT reaction time"
            value={`${settings.pvtMinMs}–${settings.pvtMaxMs}`}
            unit="ms"
            hint="In range between the two handles. Faster or slower is CAUTION."
          >
            <BandSlider
              label="PVT reaction time"
              lo={settings.pvtMinMs}
              hi={settings.pvtMaxMs}
              {...PVT.sliderBounds}
              gap={10}
              unit="ms"
              onChange={(lo, hi) => set({ pvtMinMs: lo, pvtMaxMs: hi })}
            />
          </LimitCard>
          <LimitCard title="Strength exercise target" value={String(settings.aredTargetMinutes)} unit="min" hint="Below the target is CAUTION.">
            <LimitSlider label="Strength exercise target" value={settings.aredTargetMinutes} {...ared} unit="min" onChange={(v) => set({ aredTargetMinutes: v })} />
          </LimitCard>
          <LimitCard title="Fluids target" value={settings.hydrationTargetLiters.toFixed(1)} unit="L" hint={`Below the target ${HYDRATION.cautionPersistenceDays} days running is CAUTION.`}>
            <LimitSlider label="Fluids target" value={settings.hydrationTargetLiters} {...hyd} unit="L" onChange={(v) => set({ hydrationTargetLiters: Math.round(v * 10) / 10 })} />
          </LimitCard>
        </div>
      </section>

      <section aria-labelledby={`${uid}-fixed`} className="space-y-3">
        <h4 id={`${uid}-fixed`} className="text-lg font-semibold text-ink">
          Fixed limits
        </h4>
        <ul className="grid gap-3 md:grid-cols-2">
          {fixed.map((r) => (
            <li key={r.indicator} className="flex flex-col gap-1.5 rounded-tile border border-line px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-semibold text-ink">{r.indicator}</span>
                <ProvenanceTag kind={PROV_TAG[r.provenance]} />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                <dt className="text-ink-2">In range</dt>
                <dd className="num text-nominal">{r.reference}</dd>
                <dt className="text-ink-2">CAUTION</dt>
                <dd className="num text-caution">{r.caution}</dd>
                <dt className="text-ink-2">CRITICAL</dt>
                <dd className="num text-critical">{r.critical}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-ink-3">{LIMITATIONS_STATEMENT}</p>
    </div>
  );
}

function Labels() {
  const kinds: Provenance[] = [
    "SYNTHETIC",
    "MANUAL",
    "TUESDAY",
    "DEVICE",
    "SIM DEVICE",
    "LIVE",
    "PARTIAL",
    "CACHED",
    "ARCHIVED",
    "UNAVAILABLE",
    "SCENARIO",
    "SUPPLIED PROTOTYPE",
    "ASTRA ASSUMPTION",
    "MISSION PLAN",
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Demo scenarios: A, nominal (day 42). B, heart and blood pressure caution (day 118). C, simulated solar particle event (days 130–134).</p>
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
    </div>
  );
}

function StorageSettings() {
  const store = useMissionStore();
  const toast = useToast();
  const storage = useMissionState((s) => s.storage);
  const measurementCount = useMissionState((s) => s.measurements.length);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-5">
      <div className="rounded-tile border border-line p-3">
        <h4 className="text-base font-semibold text-ink">Local voice setup (optional)</h4>
        <p className="mt-1 text-sm text-ink-2">Tuesday hears and speaks with local Whisper, Ollama and Kokoro on this Mac. Audio and health data stay on this device.</p>
        <pre className="mt-2 overflow-x-auto rounded-tile border border-line bg-space p-3 font-mono text-xs text-ink-2">
          <code>{`# One-time macOS setup\nbrew install whisper-cpp ffmpeg ollama python@3.12 espeak-ng\nnpm run voice:setup\nnpm run voice:setup:kokoro\n\n# Terminal 1\nnpm run dev\n\n# Terminal 2\nnpm run voice:local`}</code>
        </pre>
      </div>
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


      <div className="rounded-tile border border-line p-3">
        <h3 className="label flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          NASA API key
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          {usingDemoKey() ? "Using DEMO_KEY, which NASA rate-limits heavily." : "Using the key from VITE_NASA_API_KEY."} Vite bundles every VITE_ variable into the page, so any key set there is
          visible to users and is not a secret. Put a personal key in <code className="num">.env.local</code> and never commit it.
        </p>
      </div>

      <div className="rounded-tile border border-critical/40 p-3">
        <h3 className="label text-critical">Reset demo data</h3>
        <p className="mt-1 text-sm text-ink-2">
          Removes every logged measurement, task record, follow-up and setting from this browser and restores the bundled baseline (scenario A, day {MISSION.defaultDay}). Cached space-weather events
          are kept. This cannot be undone.
        </p>
        {!confirming ? (
          <button type="button" className="btn btn-danger mt-3" onClick={() => setConfirming(true)}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset demo data…
          </button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm reset">
            <p className="w-full text-sm font-semibold text-ink">
              Delete {measurementCount} logged measurement
              {measurementCount === 1 ? "" : "s"} and all task progress?
            </p>
            <button
              type="button"
              className="btn btn-danger"
              data-autofocus
              onClick={() => {
                const r = store.resetDemoData();
                setConfirming(false);
                toast({
                  tone: r.persisted ? "success" : "warning",
                  title: r.message,
                  body: "Scenario A, mission day 42.",
                });
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
  // Closing never starts the tour by itself; "Take the 1-minute tour" does.
  const close = closeSources;
  return (
    <Dialog open={sourcesTab !== null} onClose={close} title="Overview and data sources" labelId="sources-title" widthClass="max-w-4xl">
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
