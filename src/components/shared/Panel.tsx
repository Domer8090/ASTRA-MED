import type { ReactNode } from "react";

interface PanelProps {
  id?: string;
  title: string;
  /** Short plain-language subtitle under the title. */
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
          <h2 id={headingId} className="font-cond text-md font-bold uppercase tracking-label text-ink">
            {title}
          </h2>
          {subtitle ? <div className="mt-0.5 text-sm text-ink-2">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}
