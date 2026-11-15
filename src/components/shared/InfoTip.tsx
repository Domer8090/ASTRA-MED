import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

const WIDTH = 288;

/**
 * A small (i) button. Click or tap opens a short explanation; click again,
 * click outside or press Escape to close. The popover is fixed-positioned so
 * panels with hidden overflow never clip it.
 */
export function InfoTip({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left + r.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - 8);
    const height = pop.current?.offsetHeight ?? 0;
    const below = r.bottom + 6;
    const top = below + height > window.innerHeight - 8 && r.top - height - 6 > 8 ? r.top - height - 6 : below;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setOpen(false);
      if (e.type === "keydown") btn.current?.focus();
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full align-middle text-ink-3 hover:text-ink aria-expanded:text-cyan ${className}`}
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label={label}
          style={{ top: pos.top, left: pos.left, width: WIDTH }}
          className="fixed z-[80] rounded-tile border border-line-strong bg-raised px-3 py-2.5 text-left font-sans text-sm normal-case leading-5 tracking-normal text-ink-2"
        >
          <p className="mb-1 font-cond text-xs font-bold uppercase tracking-label text-ink">{label}</p>
          <div className="space-y-1.5">{children}</div>
        </div>
      ) : null}
    </>
  );
}
