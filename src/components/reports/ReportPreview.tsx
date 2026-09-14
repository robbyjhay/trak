"use client";

import { useState, createContext, useContext, useCallback } from "react";
import { useTrak } from "@/context/TrakStore";
import {
  buildActivityReportHTML,
  downloadReportDoc,
  printReport,
} from "@/lib/reports/buildReport";
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
    async (id: string) => {
      const act = getActivity(id);
      if (!act) return;
      if (act.status !== "completed") {
        showToast(
          "Report not ready yet",
          "This activity's report is available once at least one day is submitted.",
        );
        return;
      }
      const libraryTitles: Record<string, string> = {};
      const innovationTitles: Record<string, string> = {};
      if (act.libraryResourceId) {
        try {
          const r = await fetch(`/api/library/${act.libraryResourceId}`);
          const j = await r.json().catch(() => null);
          if (j?.resource?.title) libraryTitles[act.libraryResourceId] = j.resource.title;
        } catch {
          /* title is optional — report falls back to the ref code */
        }
      }
      if (act.innovationId) {
        try {
          const r = await fetch(`/api/innovation-cloud/${act.innovationId}`);
          const j = await r.json().catch(() => null);
          if (j?.innovation?.title) innovationTitles[act.innovationId] = j.innovation.title;
        } catch {
          /* title is optional — report falls back to the ref code */
        }
      }
      setActivityId(id);
      setHtml(
        buildActivityReportHTML(
          act,
          db,
          userMap,
          responsibilities,
          now,
          { libraryTitles, innovationTitles },
        ),
      );
      setOpen(true);
    },
    [getActivity, db, userMap, responsibilities, now, showToast],
  );

  const act = activityId ? getActivity(activityId) : null;

  const downloadPdf = useCallback(async () => {
    if (!act) return;
    const memberName = userMap[act.createdBy]?.name || "Unknown";
    const dateStr = now.toISOString().split("T")[0];
    const filename = `${memberName} - Activity Report - ${dateStr}`;
    try {
      const res = await fetch(`/api/reports/${act.id}?format=pdf`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showToast("PDF downloaded", "Saved as a print-ready A4 PDF.");
    } catch {
      showToast(
        "Download failed",
        "Couldn't generate the PDF. Try the Print option instead.",
      );
    }
  }, [act, userMap, now, showToast]);

  const downloadDoc = useCallback(() => {
    if (!act) return;
    const memberName = userMap[act.createdBy]?.name || "Unknown";
    const dateStr = now.toISOString().split("T")[0];
    const filename = `${memberName} - Activity Report - ${dateStr}.doc`;
    downloadReportDoc(html, filename);
    showToast(
      "Report downloaded",
      "Saved as a Word-ready document — open it, review, and fill in anything flagged for manual entry.",
    );
  }, [act, html, userMap, now, showToast]);

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
          
          <div className="absolute bottom-5 right-5 flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-full border-none bg-surface px-3 text-xs font-semibold text-foreground-secondary shadow-lg transition-transform hover:scale-105 hover:text-foreground"
              onClick={() => printReport(html)}
              aria-label="Print or save as PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.printer} />
              </svg>
              Print
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-full border-none bg-surface px-3 text-xs font-semibold text-foreground-secondary shadow-lg transition-transform hover:scale-105 hover:text-foreground"
              onClick={downloadDoc}
              aria-label="Download Word document"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.file} />
              </svg>
              .doc
            </button>
            <button
              type="button"
              className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105"
              onClick={downloadPdf}
              aria-label="Download PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.download} />
              </svg>
              PDF
            </button>
          </div>
        </ModalPanel>
      </ModalBackdrop>
    </Ctx.Provider>
  );
}
