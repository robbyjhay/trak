"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTrak } from "@/context/TrakStore";
import { apiGet, apiSend } from "@/lib/api/client";
import { PATHS } from "@/components/icons";
import { fmtDate } from "@/lib/dates";
import { InnovationDetailModal } from "@/components/innovation/InnovationDetailModal";
import { DelegateModal } from "@/components/delegation/DelegateModal";
import {
  CategoryChip,
  StatusBadge,
  BulbIcon,
  INNOVATION_CATEGORY_LABELS,
} from "@/components/innovation/bits";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { GhostBtn } from "@/components/ui/Buttons";
import { TrakLoader } from "@/components/ui/TrakLoader";
import { INNOVATION_CATEGORIES } from "@/lib/types";
import type { Innovation, InnovationCategory, InnovationStatus } from "@/lib/types";

type SortOpt = "newest" | "oldest" | "name-asc" | "name-desc";

export default function ManageInnovationPage() {
  const router = useRouter();
  const { showToast } = useTrak();

  const [innovations, setInnovations] = useState<Innovation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<InnovationCategory | "ALL">("ALL");
  const [status, setStatus] = useState<InnovationStatus | "ALL">("ALL");
  const [sort, setSort] = useState<SortOpt>("newest");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [reviewInnovation, setReviewInnovation] = useState<Innovation | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [delegateInnovation, setDelegateInnovation] = useState<Innovation | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchInnovations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        category,
        status,
        sort,
      });
      const data = await apiGet<{
        innovations: Innovation[];
        meta: { total: number };
      }>(`/api/innovation-cloud/manage?${q}`);
      setInnovations(data.innovations);
      setTotal(data.meta.total);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load innovations.";
      setError(msg);
      if (msg.includes("Head")) router.push("/innovation-cloud");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, status, sort, router]);

  useEffect(() => {
    fetchInnovations();
  }, [fetchInnovations]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, status, sort]);

  async function handleApprove(id: string) {
    setSubmitting(true);
    try {
      await apiSend(`/api/innovation-cloud/${id}/approve`, "POST");
      showToast("Innovation approved", "The member has been notified.");
      setReviewInnovation(null);
      fetchInnovations();
    } catch (err) {
      showToast(
        "Error approving",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeclineSubmit() {
    if (!reviewInnovation || !declineReason.trim()) return;
    setSubmitting(true);
    try {
      await apiSend(
        `/api/innovation-cloud/${reviewInnovation.id}/decline`,
        "POST",
        { reason: declineReason },
      );
      showToast("Innovation declined", "The member has been notified.");
      setDeclineOpen(false);
      setReviewInnovation(null);
      fetchInnovations();
    } catch (err) {
      showToast(
        "Error declining",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImplement(id: string) {
    setSubmitting(true);
    try {
      await apiSend(`/api/innovation-cloud/${id}/implement`, "POST");
      showToast("Marked as Implemented", "The member has been notified.");
      setReviewInnovation(null);
      fetchInnovations();
    } catch (err) {
      showToast(
        "Error updating",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Actions passed into detail modal
  function renderActions() {
    if (!reviewInnovation) return null;
    const { status: s, id } = reviewInnovation;

    if (s === "PENDING") {
      return (
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
            onClick={() => handleApprove(id)}
            className="rounded-[11px] bg-success px-[26px] py-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
          >
            {submitting ? "Approving..." : "Approve"}
          </button>
        </>
      );
    }

    if (s === "APPROVED") {
      return (
        <>
          <button
            type="button"
            onClick={() => setDelegateInnovation(reviewInnovation)}
            className="rounded-[11px] bg-primary px-[26px] py-3.5 text-[13.5px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Assign Collaborator
          </button>
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
            onClick={() => handleImplement(id)}
            className="rounded-[11px] bg-aztec-3 px-[26px] py-3.5 text-[13.5px] font-bold text-white shadow-sm transition-colors hover:bg-aztec-3/90 disabled:opacity-50"
          >
            {submitting ? "Updating..." : "✓ Mark as Implemented"}
          </button>
        </>
      );
    }

    // IMPLEMENTED or DECLINED — just close
    return (
      <button
        type="button"
        onClick={() => setReviewInnovation(null)}
        className="rounded-[11px] border border-border bg-surface-muted px-[26px] py-3.5 text-[13.5px] font-bold text-foreground-secondary transition-colors hover:bg-surface-hover"
      >
        Close
      </button>
    );
  }

  return (
    <div className="pb-24">
      {/* Page head */}
      <Link
        href="/innovation-cloud"
        className="mb-4 inline-flex items-center gap-2 text-[14px] font-semibold text-primary transition-colors hover:text-primary-hover"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d={PATHS.chevronLeft} />
        </svg>
        Innovation Cloud
      </Link>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">
            Manage Innovations
          </h1>
          <p className="mt-1 text-[14px] text-foreground-secondary">
            Review and act on submitted innovation ideas.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-faint"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d={PATHS.search} />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search innovations..."
            className="w-full rounded-[10px] border border-border bg-surface-muted py-2 pl-9 pr-4 text-[13px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as InnovationStatus | "ALL")
            }
            className="rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="IMPLEMENTED">Implemented</option>
            <option value="DECLINED">Declined</option>
          </select>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as InnovationCategory | "ALL")
            }
            className="rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {INNOVATION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {INNOVATION_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOpt)}
            className="rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
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
      ) : innovations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {/* Table header (desktop) */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-foreground-faint sm:grid">
            <div>Innovation</div>
            <div>Submitted By</div>
            <div>Date</div>
            <div>Status</div>
            <div className="w-[88px] text-right">Action</div>
          </div>

          {innovations.map((inno) => (
            <div
              key={inno.id}
              className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4 transition-colors hover:border-primary/40 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <CategoryChip category={inno.category} />
                  <StatusBadge status={inno.status} />
                </div>
                <h3
                  className="line-clamp-1 text-[14px] font-bold text-foreground"
                  title={inno.title}
                >
                  {inno.title}
                </h3>
                <div className="mt-1 hidden sm:block">
                  <CategoryChip category={inno.category} />
                </div>
              </div>
              <div className="text-[12.5px] font-semibold text-foreground-secondary">
                <span className="mr-1 font-medium text-foreground-faint sm:hidden">
                  By:
                </span>
                {inno.submittedByName}
              </div>
              <div className="text-[12.5px] text-foreground-secondary">
                <span className="mr-1 font-medium text-foreground-faint sm:hidden">
                  Date:
                </span>
                <time dateTime={inno.createdAt}>{fmtDate(inno.createdAt)}</time>
              </div>
              <div className="hidden sm:block">
                <StatusBadge status={inno.status} />
              </div>
              <div className="flex justify-end sm:w-[88px]">
                <button
                  type="button"
                  onClick={() => setReviewInnovation(inno)}
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
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                Previous
              </button>
              <span className="flex items-center px-3 text-sm text-foreground-secondary">
                {page} / {Math.ceil(total / limit)}
              </span>
              <button
                type="button"
                disabled={page * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground-faint">
            <BulbIcon size={26} />
          </div>
          <p className="text-[14px] font-semibold text-foreground mb-1">
            No innovations found
          </p>
          <p className="text-sm text-foreground-secondary">
            No submissions match your current filters.
          </p>
        </div>
      )}

      {/* Detail + Action modal */}
      <InnovationDetailModal
        innovation={reviewInnovation}
        showStatus
        onClose={() => setReviewInnovation(null)}
        actions={renderActions()}
      />

      {/* Decline reason modal */}
      <ModalBackdrop
        open={declineOpen}
        onClose={() => !submitting && setDeclineOpen(false)}
        labelledBy="inno-decline-title"
      >
        <ModalPanel>
          <h2
            id="inno-decline-title"
            className="font-display text-[20px] font-bold text-foreground"
          >
            Decline Innovation
          </h2>
          <p className="mt-1 text-[13px] text-foreground-secondary">
            Provide a clear reason. The submitter will receive this feedback.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label
                htmlFor="inno-decline-reason"
                className="mb-1.5 block text-[12.5px] font-bold text-foreground"
              >
                Reason{" "}
                <span className="text-critical-semantic" aria-hidden>
                  *
                </span>
              </label>
              <textarea
                id="inno-decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="e.g. Already being planned, Out of scope..."
                className="w-full resize-y rounded-[12px] border-[1.5px] border-border bg-surface-muted px-3.5 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <GhostBtn
                onClick={() => setDeclineOpen(false)}
                disabled={submitting}
                className="px-[26px] py-3.5 text-[13.5px]"
              >
                Cancel
              </GhostBtn>
              <button
                type="button"
                disabled={!declineReason.trim() || submitting}
                onClick={handleDeclineSubmit}
                className="rounded-[11px] bg-critical px-[26px] py-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-critical/90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Decline Innovation"}
              </button>
            </div>
          </div>
        </ModalPanel>
      </ModalBackdrop>

      {delegateInnovation && (
        <DelegateModal
          kind="innovation"
          targetId={delegateInnovation.id}
          title={delegateInnovation.title}
          open={Boolean(delegateInnovation)}
          onClose={() => setDelegateInnovation(null)}
          onSuccess={() => {
            setDelegateInnovation(null);
            fetchInnovations();
          }}
        />
      )}
    </div>
  );
}
