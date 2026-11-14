import { ExternalLink } from "lucide-react";
import { PROVENANCE_LABEL } from "../../engine/basis";
import type { RecommendationBasis } from "../../types/health";

const TONE: Record<RecommendationBasis["provenance"], string> = {
  "supplied-prototype": "border-line-strong text-ink-2",
  "astra-assumption": "border-caution/40 text-[#f8c36b]",
  "mission-plan": "border-blue/40 text-[#8cb4ff]",
  "scenario-simulation": "border-line-strong bg-raised text-ink",
  routine: "border-line text-ink-3",
};

/** Origin of a recommendation: indicator, configured rule, provenance, and scientific context if any. */
export function BasisLine({ basis, compact = false, inline = false }: { basis: RecommendationBasis; compact?: boolean; inline?: boolean }) {
  if (inline) {
    return (
      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-2xs text-ink-3" title={`${basis.indicator}. ${basis.rule}. ${basis.reference ? `${basis.reference.label}. ` : ""}${basis.referenceNote}`}>
        <span className="shrink-0 font-semibold text-ink-2">Basis:</span>
        <span className="truncate">
          {basis.indicator}, <span className="num">{basis.rule}</span>
        </span>
        <span className={`chip-tag shrink-0 ${TONE[basis.provenance]}`}>{PROVENANCE_LABEL[basis.provenance]}</span>
      </p>
    );
  }
  return (
    <div className={`text-2xs leading-4 text-ink-3 ${compact ? "" : "mt-1.5"}`}>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-semibold text-ink-2">Basis:</span>
        <span>{basis.indicator}.</span>
        <span className="num text-ink-2">{basis.rule}</span>
        <span className={`chip-tag ${TONE[basis.provenance]}`}>{PROVENANCE_LABEL[basis.provenance]}</span>
      </p>
      <p className="mt-0.5">
        {basis.reference ? (
          <a href={basis.reference.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-0.5">
            {basis.reference.label}
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        ) : null}
        {basis.reference ? " " : ""}
        {basis.referenceNote}
      </p>
    </div>
  );
}
