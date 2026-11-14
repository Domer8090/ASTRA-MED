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

function measure(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  // Clamp very tall targets to the viewport so the hole stays on screen.
  const top = Math.max(r.top - PAD, 8);
  const bottom = Math.min(r.bottom + PAD, window.innerHeight - 8);
  return { top, left: Math.max(r.left - PAD, 4), width: Math.min(r.width + PAD * 2, window.innerWidth - 8), height: Math.max(bottom - top, 40) };
}

/** Steps that have a visible target at this screen size. */
function visibleSteps(): TourStep[] {
  return TOUR_STEPS.filter((s) => targetOf(s) !== null);
}

/** Card placement: below the hole, else above, else docked to the bottom of the screen. */
function cardStyle(hole: Rect | null): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!hole || vw < 640) return { left: 12, right: 12, bottom: 84 };
  const left = Math.min(Math.max(hole.left, 12), vw - CARD_W - 12);
  const below = hole.top + hole.height + 12;
  if (below + 200 < vh) return { left, top: below, width: CARD_W };
  if (hole.top - 212 > 0) return { left, top: hole.top - 212, width: CARD_W };
  return { left: Math.max(vw - CARD_W - 24, 12), bottom: 24, width: CARD_W };
}

function Tour({ onEnd }: { onEnd: () => void }) {
  const [steps] = useState(visibleSteps);
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = steps[index];

  const place = useCallback(() => {
    const el = step ? targetOf(step) : null;
    setHole(el ? measure(el) : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = targetOf(step);
    el?.scrollIntoView({ block: el.getBoundingClientRect().height > window.innerHeight * 0.7 ? "start" : "center", behavior: "auto" });
    place();
    cardRef.current?.focus();
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
        className="t-fade-in panel fixed border border-cyan/60 p-4 outline-none"
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

/** Spotlight walkthrough of the console. Mounted only while the tour runs. */
export function SpotlightTour() {
  const { tourActive, endTour } = useOnboarding();
  if (!tourActive) return null;
  return <Tour onEnd={endTour} />;
}
