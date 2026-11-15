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
  /**
   * Pointer in screen space, 0–1, mirrored so moving right moves right. The
   * midpoint of thumb tip and index tip: it stays put while pinching, so a pinch
   * lands where you were pointing instead of jumping.
   */
  cursor: { x: number; y: number };
  /** Thumb and index tips touching. Uses hysteresis through `wasPinching`. */
  pinch: boolean;
  /** Fingers extended, 0–4 (thumb excluded). */
  extended: number;
  open: boolean;
  fist: boolean;
  /** How open the hand is, 0 (fist) to 1 (fully open). Smooth, for breathing and gauges. */
  openness: number;
  /** Wrist to middle-finger base, in image widths. Grows as the hand nears the camera. */
  palmSize: number;
}

/** 3D distance when depth is available (MediaPipe gives z in image-width units), else 2D. */
const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

/** Pinch starts below this thumb–index gap (in palm lengths) and ends above PINCH_OFF. Forgiving, so a light touch counts. */
export const PINCH_ON = 0.38;
export const PINCH_OFF = 0.5;

export function readHandPose(lm: readonly Landmark[], wasPinching = false): HandPose | null {
  if (lm.length < 21) return null;
  const wrist = lm[0]!;
  const palmSize = dist(wrist, lm[9]!);
  if (palmSize <= 0) return null;
  const pinchRatio = dist(lm[4]!, lm[8]!) / palmSize;
  const pinch = wasPinching ? pinchRatio < PINCH_OFF : pinchRatio < PINCH_ON;
  let extended = 0;
  let reach = 0;
  for (const [tip, joint] of [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ] as const) {
    const tipReach = dist(lm[tip]!, wrist);
    // Extended: the tip is clearly past its middle joint and well beyond the palm.
    // Distances include depth, so a hand turned toward the camera still reads correctly.
    if (tipReach > dist(lm[joint]!, wrist) * 1.08 && tipReach > palmSize * 1.3) extended++;
    // Fingertip reach in palm lengths: about 0.9 curled, about 1.9 straight.
    reach += Math.min(1, Math.max(0, (tipReach / palmSize - 1) / 0.8));
  }
  const openness = reach / 4;
  const thumb = lm[4]!;
  const index = lm[8]!;
  return {
    cursor: { x: 1 - (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 },
    pinch,
    extended,
    open: extended >= 3 && !pinch,
    fist: extended === 0,
    openness,
    palmSize,
  };
}

/**
 * Adaptive smoothing for a jittery cursor: small movements are smoothed hard so
 * a resting hand holds still, fast movements follow almost at once so it never
 * feels laggy. Pass `alpha` for a fixed amount instead.
 */
export function smoothPoint(prev: { x: number; y: number } | null, next: { x: number; y: number }, alpha?: number): { x: number; y: number } {
  if (!prev) return next;
  const speed = Math.hypot(next.x - prev.x, next.y - prev.y);
  const a = alpha ?? Math.min(0.85, 0.2 + speed * 9);
  return { x: prev.x + (next.x - prev.x) * a, y: prev.y + (next.y - prev.y) * a };
}

/** Bones between the 21 hand landmarks, for drawing the hand skeleton. */
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

/** At or below this openness the hand is a fist: zoom in. */
export const FIST_OPENNESS = 0.2;
/** At or above this openness, all four fingers out and no pinch, the hand is open: zoom out. */
export const OPEN_OPENNESS = 0.8;

export type ZoomIntent = "in" | "out" | null;

/**
 * Earth zoom from the shape of the hand: a fist zooms in, an open hand zooms out,
 * anything in between (a relaxed hand, a pinch) does nothing. A fist is checked first,
 * because a closed hand can also read as a pinch.
 */
export function handZoomIntent(p: HandPose): ZoomIntent {
  if (p.openness <= FIST_OPENNESS) return "in";
  if (!p.pinch && p.extended >= 4 && p.openness >= OPEN_OPENNESS) return "out";
  return null;
}

/** Zoom from every tracked hand. Hands that disagree (one fist, one open) cancel out. */
export function handsZoomIntent(poses: readonly HandPose[]): ZoomIntent {
  const wanted = new Set(poses.map(handZoomIntent).filter((z): z is "in" | "out" => z !== null));
  return wanted.size === 1 ? [...wanted][0]! : null;
}
