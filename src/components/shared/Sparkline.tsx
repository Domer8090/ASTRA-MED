import { memo } from "react";

/** Tiny line of recent values. Gaps (null) break the line. Purely visual; the card states the values in text. */
export const Sparkline = memo(function Sparkline({ values, color, className = "h-7 w-full" }: { values: (number | null)[]; color: string; className?: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className={className} aria-hidden="true" />;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const w = 100;
  const h = 24;
  const step = w / Math.max(1, values.length - 1);
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    const x = (i * step).toFixed(1);
    const y = (h - 2 - ((v - min) / span) * (h - 4)).toFixed(1);
    d += `${pen ? "L" : "M"}${x} ${y}`;
    pen = true;
  });
  const lastIdx = values.length - 1;
  const last = values[lastIdx];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="#7D93AB" strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {last !== null && last !== undefined ? (
        <circle cx={lastIdx * step} cy={h - 2 - ((last - min) / span) * (h - 4)} r="2.2" fill={color} vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
});
