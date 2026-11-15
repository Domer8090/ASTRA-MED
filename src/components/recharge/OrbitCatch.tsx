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
  spin: number;
}

interface Burst {
  x: number;
  y: number;
  t: number;
  color: string;
  parts: { vx: number; vy: number }[];
}

/** A supply capsule: shaded body, a turning docking ring and a blinking beacon. */
function drawPod(ctx: CanvasRenderingContext2D, p: Pod, now: number, locked: boolean) {
  const age = (now - p.born) / 1000;
  const g = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.4, p.r * 0.1, p.x, p.y, p.r);
  g.addColorStop(0, "#efeaff");
  g.addColorStop(0.45, COLORS.tue);
  g.addColorStop(1, "#4b3f86");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.spin + age * 0.8);
  ctx.strokeStyle = "rgba(232,240,250,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.r * 1.35, p.r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (Math.sin(age * 5 + p.spin) > 0.3) {
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.arc(p.x + p.r * 0.45, p.y - p.r * 0.45, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (locked) drawLock(ctx, p, now);
}

/** A gold star, worth more, turning slowly. */
function drawStar(ctx: CanvasRenderingContext2D, p: Pod, now: number, locked: boolean) {
  const turn = p.spin + ((now - p.born) / 1000) * 1.2;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(turn);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? p.r * 1.15 : p.r * 0.5;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, p.r * 1.15);
  g.addColorStop(0, "#fff6d6");
  g.addColorStop(1, COLORS.gold);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  if (locked) drawLock(ctx, p, now);
}

/** Corner brackets around the object under the cursor, so you know a pinch or click will catch it. */
function drawLock(ctx: CanvasRenderingContext2D, p: Pod, now: number) {
  const r = p.r + 9 + Math.sin(now / 120) * 1.5;
  const k = r * 0.45;
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 2.5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(p.x + sx * r, p.y + sy * (r - k));
    ctx.lineTo(p.x + sx * r, p.y + sy * r);
    ctx.lineTo(p.x + sx * (r - k), p.y + sy * r);
    ctx.stroke();
  }
}

interface Props {
  posesRef: MutableRefObject<HandPose[]>;
  best: number;
  onFinish: (score: number, seconds: number) => void;
}

/**
 * A calm one-minute catching game. Move a finger (or the pointer) over a supply
 * pod and pinch (or click or tap) to collect it. Gold stars are worth more.
 * Nothing is lost by missing: there is no fail state.
 */
