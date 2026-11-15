import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Hand, Play } from "lucide-react";
import { COLORS } from "../../config/theme";
import type { HandPose } from "../../engine/gestures";
import type { HandStatus } from "../../hooks/useHandTracking";

const IN_S = 4;
const OUT_S = 6;
const CYCLES = 6;
const TOTAL = (IN_S + OUT_S) * CYCLES;
/** Ring radius at empty and full lungs, in SVG units. */
const R_MIN = 40;
const R_MAX = 88;
/** How close (0–1) the hand's openness must be to the ring to count as following it. */
const FOLLOW_TOLERANCE = 0.3;

interface Props {
  posesRef: MutableRefObject<HandPose[]>;
  /** Hand control is switched on (the camera may still be looking for a hand). */
  handOn: boolean;
  handStatus: HandStatus;
  onFinish: (seconds: number, syncPercent: number | null) => void;
}

/** Breathing curve: slow start and end of each breath, like real lungs, not a linear pump. */
function lungs(t: number): { inhale: boolean; fill: number; secondsLeft: number } {
  const c = t % (IN_S + OUT_S);
  const inhale = c < IN_S;
  const k = inhale ? c / IN_S : (c - IN_S) / OUT_S;
  const eased = 0.5 - Math.cos(Math.PI * k) / 2;
  return { inhale, fill: inhale ? eased : 1 - eased, secondsLeft: Math.ceil(inhale ? IN_S - c : IN_S + OUT_S - c) };
}

/**
 * One minute of paced breathing (in 4 s, out 6 s). With hand control on, open
 * the hand as you breathe in and close it as you breathe out: a second, dashed
 * ring shows your hand live, so you can see it is being read, and Tuesday
 * reports how closely it followed. A relaxation exercise, not a treatment.
 */
export default function BreatheRing({ posesRef, handOn, handStatus, onFinish }: Props) {
  const ringRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const handRingRef = useRef<SVGCircleElement>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<{ inhale: boolean; secondsLeft: number }>({ inhale: true, secondsLeft: IN_S });
  const [handFollowing, setHandFollowing] = useState<boolean | null>(null);
  const [done, setDone] = useState<{ sync: number | null } | null>(null);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!running) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    let matched = 0;
    let seen = 0;
    let lastKey = "";
    let lastFollow: boolean | null = null;
    let handOpen: number | null = null;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (t >= TOTAL) {
        const sync = seen > 60 ? Math.round((matched / seen) * 100) : null;
        setRunning(false);
        setDone({ sync });
        setHandFollowing(null);
        onFinishRef.current(TOTAL, sync);
        return;
      }
      const { inhale, fill, secondsLeft } = lungs(t);
      // Reduced motion: the ring jumps between two sizes per phase instead of flowing.
      const shown = reduce ? (inhale ? 1 : 0) : fill;
      const r = R_MIN + shown * (R_MAX - R_MIN);
      ringRef.current?.setAttribute("r", String(r));
      glowRef.current?.setAttribute("r", String(r + 6));
      glowRef.current?.setAttribute("opacity", String(0.08 + shown * 0.22));
      const key = `${inhale}:${secondsLeft}`;
      if (key !== lastKey) {
        lastKey = key;
        setPhase({ inhale, secondsLeft });
      }

      const poses = posesRef.current;
      if (poses.length) {
        // Average openness of every hand in view, smoothed so a twitch doesn't flicker.
        const open = poses.reduce((sum, p) => sum + p.openness, 0) / poses.length;
        handOpen = handOpen === null ? open : handOpen + (open - handOpen) * 0.25;
        handRingRef.current?.setAttribute("r", String(R_MIN + handOpen * (R_MAX - R_MIN)));
        handRingRef.current?.setAttribute("opacity", "1");
        seen++;
        const following = Math.abs(handOpen - fill) < FOLLOW_TOLERANCE;
        if (following) matched++;
        if (following !== lastFollow) {
          lastFollow = following;
          setHandFollowing(following);
        }
      } else {
        handOpen = null;
        handRingRef.current?.setAttribute("opacity", "0");
        if (lastFollow !== null) {
          lastFollow = null;
          setHandFollowing(null);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, posesRef]);

  const handLine = !handOn
    ? null
    : handStatus === "starting"
      ? "Starting the camera…"
      : handStatus === "error"
        ? "Hand control is unavailable. Follow the ring with your breath."
        : handFollowing === null
          ? "No hand seen. Hold one hand up in front of the camera, palm facing it."
          : handFollowing
            ? "Your hand is following the ring."
            : phase.inhale
              ? "Hand seen. Open it slowly as you breathe in."
              : "Hand seen. Close it slowly as you breathe out.";

  return (
    <div className="grid h-full min-h-[360px] place-items-center rounded-panel border border-line bg-space p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <svg viewBox="0 0 200 200" className="h-64 w-64" aria-hidden="true">
          <circle cx="100" cy="100" r="94" fill="none" stroke={COLORS.line} strokeWidth="1" />
          <circle cx="100" cy="100" r={R_MIN} fill="none" stroke={COLORS.line} strokeWidth="1" strokeDasharray="2 4" />
          <circle ref={glowRef} cx="100" cy="100" r={R_MIN + 6} fill={COLORS.tue} opacity={0.08} />
          <circle ref={ringRef} cx="100" cy="100" r={R_MIN} fill={COLORS.tue} fillOpacity={0.16} stroke={COLORS.tue} strokeWidth="2.5" />
          <circle ref={handRingRef} cx="100" cy="100" r={R_MIN} fill="none" stroke={COLORS.cyan} strokeWidth="2" strokeDasharray="6 5" opacity={0} />
          {running ? (
            <text x="100" y="112" textAnchor="middle" fill={COLORS.ink} fontSize="34" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
              {phase.secondsLeft}
            </text>
          ) : null}
        </svg>
        <p className="font-cond text-2xl font-semibold text-ink" aria-live="polite">
          {running ? (phase.inhale ? "Breathe in" : "Breathe out") : done ? "Round complete" : "Paced breathing"}
        </p>
        <p className="max-w-sm text-base text-ink-2">
          {running
            ? handOn
              ? "Open your hand as you breathe in, close it as you breathe out. The dashed ring is your hand."
              : "Follow the ring: in for 4 seconds, out for 6."
            : done
              ? done.sync !== null
                ? `Your hand followed the ring ${done.sync}% of the time.`
                : "Six slow breaths, one minute."
              : `Six slow breaths, one minute. In for ${IN_S} seconds, out for ${OUT_S}. A relaxation exercise, not a treatment.`}
        </p>
        {running && handLine ? (
          <p role="status" className={`flex items-center gap-2 text-sm ${handFollowing ? "text-cyan" : "text-ink-2"}`}>
            <Hand aria-hidden="true" className="h-4 w-4" />
            {handLine}
          </p>
        ) : null}
        {!running ? (
          <button
            type="button"
            className="btn btn-primary min-h-[44px]"
            onClick={() => {
              setDone(null);
              setPhase({ inhale: true, secondsLeft: IN_S });
              setRunning(true);
            }}
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            {done ? "Another round" : "Start"}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost min-h-[44px]" onClick={() => setRunning(false)}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
