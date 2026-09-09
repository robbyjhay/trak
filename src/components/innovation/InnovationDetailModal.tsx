"use client";

import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { fmtDate } from "@/lib/dates";
import type { Innovation } from "@/lib/types";
import { CategoryChip, StatusBadge, BulbIcon } from "./bits";

export function InnovationDetailModal({
  innovation,
  showStatus,
  onClose,
  actions,
}: {
  innovation: Innovation | null;
  showStatus: boolean;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <ModalBackdrop
      open={!!innovation}
      onClose={onClose}
      labelledBy="inno-detail-title"
      bottomSheetOnMobile
    >
      <ModalPanel bottomSheetOnMobile>
        {innovation && (
          <>
            {/* Header */}
            <div className="mb-5 flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-aztec-3 to-aztec text-white"
                aria-hidden
              >
                <BulbIcon size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="inno-detail-title"
                  className="font-display text-[19px] font-bold leading-tight text-foreground"
                >
                  {innovation.title}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <CategoryChip category={innovation.category} />
                  {showStatus && <StatusBadge status={innovation.status} />}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-foreground-faint mb-1.5">
                Description
              </p>
              <p className="text-[14px] text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                {innovation.description}
              </p>
            </div>

            {/* Supporting Details */}
            {innovation.details && (
              <div className="mb-4">
                <p className="text-[12px] font-bold uppercase tracking-wide text-foreground-faint mb-1.5">
                  Supporting Details
                </p>
                <p className="text-[14px] text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                  {innovation.details}
                </p>
              </div>
            )}

            {/* Decline reason */}
            {innovation.status === "DECLINED" && innovation.declineReason && (
              <div className="mb-4 rounded-[12px] bg-critical-surface p-3.5">
                <p className="text-[12px] font-bold text-critical-semantic mb-1">
                  Reason for Decline
                </p>
                <p className="text-[13px] text-critical-semantic">
                  {innovation.declineReason}
                </p>
              </div>
            )}

            {/* Meta info */}
            <div className="mb-5 flex flex-col gap-1.5 rounded-[12px] bg-surface-muted p-3.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground-faint">
                  Submitted by
                </span>
                <span className="font-bold text-foreground">
                  {innovation.submittedByName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground-faint">
                  Date submitted
                </span>
                <time
                  className="font-bold text-foreground"
                  dateTime={innovation.createdAt}
                >
                  {fmtDate(innovation.createdAt)}
                </time>
              </div>
              {innovation.reviewedAt && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground-faint">
                    Reviewed
                  </span>
                  <time
                    className="font-bold text-foreground"
                    dateTime={innovation.reviewedAt}
                  >
                    {fmtDate(innovation.reviewedAt)}
                  </time>
                </div>
              )}
              {innovation.implementedAt && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground-faint">
                    Implemented
                  </span>
                  <time
                    className="font-bold text-foreground"
                    dateTime={innovation.implementedAt}
                  >
                    {fmtDate(innovation.implementedAt)}
                  </time>
                </div>
              )}
            </div>

            {/* Actions */}
            {actions ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {actions}
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[11px] border border-border bg-surface-muted px-[26px] py-3.5 text-[13.5px] font-bold text-foreground-secondary transition-colors hover:bg-surface-hover"
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </ModalPanel>
    </ModalBackdrop>
  );
}
