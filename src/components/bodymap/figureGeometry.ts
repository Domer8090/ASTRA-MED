/**
 * Front-facing human silhouette for the body plate.
 * Drawn as the right half (viewer's right) in cubic Bézier segments and
 * mirrored about the centre line, so the figure is exactly symmetric.
 * Coordinates are in a 640 × 640 plate; the figure is centred on x = 320.
 */
import type { BodySystemId } from "../../types/health";

type Pt = readonly [number, number];
interface Seg {
  c1: Pt;
  c2: Pt;
  p: Pt;
}

export const CX = 320;
const OX = CX - 180; // half-figure was authored around x = 180

const shift = ([x, y]: Pt): Pt => [x + OX, y];
const mirror = ([x, y]: Pt): Pt => [2 * CX - x, y];
const f = ([x, y]: Pt) => `${x.toFixed(1)} ${y.toFixed(1)}`;

function mirroredClosedPath(start: Pt, segs: Seg[]): string {
  const s = segs.map((g) => ({ c1: shift(g.c1), c2: shift(g.c2), p: shift(g.p) }));
  const s0 = shift(start);
  let d = `M${f(s0)}`;
  for (const g of s) d += `C${f(g.c1)} ${f(g.c2)} ${f(g.p)}`;
  // Walk back up the mirrored side: reverse each segment.
  const points = [s0, ...s.map((g) => g.p)];
  for (let i = s.length - 1; i >= 0; i--) {
    const g = s[i]!;
    const from = points[i]!;
    d += `C${f(mirror(g.c2))} ${f(mirror(g.c1))} ${f(mirror(from))}`;
  }
  return `${d}Z`;
}

function closedPath(start: Pt, segs: Seg[], mirrored = false): string {
  const t = (p: Pt) => (mirrored ? mirror(shift(p)) : shift(p));
  let d = `M${f(t(start))}`;
  for (const g of segs) d += `C${f(t(g.c1))} ${f(t(g.c2))} ${f(t(g.p))}`;
  return `${d}Z`;
}

/** Head, neck, torso and legs as one outline. */
const BODY_START: Pt = [180, 28];
const BODY_SEGS: Seg[] = [
  { c1: [198, 28], c2: [211, 44], p: [211, 64] },
  { c1: [211, 84], c2: [203, 98], p: [194, 104] },
  { c1: [192, 108], c2: [192, 114], p: [193, 120] },
  { c1: [200, 128], c2: [226, 131], p: [244, 136] },
  { c1: [256, 139], c2: [262, 150], p: [262, 166] },
  { c1: [262, 180], c2: [246, 188], p: [240, 198] },
  { c1: [238, 232], c2: [226, 262], p: [227, 292] },
  { c1: [228, 312], c2: [240, 322], p: [243, 340] },
  { c1: [246, 368], c2: [240, 410], p: [234, 452] },
  { c1: [232, 468], c2: [232, 482], p: [230, 494] },
  { c1: [234, 520], c2: [232, 552], p: [222, 584] },
  { c1: [220, 592], c2: [226, 600], p: [228, 606] },
  { c1: [228, 612], c2: [210, 614], p: [200, 612] },
  { c1: [196, 610], c2: [198, 598], p: [200, 586] },
  { c1: [200, 560], c2: [196, 524], p: [198, 496] },
  { c1: [199, 484], c2: [197, 474], p: [196, 462] },
  { c1: [194, 420], c2: [192, 380], p: [180, 354] },
];

const ARM_START: Pt = [242, 137];
const ARM_SEGS: Seg[] = [
  { c1: [264, 140], c2: [276, 160], p: [277, 190] },
  { c1: [279, 222], c2: [285, 248], p: [287, 270] },
  { c1: [291, 302], c2: [297, 338], p: [299, 366] },
  { c1: [303, 382], c2: [305, 404], p: [297, 416] },
  { c1: [291, 424], c2: [281, 420], p: [280, 408] },
  { c1: [279, 396], c2: [281, 384], p: [282, 372] },
  { c1: [276, 336], c2: [266, 304], p: [264, 278] },
  { c1: [260, 252], c2: [254, 228], p: [250, 208] },
  { c1: [247, 190], c2: [238, 168], p: [236, 152] },
  { c1: [236, 146], c2: [238, 140], p: [242, 137] },
];

export const BODY_PATH = mirroredClosedPath(BODY_START, BODY_SEGS);
export const ARM_RIGHT_PATH = closedPath(ARM_START, ARM_SEGS);
export const ARM_LEFT_PATH = closedPath(ARM_START, ARM_SEGS, true);

