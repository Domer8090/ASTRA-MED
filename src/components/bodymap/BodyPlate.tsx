import { lazy, memo, Suspense, useState } from "react";
import { COLORS } from "../../config/theme";
import type { BodySystemId, BodySystemState } from "../../types/health";
import { CX } from "./figureGeometry";
import type { BodyViewControls } from "./BodyModel3D";

const BodyModel3D = lazy(() => import("./BodyModel3D").then((module) => ({ default: module.BodyModel3D })));

interface Props {
  systems: Record<BodySystemId, BodySystemState>;
  selected: BodySystemId;
  onSelect: (id: BodySystemId) => void;
  compact: boolean;
  /** Active environmental hazard, drawn as an envelope around the figure. Not a dose. */
  hazard?: { level: string; label: string } | null;
}

/** Body frame and live 3D anatomy. System markers are projected from organ meshes inside the model viewer. */
export const BodyPlate = memo(function BodyPlate({ systems, selected, onSelect, compact, hazard }: Props) {
  const viewBox = compact ? `${CX - 150} 14 300 612` : "0 0 640 640";
  const [viewControls, setViewControls] = useState<BodyViewControls | null>(null);

  return (
    <div className="relative">
    <svg viewBox={viewBox} className="h-auto w-full" role="group" aria-label="Interactive 3D anatomy. Select a system marker or a system button to see its status and crew guidance.">
      {hazard ? (
        <g aria-hidden="true">
          <ellipse cx={CX} cy={322} rx={150} ry={300} fill="none" stroke={hazard.level === "ALL CLEAR" ? COLORS.nominal : COLORS.caution} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x={CX + 146} y={compact ? 30 : 40} textAnchor="end" fill={hazard.level === "ALL CLEAR" ? COLORS.nominal : COLORS.caution} fontFamily="Barlow Semi Condensed" fontWeight="700" fontSize="12" letterSpacing="0.6">
            {hazard.label}
          </text>
        </g>
      ) : null}

      <foreignObject x="160" y="18" width="320" height="606">
        <div className="h-full w-full">
          <Suspense fallback={<div role="status" className="flex h-full items-center justify-center text-xs text-ink-3">Loading 3D anatomy…</div>}>
            <BodyModel3D systems={systems} selected={selected} onSelect={onSelect} onControlsReady={setViewControls} />
          </Suspense>
        </div>
      </foreignObject>

      {!compact ? (
        <text x="16" y="628" fill={COLORS.ink3} fontFamily="Barlow Semi Condensed" fontSize="11.5" aria-hidden="true">
          Drag to rotate. Organ markers stay attached to the anatomy.
        </text>
      ) : null}
    </svg>
    <div className="absolute right-3 top-3 z-20 flex flex-col gap-1 rounded-control border border-line bg-panel/95 p-1" role="group" aria-label="Anatomy view controls">
      <button type="button" disabled={!viewControls} className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-lg text-ink hover:border-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan disabled:cursor-wait disabled:opacity-40" aria-label="Zoom in" onClick={() => viewControls?.zoom(1.12)}>+</button>
      <button type="button" disabled={!viewControls} className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-lg text-ink hover:border-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan disabled:cursor-wait disabled:opacity-40" aria-label="Zoom out" onClick={() => viewControls?.zoom(0.89)}>−</button>
      <button type="button" disabled={!viewControls} className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-sm font-bold text-ink hover:border-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan disabled:cursor-wait disabled:opacity-40" aria-label="Reset anatomy view" onClick={() => viewControls?.reset()}>↺</button>
    </div>
    </div>
  );
});
