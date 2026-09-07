"use client";

"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ButtonHTMLAttributes, ForwardedRef, ReactNode, SVGProps } from "react";
import React from "react";
import { useCopy } from "@/hooks/useCopy";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Icon content (SVG element or component) */
  icon: ReactNode;
  /** Accessible label (required for icon-only buttons) */
  "aria-label": string;
  /** Visual variant */
  variant?: "ghost" | "subtle" | "surface" | "primary" | "critical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
  /** Show tooltip on hover/focus */
  tooltip?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Press animation scale (default varies by size) */
  pressScale?: number;
  /** Use as child render prop for advanced composition */
  children?: never;
}

const variantClasses = {
  ghost: "bg-transparent text-foreground-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-active",
  subtle: "bg-surface-muted text-foreground-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-active",
  surface: "bg-surface text-foreground-secondary border border-border hover:bg-surface-hover hover:border-border-strong hover:text-foreground active:bg-surface-active",
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-sm",
  critical: "bg-critical-surface text-critical-semantic hover:bg-critical-surface/80 active:bg-critical-surface border border-critical/30",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-5 w-5",
};

const pressScales = {
  sm: 0.92,
  md: 0.95,
  lg: 0.96,
};

export const IconButton = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      "aria-label": ariaLabel,
      variant = "ghost",
      size = "md",
      className,
      tooltip,
      disabled,
      loading,
      pressScale,
      ...props
    },
    ref
  ) => {
    const reduceMotion = useReducedMotion();
    const scale = pressScale ?? pressScales[size];
    const isInteractive = !disabled && !loading;

    const tapAnimation = reduceMotion || !isInteractive
      ? undefined
      : { scale };

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        whileTap={tapAnimation}
        className={cn(
          "inline-flex items-center justify-center rounded-[9px] font-bold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground-secondary",
          "touch-manipulation select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...(props as any)}
      >
        {loading ? (
          <span className={cn("relative inline-flex", iconSizeClasses[size])} aria-hidden>
            <svg
              className="animate-spin text-current"
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                strokeLinecap="round"
                strokeOpacity="1"
              />
            </svg>
          </span>
        ) : (
          <span className={cn("relative inline-flex shrink-0", iconSizeClasses[size])} aria-hidden>
            {icon}
          </span>
        )}
      </motion.button>
    );
  }
);

IconButton.displayName = "IconButton";

export interface AnimatedIconButtonProps extends Omit<IconButtonProps, "pressScale"> {
  /** Animated state (e.g., copied, saved, sent) */
  animated?: boolean;
  /** Icon to show in animated state */
  animatedIcon?: ReactNode;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom press scale */
  pressScale?: number;
}

export const AnimatedIconButton = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, AnimatedIconButtonProps>(
  (
    {
      icon,
      "aria-label": ariaLabel,
      variant = "ghost",
      size = "md",
      className,
      tooltip,
      disabled,
      loading,
      animated,
      animatedIcon,
      animationDuration = 160,
      pressScale,
      ...props
    },
    ref
  ) => {
    const reduceMotion = useReducedMotion();
    const scale = pressScale ?? pressScales[size];
    const isInteractive = !disabled && !loading;

    const tapAnimation = reduceMotion || !isInteractive
      ? undefined
      : { scale };

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-label={animated ? `${ariaLabel} (completed)` : ariaLabel}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        whileTap={tapAnimation}
        className={cn(
          "inline-flex items-center justify-center rounded-[9px] font-bold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground-secondary",
          "touch-manipulation select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...(props as any)}
      >
        <span className={cn("relative inline-flex shrink-0", iconSizeClasses[size])} aria-hidden>
          <motion.span
            key={animated ? "animated" : "idle"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: -10 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: 10 }}
            transition={{ duration: animationDuration / 1000, ease: "easeOut" }}
          >
            {animated && animatedIcon ? animatedIcon : icon}
          </motion.span>
        </span>
      </motion.button>
    );
  }
);

AnimatedIconButton.displayName = "AnimatedIconButton";

export interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Leading icon */
  icon?: ReactNode;
  /** Button text */
  children: ReactNode;
  /** Visual variant */
  variant?: "primary" | "ghost" | "subtle" | "surface" | "critical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Press animation scale */
  pressScale?: number;
}

const actionVariantClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-sm",
  ghost: "bg-transparent text-foreground-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-active border border-transparent",
  subtle: "bg-surface-muted text-foreground-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-active border border-transparent",
  surface: "bg-surface text-foreground-secondary border border-border hover:bg-surface-hover hover:border-border-strong hover:text-foreground active:bg-surface-active",
  critical: "bg-critical text-critical-foreground hover:bg-critical/90 active:bg-critical shadow-sm",
};

