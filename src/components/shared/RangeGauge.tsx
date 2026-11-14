import { memo } from "react";
import type { GaugeTrack, ZoneKind } from "../../engine/gauges";

const ZONE_FILL: Record<ZoneKind, string> = {
  reference: "rgba(34,197,94,0.28)",
  nominal: "rgba(145,164,186,0.14)",
  caution: "rgba(245,158,11,0.40)",
  critical: "rgba(244,63,94,0.48)",
};

function pos(v: number, t: GaugeTrack): number {
  return Math.min(100, Math.max(0, ((v - t.min) / (t.max - t.min)) * 100));
}

/** Position of a value on its configured scale: critical, caution and reference zones with a marker. */
export const RangeGauge = memo(function RangeGauge({ tracks, values }: { tracks: GaugeTrack[]; values: number[] }) {
  return (
    <div className="flex flex-col gap-1" aria-hidden="true">
      {tracks.map((t, i) => {
        const v = values[i];
        return (
          <div key={t.label ?? i} className="flex items-center gap-1.5">
            {t.label ? <span className="w-6 font-cond text-[10px] font-semibold text-ink-3">{t.label}</span> : null}
            <div className="relative h-[6px] flex-1 rounded-[2px] bg-[#16283B]">
              {t.zones.map((z, k) => (
                <span key={k} className="absolute inset-y-0" style={{ left: `${pos(z.from, t)}%`, width: `${pos(z.to, t) - pos(z.from, t)}%`, background: ZONE_FILL[z.kind] }} />
              ))}
              {t.reference ? (
                <span
                  className="absolute inset-y-0"
                  style={{ left: `${pos(t.reference[0], t)}%`, width: `${pos(t.reference[1], t) - pos(t.reference[0], t)}%`, background: ZONE_FILL.reference }}
                />
              ) : null}
              {v !== undefined ? (
                <span className="absolute -top-[3px] h-[12px] w-[3px] -translate-x-1/2 rounded-[1px] bg-ink ring-2 ring-panel" style={{ left: `${pos(v, t)}%` }} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
});
