/**
 * Reads a hand pose from 21 MediaPipe hand landmarks (normalised image
 * coordinates). Pure, so the gesture rules are testable without a camera.
 * Landmark indices: 0 wrist, 4 thumb tip, 5/9/13/17 finger bases,
 * 8/12/16/20 finger tips, 6/10/14/18 middle joints.
 */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface HandPose {
  /** Index fingertip in screen space, 0–1, mirrored so moving right moves right. */
  cursor: { x: number; y: number };
  /** Thumb and index tips touching. Uses hysteresis through `wasPinching`. */
  pinch: boolean;
  /** Fingers extended, 0–4 (thumb excluded). */
  extended: number;
  open: boolean;
  fist: boolean;
  /** Wrist to middle-finger base, in image widths. Grows as the hand nears the camera. */
  palmSize: number;
}

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

export const PINCH_ON = 0.32;
export const PINCH_OFF = 0.45;

export function readHandPose(lm: readonly Landmark[], wasPinching = false): HandPose | null {
  if (lm.length < 21) return null;
  const wrist = lm[0]!;
  const palmSize = dist(wrist, lm[9]!);
  if (palmSize <= 0) return null;
  const pinchRatio = dist(lm[4]!, lm[8]!) / palmSize;
  const pinch = wasPinching ? pinchRatio < PINCH_OFF : pinchRatio < PINCH_ON;
  let extended = 0;
  for (const [tip, joint] of [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ] as const) {
    // A finger is extended when its tip is further from the wrist than its middle joint.
    if (dist(lm[tip]!, wrist) > dist(lm[joint]!, wrist) * 1.1) extended++;
  }
  const tip = lm[8]!;
  return {
    cursor: { x: 1 - tip.x, y: tip.y },
    pinch,
    extended,
    open: extended >= 4 && !pinch,
    fist: extended === 0,
    palmSize,
  };
}

/** Exponential smoothing for a jittery cursor. `alpha` near 1 follows quickly. */
export function smoothPoint(prev: { x: number; y: number } | null, next: { x: number; y: number }, alpha = 0.45): { x: number; y: number } {
  if (!prev) return next;
  return { x: prev.x + (next.x - prev.x) * alpha, y: prev.y + (next.y - prev.y) * alpha };
}