/** Fine anatomical hints, drawn at low opacity inside the silhouette. */
export const ANATOMY = {
  brain: `M${CX - 22} 58 C${CX - 22} 38 ${CX + 22} 38 ${CX + 22} 58 C${CX + 22} 70 ${CX + 12} 76 ${CX} 76 C${CX - 12} 76 ${CX - 22} 70 ${CX - 22} 58Z`,
  brainFissure: `M${CX} 40 C${CX - 2} 52 ${CX + 2} 62 ${CX} 75`,
  eyes: [
    [CX - 11, 82],
    [CX + 11, 82],
  ] as const,
  spine: `M${CX} 122 L${CX} 338`,
  ribs: [0, 1, 2, 3, 4].map((i) => {
    const y = 172 + i * 17;
    const w = 52 - Math.abs(i - 1.5) * 4;
    return `M${CX - 4} ${y} C${CX - w * 0.55} ${y - 2} ${CX - w} ${y + 6} ${CX - w + 2} ${y + 16} M${CX + 4} ${y} C${CX + w * 0.55} ${y - 2} ${CX + w} ${y + 6} ${CX + w - 2} ${y + 16}`;
  }),
  clavicles: `M${CX - 6} 140 C${CX - 26} 136 ${CX - 48} 138 ${CX - 64} 144 M${CX + 6} 140 C${CX + 26} 136 ${CX + 48} 138 ${CX + 64} 144`,
  heart: `M${CX + 8} 196 C${CX + 2} 186 ${CX - 12} 190 ${CX - 10} 202 C${CX - 8} 214 ${CX + 8} 224 ${CX + 14} 230 C${CX + 22} 222 ${CX + 36} 212 ${CX + 34} 200 C${CX + 32} 188 ${CX + 16} 186 ${CX + 8} 196Z`,
  aorta: `M${CX + 6} 192 C${CX + 4} 174 ${CX + 18} 168 ${CX + 24} 178 M${CX - 2} 194 L${CX - 4} 150`,
  liver: `M${CX - 44} 252 C${CX - 46} 240 ${CX - 20} 236 ${CX + 2} 242 C${CX + 6} 250 ${CX - 4} 262 ${CX - 18} 268 C${CX - 32} 272 ${CX - 44} 266 ${CX - 44} 252Z`,
  stomach: `M${CX + 6} 252 C${CX + 14} 244 ${CX + 34} 246 ${CX + 34} 260 C${CX + 34} 276 ${CX + 18} 284 ${CX + 6} 278 C${CX - 2} 272 ${CX} 262 ${CX + 6} 252Z`,
  spleen: `M${CX + 38} 236 C${CX + 46} 236 ${CX + 50} 246 ${CX + 46} 254 C${CX + 42} 258 ${CX + 36} 252 ${CX + 36} 244Z`,
  pelvis: `M${CX - 54} 322 C${CX - 40} 312 ${CX - 20} 330 ${CX} 336 C${CX + 20} 330 ${CX + 40} 312 ${CX + 54} 322 M${CX - 40} 330 C${CX - 30} 350 ${CX - 12} 356 ${CX} 352 C${CX + 12} 356 ${CX + 30} 350 ${CX + 40} 330`,
  femurs: `M${CX - 40} 346 L${CX - 34} 470 M${CX + 40} 346 L${CX + 34} 470 M${CX - 33} 500 L${CX - 30} 584 M${CX + 33} 500 L${CX + 30} 584`,
  knees: [
    [CX - 34, 480],
    [CX + 34, 480],
  ] as const,
  lymphNodes: [
    [CX - 16, 112],
    [CX + 16, 112],
    [CX - 56, 194],
    [CX + 56, 194],
    [CX - 30, 346],
    [CX + 30, 346],
    [CX - 8, 150],
  ] as const,
};

export interface HotspotGeometry {
  id: BodySystemId;
  /** Marker position. */
  anchor: Pt;
  /** Region shape highlighted when selected. */
  region: string;
  /** Callout box position (top-left) and side. */
  callout: { x: number; y: number; side: "left" | "right" };
}

const W = 148;

export const CALLOUT_WIDTH = W;
export const CALLOUT_HEIGHT = 58;

export const HOTSPOTS: HotspotGeometry[] = [
  {
    id: "neuroOcular",
    anchor: [CX - 14, 66],
    region: `M${CX} 30 C${CX + 34} 30 ${CX + 36} 60 ${CX + 34} 82 C${CX + 30} 102 ${CX + 14} 108 ${CX} 108 C${CX - 14} 108 ${CX - 30} 102 ${CX - 34} 82 C${CX - 36} 60 ${CX - 34} 30 ${CX} 30Z`,
    callout: { x: 16, y: 40, side: "left" },
  },
  {
    id: "cardiovascular",
    anchor: [CX + 12, 206],
    region: `M${CX + 12} 168 C${CX + 46} 168 ${CX + 50} 214 ${CX + 30} 236 C${CX + 18} 246 ${CX} 246 ${CX - 12} 234 C${CX - 26} 220 ${CX - 22} 168 ${CX + 12} 168Z`,
    callout: { x: 640 - 16 - W, y: 160, side: "right" },
  },
  {
    id: "immuneRadiation",
    anchor: [CX + 42, 246],
    region: `M${CX + 42} 226 C${CX + 56} 226 ${CX + 60} 244 ${CX + 56} 258 C${CX + 50} 268 ${CX + 34} 266 ${CX + 30} 254 C${CX + 26} 240 ${CX + 30} 226 ${CX + 42} 226Z`,
    callout: { x: 640 - 16 - W, y: 284, side: "right" },
  },
  {
    id: "metabolicCircadian",
    anchor: [CX - 22, 258],
    region: `M${CX - 48} 248 C${CX - 48} 232 ${CX + 4} 230 ${CX + 30} 240 C${CX + 40} 252 ${CX + 36} 284 ${CX + 10} 290 C${CX - 16} 296 ${CX - 48} 280 ${CX - 48} 248Z`,
    callout: { x: 16, y: 236, side: "left" },
  },
  {
    id: "musculoskeletal",
    anchor: [CX - 36, 420],
    region: `M${CX - 60} 352 C${CX - 62} 400 ${CX - 56} 452 ${CX - 50} 500 L${CX - 20} 500 C${CX - 16} 452 ${CX - 14} 400 ${CX - 8} 362Z M${CX + 60} 352 C${CX + 62} 400 ${CX + 56} 452 ${CX + 50} 500 L${CX + 20} 500 C${CX + 16} 452 ${CX + 14} 400 ${CX + 8} 362Z`,
    callout: { x: 16, y: 410, side: "left" },
  },
];
