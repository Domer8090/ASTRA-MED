import { useId, useState, type ReactNode } from "react";

/** Explains a technical term. Opens on hover and keyboard focus; Escape closes it. */
export function Term({ children, tip }: { children: ReactNode; tip: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="cursor-help border-b border-dotted border-ink-3 text-inherit"
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {children}
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute bottom-full left-0 z-50 mb-2 w-64 rounded-tile border border-line-strong bg-raised px-3 py-2 text-left font-sans text-sm normal-case tracking-normal text-ink-2 transition-opacity duration-150 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {tip}
      </span>
    </span>
  );
}
