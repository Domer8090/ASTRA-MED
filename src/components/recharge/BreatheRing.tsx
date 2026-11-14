import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Play } from "lucide-react";
import { COLORS } from "../../config/theme";
import type { HandPose } from "../../engine/gestures";

const IN_S = 4;
const OUT_S = 6;
const CYCLES = 6;
const TOTAL = (IN_S + OUT_S) * CYCLES;

interface Props {
  poseRef: MutableRefObject<HandPose | null>;
  handOn: boolean;
  onFinish: (seconds: number, syncPercent: number | null) => void;
}

/**
 * One minute of paced breathing (in 4 s, out 6 s). With hand control on, open
 * the hand to breathe in and close it to breathe out; Tuesday reports how
 * closely the hand followed the ring. A relaxation exercise, not a treatment.
 */
export default function BreatheRing({ poseRef, handOn, onFinish }: Props) {
  const ringRef = useRef<SVGCircleElement>(null);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("Breathe in");
  const [done, setDone] = useState<{ sync: number | null } | null>(null);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let raf = 0;
    let matched = 0;
    let seen = 0;
    let lastLabel = "";
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (t >= TOTAL) {
        const sync = seen > 60 ? Math.round((matched / seen) * 100) : null;
        setRunning(false);
        setDone({ sync });
        onFinishRef.current(TOTAL, sync);
        return;
      }
      const c = t % (IN_S + OUT_S);
      const inhale = c < IN_S;
      const k = inhale ? c / IN_S : 1 - (c - IN_S) / OUT_S;
      const eased = 0.5 - Math.cos(Math.PI * k) / 2;
      ringRef.current?.setAttribute("r", String(38 + eased * 52));
      const next = inhale ? "Breathe in" : "Breathe out";
      if (next !== lastLabel) {
        lastLabel = next;
        setLabel(next);
      }
      const pose = poseRef.current;
      if (pose) {
        seen++;
        if ((inhale && pose.extended >= 3) || (!inhale && pose.extended <= 1)) matched++;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, poseRef]);

  return (
    <div className="grid h-full min-h-[360px] place-items-center rounded-panel border border-line bg-space p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <svg viewBox="0 0 200 200" className="h-64 w-64" aria-hidden="true">
          <circle cx="100" cy="100" r="92" fill="none" stroke={COLORS.line} strokeWidth="1" />
          <circle ref={ringRef} cx="100" cy="100" r="38" fill={COLORS.tue} fillOpacity={0.14} stroke={COLORS.tue} strokeWidth="2" />
        </svg>
        <p className="font-cond text-xl font-bold text-ink" aria-live="polite">
          {running ? label : done ? "Round complete" : "Paced breathing"}
        </p>
        <p className="max-w-sm text-sm text-ink-2">
          {running
            ? handOn
              ? "Open your hand as you breathe in, close it as you breathe out."
              : "Follow the ring: in for 4 seconds, out for 6."
            : done
              ? done.sync !== null
                ? `Your hand followed the ring ${done.sync}% of the time.`
                : "Six slow breaths, one minute."
              : `Six slow breaths, one minute. In for ${IN_S} seconds, out for ${OUT_S}. A relaxation exercise, not a treatment.`}
        </p>
        {!running ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDone(null);
              setRunning(true);
            }}
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            {done ? "Another round" : "Start"}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setRunning(false)}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