const actionSizeClasses = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-3.5 py-2 text-[12.5px] gap-2",
  lg: "px-4 py-2.5 text-[13.5px] gap-2",
};

const actionIconSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-4.5 w-4.5",
};

export const ActionButton = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      icon,
      children,
      variant = "primary",
      size = "md",
      className,
      disabled,
      loading,
      fullWidth,
      pressScale,
      ...props
    },
    ref
  ) => {
    const reduceMotion = useReducedMotion();
    const scale = pressScale ?? (size === "sm" ? 0.96 : size === "md" ? 0.98 : 0.99);
    const isInteractive = !disabled && !loading;

    const tapAnimation = reduceMotion || !isInteractive
      ? undefined
      : { scale };

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-busy={loading}
        whileTap={tapAnimation}
        className={cn(
          "inline-flex items-center justify-center rounded-[9px] font-bold transition-colors duration-150 whitespace-nowrap",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground-secondary",
          "touch-manipulation select-none",
          actionVariantClasses[variant],
          actionSizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...(props as any)}
      >
        {loading ? (
          <svg
            className={`animate-spin ${actionIconSizes[size]} text-current shrink-0`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" strokeOpacity="1" />
          </svg>
        ) : icon ? (
          <span className={cn("shrink-0", actionIconSizes[size])} aria-hidden>
            {icon}
          </span>
        ) : null}
        <span>{children}</span>
      </motion.button>
    );
  }
);

ActionButton.displayName = "ActionButton";

export interface MoreButtonProps extends Omit<IconButtonProps, "icon" | "variant"> {
  /** Menu trigger button */
  trigger?: ReactNode;
  /** Custom icon (defaults to three dots) */
  icon?: ReactNode;
}

export function MoreButton({
  "aria-label": ariaLabel = "More options",
  size = "md",
  className,
  disabled,
  icon,
  ...props
}: MoreButtonProps) {
  const defaultIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19.5" cy="12" r="1" />
      <circle cx="4.5" cy="12" r="1" />
    </svg>
  );

  return (
    <IconButton
      ref={(props as any).ref}
      icon={icon ?? defaultIcon}
      aria-label={ariaLabel}
      variant="ghost"
      size={size}
      className={className}
      disabled={disabled}
      {...props}
    />
  );
}

export interface SendButtonProps extends Omit<AnimatedIconButtonProps, "icon" | "animatedIcon" | "variant"> {
  /** Custom send icon path */
  iconPath?: string;
  /** Whether send is available */
  ready?: boolean;
}

export function SendButton({
  "aria-label": ariaLabel = "Send message",
  size = "md",
  className,
  disabled,
  loading,
  ready = true,
  iconPath,
  ...props
}: SendButtonProps) {
  const defaultIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  );

  const sentIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="text-success">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );

  const isDisabled = disabled || loading || !ready;

  return (
    <AnimatedIconButton
      icon={iconPath ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d={iconPath} />
        </svg>
      ) : defaultIcon}
      animatedIcon={sentIcon}
      animated={false}
      aria-label={ariaLabel}
      variant="primary"
      size={size}
      className={cn("transition-colors", className)}
      disabled={isDisabled}
      loading={loading}
      {...props}
    />
  );
}

export interface CopyButtonIconProps extends Omit<AnimatedIconButtonProps, "icon" | "animatedIcon" | "variant"> {
  /** Text to copy */
  text: string;
  /** Copy success callback */
  onCopied?: () => void;
  /** Copy error callback */
  onError?: () => void;
  /** Duration for copied state (ms) */
  duration?: number;
}

export function CopyButtonIcon({
  text,
  "aria-label": ariaLabel = "Copy",
  size = "md",
  className,
  disabled,
  onCopied,
  onError,
  duration = 1600,
  ...props
}: CopyButtonIconProps) {
  const { copied, copy } = useCopy({ duration, onSuccess: onCopied, onError });
  const reduceMotion = useReducedMotion();

  const copyIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
    </svg>
  );

  const checkIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="text-success">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );

  async function handleClick() {
    if (!text) return;
    await copy(text);
  }

  return (
    <AnimatedIconButton
      icon={copyIcon}
      animatedIcon={checkIcon}
      animated={copied}
      aria-label={copied ? "Copied" : ariaLabel}
      variant="ghost"
      size={size}
      className={cn("transition-colors", className)}
      disabled={disabled || !text}
      onClick={handleClick}
      animationDuration={140}
      pressScale={0.92}
      {...props}
    />
  );
}