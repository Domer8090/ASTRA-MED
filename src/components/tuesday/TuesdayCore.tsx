import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/useMediaQuery";

export type TuesdayCoreState = "idle" | "listening" | "thinking" | "speaking";

export interface CoreReadout {
  label: string;
  value: string;
}

interface TuesdayCoreProps {
  state: TuesdayCoreState;
  /** Fallback input level, 0 to 1, used when no live analyser is available. */
  level: number;
  /** Live microphone analyser, when local capture runs. */
  getAnalyser?: () => AnalyserNode | null;
  /** Readiness score as a fraction, drawn as the inner lilac arc. */
  readiness?: number;
  /** Checklist completion as a fraction, drawn as the inner cyan arc. */
  checklist?: number;
  /** Up to four short readouts placed around the rings. */
  readouts?: readonly CoreReadout[];
  /** Word under the name in the centre disc. */
  stateWord?: string;
  /** Largest size in CSS pixels; the HUD shrinks to fit its container. */
  maxSize?: number;
}

interface Palette {
  ink: string;
  ink2: string;
  muted: string;
  cyan: string;
  cyanDeep: string;
  blue: string;
  tue: string;
  tueDeep: string;
  line: string;
  space: string;
}

const TAU = Math.PI * 2;
const SPOKES = 56;
const DOTS_PER_SPOKE = 7;

function readPalette(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ink: v("--c-ink"),
    ink2: v("--c-ink-2"),
    muted: v("--c-ink-3"),
    cyan: v("--c-cyan"),
    cyanDeep: v("--c-cyan-deep"),
    blue: v("--c-blue"),
    tue: v("--c-tue"),
    tueDeep: v("--c-tue-deep"),
    line: v("--c-line"),
    space: v("--c-space"),
  };
}

/** Deterministic pseudo-random sequence so the ring layout is the same every frame and every visit. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

interface Arc {
  start: number;
  length: number;
  width: number;
  bright: boolean;
}

/** A ring of irregular arc segments, like an instrument bezel. */
function makeArcs(seed: number, count: number, minLen: number, maxLen: number): Arc[] {
  const rnd = seeded(seed);
  const arcs: Arc[] = [];
  let a = 0;
  for (let i = 0; i < count && a < TAU; i++) {
    const length = minLen + rnd() * (maxLen - minLen);
    arcs.push({ start: a, length, width: rnd() > 0.75 ? 2.2 : 1, bright: rnd() > 0.7 });
    a += length + 0.04 + rnd() * 0.25;
  }
  return arcs;
}

const OUTER_ARCS = makeArcs(7, 14, 0.15, 0.9);
const MID_ARCS = makeArcs(23, 18, 0.05, 0.5);
const BEZEL_ARCS = makeArcs(91, 6, 0.4, 1.1);

/** Cheap smooth noise: a sum of sines with unrelated periods. */
function wobble(t: number, seed: number): number {
  return (Math.sin(t * 1.7 + seed) + Math.sin(t * 2.9 + seed * 2.1) * 0.6 + Math.sin(t * 4.3 + seed * 0.7) * 0.3) / 1.9;
}

function targetEnergy(state: TuesdayCoreState, t: number, micLevel: number): number {
  switch (state) {
    case "listening":
      return Math.min(1, 0.3 + micLevel);
    case "speaking":
      return 0.25 + 0.6 * Math.abs(Math.sin(t * 8.5)) * (0.55 + 0.45 * Math.abs(Math.sin(t * 1.9)));
    case "thinking":
      return 0.35 + 0.1 * Math.sin(t * 3);
    default:
      return 0.38 + 0.06 * Math.sin(t * 1.1);
  }
}

interface Frame {
  t: number;
  spin: number;
  energy: number;
  state: TuesdayCoreState;
  bins: Uint8Array | null;
  readiness: number;
  checklist: number;
  readouts: readonly CoreReadout[];
  stateWord: string;
}

function ring(ctx: CanvasRenderingContext2D, c: number, r: number, color: string, alpha: number, width: number) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, TAU);
  ctx.stroke();
}

function arcsAt(ctx: CanvasRenderingContext2D, c: number, r: number, arcs: readonly Arc[], rot: number, p: Palette, scale: number, alpha: number) {
  for (const a of arcs) {
    ctx.globalAlpha = a.bright ? alpha : alpha * 0.6;
    ctx.strokeStyle = a.bright ? p.ink : p.blue;
    ctx.lineWidth = a.width * scale;
    ctx.beginPath();
    ctx.arc(c, c, r, a.start + rot, a.start + rot + a.length);
    ctx.stroke();
  }
}

function ticks(ctx: CanvasRenderingContext2D, c: number, r: number, count: number, len: number, rot: number, color: string, alpha: number, majorEvery = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + rot;
    const major = majorEvery > 0 && i % majorEvery === 0;
    const l = major ? len * 2 : len;
    ctx.globalAlpha = major ? alpha : alpha * 0.55;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    ctx.lineTo(c + Math.cos(a) * (r - l), c + Math.sin(a) * (r - l));
    ctx.stroke();
  }
}

