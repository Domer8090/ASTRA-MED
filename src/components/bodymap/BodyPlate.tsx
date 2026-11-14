import { memo, useId, type KeyboardEvent } from "react";
import { BODY_SYSTEMS } from "../../data/bodySystems";
import { COLORS, STATUS_COLOR } from "../../config/theme";
import type { BodySystemId, BodySystemState, HealthStatus } from "../../types/health";
import { ANATOMY, ARM_LEFT_PATH, ARM_RIGHT_PATH, BODY_PATH, CALLOUT_HEIGHT, CALLOUT_WIDTH, CX, HOTSPOTS } from "./figureGeometry";

interface Props {
  systems: Record<BodySystemId, BodySystemState>;
  selected: BodySystemId;
  onSelect: (id: BodySystemId) => void;
  compact: boolean;
  keyReadings: Record<BodySystemId, string>;
  /** Active environmental hazard, drawn as an envelope around the figure. Not a dose. */
  hazard?: { level: string; label: string } | null;
  /** Systems directly affected by the active hazard; their hotspots get a hazard ring. */
  hazardSystems?: readonly BodySystemId[];
}

/** Small status glyph drawn inside a hotspot marker: circle-check, triangle or octagon. */
function Glyph({ status, x, y }: { status: HealthStatus; x: number; y: number }) {
  const c = STATUS_COLOR[status];
  if (status === "NOMINAL") {
    return <path d={`M${x - 3.2} ${y + 0.2} l2.2 2.3 l4.4 -4.8`} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (status === "CAUTION") {
    return (
      <g>
        <path d={`M${x} ${y - 4.6} L${x + 4.6} ${y + 3.6} L${x - 4.6} ${y + 3.6}Z`} fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
        <path d={`M${x} ${y - 1.4} v2.2`} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    );
  }
  const r = 4.4;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 8) * (2 * i + 1);
    return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <g>
      <polygon points={pts} fill="none" stroke={c} strokeWidth="1.6" />
      <path d={`M${x} ${y - 2} v2.4`} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

const GRID = Array.from({ length: 17 }, (_, i) => i * 40);

export const BodyPlate = memo(function BodyPlate({ systems, selected, onSelect, compact, keyReadings, hazard, hazardSystems = [] }: Props) {
  const uid = useId().replace(/:/g, "");
  const clipId = `body-clip-${uid}`;
  const viewBox = compact ? `${CX - 150} 14 300 612` : "0 0 640 640";

  const onKey = (id: BodySystemId) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <svg viewBox={viewBox} className="h-auto w-full" role="group" aria-label="Interactive body map. Five selectable body systems, each showing its current status.">
      <defs>
        <clipPath id={clipId}>
          <path d={BODY_PATH} />
          <path d={ARM_RIGHT_PATH} />
          <path d={ARM_LEFT_PATH} />
        </clipPath>
      </defs>

      {/* Measurement graticule and plate frame */}
      <g aria-hidden="true">
        {GRID.map((g) => (
          <path key={`v${g}`} d={`M${g} 0V640`} stroke={COLORS.lineSoft} strokeWidth="1" />
        ))}
        {GRID.map((g) => (
          <path key={`h${g}`} d={`M0 ${g}H640`} stroke={COLORS.lineSoft} strokeWidth="1" />
        ))}
        <path d={`M${CX} 8V632`} stroke={COLORS.line} strokeWidth="1" strokeDasharray="2 6" />
        {Array.from({ length: 31 }, (_, i) => i * 20 + 20).map((y) => (
          <path key={`t${y}`} d={`M${CX - 172} ${y}h${y % 100 === 0 ? 10 : 5}`} stroke={COLORS.line} strokeWidth="1" />
        ))}
      </g>

      {hazard ? (
        <g aria-hidden="true">
          <ellipse cx={CX} cy={322} rx={150} ry={300} fill="none" stroke={hazard.level === "ALL CLEAR" ? COLORS.nominal : COLORS.caution} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="6 6" />
          <text x={CX + 146} y={compact ? 30 : 40} textAnchor="end" fill={hazard.level === "ALL CLEAR" ? COLORS.nominal : COLORS.caution} fontFamily="Barlow Semi Condensed" fontWeight="700" fontSize="12" letterSpacing="0.6">
            {hazard.label}
          </text>
        </g>
      ) : null}

      {/* Silhouette */}
      <g aria-hidden="true">
        <path d={ARM_LEFT_PATH} fill="#0F1A2C" />
        <path d={ARM_RIGHT_PATH} fill="#0F1A2C" />
        <path d={BODY_PATH} fill="#0F1A2C" />
        <g clipPath={`url(#${clipId})`} className="plate-scan">
          {Array.from({ length: 105 }, (_, i) => 24 + i * 5.8).map((y) => (
            <path key={y} d={`M0 ${y.toFixed(1)}H640`} stroke={COLORS.cyan} strokeOpacity="0.07" strokeWidth="1" />
          ))}
        </g>
        <g fill="none" stroke={COLORS.cyan} strokeOpacity="0.55" strokeWidth="1.25" strokeLinejoin="round">
          <path className="plate-contour" d={ARM_LEFT_PATH} />
          <path className="plate-contour" d={ARM_RIGHT_PATH} />
          <path className="plate-contour" d={BODY_PATH} />
        </g>
        <g fill="none" stroke={COLORS.ink2} strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round">
          <path d={ANATOMY.brain} />
          <path d={ANATOMY.brainFissure} />
          {ANATOMY.eyes.map(([x, y]) => (
            <ellipse key={x} cx={x} cy={y} rx="5" ry="2.6" />
          ))}
          <path d={ANATOMY.spine} strokeDasharray="3 4" />
          <path d={ANATOMY.clavicles} />
          {ANATOMY.ribs.map((d) => (
            <path key={d} d={d} />
          ))}
          <path d={ANATOMY.heart} />
          <path d={ANATOMY.aorta} />
          <path d={ANATOMY.liver} />
          <path d={ANATOMY.stomach} />
          <path d={ANATOMY.spleen} />
          <path d={ANATOMY.pelvis} />
          <path d={ANATOMY.femurs} />
          {ANATOMY.knees.map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="7" />
          ))}
        </g>
        <g fill={COLORS.ink2} fillOpacity={selected === "immuneRadiation" ? 0.9 : 0.3}>
          {ANATOMY.lymphNodes.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" />
          ))}
        </g>
      </g>

      {/* Leader lines and callouts (pointer only; the hotspots carry keyboard access) */}
      {!compact
        ? HOTSPOTS.map((h) => {
            const st = systems[h.id];
            const isSel = selected === h.id;
            const edgeX = h.callout.side === "left" ? h.callout.x + CALLOUT_WIDTH : h.callout.x;
            const edgeY = h.callout.y + CALLOUT_HEIGHT / 2;
            const elbowX = h.callout.side === "left" ? edgeX + 18 : edgeX - 18;
            const color = isSel ? COLORS.cyan : COLORS.lineStrong;
            return (
              <g key={`c-${h.id}`} aria-hidden="true" className="cursor-pointer" onClick={() => onSelect(h.id)}>
                <path d={`M${edgeX} ${edgeY}H${elbowX}L${h.anchor[0]} ${h.anchor[1]}`} fill="none" stroke={color} strokeWidth={isSel ? 1.5 : 1} />
                <circle cx={edgeX} cy={edgeY} r="2" fill={color} />
                <rect
                  x={h.callout.x}
                  y={h.callout.y}
                  width={CALLOUT_WIDTH}
                  height={CALLOUT_HEIGHT}
                  rx="5"
                  fill={isSel ? "#111D31" : COLORS.panel}
                  stroke={isSel ? COLORS.cyan : COLORS.line}
                  strokeWidth={isSel ? 1.5 : 1}
                />
                <text x={h.callout.x + 10} y={h.callout.y + 19} fill={COLORS.ink} fontFamily="Barlow Semi Condensed" fontWeight="600" fontSize="13.5">
                  {BODY_SYSTEMS[h.id].shortName}
                </text>
                <Glyph status={st.status} x={h.callout.x + 16} y={h.callout.y + 35} />
                <text x={h.callout.x + 26} y={h.callout.y + 39.5} fill={STATUS_COLOR[st.status]} fontFamily="Barlow Semi Condensed" fontWeight="700" fontSize="12" letterSpacing="0.9">
                  {st.status}
                </text>
                <text x={h.callout.x + 10} y={h.callout.y + 52} fill={COLORS.ink2} fontFamily="IBM Plex Mono" fontSize="10.5">
                  {keyReadings[h.id]}
                </text>
              </g>
            );
          })
        : null}

      {/* Hotspots: keyboard-accessible controls */}
      {HOTSPOTS.map((h) => {
        const st = systems[h.id];
        const isSel = selected === h.id;
        const color = STATUS_COLOR[st.status];
        const label = `${BODY_SYSTEMS[h.id].name}: ${st.status}.${hazardSystems.includes(h.id) ? " Directly affected by the active environmental hazard." : ""} ${isSel ? "Selected." : "Select to show system details."}`;
        return (
          <g
            key={h.id}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSel}
            className="hotspot cursor-pointer"
            onClick={() => onSelect(h.id)}
            onKeyDown={onKey(h.id)}
          >
            <path
              className="hotspot-region"
              d={h.region}
              fill={color}
              fillOpacity={isSel ? 0.2 : 0.05}
              stroke={color}
              strokeOpacity={isSel ? 0.95 : 0.35}
              strokeWidth={isSel ? 1.6 : 1}
              strokeDasharray={isSel ? undefined : "3 3"}
            />
            {/* Enlarged invisible hit area for touch */}
            <circle cx={h.anchor[0]} cy={h.anchor[1]} r="22" fill="transparent" />
            <circle className="hotspot-ring" cx={h.anchor[0]} cy={h.anchor[1]} r="11" fill={COLORS.space} stroke={color} strokeWidth={isSel ? 2.2 : 1.6} />
            {st.status === "CRITICAL" ? <circle cx={h.anchor[0]} cy={h.anchor[1]} r="15" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.7" /> : null}
            {hazardSystems.includes(h.id) ? (
              <circle cx={h.anchor[0]} cy={h.anchor[1]} r="19" fill="none" stroke={COLORS.caution} strokeWidth="1.5" strokeDasharray="3 3" aria-hidden="true" />
            ) : null}
            <Glyph status={st.status} x={h.anchor[0]} y={h.anchor[1]} />
          </g>
        );
      })}

      {!compact ? (
        <text x="16" y="628" fill={COLORS.ink3} fontFamily="Barlow Semi Condensed" fontSize="11.5" aria-hidden="true">
          Anterior view, crew FE-2. Schematic, not to scale.
        </text>
      ) : null}
    </svg>
  );
});
