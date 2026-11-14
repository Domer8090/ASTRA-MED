import type { ReadinessSummary } from "../../types/health";
import { formatNumber } from "../../utils/formatting";

/** The four weighted parts of the readiness score, read straight from the engine output. */
export function ReadinessBreakdown({ readiness }: { readiness: ReadinessSummary }) {
  return (
    <div>
      <ul className="space-y-2">
        {readiness.components.map((c) => (
          <li key={c.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 text-ink">{c.label}</span>
              <span className="num shrink-0 text-ink">
                {formatNumber(c.points, 1)}
                <span className="text-ink-3"> / {c.weight}</span>
              </span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-line" aria-hidden="true">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${Math.round(c.fraction * 100)}%` }} />
            </div>
            <p className="mt-0.5 text-2xs text-ink-3">{c.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2 text-sm">
        <span className="text-ink-2">Sum, rounded</span>
        <span className="num font-semibold text-ink">
          {readiness.score}
          <span className="text-ink-3"> / 100</span>
        </span>
      </p>
    </div>
  );
}
