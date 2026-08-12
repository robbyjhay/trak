import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryBtn({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-[11px] bg-linear-to-br from-aztec-3 to-aztec px-[26px] py-3.5 text-[13.5px] font-bold text-paper shadow-sm transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron disabled:cursor-not-allowed disabled:opacity-[0.42] disabled:shadow-none disabled:hover:translate-y-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[9px] border-[1.5px] border-line px-3.5 py-2 text-xs font-bold text-ink-soft transition-all hover:border-saffron-dim hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryMini({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[9px] border-none bg-aztec px-[15px] py-2 text-xs font-bold text-white transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
