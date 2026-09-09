"use client";

import { useState } from "react";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { PrimaryBtn, GhostBtn } from "@/components/ui/Buttons";
import { fmtDateFull } from "@/lib/dates";
import type { LibraryResource } from "@/lib/types";
import { CategoryChip, CategoryIcon, EXTERNAL_LINK_PATH, StatusBadge } from "./bits";

export function ResourceDetailModal({
  resource,
  showStatus = false,
  onClose,
  actions,
}: {
  resource: LibraryResource | null;
  showStatus?: boolean;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <ModalBackdrop open={Boolean(resource)} onClose={onClose} labelledBy="library-detail-title" bottomSheetOnMobile>
      {resource && (
        <ModalPanel bottomSheetOnMobile className="w-[560px] max-w-[94vw] p-0">
          <div key={resource.id}>
            <div className="relative aspect-[16/8] w-full overflow-hidden rounded-t-[24px] bg-aztec-3/10 sm:rounded-t-[20px] dark:bg-white/5">
              {resource.thumbnailUrl && !imgFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resource.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-aztec-3 to-aztec text-white">
                  <CategoryIcon category={resource.category} size={30} />
                  <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">
                    {resource.category}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <span className="text-xl leading-none" aria-hidden>&times;</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip category={resource.category} />
                {showStatus && <StatusBadge status={resource.status} />}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground-faint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d={EXTERNAL_LINK_PATH} />
                  </svg>
                  External resource
                </span>
              </div>

              <h2 id="library-detail-title" className="font-display text-[22px] leading-tight font-bold text-foreground">
                {resource.title}
              </h2>

              {resource.description ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground-secondary">
                  {resource.description}
                </p>
              ) : null}

              <dl className="grid grid-cols-2 gap-3 rounded-[14px] bg-surface-muted/60 p-4 text-[12.5px]">
                <div>
                  <dt className="font-semibold text-foreground-faint">Contributor</dt>
                  <dd className="mt-0.5 font-bold text-foreground">{resource.submittedByName}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground-faint">Shared on</dt>
                  <dd className="mt-0.5 font-bold text-foreground">{fmtDateFull(resource.createdAt)}</dd>
                </div>
                {showStatus && resource.reviewerName ? (
                  <div>
                    <dt className="font-semibold text-foreground-faint">Reviewed by</dt>
                    <dd className="mt-0.5 font-bold text-foreground">{resource.reviewerName}</dd>
                  </div>
                ) : null}
                {showStatus && resource.status === "DECLINED" && resource.declineReason ? (
                  <div className="col-span-2">
                    <dt className="font-semibold text-foreground-faint">Why it was declined</dt>
                    <dd className="mt-0.5 font-semibold text-critical-semantic">{resource.declineReason}</dd>
                  </div>
                ) : null}
              </dl>

              <p className="break-all rounded-[12px] border border-border-subtle px-3 py-2 font-mono text-[11.5px] text-foreground-secondary">
                {resource.externalUrl}
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <GhostBtn onClick={onClose}>Close</GhostBtn>
                <a
                  href={resource.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-br from-aztec-3 to-aztec px-[26px] py-3.5 text-[13.5px] font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Open Resource
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d={EXTERNAL_LINK_PATH} />
                  </svg>
                </a>
                {actions}
              </div>
              <p className="text-center text-[11px] text-foreground-faint sm:text-right">
                This resource lives outside TRAK and opens in a new tab.
              </p>
            </div>
          </div>
        </ModalPanel>
      )}
    </ModalBackdrop>
  );
}

// Re-exported for the Head review flow (Approve/Decline actions slot in).
export { PrimaryBtn };
