import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { TOUR_STEPS, type TourStep } from "../data/tourSteps";
import { useOnboarding } from "../hooks/useOnboarding";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const CARD_W = 340;

/** First visible element marked `data-tour="<target>"`, or with that id. Hidden duplicates (mobile vs desktop) are skipped. */
function targetOf(step: TourStep): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"], #${step.target}`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Bottom edge of the sticky top bar; content scrolled under it is hidden. */
function headerBottom(): number {
  const h = document.querySelector<HTMLElement>("[data-sticky-header]");
  if (!h) return 0;
  const r = h.getBoundingClientRect();
  return r.height > 0 && getComputedStyle(h).position === "sticky" ? Math.max(0, r.bottom) : 0;
}

/** True when the target sits in the sticky header or is fixed (it never scrolls under the header). */
function pinned(el: HTMLElement): boolean {
  if (el.closest("[data-sticky-header]")) return true;
  for (let n: HTMLElement | null = el; n; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return true;
  return false;
}

function measure(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  // Never draw the hole over the sticky header unless the target lives there.
  const ceiling = pinned(el) ? 4 : headerBottom() + 4;
  const top = Math.max(r.top - PAD, ceiling);
  const bottom = Math.min(r.bottom + PAD, window.innerHeight - 8);
  const left = Math.max(r.left - PAD, 4);
  const right = Math.min(r.right + PAD, window.innerWidth - 4);
  return { top, left, width: Math.max(right - left, 40), height: Math.max(bottom - top, 40) };
}

/** Scroll the target just below the sticky header (or centre it when it is short). */
function bringIntoView(el: HTMLElement): void {
  if (pinned(el)) return;
  const r = el.getBoundingClientRect();
  const top = headerBottom();
  const room = window.innerHeight - top;
  const offset = r.height + 2 * PAD < room - 220 ? (room - r.height) / 2 : 16;
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - top - offset), behavior: "auto" });
}

/** Steps that have a visible target at this screen size. */
function visibleSteps(): TourStep[] {
  return TOUR_STEPS.filter((s) => targetOf(s) !== null);
}

const CARD_H = 230;

/**
 * Wide, tall targets leave no room for the card above, below or beside them.
 * Show the top part of the target and keep the bottom of the screen for the card.
 */
function fitHole(hole: Rect): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) return hole;
  const gap = 12;
  const fitsBelow = hole.top + hole.height + gap + CARD_H < vh;
  const fitsAbove = hole.top - CARD_H - gap > headerBottom();
  const fitsSide = hole.left + hole.width + gap + CARD_W < vw || hole.left - gap - CARD_W > 0;
  if (fitsBelow || fitsAbove || fitsSide) return hole;
  return { ...hole, height: Math.max(80, vh - CARD_H - 2 * gap - hole.top) };
}

/** Card placement: below, above, then beside the hole; on phones, docked away from the hole. */
function cardStyle(hole: Rect | null): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 12;
  if (!hole) return { left: 12, right: 12, bottom: 84 };
  if (vw < 640) return hole.top + hole.height / 2 > vh / 2 ? { left: 12, right: 12, top: Math.max(12, headerBottom() + 8) } : { left: 12, right: 12, bottom: 84 };
  const left = Math.min(Math.max(hole.left, gap), vw - CARD_W - gap);
  const below = hole.top + hole.height + gap;
  if (below + CARD_H < vh) return { left, top: below, width: CARD_W };
  if (hole.top - CARD_H - gap > headerBottom()) return { left, top: hole.top - CARD_H - gap, width: CARD_W };
  const top = Math.min(Math.max(hole.top, headerBottom() + gap), vh - CARD_H - gap);
  if (hole.left + hole.width + gap + CARD_W < vw) return { left: hole.left + hole.width + gap, top, width: CARD_W };
  if (hole.left - gap - CARD_W > 0) return { left: hole.left - gap - CARD_W, top, width: CARD_W };
  return { left: gap, bottom: gap, width: CARD_W };
}

function Tour({ steps, onEnd }: { steps: readonly TourStep[]; onEnd: () => void }) {
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = steps[index];

  const place = useCallback(() => {
    const el = step ? targetOf(step) : null;
    setHole(el ? fitHole(measure(el)) : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = targetOf(step);
    if (el) bringIntoView(el);
    place();
    // Layout can settle a frame later (lazy charts, fonts); measure again.
    const raf = requestAnimationFrame(place);
    const late = window.setTimeout(place, 250);
    cardRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
    };
  }, [step, place]);

  useEffect(() => {
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [place]);

  const last = index === steps.length - 1;
  const next = () => (last ? onEnd() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onEnd();
    else if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") back();
    else if (e.key === "Tab") {
      // Keep focus inside the tour card.
      const f = cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!f || f.length === 0) return;
      const first = f[0]!;
      const end = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!step) return null;
  const scrim = "fixed bg-space/80";
  return (
    <div className="fixed inset-0 z-[80]" onKeyDown={onKeyDown}>
      {hole ? (
        <>
          <div aria-hidden="true" className={scrim} style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div aria-hidden="true" className={scrim} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div aria-hidden="true" className={scrim} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div aria-hidden="true" className={scrim} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div aria-hidden="true" className="fixed rounded-panel border-2 border-cyan" style={hole} />
        </>
      ) : (
        <div aria-hidden="true" className={`${scrim} inset-0`} />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="t-fade-in panel fixed rounded-panel border border-cyan/60 p-4 outline-none"
        style={cardStyle(hole)}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="label">
            Tour <span className="num">{index + 1}</span> of <span className="num">{steps.length}</span>
          </p>
          <button type="button" className="btn btn-ghost -mr-2 -mt-2 min-h-[36px] min-w-[36px] px-1" aria-label="Close the tour" onClick={onEnd}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <h2 id={titleId} className="mt-1 font-cond text-lg font-bold text-ink">
          {step.title}
        </h2>
        <p className="mt-1 text-base text-ink-2" aria-live="polite">
          {step.body}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost text-sm" onClick={onEnd}>
            Skip tour
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary text-sm" onClick={back} disabled={index === 0} aria-label="Previous step">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button type="button" className="btn btn-primary text-sm" onClick={next}>
              {last ? "Finish" : "Next"}
              {last ? null : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Spotlight walkthrough of the console. Mounted only while the tour runs.
 * Starting the tour switches to Summary first; the steps are read once that view
 * has rendered. If no target is visible at all, the tour ends instead of staying
 * active with nothing on screen (which used to block starting it again).
 */
export function SpotlightTour() {
  const { tourActive, endTour } = useOnboarding();
  if (!tourActive) return null;
  return <TourLoader onEnd={endTour} />;
}

function TourLoader({ onEnd }: { onEnd: () => void }) {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  useEffect(() => {
    let tries = 0;
    let timer = 0;
    const look = () => {
      const found = visibleSteps();
      if (found.length || tries >= 10) {
        if (found.length) setSteps(found);
        else onEnd();
        return;
      }
      tries += 1;
      timer = window.setTimeout(look, 80);
    };
    timer = window.setTimeout(look, 60);
    return () => window.clearTimeout(timer);
  }, [onEnd]);
  return steps ? <Tour steps={steps} onEnd={onEnd} /> : null;
}
