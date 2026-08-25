"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModalBackdrop({
  open,
  onClose,
  children,
  className,
  labelledBy,
  describedBy,
  bottomSheetOnMobile,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  /** id of the visible title element inside the dialog */
  labelledBy?: string;
  /** id of supporting description text */
  describedBy?: string;
  bottomSheetOnMobile?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const autoTitleId = useId();

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !panelRef.current.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLElement>(FOCUSABLE);
      (first || root).focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      trapFocus(e);
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus?.();
    };
  }, [open, trapFocus]);

  if (!open) return null;

  function onBackdropKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex bg-overlay backdrop-blur-[2px]",
        bottomSheetOnMobile ? "items-end sm:items-center justify-center" : "items-center justify-center",
        className,
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      onKeyDown={onBackdropKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || autoTitleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn("outline-none", bottomSheetOnMobile && "w-full sm:w-auto")}
      >
        {/* Fallback title for screen readers when caller omits labelledBy */}
        {!labelledBy && (
          <span id={autoTitleId} className="sr-only">
            Dialog
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

export function ModalPanel({
  children,
  className,
  wide,
  bottomSheetOnMobile,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  bottomSheetOnMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-y-auto bg-modal text-foreground p-7 shadow-modal border border-border",
        wide ? "w-[900px] max-w-[95vw] p-0" : "w-[460px] max-w-[92vw]",
        bottomSheetOnMobile 
          ? "max-h-[92vh] rounded-t-[24px] rounded-b-none sm:rounded-[20px] pb-[max(env(safe-area-inset-bottom),28px)] sm:pb-7 max-w-full w-full"
          : "max-h-[88vh] rounded-[20px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
