import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";

export type ToastTone = "success" | "info" | "warning";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}

interface Toast extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const ICONS = { success: CircleCheck, info: Info, warning: TriangleAlert } as const;
const TONE_CLASS: Record<ToastTone, string> = {
  success: "text-nominal",
  info: "text-cyan",
  warning: "text-caution",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.action ? 9000 : 6000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[76px] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-start lg:pl-[calc(var(--rail-w)+20px)]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => {
          const tone = t.tone ?? "success";
          const Icon = ICONS[tone];
          return (
            <div
              key={t.id}
              role="status"
              className="t-toast pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-tile border border-line-strong bg-raised px-4 py-3"
            >
              <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${TONE_CLASS[tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-ink">{t.title}</p>
                {t.body ? <p className="mt-0.5 text-sm text-ink-2">{t.body}</p> : null}
              </div>
              {t.action ? (
                <button
                  type="button"
                  className="btn btn-secondary min-h-[30px] px-2 text-xs"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost min-h-[30px] px-1.5" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (t: ToastInput) => void {
  const v = useContext(ToastContext);
  if (!v) throw new Error("ToastProvider is missing");
  return v;
}
