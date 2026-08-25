"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { useTrak } from "@/context/TrakStore";
import { buildActivityReportHTML, downloadReportDoc } from "@/lib/reports/buildReport";
import { PATHS } from "@/components/icons";
import { PrimaryMini } from "@/components/ui/Buttons";

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
      {open && act && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(13,29,26,0.55)] backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[92vh] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-[18px] bg-[#e5e3db] shadow-[0_30px_70px_rgba(0,0,0,0.4)]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-6 sm:py-4">
              <div>
                <div className="text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">
                  Report preview — A4
                </div>
                <div className="mt-0.5 max-w-[520px] truncate font-display text-[16.5px] font-semibold">
                  {act.title}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <PrimaryMini
                  onClick={() => {
                    downloadReportDoc(html, act.title);
                    showToast(
                      "Report downloaded",
                      "Saved as a Word-ready document — open it, review, and fill in anything flagged for manual entry.",
                    );
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.download} />
                  </svg>
                  Download
                </PrimaryMini>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-neutral-bg text-lg text-ink-soft"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex flex-1 justify-center overflow-y-auto bg-[#e5e3db] p-4 sm:p-8">
              <iframe
                title="Activity report preview"
                className="min-h-[297mm] w-[210mm] max-w-full border-none bg-white shadow-[0_6px_28px_rgba(0,0,0,0.22)]"
                srcDoc={html}
              />
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
