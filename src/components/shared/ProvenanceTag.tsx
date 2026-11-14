export type Provenance =
  | "SYNTHETIC"
  | "MANUAL"
  | "LIVE"
  | "PARTIAL"
  | "CACHED"
  | "ARCHIVED"
  | "UNAVAILABLE"
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
  ARCHIVED: "border-line-strong text-ink-2",
  UNAVAILABLE: "border-critical/50 text-[#ff8aa0]",
  SCENARIO: "border-line-strong bg-raised text-ink",
  "SUPPLIED PROTOTYPE": "border-line-strong text-ink-2",
  "ASTRA ASSUMPTION": "border-caution/40 text-[#f8c36b]",
  "MISSION PLAN": "border-blue/40 text-[#8cb4ff]",
};

const TITLE: Record<Provenance, string> = {
  SYNTHETIC: "Synthetic demonstration telemetry bundled with the app. Not real astronaut data.",
  MANUAL: "Entered on this device by the crew member.",
  LIVE: "Received in a successful NASA DONKI response during this browser session.",
  PARTIAL: "Some DONKI event types were received live this session; the others show cached or archived data.",
  CACHED: "Received from NASA DONKI in an earlier session and saved in this browser.",
  ARCHIVED: "Real DONKI records from 2024-05-08 to 2024-05-16, bundled for offline use. Historical, not current conditions.",
  UNAVAILABLE: "The DONKI feed cannot be reached now (offline, or every request failed). Anything shown is cached or archived.",
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
