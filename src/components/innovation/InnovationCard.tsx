"use client";

import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/dates";
import type { Innovation } from "@/lib/types";
import { CategoryChip, StatusBadge, BulbIcon } from "./bits";

export function InnovationCard({
  innovation,
  onOpen,
  showStatus = false,
}: {
  innovation: Innovation;
  onOpen: () => void;
  showStatus?: boolean;
}) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border border-border bg-surface shadow-card",
        "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-modal",
        "focus-within:ring-2 focus-within:ring-primary",
      )}
    >
      {/* Mobile: compact horizontal */}
      <div className="flex gap-3 p-4 sm:hidden">
        <div
          className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-aztec-3 to-aztec text-white"
          aria-hidden
        >
          <BulbIcon size={24} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="line-clamp-2 text-[13.5px] leading-snug font-bold text-foreground">
            <button
              type="button"
              onClick={onOpen}
              className="text-left focus-visible:outline-none"
            >
              {innovation.title}
            </button>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoryChip category={innovation.category} />
            {showStatus && <StatusBadge status={innovation.status} />}
          </div>
          <div className="mt-1 text-[11px] text-foreground-faint">
            <span className="font-semibold">{innovation.submittedByName}</span>
            <span aria-hidden> · </span>
            <time dateTime={innovation.createdAt}>
              {fmtDate(innovation.createdAt)}
            </time>
          </div>
          {innovation.description ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-foreground-secondary">
              {innovation.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Desktop: vertical tile */}
      <div className="hidden sm:flex sm:flex-col">
        {/* Gradient header */}
        <div
          className="flex h-[80px] items-center justify-center bg-gradient-to-br from-aztec-3 to-aztec"
          aria-hidden
        >
          <BulbIcon size={32} className="text-white/90" />
        </div>

        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip category={innovation.category} />
            {showStatus && <StatusBadge status={innovation.status} />}
          </div>

          <h3 className="line-clamp-2 text-[15px] leading-snug font-bold text-foreground">
            <button
              type="button"
              onClick={onOpen}
              className="text-left focus-visible:outline-none hover:underline"
            >
              {innovation.title}
            </button>
          </h3>

          {innovation.description ? (
            <p className="line-clamp-2 text-[13px] leading-snug text-foreground-secondary">
              {innovation.description}
            </p>
          ) : null}

          <div className="text-[11px] text-foreground-faint">
            <span className="font-semibold">{innovation.submittedByName}</span>
            <span aria-hidden> · </span>
            <time dateTime={innovation.createdAt}>
              {fmtDate(innovation.createdAt)}
            </time>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-[9px]",
              "border-[1.5px] border-border px-3.5 py-2 text-xs font-bold text-foreground-secondary",
              "transition-all duration-150 hover:border-primary hover:text-foreground",
              "active:scale-[0.98] focus-visible:outline focus-visible:outline-2",
              "focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            View details
          </button>
        </div>
      </div>
    </article>
  );
}
