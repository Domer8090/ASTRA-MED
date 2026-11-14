import { memo, useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { COLORS } from "../../config/theme";
import type { ChartRow, StatusPeriod } from "../../services/chartSeries";
import type { HealthStatus } from "../../types/health";
import { padDay } from "../../utils/dates";
import { formatNumber } from "../../utils/formatting";
import type { TabDef } from "./trendTabs";

const PERIOD_FILL: Record<Exclude<HealthStatus, "NOMINAL">, string> = { CAUTION: COLORS.caution, CRITICAL: COLORS.critical };

function ChartTooltip({ active, payload, label, tab }: TooltipContentProps<number, string> & { tab: TabDef }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  return (
    <div className="rounded-tile border border-line-strong bg-raised px-3 py-2 text-sm">
      <p className="num mb-1 text-ink-2">Mission day {padDay(Number(label))}</p>
      {tab.series.map((s) => {
        const v = row?.[s.key];
        if (typeof v !== "number") return null;
        const manual = s.manualKey && typeof row?.[s.manualKey] === "number";
        return (
          <p key={s.key} className="flex items-center gap-2 text-ink">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
            <span className="num ml-auto pl-3 font-medium">
              {formatNumber(v, s.decimals)} {s.unit}
            </span>
            {manual ? <span className="chip-tag border-cyan/50 text-cyan">MANUAL</span> : null}
          </p>
        );
      })}
      <p className="mt-1 text-2xs text-ink-3">{row && tab.series.some((s) => s.manualKey && typeof row[s.manualKey] === "number") ? "Includes a manual entry." : "Synthetic demo telemetry."}</p>
    </div>
  );
}

const TrendChart = memo(function TrendChart({
  tab,
  rows,
  periods,
  day,
  range,
  target,
  onPick,
}: {
  tab: TabDef;
  rows: ChartRow[];
  periods: StatusPeriod[];
  day: number;
  range: [number, number];
  target?: number;
  onPick: (d: number) => void;
}) {
  const hasRight = tab.series.some((s) => s.axis === "right");
  const xTicks = useMemo(() => {
    const span = range[1] - range[0];
    const step = span <= 10 ? 1 : span <= 31 ? 5 : span <= 91 ? 15 : 30;
    const out: number[] = [];
    for (let d = Math.ceil(range[0] / step) * step; d <= range[1]; d += step) out.push(d === 0 ? 1 : d);
    if (out[0] !== range[0]) out.unshift(range[0]);
    return out;
  }, [range]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={rows}
        margin={{ top: 22, right: hasRight ? 4 : 12, bottom: 4, left: 0 }}
        onClick={(state) => {
          const d = Number(state?.activeLabel);
          if (Number.isFinite(d) && d >= 1) onPick(d);
        }}
      >
        <CartesianGrid stroke={COLORS.lineSoft} vertical={false} />
        <XAxis
          dataKey="day"
          type="number"
          domain={range}
          ticks={xTicks}
          tick={{ fill: COLORS.ink2, fontSize: 11, fontFamily: "IBM Plex Mono" }}
          tickLine={{ stroke: COLORS.line }}
          axisLine={{ stroke: COLORS.line }}
          tickFormatter={(d: number) => `D${d}`}
        />
        <YAxis
          yAxisId="left"
          domain={tab.leftDomain}
          width={44}
          tick={{ fill: COLORS.ink2, fontSize: 11, fontFamily: "IBM Plex Mono" }}
          tickLine={false}
          axisLine={false}
          allowDataOverflow
        />
        {hasRight ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={tab.rightDomain}
            width={44}
            tick={{ fill: COLORS.ink2, fontSize: 11, fontFamily: "IBM Plex Mono" }}
            tickLine={false}
            axisLine={false}
          />
        ) : null}

        {periods.map((p) => (
          <ReferenceArea
            key={`${p.start}-${p.status}`}
            yAxisId="left"
            x1={p.start - 0.5}
            x2={p.end + 0.5}
            fill={PERIOD_FILL[p.status]}
            fillOpacity={0.1}
            stroke={PERIOD_FILL[p.status]}
            strokeOpacity={0.35}
            ifOverflow="hidden"
            label={p.end - p.start >= 2 || range[1] - range[0] <= 31 ? { value: p.status, position: "insideTop", fill: PERIOD_FILL[p.status], fontSize: 10, fontFamily: "Barlow Semi Condensed", fontWeight: 700 } : undefined}
          />
        ))}
        {tab.bands.map((b, i) => (
          <ReferenceArea
            key={b.label}
            yAxisId="left"
            y1={b.y1}
            y2={b.y2}
            fill={COLORS.nominal}
            fillOpacity={0.07}
            stroke={COLORS.nominal}
            strokeOpacity={0.22}
            strokeDasharray="4 4"
            ifOverflow="hidden"
            label={i === 0 ? { value: "Configured Reference Range", position: "insideTopLeft", fill: "#6FD39A", fontSize: 10, fontFamily: "Barlow Semi Condensed" } : undefined}
          />
        ))}
        {target !== undefined ? (
          <ReferenceLine yAxisId="left" y={target} stroke={COLORS.nominal} strokeDasharray="4 4" label={{ value: `Plan ${target} min`, position: "insideTopLeft", fill: "#6FD39A", fontSize: 10 }} />
        ) : null}
        <ReferenceLine
          yAxisId="left"
          x={day}
          stroke={COLORS.cyan}
          strokeWidth={1.25}
          label={{ value: `D${padDay(day)}`, position: "top", fill: COLORS.cyan, fontSize: 11, fontFamily: "IBM Plex Mono" }}
          ifOverflow="hidden"
        />

        <Tooltip content={(props) => <ChartTooltip {...(props as TooltipContentProps<number, string>)} tab={tab} />} cursor={{ stroke: COLORS.lineStrong }} isAnimationActive={false} />
        <Legend
          verticalAlign="bottom"
          height={26}
          iconSize={9}
          wrapperStyle={{ fontSize: 12, color: COLORS.ink2, fontFamily: "Barlow" }}
        />

        {tab.series.map((s) =>
          s.kind === "bar" ? (
            <Bar key={s.key} yAxisId={s.axis ?? "left"} dataKey={s.key} name={`${s.name} (${s.unit})`} fill={s.color} fillOpacity={0.75} maxBarSize={10} isAnimationActive={false} />
          ) : s.kind === "area" ? (
            <Area key={s.key} yAxisId={s.axis ?? "left"} type="monotone" dataKey={s.key} name={`${s.name} (${s.unit})`} stroke={s.color} fill={s.color} fillOpacity={0.08} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls={false} />
          ) : (
            <Line key={s.key} yAxisId={s.axis ?? "left"} type="monotone" dataKey={s.key} name={`${s.name} (${s.unit})`} stroke={s.color} strokeWidth={1.75} dot={false} activeDot={{ r: 3.5 }} isAnimationActive={false} connectNulls={false} />
          ),
        )}
        {tab.series
          .filter((s) => s.manualKey)
          .map((s) => (
            <Scatter key={`${s.key}-m`} yAxisId={s.axis ?? "left"} dataKey={s.manualKey!} name="Manual entry" fill={COLORS.ink} stroke={COLORS.cyan} strokeWidth={2} shape="circle" legendType={s === tab.series.find((x) => x.manualKey) ? "circle" : "none"} isAnimationActive={false} />
          ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
});


export default TrendChart;
