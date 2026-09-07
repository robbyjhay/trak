"use no memo";

import type { LinkPreview } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LinkPreviewCard({
  preview,
  me,
}: {
  preview: LinkPreview;
  me: boolean;
}) {
  if (!preview) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mb-1.5 mt-1 flex w-full flex-col overflow-hidden rounded-[12px] no-underline transition-colors",
        me
          ? "bg-black/10 text-primary-foreground hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15"
          : "bg-surface-muted hover:bg-surface-hover text-foreground"
      )}
      style={{ WebkitTapHighlightColor: "transparent" } as any}
    >
      {preview.image && (
        <div className="relative w-full overflow-hidden border-b border-black/5 dark:border-white/5">
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-[200px] w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="px-3 py-2">
        <div className={cn("truncate text-[11px] font-medium tracking-tight", me ? "text-primary-foreground/60" : "text-foreground-faint")}>
          {preview.domain}
        </div>
        {preview.title && (
          <div className="mt-0.5 truncate text-[13px] font-bold leading-tight">{preview.title}</div>
        )}
        {preview.description && (
          <div className={cn("mt-0.5 line-clamp-2 text-[12px] leading-snug", me ? "text-primary-foreground/70" : "text-foreground-secondary")}>
            {preview.description}
          </div>
        )}
      </div>
    </a>
  );
}
