import { TrendingUp } from "lucide-react";

/** Marks an early-warning projection. Deliberately not a status colour: it never changes a status. */
export function TrendChip({ className = "" }: { className?: string }) {
  return (
    <span className={`chip-tag inline-flex items-center gap-1 border-cyan/50 text-cyan ${className}`} title="Trend watch: a 7-day projection toward a caution limit. Not a status and not a diagnosis.">
      <TrendingUp aria-hidden="true" className="h-3 w-3" />
      TREND WATCH
    </span>
  );
}
