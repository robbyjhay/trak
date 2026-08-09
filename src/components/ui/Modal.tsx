"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ModalBackdrop({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(13,29,26,0.55)] backdrop-blur-[2px]",
        className,
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

export function ModalPanel({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-h-[88vh] overflow-y-auto rounded-[20px] bg-white p-7 shadow-modal",
        wide ? "w-[900px] max-w-[95vw] p-0" : "w-[460px] max-w-[92vw]",
        className,
      )}
    >
      {children}
    </div>
  );
}
