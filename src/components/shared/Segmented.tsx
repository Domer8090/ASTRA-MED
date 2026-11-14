import { useId } from "react";

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  className?: string;
}

/** Radio-group semantics: one tab stop, arrow keys move. */
export function Segmented<T extends string | number>({ label, value, options, onChange, className = "" }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-control border border-line-strong bg-space p-0.5 ${className}`}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={String(o.value)}
            title={o.hint}
            className={`relative cursor-pointer rounded-[3px] px-2.5 py-1 font-cond text-sm font-semibold transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan ${
              checked ? "bg-raised text-ink shadow-[inset_0_0_0_1px_#2A4A68]" : "text-ink-2 hover:text-ink"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              checked={checked}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
