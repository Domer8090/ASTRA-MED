import type { ReactNode } from "react";

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-tile border border-dashed border-line-strong px-4 py-5">
      <div className="flex items-center gap-2 text-ink">
        {icon}
        <p className="text-base font-semibold">{title}</p>
      </div>
      {children ? <div className="max-w-prose text-sm text-ink-2">{children}</div> : null}
      {action}
    </div>
  );
}
