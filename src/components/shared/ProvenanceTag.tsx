export type Provenance =
  | "SYNTHETIC"
  | "MANUAL"
  | "LIVE"
  | "PARTIAL"
  | "CACHED"
  | "FALLBACK"
  | "SCENARIO"
  | "SUPPLIED PROTOTYPE"
  | "ASTRA ASSUMPTION"
  | "MISSION PLAN";

const STYLE: Record<Provenance, string> = {
  SYNTHETIC: "border-line-strong text-ink-2",
  MANUAL: "border-cyan/50 text-cyan",
  LIVE: "border-nominal/50 text-nominal",
  PARTIAL: "border-caution/50 text-caution",
  CACHED: "border-blue/50 text-[#8cb4ff]",
  FALLBACK: "border-line-strong text-ink-2",
  SCENARIO: "border-line-strong bg-raised text-ink",
  "SUPPLIED PROTOTYPE": "border-line-strong text-ink-2",
  "ASTRA ASSUMPTION": "border-caution/40 text-[#f8c36b]",
  "MISSION PLAN": "border-blue/40 text-[#8cb4ff]",
};

const TITLE: Record<Provenance, string> = {
  SYNTHETIC: "Synthetic demonstration telemetry bundled with the app. Not real astronaut data.",
  MANUAL: "Entered on this device by the crew member.",
  LIVE: "Fetched from NASA DONKI during this session.",
  PARTIAL: "Some DONKI endpoints loaded live; others failed.",
  CACHED: "Last successful NASA DONKI result saved in this browser.",
  FALLBACK: "Archived DONKI records bundled for offline demonstration. Not current conditions.",
  SCENARIO: "Simulated mission event from the selected demo scenario.",
  "SUPPLIED PROTOTYPE": "Prototype reference value supplied for this build (PROMPT.md §8.2). Not an official NASA flight rule.",
  "ASTRA ASSUMPTION": "Added by ASTRA-MED to fill a gap. No cited source; editable in configuration.",
  "MISSION PLAN": "Demo mission-plan target. A real mission protocol sets this per crew member.",
};

export function ProvenanceTag({ kind, label, className = "" }: { kind: Provenance; label?: string; className?: string }) {
  return (
    <span className={`chip-tag ${STYLE[kind]} ${className}`} title={TITLE[kind]}>
      {label ?? kind}
    </span>
  );
}

export const PROVENANCE_DESCRIPTIONS = TITLE;
