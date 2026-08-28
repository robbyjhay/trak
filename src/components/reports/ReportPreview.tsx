"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { useTrak } from "@/context/TrakStore";
import { buildActivityReportHTML, downloadReportDoc } from "@/lib/reports/buildReport";
import { PATHS } from "@/components/icons";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";

interface ReportCtx {
  openReport: (activityId: string) => void;
}

const Ctx = createContext<ReportCtx>({ openReport: () => {} });

export function useReportPreview() {
  return useContext(Ctx);
}

export function ReportPreviewProvider({ children }: { children: React.ReactNode }) {
  const { getActivity, db, userMap, responsibilities, now, showToast } =
    useTrak();
  const [open, setOpen] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [html, setHtml] = useState("");

  const openReport = useCallback(
    (id: string) => {
      const act = getActivity(id);
      if (!act) return;
      if (act.status !== "completed") {
        showToast(
          "Report not ready yet",
          "This activity's report is available once at least one day is submitted.",
        );
        return;
      }
      setActivityId(id);
      setHtml(buildActivityReportHTML(act, db, userMap, responsibilities, now));
      setOpen(true);
    },
    [getActivity, db, userMap, responsibilities, now, showToast],
  );

  const act = activityId ? getActivity(activityId) : null;

  return (
    <Ctx.Provider value={{ openReport }}>
      {children}
      <ModalBackdrop open={open && !!act} onClose={() => setOpen(false)} labelledBy="report-preview-title" bottomSheetOnMobile>
        <ModalPanel wide bottomSheetOnMobile className="flex flex-col overflow-hidden p-0 relative h-[90vh] sm:h-[94vh] sm:w-[1000px] sm:max-w-[95vw]">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-modal px-5 py-4">
            <div>
              <div id="report-preview-title" className="text-[10.5px] font-bold tracking-widest text-foreground-faint uppercase">
                Report preview — A4
              </div>
              <div className="mt-0.5 max-w-[320px] truncate font-display text-[16.5px] font-semibold">
                {act?.title}
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-surface-muted text-lg text-foreground-secondary hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex flex-1 overflow-y-auto bg-surface-muted">
            <iframe
              title="Activity report preview"
              className="h-full w-full border-none bg-transparent"
              srcDoc={html}
            />
          </div>
          
          <button
            type="button"
            className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
            aria-label="Download Report"
            onClick={() => {
              if (act) {
                const memberName = userMap[act.createdBy]?.name || "Unknown";
                const dateStr = now.toISOString().split("T")[0];
                const filename = `${memberName} - Activity Report - ${dateStr}.doc`;
                downloadReportDoc(html, filename);
                showToast(
                  "Report downloaded",
                  "Saved as a Word-ready document — open it, review, and fill in anything flagged for manual entry.",
                );
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.download} />
            </svg>
          </button>
        </ModalPanel>
      </ModalBackdrop>
    </Ctx.Provider>
  );
}
