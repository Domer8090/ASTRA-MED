import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { setConsoleView } from "../hooks/useConsoleView";
import { useMissionStore } from "../hooks/useMissionState";
import { useOnboarding } from "../hooks/useOnboarding";
import { useTuesday } from "../hooks/useTuesday";
import { PITCH_STEPS, type PitchStep } from "../data/pitchSteps";
import { scrollToSection } from "./navigation";
import { takePitchRequest } from "../state/pitchRequest";

/**
 * Pitch mode: a presenter-driven spotlight walkthrough for live demos.
 * Start with ?pitch in the URL or Shift+P. Right arrow, Page Down or Space go
 * forward; Left arrow or Page Up go back; H hides the caption; Esc exits.
 * Each step sets the scenario, day and view itself, so the presenter never clicks.
 */

const PAD = 10;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Box {
  getBoundingClientRect(): { top: number; bottom: number; left: number; right: number; height: number };
}

/** One target, or several framed together as one box (their union). Null until every one is visible. */
function findTarget(target: string | readonly string[]): Box | null {
  const names = typeof target === "string" ? [target] : target;
  const els = names.map(findOne);
  if (els.some((e) => !e)) return null;
  if (els.length === 1) return els[0]!;
  return {
    getBoundingClientRect() {
      const rs = els.map((e) => e!.getBoundingClientRect());
      const top = Math.min(...rs.map((r) => r.top));
      const bottom = Math.max(...rs.map((r) => r.bottom));
      return { top, bottom, left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), height: bottom - top };
    },
  };
}

function findOne(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-pitch="${name}"], [data-tour="${name}"], #${name}`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function headerBottom(): number {
  const h = document.querySelector<HTMLElement>("[data-sticky-header]");
  if (!h) return 0;
  const r = h.getBoundingClientRect();
  return r.height > 0 && getComputedStyle(h).position === "sticky" ? Math.max(0, r.bottom) : 0;
}

/** Scroll the target just under the sticky header, or centre it when it is short. */
function bringIntoView(el: Box, reserve: number): void {
  const r = el.getBoundingClientRect();
  const top = headerBottom();
  const room = window.innerHeight - top - reserve;
  const offset = r.height + 2 * PAD < room ? (room - r.height) / 2 : 16;
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - top - offset), behavior: "auto" });
}

function measure(el: Box, reserve: number): Rect {
  const r = el.getBoundingClientRect();
  const ceiling = headerBottom() + 4;
  const floor = window.innerHeight - reserve - 12;
  const top = Math.max(r.top - PAD, ceiling);
  const bottom = Math.min(r.bottom + PAD, floor);
  const left = Math.max(r.left - PAD, 4);
  const right = Math.min(r.right + PAD, window.innerWidth - 4);
  return { top, left, width: Math.max(right - left, 40), height: Math.max(bottom - top, 40) };
}

export function PitchMode() {
  const [active, setActive] = useState(false);
  const { dismissWelcome } = useOnboarding();

  useEffect(() => {
    if (takePitchRequest()) setActive(true);
  }, []);

  // Shift+P starts or stops pitch mode from anywhere except text fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.shiftKey && (e.key === "P" || e.key === "p"))) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      setActive((a) => !a);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (active) dismissWelcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;
  return <Pitch steps={PITCH_STEPS} onEnd={() => setActive(false)} />;
}

