import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useMissionModel } from "../hooks/useMissionModel";
import { scrollToSection } from "./navigation";
import { ReadinessBreakdown } from "./shared/ReadinessBreakdown";

/** Readiness score in the top bar. Opens its calculation so the number is never a black box. */
export function ReadinessIndicator() {
  const { readiness, day } = useMissionModel();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="num text-left text-md font-semibold text-ink underline decoration-line-strong decoration-dotted underline-offset-4 hover:decoration-cyan"
        title="Engagement score, not a medical clearance. Select to see how it is calculated."
      >
        {readiness.score}
        <span className="text-ink-3">/100</span>
        <span className="sr-only">, show how readiness is calculated</span>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-label="How readiness is calculated" className="panel absolute right-0 top-full z-40 mt-2 w-[min(340px,calc(100vw-32px))] border border-line-strong p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">Readiness, day {day}</p>
              <p className="mt-0.5 text-sm text-ink">An engagement indicator for the countermeasure plan. It is not a medical clearance and never hides a CAUTION or CRITICAL.</p>
            </div>
            <button type="button" className="btn btn-ghost min-h-[32px] min-w-[32px] shrink-0 px-1" aria-label="Close readiness details" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}>
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <ReadinessBreakdown readiness={readiness} />
          </div>
          <p className="mt-2 text-2xs text-ink-3">Earlier days use synthetic demo adherence history, so the 7-day part and the streak are demo data until you mark tasks yourself.</p>
          <button
            type="button"
            className="link mt-2 text-sm"
            onClick={() => {
              setOpen(false);
              scrollToSection("countermeasures");
            }}
          >
            Open today&apos;s countermeasures
          </button>
        </div>
      ) : null}
    </div>
  );
}
