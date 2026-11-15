import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

interface PanelProps {
  id?: string;
  title: string;
  /** Explanation of the panel, shown behind an (i) next to the title. */
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div";
}

export function Panel({ id, title, subtitle, actions, children, className = "", bodyClassName = "p-4 md:p-5", as = "section" }: PanelProps) {
  const Tag = as;
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag id={id} aria-labelledby={headingId} className={`panel min-w-0 scroll-mt-[var(--sticky-offset)] ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-1 text-xl font-bold text-ink">
            {title}
            {subtitle ? <InfoTip label={title}>{subtitle}</InfoTip> : null}
          </h2>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}