export default function OrbitCatch({ posesRef, best, onFinish }: Props) {
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
    const bursts: Burst[] = [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A fixed starfield in three depths; nearer stars drift faster.
    const stars = Array.from({ length: 160 }, () => ({ x: rand(), y: rand(), z: 1 + Math.floor(rand() * 3), tw: rand() * 6 }));
    let pointer: { x: number; y: number } | null = null;
    /** Keyboard cursor: arrow keys move it, Space or Enter catches. */
    let keyCursor: { x: number; y: number } | null = null;
    const held = new Set<string>();
    let clicked = false;
    let wasPinch: boolean[] = [];
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        held.add(e.key);
        keyCursor ??= { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        keyCursor ??= { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
        pointer = { ...keyCursor };
        clicked = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => held.delete(e.key);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("keyup", onKeyUp);
    canvas.focus({ preventScroll: true });

    const collectAt = (x: number, y: number, now: number) => {
      for (let i = pods.length - 1; i >= 0; i--) {
        const p = pods[i]!;
        if (Math.hypot(p.x - x, p.y - y) <= p.r + 18) {
          streak++;
          const gain = (p.kind === "star" ? 25 : 10) + Math.min(streak - 1, 5) * 2;
          points += gain;
          sparks.push({ x: p.x, y: p.y, t: now, text: streak > 1 ? `+${gain}  ×${streak}` : `+${gain}` });
          if (!reduce) bursts.push({ x: p.x, y: p.y, t: now, color: p.kind === "star" ? COLORS.gold : COLORS.tue, parts: Array.from({ length: 14 }, (_, k) => ({ vx: Math.cos((k / 14) * Math.PI * 2) * (60 + rand() * 80), vy: Math.sin((k / 14) * Math.PI * 2) * (60 + rand() * 80) })) });
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
        pods.push({ x, y, vx: (tx / len) * speed + Math.cos(angle) * 4, vy: (ty / len) * speed + Math.sin(angle) * 4, r: 16 + rand() * 8, kind: rand() < 0.15 ? "star" : "pod", born: now, spin: rand() * Math.PI * 2 });
      }

      const poses = posesRef.current;
      const hands = poses.map((p) => ({ x: p.cursor.x * w, y: p.cursor.y * h, pinch: p.pinch }));
      hands.forEach((hd, i) => {
        if (hd.pinch && !wasPinch[i]) collectAt(hd.x, hd.y, now);
      });
      wasPinch = hands.map((hd) => hd.pinch);
      if (keyCursor && held.size) {
        const step = 6;
        if (held.has("ArrowLeft")) keyCursor.x -= step;
        if (held.has("ArrowRight")) keyCursor.x += step;
        if (held.has("ArrowUp")) keyCursor.y -= step;
        if (held.has("ArrowDown")) keyCursor.y += step;
        keyCursor.x = Math.max(0, Math.min(w, keyCursor.x));
        keyCursor.y = Math.max(0, Math.min(h, keyCursor.y));
      }
      const cursors = hands.length ? hands : keyCursor ? [{ ...keyCursor, pinch: false }] : pointer ? [{ ...pointer, pinch: false }] : [];
      if (clicked && pointer) collectAt(pointer.x, pointer.y, now);
      clicked = false;

      // Space: deep background, drifting stars, and Mars low on the horizon.
      ctx.fillStyle = COLORS.space;
      ctx.fillRect(0, 0, w, h);
      const neb = ctx.createRadialGradient(w * 0.2, h * 0.25, 0, w * 0.2, h * 0.25, Math.max(w, h) * 0.6);
      neb.addColorStop(0, "rgba(76,141,255,0.10)");
      neb.addColorStop(1, "rgba(76,141,255,0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);
      for (const st of stars) {
        const drift = reduce ? 0 : elapsed * 4 * st.z;
        const sx = (((st.x * w - drift) % w) + w) % w;
        ctx.globalAlpha = reduce ? 0.6 : 0.35 + 0.35 * (1 + Math.sin(elapsed * 1.5 + st.tw)) / 2 + st.z * 0.08;
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(sx, st.y * h, st.z * 0.8, st.z * 0.8);
      }
      ctx.globalAlpha = 1;
      const pr = Math.max(w, h) * 0.9;
      const planet = ctx.createRadialGradient(w * 0.7, h + pr * 0.82, pr * 0.2, w * 0.7, h + pr * 0.82, pr);
      planet.addColorStop(0, "#a8431a");
      planet.addColorStop(0.92, "#6b2a12");
      planet.addColorStop(1, "rgba(193,68,14,0)");
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(w * 0.7, h + pr * 0.82, pr, 0, Math.PI * 2);
      ctx.fill();

      // Time left, as a thin bar along the top; amber in the last ten seconds.
      const frac = Math.max(0, 1 - elapsed / ROUND_SECONDS);
      ctx.fillStyle = "rgba(232,240,250,0.08)";
      ctx.fillRect(0, 0, w, 4);
      ctx.fillStyle = remaining <= 10 ? COLORS.caution : COLORS.cyan;
      ctx.fillRect(0, 0, w * frac, 4);

      for (let i = pods.length - 1; i >= 0; i--) {
        const p = pods[i]!;
        p.x += p.vx / 60;
        p.y += p.vy / 60;
        if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60 || now - p.born > 14_000) {
          pods.splice(i, 1);
          continue;
        }
        const locked = cursors.some((c) => Math.hypot(p.x - c.x, p.y - c.y) <= p.r + 18);
        if (p.kind === "star") drawStar(ctx, p, now, locked);
        else drawPod(ctx, p, now, locked);
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]!;
        const age = (now - b.t) / 600;
        if (age >= 1) {
          bursts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 10 + age * 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = b.color;
        for (const q of b.parts) ctx.fillRect(b.x + q.vx * age * 0.6 - 2, b.y + q.vy * age * 0.6 - 2, 4, 4);
        ctx.globalAlpha = 1;
      }
      ctx.font = "600 18px 'IBM Plex Mono', monospace";
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
      cursors.forEach((c, i) => {
        const color = i === 0 ? COLORS.cyan : COLORS.tue;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.pinch ? 9 : 16, 0, Math.PI * 2);
        ctx.stroke();
        if (c.pinch) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Crosshair ticks.
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          ctx.beginPath();
          ctx.moveTo(c.x + dx * 20, c.y + dy * 20);
          ctx.lineTo(c.x + dx * 26, c.y + dy * 26);
          ctx.stroke();
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, posesRef]);

  const startRound = () => {
    setScore(0);
    setLeft(ROUND_SECONDS);
    setPhase("playing");
  };

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-panel border border-line bg-space">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan"
        aria-label="Orbit Catch play area. Move with the arrow keys and press Space or Enter to catch, or point and click, or pinch with hand control."
      />
      <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-center justify-between">
        <p className="num mt-1 text-xl font-semibold text-ink" aria-live="off">
          {score} <span className="text-sm text-ink-2">points</span>
        </p>
        <p className={`num mt-1 text-xl font-semibold ${left <= 10 ? "text-caution" : "text-ink"}`}>{left} s</p>
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
                : "Supply pods drift past for one minute. Point at one and pinch to collect it, click or tap it, or use the arrow keys and Space. Gold stars are worth more, and catching in a row adds a bonus. There is no way to lose."}
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
