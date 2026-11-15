import { bandText, nominalBand, type GaugeTrack, type ZoneKind } from "../../engine/gauges";
import type { MeasurementValue } from "../../types/health";

const ZONE_FILL: Record<ZoneKind, string> = {
  reference: "bg-nominal/45",
  nominal: "bg-line-strong/40",
  caution: "bg-caution/55",
  critical: "bg-critical/60",
};

function pos(v: number, t: GaugeTrack): number {
  return Math.min(100, Math.max(0, ((v - t.min) / (t.max - t.min)) * 100));
}

function valuesOf(v: MeasurementValue | undefined): number[] {
  if (v === undefined) return [];
  if (typeof v === "number") return [v];
  if (v && typeof v === "object" && "systolic" in v) return [v.systolic, v.diastolic];
  return [];
}

/**
 * A large, labelled range for the Summary: the configured range in big numbers
 * ("Range 50–100 bpm"), a thick bar with the in-range band in green and the
 * caution and critical zones, and a marker at today's value. Built from
 * `gaugeTracks`, so no threshold is compared here.
 */
export function RangeBar({ tracks, value, unit }: { tracks: GaugeTrack[]; value: MeasurementValue | undefined; unit: string }) {
  const values = valuesOf(value);
  return (
    <div className="flex flex-col gap-2.5">
      {tracks.map((t, i) => {
        const v = values[i];
        const band = nominalBand(t);
        const bandFrom = band.lo ?? t.min;
        const bandTo = band.hi ?? t.max;
        return (
          <div key={t.label ?? i} className="flex flex-col gap-1">
            <p className="flex items-baseline gap-2 text-sm text-ink-2">
              {t.label ? <span className="font-semibold text-ink">{t.label === "SYS" ? "Systolic" : t.label === "DIA" ? "Diastolic" : t.label}</span> : null}
              <span>In range</span>
              <span className="num text-lg font-semibold text-nominal">{bandText(t)}</span>
              <span className="text-sm">{unit}</span>
            </p>
            <div className="relative h-3 rounded-full bg-line-soft" aria-hidden="true">
              {t.zones.map((z, k) => (
                <span key={k} className={`absolute inset-y-0 ${ZONE_FILL[z.kind]} ${k === 0 && pos(z.from, t) === 0 ? "rounded-l-full" : ""} ${pos(z.to, t) === 100 ? "rounded-r-full" : ""}`} style={{ left: `${pos(z.from, t)}%`, width: `${pos(z.to, t) - pos(z.from, t)}%` }} />
              ))}
              <span className={`absolute inset-y-0 ${ZONE_FILL.reference}`} style={{ left: `${pos(bandFrom, t)}%`, width: `${pos(bandTo, t) - pos(bandFrom, t)}%` }} />
              {v !== undefined ? <span className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-panel" style={{ left: `${pos(v, t)}%` }} /> : null}
            </div>
          </div>
        );
      })}
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-nominal/45" />In range</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-caution/55" />Caution</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-critical/60" />Critical</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-1.5 rounded-full bg-ink" />Your reading</span>
      </p>
    </div>
  );
}
