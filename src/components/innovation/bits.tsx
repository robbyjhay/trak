"use client";

import { cn } from "@/lib/utils";
import type { InnovationCategory, InnovationStatus } from "@/lib/types";

export const INNOVATION_CATEGORY_LABELS: Record<InnovationCategory, string> = {
  PROCESS: "Process",
  TECHNOLOGY: "Technology",
  COMMUNITY: "Community",
  TRAINING: "Training & Dev",
  COMMUNICATION: "Communication",
  OTHER: "Other",
};

export const INNOVATION_CATEGORY_ICON_PATHS: Record<InnovationCategory, string> = {
  PROCESS:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v5l3 3",
  TECHNOLOGY:
    "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z",
  COMMUNITY:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  TRAINING:
    "M12 2l10 6.5v7L12 22 2 15.5v-7L12 2zM12 22V12M2 8.5l10 3.5 10-3.5",
  COMMUNICATION:
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  OTHER:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-13v5m0 3h.01",
};

/** Lightbulb / idea icon path */
export const BULB_PATH =
  "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.5.8 1.3.8 2.1V18h6.4v-1.2c0-.8.3-1.6.8-2.1A7 7 0 0 0 12 2z";

export function BulbIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d={BULB_PATH} />
    </svg>
  );
}

export function CategoryIcon({
  category,
  size = 14,
}: {
  category: InnovationCategory;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d={INNOVATION_CATEGORY_ICON_PATHS[category]} />
    </svg>
  );
}

export function CategoryChip({ category }: { category: InnovationCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-aztec/5 px-2 py-0.5 text-[10.5px] font-bold text-aztec dark:bg-white/10 dark:text-white">
      <CategoryIcon category={category} size={12} />
      {INNOVATION_CATEGORY_LABELS[category]}
    </span>
  );
}

// Status badge uses icon + text, never color alone
const STATUS_CONFIG: Record<
  InnovationStatus,
  { label: string; iconPath: string; className: string }
> = {
  PENDING: {
    label: "Pending Review",
    iconPath: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v5l3 3",
    className: "bg-warning-surface text-warning-foreground",
  },
  APPROVED: {
    label: "Approved",
    iconPath:
      "M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    className: "bg-success-surface text-good dark:text-emerald-300",
  },
  IMPLEMENTED: {
    label: "Implemented",
    iconPath:
      "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    className: "bg-primary/10 text-primary",
  },
  DECLINED: {
    label: "Declined",
    iconPath:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M15 9l-6 6M9 9l6 6",
    className: "bg-critical-surface text-critical-semantic",
  },
};

export function StatusBadge({ status }: { status: InnovationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        cfg.className,
      )}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <path d={cfg.iconPath} />
      </svg>
      {cfg.label}
    </span>
  );
}
