"use client";

import { useCopy } from "@/hooks/useCopy";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Icon paths (kept local to avoid adding to global PATHS if unnecessary) */
/* ------------------------------------------------------------------ */
const COPY_PATH_D = "M9 9h13v13H9z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3";
const CHECK_PATH_D = "M20 6L9 17l-5-5";

/* ------------------------------------------------------------------ */
/* Shared tooltip that appears above the trigger when copied           */
/* ------------------------------------------------------------------ */
function CopiedTooltip({ show, label }: { show: boolean; label: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.97 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 2, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tooltip px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-toast"
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d={CHECK_PATH_D} />
            </svg>
            {label}
          </span>
          {/* Arrow */}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-tooltip" aria-hidden />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Animated icon swap: Copy -> Check, fixed box so no layout shift    */
/* ------------------------------------------------------------------ */
function SwapIcon({ copied, className = "" }: { copied: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)} aria-hidden>
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.svg
            key="check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute"
          >
            <path d={CHECK_PATH_D} />
          </motion.svg>
        ) : (
          <motion.svg
            key="copy"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Primary public component: versatile button with copy semantics       */
/* - No layout shift: fixed icon box + min-width + tooltip absolute   */
/* - Restores automatically after duration                            */
/* - Supports ghost / primary / subtle variants                       */
/* ------------------------------------------------------------------ */

type CopyButtonProps = {
  /** Text that will be copied */
  text: string;
  /** Visible label in idle state. Default "Copy" */
  label?: string;
  /** Label when copied. Default "Copied" */
  successLabel?: string;
  /** Tooltip label when copied (for icon-only). Default "Copied" */
  tooltipLabel?: string;
  variant?: "primary" | "ghost" | "subtle" | "icon";
  size?: "sm" | "md";
  className?: string;
  duration?: number;
  disabled?: boolean;
  /** Show floating tooltip in addition to inline label (useful for icon variant) */
  showTooltip?: boolean;
  onCopied?: () => void;
  onError?: () => void;
};

export function CopyButton({
  text,
  label = "Copy",
  successLabel = "Copied",
  tooltipLabel = "Copied",
  variant = "ghost",
  size = "md",
  className,
  duration = 1600,
  disabled,
  showTooltip,
  onCopied,
  onError,
}: CopyButtonProps) {
  const { copied, copy } = useCopy({ duration, onSuccess: onCopied, onError });
  const isIcon = variant === "icon";
  const reduceMotion = useReducedMotion();

  async function handleClick() {
    if (!text) return;
    await copy(text);
  }

  // Variant classes — restrained, premium, no bounce
  const variantClass =
    variant === "primary"
      ? copied
        ? "bg-success text-success-foreground border-success shadow-sm"
        : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
      : variant === "ghost"
        ? copied
          ? "border-success/40 bg-success-surface text-success"
          : "border-border bg-surface text-foreground-secondary hover:border-primary hover:text-foreground hover:bg-surface-hover"
        : variant === "subtle"
          ? copied
            ? "bg-success-surface text-success border-transparent"
            : "bg-surface-muted text-foreground-secondary hover:bg-surface-hover hover:text-foreground border-transparent"
          : copied
            ? "bg-success-surface text-success border-success/30"
            : "bg-surface text-foreground-secondary hover:bg-surface-hover hover:text-foreground border-border";

  const sizeClass = isIcon
    ? size === "sm"
      ? "h-8 w-8 p-0"
      : "h-9 w-9 p-0"
    : size === "sm"
      ? "px-3 py-1.5 text-xs"
      : "px-3.5 py-2 text-[12.5px]";

  // For button width stability: we render both labels hidden to measure max width,
  // but keep visible label via opacity switch inside fixed inner container.
  // Simpler: keep min-width that covers both strings for common cases.
  const minW = !isIcon
    ? successLabel.length > label.length
      ? "min-w-[92px]"
      : label.length > 8
        ? "min-w-[124px]"
        : "min-w-[96px]"
    : "";

  return (
    <span className="relative inline-flex">
      {/* Tooltip — absolute, no layout impact */}
      {(showTooltip || isIcon) && <CopiedTooltip show={copied} label={tooltipLabel} />}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !text}
        aria-label={copied ? successLabel : label}
        data-testid={copied ? "copy-success" : "copy-action"}
        data-copied={copied ? "true" : "false"}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          variantClass,
          sizeClass,
          minW,
          // Prevent layout shift from font changes
          "select-none whitespace-nowrap",
          className
        )}
      >
        <SwapIcon copied={copied} />
        {!isIcon && (
          <span className="relative inline-flex items-center justify-center">
            {/* Hidden spacer reserves width for the longer label so button never reflows */}
            <span className="invisible select-none" aria-hidden>
              {successLabel.length > label.length ? successLabel : label}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? "suc" : "idle"}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {copied ? successLabel : label}
              </motion.span>
            </AnimatePresence>
          </span>
        )}
      </button>
    </span>
  );
}

/** Icon-only variant — fixed circle, tooltip confirms */
export function CopyIconButton({
  text,
  label = "Copy",
  duration = 1600,
  className,
  size = "md",
  onCopied,
}: {
  text: string;
  label?: string;
  duration?: number;
  className?: string;
  size?: "sm" | "md";
  onCopied?: () => void;
}) {
  return (
    <CopyButton
      text={text}
      label={label}
      successLabel="Copied"
      variant="icon"
      size={size}
      duration={duration}
      className={cn("rounded-full", className)}
      showTooltip
      onCopied={onCopied}
    />
  );
}

/** Inline text copy (e.g., code/value) — subtle, underline on hover */
export function InlineCopy({
  text,
  children,
  className,
  duration = 1600,
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}) {
  const { copied, copy } = useCopy({ duration });
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => copy(text)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 -mx-1 py-0.5 text-left transition-colors hover:bg-surface-muted",
          copied ? "text-success" : "text-foreground",
          className
        )}
        aria-label={copied ? "Copied" : "Copy"}
        data-testid={copied ? "copy-success" : "copy-action"}
      >
        <span className="underline decoration-border underline-offset-2 hover:decoration-foreground/30">{children}</span>
        <span className="relative inline-flex h-3.5 w-3.5 shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.svg
                key="chk"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="absolute text-success"
              >
                <path d={CHECK_PATH_D} />
              </motion.svg>
            ) : (
              <motion.svg
                key="cpy"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="absolute text-foreground-faint"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
      </button>
      <CopiedTooltip show={copied} label="Copied" />
    </span>
  );
}

/** Small pill for copyable values (e.g., guest code) */
export function CopyPill({
  text,
  valueLabel,
  className,
}: {
  text: string;
  valueLabel: string;
  className?: string;
}) {
  const { copied, copy } = useCopy({ duration: 1600 });
  return (
    <span className="relative inline-flex">
      <CopiedTooltip show={copied} label="Copied" />
      <button
        type="button"
        onClick={() => copy(text)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
          copied ? "border-success/30 bg-success-surface text-success" : "border-border bg-surface-muted text-foreground hover:border-primary/40",
          className
        )}
        data-testid={copied ? "copy-success" : "copy-action"}
      >
        <span className="font-mono tracking-widest">{valueLabel}</span>
        <SwapIcon copied={copied} className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