function Pitch({ steps, onEnd }: { steps: readonly PitchStep[]; onEnd: () => void }) {
  const store = useMissionStore();
  const tuesday = useTuesday();
  const tuesdayRef = useRef(tuesday);
  tuesdayRef.current = tuesday;
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [hidden, setHidden] = useState(false);
  // Modal dialogs (Recharge) sit in the top layer; draw inside them so the caption stays visible.
  const [host, setHost] = useState<HTMLElement>(() => document.body);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index]!;

  // A caption docked to the right sits beside the frame, so the frame can use the full height.
  const reserve = useCallback(() => (hidden || step.dock === "right" ? 0 : (cardRef.current?.offsetHeight ?? 180) + 24), [hidden, step]);

  const place = useCallback(() => {
    const dlg = document.querySelector<HTMLElement>("dialog[open]") ?? document.body;
    setHost((h) => (h === dlg ? h : dlg));
    if (!step.target) {
      setHole(null);
      return;
    }
    const el = findTarget(step.target);
    setHole(el ? measure(el, reserve()) : null);
  }, [step, reserve]);

  // Every run starts from the bundled demo data, so readings logged earlier
  // (for example while trying Tuesday) cannot change what the steps show.
  // Runs before the step effect below.
  useLayoutEffect(() => {
    store.resetDemoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Put the app in the state this step needs, then find and frame its target.
  useLayoutEffect(() => {
    const t = tuesdayRef.current;
    const settings = store.getState().settings;
    if (settings.scenarioId !== step.scenario) store.setScenario(step.scenario);
    store.setSelectedDay(step.day);
    if (step.view !== "recharge" && t.recharge) t.closeRecharge();
    if (step.view === "tuesday") {
      if (!t.tuesdayMode) t.setTuesdayMode(true);
    } else if (t.tuesdayMode) {
      t.setTuesdayMode(false);
    }
    if (step.view === "summary") {
      setConsoleView("summary");
      window.scrollTo({ top: 0, behavior: "auto" });
    } else if (step.view === "details") {
      setConsoleView("details");
    } else if (step.view === "weather") {
      scrollToSection("weather");
    } else if (step.view === "recharge") {
      if (t.recharge !== "earth") t.openRecharge("earth");
    }

    let tries = 0;
    let timer = 0;
    const settle = () => {
      const el = step.target ? findTarget(step.target) : null;
      if (step.target && !el && tries < 40) {
        tries += 1;
        timer = window.setTimeout(settle, 80);
        return;
      }
      if (el) bringIntoView(el, reserve());
      place();
    };
    timer = window.setTimeout(settle, step.view === "weather" ? 1400 : 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Keep the frame on its target while charts load, fonts settle or the window changes.
  useEffect(() => {
    const id = window.setInterval(place, 400);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [place]);

  const end = useCallback(() => {
    if (tuesdayRef.current.recharge) tuesdayRef.current.closeRecharge();
    onEnd();
  }, [onEnd]);

  // Presenter keys. Capture phase so the Earth view and other widgets do not see them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      let handled = true;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        if (index === steps.length - 1) end();
        else setIndex(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") setIndex(Math.max(0, index - 1));
      else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(steps.length - 1);
      else if (e.key === "Escape") end();
      else if (e.key === "h" || e.key === "H") setHidden((h) => !h);
      else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, steps.length, end]);

  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const cardW = step.dock === "right" ? Math.min(520, vw - 32) : Math.min(620, vw - 32);
  const centre = hole ? hole.left + hole.width / 2 : vw / 2;
  const cardLeft = step.dock === "left" ? 24 : step.dock === "right" ? vw - cardW - 24 : Math.min(Math.max(centre - cardW / 2, 16), vw - cardW - 16);
  const dim = step.dim !== false;
  // Opening step: the app as it is. Keys still work; nothing is drawn.
  if (step.bare) return null;
  const shown = steps.filter((s) => !s.bare);
  const pos = shown.indexOf(step);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-live="polite">
      {hole ? (
        <>
          {dim ? (
            <>
              {/* Four panels around the hole, the same scrim the spotlight tour uses. */}
              <div aria-hidden="true" className="fixed bg-space/80" style={{ top: 0, left: 0, right: 0, height: hole.top }} />
              <div aria-hidden="true" className="fixed bg-space/80" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
              <div aria-hidden="true" className="fixed bg-space/80" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
              <div aria-hidden="true" className="fixed bg-space/80" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
            </>
          ) : null}
          <div aria-hidden="true" className="fixed rounded-panel border-2 border-cyan" style={hole} />
        </>
      ) : dim ? (
        <div aria-hidden="true" className={`fixed inset-0 ${step.images ? "bg-space/95" : "bg-space/80"}`} />
      ) : null}

      {step.images ? (
        <div className="t-fade-in fixed inset-x-0 flex items-start justify-center gap-6 px-8" style={{ top: 40 }}>
          {step.images.map((im) => (
            <figure key={im.src} className="flex min-w-0 flex-col items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}${im.src}`}
                alt={im.label}
                className="rounded-panel border border-line-strong"
                style={{ maxHeight: "calc(100vh - 330px)", maxWidth: "44vw", objectFit: "contain" }}
              />
              <figcaption className="font-cond text-2xl font-bold text-cyan">{im.label}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {hidden ? null : (
        <div
          ref={cardRef}
          className="t-fade-in panel pointer-events-auto fixed rounded-panel border border-cyan/60 px-6 py-5"
          style={{ left: cardLeft, width: cardW, bottom: 20 }}
        >
          <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
            <span className="font-cond font-semibold uppercase tracking-wide text-cyan">
              Live demo <span className="num">{pos + 1}</span> / <span className="num">{shown.length}</span>
            </span>
            <span>← → to move · H hides this · Esc exits</span>
          </div>
          <h2 className="mt-2 font-cond text-2xl font-bold text-ink">{step.title}</h2>
          <p className="mt-1 text-lg leading-snug text-ink-2">{step.body}</p>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {shown.map((s, i) => (
              <span key={s.title} className={`h-1 flex-1 rounded-full ${i <= pos ? "bg-cyan" : "bg-line"}`} />
            ))}
          </div>
        </div>
      )}
    </div>,
    host,
  );
}
