import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
  /** Desktop drawers stay non-modal so the console remains usable beside them. */
  modal?: boolean;
  widthClass?: string;
  labelId?: string;
}

/**
 * Native <dialog>: focus moves inside on open and returns to the trigger on
 * close; Escape closes; modal dialogs make the page inert.
 */
export function Dialog({ open, onClose, title, titleExtra, children, footer, variant = "modal", modal = true, widthClass = "max-w-2xl", labelId }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const headingId = labelId ?? `dlg-${title.replace(/\W+/g, "-").toLowerCase()}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        returnFocus.current = document.activeElement as HTMLElement | null;
        if (modal) el.showModal();
        else el.show();
        // Focus the dialog container first so screen readers announce the title.
        window.setTimeout(() => {
          const target = el.querySelector<HTMLElement>("[data-autofocus]");
          (target ?? el).focus();
        }, 0);
      }
    } else if (el.open) {
      el.close();
    }
  }, [open, modal]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCloseEvt = () => {
      onClose();
      const target = returnFocus.current;
      if (target && document.contains(target)) target.focus();
    };
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !modal) {
        e.stopPropagation();
        onClose();
      }
    };
    el.addEventListener("close", onCloseEvt);
    el.addEventListener("cancel", onCancel);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("close", onCloseEvt);
      el.removeEventListener("cancel", onCancel);
      el.removeEventListener("keydown", onKey);
    };
  }, [onClose, modal]);

  const frame =
    variant === "drawer"
      ? `t-drawer fixed inset-0 m-0 h-[100dvh] w-full md:inset-y-0 md:left-auto md:right-0 md:h-[100dvh] md:w-[min(480px,100vw)] ${modal ? "" : "z-40"}`
      : `t-modal m-auto w-[calc(100vw-24px)] ${widthClass} max-h-[calc(100dvh-24px)]`;

  return (
    <dialog ref={ref} aria-labelledby={headingId} tabIndex={-1} className={`${frame} overscroll-contain outline-none`}>
      <div className={`flex h-full max-h-[inherit] flex-col border-line-strong bg-raised ${variant === "drawer" ? "md:border-l" : "rounded-panel border"}`}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={headingId} className="font-cond text-lg font-bold text-ink">
              {title}
            </h2>
            {titleExtra}
          </div>
          <button type="button" className="btn btn-ghost -mr-2 min-h-[40px] min-w-[40px] px-2" aria-label={`Close ${title}`} onClick={onClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <footer className="border-t border-line px-5 py-3">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
