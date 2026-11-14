/** Deterministic pseudo-random helpers so the synthetic mission is identical on every load. */

/** mulberry32: small, fast, good enough for demo data. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample (Box–Muller) from a uniform source. */
export function gaussian(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** First-order autoregressive noise: smooth day-to-day variation instead of white noise. */
export function ar1Series(rand: () => number, length: number, phi: number, sigma: number): number[] {
  const out: number[] = [];
  const innovation = sigma * Math.sqrt(1 - phi * phi);
  let x = gaussian(rand) * sigma;
  for (let i = 0; i < length; i++) {
    x = phi * x + gaussian(rand) * innovation;
    out.push(x);
  }
  return out;
}

/** Hash a string to a 32-bit seed (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function roundTo(value: number, step: number): number {
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Smooth 0→1 ramp between edge0 and edge1. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
