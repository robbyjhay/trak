"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { apiGet, apiSend } from "@/lib/api/client";
import { PATHS } from "@/components/icons";
import { fmtDate } from "@/lib/dates";
import { ResourceDetailModal, PrimaryBtn } from "@/components/library/ResourceDetailModal";
import { CategoryChip, StatusBadge } from "@/components/library/bits";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { GhostBtn } from "@/components/ui/Buttons";
import { TrakLoader } from "@/components/ui/TrakLoader";
import type { LibraryResource, LibraryCategory, LibraryStatus } from "@/lib/types";

export default function ManageLibraryPage() {
  const router = useRouter();
  const { sessionUser, showToast } = useTrak();
  
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LibraryCategory | "ALL">("ALL");
  const [status, setStatus] = useState<LibraryStatus | "ALL">("ALL");
  const [sort, setSort] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // Modals
  const [reviewResource, setReviewResource] = useState<LibraryResource | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        status,
        sort,
      });
      
      const data = await apiGet<{ resources: LibraryResource[]; meta: { total: number } }>(`/api/library/manage?${q.toString()}`);
      setResources(data.resources);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
      // Redirect if not head
      if (err instanceof Error && err.message.includes("Head")) {
        router.push("/library");
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status, sort, router]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, status, sort]);

  const handleApprove = async (id: string) => {
    setSubmitting(true);
    try {
      await apiSend(`/api/library/${id}/approve`, "POST");
      showToast("Resource approved", "It is now visible in the public library.");
      setReviewResource(null);
      fetchResources();
    } catch (err) {
      showToast("Error approving resource", err instanceof Error ? err.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!declineReason.trim()) return;
    setSubmitting(true);
    try {
      await apiSend(`/api/library/${reviewResource?.id}/decline`, "POST", { reason: declineReason });
      showToast("Resource declined", "The submitter has been notified.");
      setDeclineOpen(false);
      setReviewResource(null);
      fetchResources();
    } catch (err) {
      showToast("Error declining resource", err instanceof Error ? err.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="page-head mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Manage Library</h1>
          <p className="mt-1 text-[14px] text-foreground-secondary">
            Review and manage submitted resources.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={PATHS.search} />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full rounded-[10px] border border-border bg-surface-muted py-2 pl-9 pr-4 text-[13px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DECLINED">Declined</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="BOOK">Books</option>
            <option value="VIDEO">Videos</option>
            <option value="AUDIO">Audio</option>
            <option value="MEMO">Memos</option>
            <option value="OTHER">Other</option>
          </select>
          
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-critical-surface p-4 text-center text-sm font-semibold text-critical-semantic">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <TrakLoader className="h-14 w-14" />
        </div>
      ) : resources.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 text-[12px] font-bold text-foreground-faint sm:grid">
            <div>Resource</div>
            <div>Submitted By</div>
            <div>Date</div>
            <div>Status</div>
            <div className="w-[100px] text-right">Action</div>
          </div>
          
          {resources.map((res) => (
            <div
              key={res.id}
              className="group flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4 transition-colors hover:border-primary sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <CategoryChip category={res.category} />
                  <StatusBadge status={res.status} />
                </div>
                <h3 className="line-clamp-1 text-[14px] font-bold text-foreground" title={res.title}>
                  {res.title}
                </h3>
                <div className="mt-1 hidden sm:block">
                  <CategoryChip category={res.category} />
                </div>
              </div>
              
              <div className="text-[12.5px] font-semibold text-foreground-secondary">
                <span className="sm:hidden font-medium text-foreground-faint mr-1">By:</span>
                {res.submittedByName}
              </div>
              
              <div className="text-[12.5px] text-foreground-secondary">
                <span className="sm:hidden font-medium text-foreground-faint mr-1">Date:</span>
                {fmtDate(res.createdAt)}
              </div>
              
              <div className="hidden sm:block">
                <StatusBadge status={res.status} />
              </div>
              
              <div className="mt-2 flex justify-end sm:mt-0 sm:w-[100px]">
                <button
                  type="button"
                  onClick={() => setReviewResource(res)}
                  className="rounded-[9px] border-[1.5px] border-border px-3.5 py-1.5 text-xs font-bold text-foreground-secondary transition-colors hover:border-primary hover:text-foreground"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
          
          {total > limit && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="text-sm text-foreground-secondary">No resources found matching your filters.</p>
        </div>
      )}

      <ResourceDetailModal
        resource={reviewResource}
        showStatus={true}
        onClose={() => setReviewResource(null)}
        actions={
          reviewResource?.status === "PENDING" ? (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setDeclineReason("");
                  setDeclineOpen(true);
                }}
                className="rounded-[11px] bg-critical-surface px-[26px] py-3.5 text-[13.5px] font-bold text-critical-semantic transition-colors hover:bg-critical-surface/80 disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleApprove(reviewResource.id)}
                className="rounded-[11px] bg-success px-[26px] py-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
              >
                {submitting ? "Approving..." : "Approve"}
              </button>
            </>
          ) : null
        }
      />

      {/* Decline Reason Modal */}
      <ModalBackdrop open={declineOpen} onClose={() => !submitting && setDeclineOpen(false)} labelledBy="decline-title">
        <ModalPanel>
          <h2 id="decline-title" className="font-display text-[20px] font-bold text-foreground">
            Decline Resource
          </h2>
          <p className="mt-1 text-[13px] text-foreground-secondary">
            Please provide a reason. The submitter will receive this feedback.
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label htmlFor="decline-reason" className="mb-1.5 block text-[12.5px] font-bold text-foreground">
                Reason <span className="text-critical-semantic" aria-hidden>*</span>
              </label>
              <textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="e.g. Inaccessible link, Duplicate resource..."
                className="w-full resize-y rounded-[12px] border-[1.5px] border-border bg-surface-muted px-3.5 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none"
              />
            </div>
            
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <GhostBtn onClick={() => setDeclineOpen(false)} disabled={submitting}>Cancel</GhostBtn>
              <button
                type="button"
                disabled={!declineReason.trim() || submitting}
                onClick={handleDeclineSubmit}
                className="rounded-[11px] bg-critical px-[26px] py-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-critical/90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Decline Resource"}
              </button>
            </div>
          </div>
        </ModalPanel>
      </ModalBackdrop>
    </div>
  );
}
