import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import type { HealthStatus } from "../../types/health";

const STYLE: Record<HealthStatus, string> = {
  NOMINAL: "border-nominal/45 bg-nominal/10 text-nominal",
  CAUTION: "border-caution/55 bg-caution/10 text-caution",
  CRITICAL: "border-critical/60 bg-critical/12 text-critical",
};

export const STATUS_ICON = { NOMINAL: CircleCheck, CAUTION: TriangleAlert, CRITICAL: OctagonAlert } as const;

export function StatusIcon({ status, className = "h-4 w-4" }: { status: HealthStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return <Icon aria-hidden="true" className={className} strokeWidth={2.2} />;
}

/** Status is always text + icon + colour. */
export function StatusBadge({ status, size = "sm", className = "" }: { status: HealthStatus; size?: "sm" | "md"; className?: string }) {
  const sizing = size === "md" ? "gap-1.5 px-2 py-1 text-sm" : "gap-1 px-1.5 py-0.5 text-2xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-badge border font-cond font-bold uppercase tracking-status ${sizing} ${STYLE[status]} ${className}`}
    >
      <StatusIcon status={status} className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      {status}
    </span>
  );
}