function draw(ctx: CanvasRenderingContext2D, S: number, f: Frame, p: Palette) {
  const c = S / 2;
  const R = S / 2;
  const k = S / 360; // stroke scale against the design size
  const live = f.state === "listening";
  const accent = live ? p.cyan : p.blue;
  ctx.clearRect(0, 0, S, S);
  ctx.lineCap = "butt";

  // Faint backdrop disc and grid, so the HUD reads as one instrument.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = p.space;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.99, 0, TAU);
  ctx.fill();
  ring(ctx, c, R * 0.985, p.line, 0.9, 1);

  // 1. Outer bezel: irregular bright arcs and a fine tick scale, turning slowly.
  arcsAt(ctx, c, R * 0.95, OUTER_ARCS, f.spin * 0.05, p, k * 1.2, 0.85);
  ticks(ctx, c, R * 0.905, 180, 3 * k, -f.spin * 0.03, p.ink2, 0.5, 15);

  // 2. Middle bezel turning the other way, plus heavy brackets.
  arcsAt(ctx, c, R * 0.84, MID_ARCS, -f.spin * 0.09, p, k, 0.7);
  ctx.lineCap = "round";
  for (const a of BEZEL_ARCS) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = p.blue;
    ctx.lineWidth = 7 * k;
    ctx.beginPath();
    ctx.arc(c, c, R * 0.775, a.start + f.spin * 0.12, a.start + f.spin * 0.12 + a.length);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // 3. Radial dot equaliser: live spectrum while listening, speech envelope while speaking.
  const r0 = R * 0.5;
  const step = R * 0.034;
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * TAU - Math.PI / 2;
    let amp: number;
    if (f.bins && live) {
      const mirrored = i < SPOKES / 2 ? i : SPOKES - 1 - i;
      amp = (f.bins[2 + mirrored] ?? 0) / 255;
    } else {
      amp = f.energy * (0.45 + 0.55 * Math.max(0, wobble(f.t * (f.state === "speaking" ? 2.6 : 0.9), i * 0.77)));
    }
    const lit = Math.round(Math.min(1, amp) * DOTS_PER_SPOKE);
    for (let d = 0; d < DOTS_PER_SPOKE; d++) {
      const rr = r0 + d * step;
      const on = d < lit;
      ctx.globalAlpha = on ? 1 - d * 0.06 : 0.1;
      ctx.fillStyle = on ? (d > 3 ? p.cyan : p.blue) : p.ink2;
      ctx.shadowColor = p.blue;
      ctx.shadowBlur = on ? 6 * k : 0;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, (on ? 3.4 : 1.6) * k, 0, TAU);
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;

  // 4. Hatched band: slanted bars between two thin rings.
  const hi = R * 0.475;
  const lo = R * 0.415;
  ring(ctx, c, hi, accent, 0.8, 1.2 * k);
  ring(ctx, c, lo, accent, 0.6, 1 * k);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.6 * k;
  const hatchRot = f.spin * 0.6;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU + hatchRot;
    ctx.globalAlpha = 0.55 + 0.4 * f.energy;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * lo, c + Math.sin(a) * lo);
    ctx.lineTo(c + Math.cos(a + 0.05) * hi, c + Math.sin(a + 0.05) * hi);
    ctx.stroke();
  }

  // 5. Inner tick scale.
  ticks(ctx, c, R * 0.4, 120, 3 * k, f.spin * 0.2, p.ink2, 0.55, 10);

  // 6. Data arcs: readiness (lilac) and checklist (cyan), each over a faint track.
  const dataArc = (r: number, frac: number, color: string, width: number) => {
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(c, c, r, -Math.PI * 0.75, Math.PI * 0.25);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(c, c, r, -Math.PI * 0.75, -Math.PI * 0.75 + Math.PI * Math.max(0, Math.min(1, frac)));
    ctx.stroke();
    ctx.lineCap = "butt";
  };
  dataArc(R * 0.35, f.readiness, p.tue, 5 * k);
  dataArc(R * 0.315, f.checklist, p.cyan, 3 * k);

  // 7. Centre disc with a pulsing rim.
  const rCore = R * (0.25 + 0.015 * f.energy);
  ctx.shadowColor = p.cyan;
  ctx.shadowBlur = (14 + 16 * f.energy) * k;
  ctx.globalAlpha = 0.5 + 0.25 * f.energy;
  ctx.fillStyle = f.state === "thinking" ? p.tueDeep : p.cyanDeep;
  ctx.beginPath();
  ctx.arc(c, c, rCore, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = p.cyan;
  ctx.beginPath();
  ctx.arc(c, c, rCore * 0.86, 0, TAU);
  ctx.fill();
  ring(ctx, c, rCore, p.cyan, 1, 2 * k);
  ring(ctx, c, rCore * 0.86, accent, 0.35, 1 * k);
  // Thinking: a bright sweep orbits the disc.
  if (f.state === "thinking") {
    ctx.lineCap = "round";
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.tue;
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.arc(c, c, rCore * 1.08, f.spin * 2.2, f.spin * 2.2 + 0.9);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  // Name and state, letter-spaced like an instrument label.
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(22 * k)}px "Barlow Semi Condensed", "Barlow", sans-serif`;
  ctx.letterSpacing = `${Math.round(5 * k)}px`;
  ctx.fillText("TUESDAY", c + 2.5 * k, c - 6 * k);
  ctx.font = `500 ${Math.round(9.5 * k)}px "IBM Plex Mono", monospace`;
  ctx.letterSpacing = `${Math.round(2 * k)}px`;
  ctx.fillStyle = p.ink;
  ctx.fillText(f.stateWord, c + k, c + 14 * k);
  ctx.letterSpacing = "0px";

  // 8. Readouts at four positions around the rings.
  const spots = [-0.75, -0.25, 0.25, 0.75].map((x) => x * Math.PI);
  ctx.font = `500 ${Math.round(9 * k)}px "IBM Plex Mono", monospace`;
  f.readouts.slice(0, 4).forEach((r, i) => {
    const a = spots[i]! - Math.PI / 2;
    const x = c + Math.cos(a) * R * 0.66;
    const y = c + Math.sin(a) * R * 0.66;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = p.ink2;
    ctx.fillText(r.label, x, y - 6 * k);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.ink;
    ctx.fillText(r.value, x, y + 6 * k);
  });
  ctx.globalAlpha = 1;
}

const SPIN_SPEED: Record<TuesdayCoreState, number> = { idle: 0.35, listening: 0.75, thinking: 2.4, speaking: 1.1 };

/**
 * Tuesday's HUD. Decorative: state and every value on it are also given as
 * text nearby. Canvas only, driven by requestAnimationFrame; with reduced
 * motion it draws one still frame whenever its inputs change.
 */
export function TuesdayCore({ state, level, getAnalyser, readiness = 0, checklist = 0, readouts = [], stateWord = "", maxSize = 360 }: TuesdayCoreProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [size, setSize] = useState(maxSize);

  const input = useRef({ state, level, getAnalyser, readiness, checklist, readouts, stateWord });
  input.current = { state, level, getAnalyser, readiness, checklist, readouts, stateWord };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry?.contentRect.width ?? maxSize);
      setSize(Math.max(160, Math.min(maxSize, w)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [maxSize]);

  const stillKey = reducedMotion ? `${state}|${readiness}|${checklist}|${stateWord}|${readouts.map((r) => r.value).join(",")}` : "";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = readPalette(canvas);

    const frameFor = (t: number, spin: number, energy: number, bins: Uint8Array | null): Frame => ({
      t,
      spin,
      energy,
      bins,
      state: input.current.state,
      readiness: input.current.readiness,
      checklist: input.current.checklist,
      readouts: input.current.readouts,
      stateWord: input.current.stateWord,
    });

    if (reducedMotion) {
      const st = input.current.state;
      draw(ctx, size, frameFor(0, 0.6, targetEnergy(st, 0, 0.4), null), palette);
      return;
    }

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let spin = 0;
    let speed = SPIN_SPEED[input.current.state];
    let energy = 0.1;
    let bins: Uint8Array<ArrayBuffer> | null = null;
    let wave: Uint8Array<ArrayBuffer> | null = null;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const current = input.current.state;

      let mic = input.current.level;
      let liveBins: Uint8Array | null = null;
      const analyser = current === "listening" ? input.current.getAnalyser?.() ?? null : null;
      if (analyser) {
        if (!bins || bins.length !== analyser.frequencyBinCount) bins = new Uint8Array(analyser.frequencyBinCount);
        if (!wave || wave.length !== analyser.fftSize) wave = new Uint8Array(analyser.fftSize);
        analyser.getByteFrequencyData(bins);
        analyser.getByteTimeDomainData(wave);
        let sum = 0;
        for (const s of wave) sum += ((s - 128) / 128) ** 2;
        mic = Math.min(1, Math.sqrt(sum / wave.length) * 4);
        liveBins = bins;
      }

      energy += (targetEnergy(current, t, mic) - energy) * Math.min(1, dt * 9);
      speed += (SPIN_SPEED[current] - speed) * Math.min(1, dt * 3);
      spin += speed * dt;
      draw(ctx, size, frameFor(t, spin, energy, liveBins), palette);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, reducedMotion, stillKey]);

  return (
    <div ref={wrapRef} className="flex w-full justify-center" style={{ maxWidth: maxSize }}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ width: size, height: size }} />
    </div>
  );
}
