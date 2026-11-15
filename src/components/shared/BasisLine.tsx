import { ExternalLink } from "lucide-react";
import { PROVENANCE_LABEL } from "../../engine/basis";
import type { RecommendationBasis } from "../../types/health";
import { InfoTip } from "./InfoTip";

/** Origin of a recommendation (indicator, configured rule, provenance, reference), behind an (i). */
export function BasisLine({ basis }: { basis: RecommendationBasis; compact?: boolean; inline?: boolean }) {
  return (
    <InfoTip label="Why this step">
      <p>
        {basis.indicator}. <span className="num text-ink">{basis.rule}</span>
      </p>
      <p className="text-xs">Source of the rule: {PROVENANCE_LABEL[basis.provenance]}.</p>
      <p className="text-xs">
        {basis.reference ? (
          <a href={basis.reference.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-0.5">
            {basis.reference.label}
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        ) : null}
        {basis.reference ? " " : ""}
        {basis.referenceNote}
      </p>
    </InfoTip>
  );
}
