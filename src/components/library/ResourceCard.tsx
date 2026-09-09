"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/dates";
import type { LibraryResource } from "@/lib/types";
import { CategoryChip, CategoryIcon, EXTERNAL_LINK_PATH, StatusBadge } from "./bits";

function Thumb({ resource, className }: { resource: LibraryResource; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? resource.thumbnailUrl : null;
  return (
    <div className={cn("relative overflow-hidden bg-aztec-3/10 dark:bg-white/5", className)} aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-aztec-3 to-aztec p-2 text-center text-white">
          <CategoryIcon category={resource.category} size={22} />
          <span className="text-[9px] font-bold tracking-wide uppercase opacity-80">
            {resource.category}
          </span>
        </div>
      )}
    </div>
  );
}

function Meta({ resource, light = false }: { resource: LibraryResource; light?: boolean }) {
  return (
    <div className={cn("text-[11px]", light ? "text-white/70" : "text-foreground-faint")}>
      <span className="font-semibold">{resource.submittedByName}</span>
      <span aria-hidden> · </span>
      <time dateTime={resource.createdAt}>{fmtDate(resource.createdAt)}</time>
    </div>
  );
}

/**
 * Responsive resource card.
 * Desktop/tablet: balanced vertical tile. Mobile: compact horizontal row.
 */
export function ResourceCard({
  resource,
  onOpen,
  showStatus = false,
  footer,
}: {
  resource: LibraryResource;
  onOpen: () => void;
  showStatus?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-card border border-border bg-surface shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-modal focus-within:ring-2 focus-within:ring-primary">
      {/* Mobile: compact horizontal */}
      <div className="flex gap-3 p-3 sm:hidden">
        <Thumb resource={resource} className="h-[72px] w-[72px] shrink-0 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-[13.5px] leading-snug font-bold text-foreground">
              <button type="button" onClick={onOpen} className="text-left focus-visible:outline-none">
                {resource.title}
              </button>
            </h3>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-foreground-faint" aria-label="External resource">
              <path d={EXTERNAL_LINK_PATH} />
            </svg>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoryChip category={resource.category} />
            {showStatus && <StatusBadge status={resource.status} />}
          </div>
          <div className="mt-1 truncate">
            <Meta resource={resource} />
          </div>
          {resource.description ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] text-foreground-secondary">{resource.description}</p>
          ) : null}
          {footer}
        </div>
      </div>

      {/* Tablet/desktop: vertical tile */}
      <div className="hidden sm:block">
        <button type="button" onClick={onOpen} className="block w-full text-left focus-visible:outline-none" aria-label={`Open ${resource.title}`}>
          <Thumb resource={resource} className="aspect-[16/9] w-full" />
        </button>
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip category={resource.category} />
            {showStatus && <StatusBadge status={resource.status} />}
            <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-foreground-faint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d={EXTERNAL_LINK_PATH} />
              </svg>
              External
            </span>
          </div>
          <h3 className="line-clamp-2 text-[15px] leading-snug font-bold text-foreground">
            <button type="button" onClick={onOpen} className="text-left focus-visible:outline-none hover:underline">
              {resource.title}
            </button>
          </h3>
          {resource.description ? (
            <p className="line-clamp-2 text-[13px] leading-snug text-foreground-secondary">{resource.description}</p>
          ) : null}
          <Meta resource={resource} />
          <button
            type="button"
            onClick={onOpen}
            className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-border px-3.5 py-2 text-xs font-bold text-foreground-secondary transition-all duration-150 hover:border-primary hover:text-foreground active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View resource
          </button>
          {footer}
        </div>
      </div>
    </article>
  );
}
