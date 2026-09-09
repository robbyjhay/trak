"use client";

import { cn } from "@/lib/utils";
import type { LibraryCategory, LibraryStatus } from "@/lib/types";
import { LIBRARY_CATEGORY_LABELS } from "@/lib/library/urls";

export const LIBRARY_ICON_PATHS: Record<LibraryCategory, string> = {
  BOOK: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  VIDEO: "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z",
  AUDIO: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  MEMO: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
  OTHER: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

export const EXTERNAL_LINK_PATH =
  "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3";

export const BOOK_PATH =
  "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z";

export function CategoryIcon({ category, size = 14 }: { category: LibraryCategory; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={LIBRARY_ICON_PATHS[category]} />
    </svg>
  );
}

export function CategoryChip({ category }: { category: LibraryCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-aztec/5 px-2 py-0.5 text-[10.5px] font-bold text-aztec dark:bg-white/10 dark:text-white">
      <CategoryIcon category={category} size={12} />
      {LIBRARY_CATEGORY_LABELS[category]}
    </span>
  );
}

const STATUS_STYLES: Record<LibraryStatus, string> = {
  PENDING: "bg-warning-surface text-warning-foreground",
  APPROVED: "bg-success-surface text-good dark:text-emerald-300",
  DECLINED: "bg-critical-surface text-critical-semantic",
};

const STATUS_DOT: Record<LibraryStatus, string> = {
  PENDING: "bg-warning",
  APPROVED: "bg-good dark:bg-emerald-400",
  DECLINED: "bg-critical",
};

export function StatusBadge({ status }: { status: LibraryStatus }) {
  const label = status === "PENDING" ? "Pending" : status === "APPROVED" ? "Approved" : "Declined";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        STATUS_STYLES[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} aria-hidden />
      {label}
    </span>
  );
}
