import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { HandPose } from "../../engine/gestures";
import { COLORS } from "../../config/theme";
import { mulberry32 } from "../../utils/prng";

const ROUND_SECONDS = 60;

interface Pod {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: "pod" | "star";
  born: number;
}

interface Props {
  poseRef: MutableRefObject<HandPose | null>;
  best: number;
  onFinish: (score: number, seconds: number) => void;
}

/**
 * A calm one-minute catching game. Move a finger (or the pointer) over a supply
 * pod and pinch (or click or tap) to collect it. Gold stars are worth more.
 * Nothing is lost by missing: there is no fail state.
 */
export default function OrbitCatch({ poseRef, best, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND_SECONDS);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rand = mulberry32(Date.now() >>> 0);
    const pods: Pod[] = [];
    const sparks: { x: number; y: number; t: number; text: string }[] = [];
    let pointer: { x: number; y: number } | null = null;
    let clicked = false;
    let wasPinch = false;
    let points = 0;
    let streak = 0;
    const start = performance.now();
    let lastSpawn = 0;
    let raf = 0;
    let lastLeft = ROUND_SECONDS;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      pointer = toLocal(e);
    };
    const onDown = (e: PointerEvent) => {
      pointer = toLocal(e);
      clicked = true;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    const collectAt = (x: number, y: number, now: number) => {
      for (let i = pods.length - 1; i >= 0; i--) {
        const p = pods[i]!;
        if (Math.hypot(p.x - x, p.y - y) <= p.r + 18) {
          streak++;
          const gain = (p.kind === "star" ? 25 : 10) + Math.min(streak - 1, 5) * 2;
          points += gain;
          sparks.push({ x: p.x, y: p.y, t: now, text: `+${gain}` });
          pods.splice(i, 1);
          setScore(points);
          return;
        }
      }
      streak = 0;
    };

    const tick = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - elapsed));
      if (remaining !== lastLeft) {
        lastLeft = remaining;
        setLeft(remaining);
      }
      if (elapsed >= ROUND_SECONDS) {
        setPhase("done");
        onFinishRef.current(points, ROUND_SECONDS);
        return;
      }
      if (now - lastSpawn > 900 && pods.length < 7) {
        lastSpawn = now;
        const edge = Math.floor(rand() * 4);
        const speed = 22 + rand() * 30 + elapsed * 0.6;
        const angle = rand() * Math.PI * 2;
        const x = edge === 0 ? -20 : edge === 1 ? w + 20 : rand() * w;
        const y = edge === 2 ? -20 : edge === 3 ? h + 20 : rand() * h;
        const tx = w * (0.25 + rand() * 0.5) - x;
        const ty = h * (0.25 + rand() * 0.5) - y;
        const len = Math.hypot(tx, ty) || 1;
        pods.push({ x, y, vx: (tx / len) * speed + Math.cos(angle) * 4, vy: (ty / len) * speed + Math.sin(angle) * 4, r: 14 + rand() * 8, kind: rand() < 0.15 ? "star" : "pod", born: now });
      }

      const pose = poseRef.current;
      const hand = pose ? { x: pose.cursor.x * w, y: pose.cursor.y * h } : null;
      const cursor = hand ?? pointer;
      if (pose?.pinch && !wasPinch && hand) collectAt(hand.x, hand.y, now);
      wasPinch = Boolean(pose?.pinch);
      if (clicked && pointer) collectAt(pointer.x, pointer.y, now);
      clicked = false;

      ctx.clearRect(0, 0, w, h);
      for (let i = pods.length - 1; i >= 0; i--) {
        const p = pods[i]!;
        p.x += p.vx / 60;
        p.y += p.vy / 60;
        if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60 || now - p.born > 14_000) {
          pods.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.kind === "star" ? COLORS.gold : COLORS.tue;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = COLORS.space;
        ctx.beginPath();
        ctx.moveTo(p.x - p.r * 0.5, p.y);
        ctx.lineTo(p.x + p.r * 0.5, p.y);
        ctx.stroke();
      }
      ctx.font = "600 14px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        const age = (now - s.t) / 700;
        if (age >= 1) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - age;
        ctx.fillStyle = COLORS.ink;
        ctx.fillText(s.text, s.x, s.y - age * 24);
        ctx.globalAlpha = 1;
      }
      if (cursor) {
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, pose?.pinch ? 10 : 16, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, [phase, poseRef]);

  const startRound = () => {
    setScore(0);
    setLeft(ROUND_SECONDS);
    setPhase("playing");
  };

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-panel border border-line bg-space">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Orbit Catch play area" />
      <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-center justify-between">
        <p className="num text-md text-ink" aria-live="off">
          {score} <span className="text-xs text-ink-3">points</span>
        </p>
        <p className="num text-md text-ink">{left} s</p>
      </div>
      {phase !== "playing" ? (
        <div className="absolute inset-0 grid place-items-center bg-space/70 p-4">
          <div className="max-w-sm text-center">
            <h3 className="font-cond text-xl font-bold text-ink">{phase === "done" ? `${score} points` : "Orbit Catch"}</h3>
            <p className="mt-2 text-sm text-ink-2" aria-live="polite">
              {phase === "done"
                ? score > best
                  ? "New best score."
                  : `Best so far: ${best}.`
                : "Supply pods drift past for one minute. Point at one and pinch to collect it, or click or tap. Gold stars are worth more. There is no way to lose."}
            </p>
            <button type="button" className="btn btn-primary mt-4" onClick={startRound}>
              {phase === "done" ? <RotateCcw aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
              {phase === "done" ? "Play again" : "Start"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
