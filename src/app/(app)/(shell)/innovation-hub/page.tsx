"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTrak } from "@/context/TrakStore";
import { apiGet } from "@/lib/api/client";
import { PATHS } from "@/components/icons";
import { InnovationCard } from "@/components/innovation/InnovationCard";
import { SubmitInnovationModal } from "@/components/innovation/SubmitInnovationModal";
import { InnovationDetailModal } from "@/components/innovation/InnovationDetailModal";
import { BulbIcon, INNOVATION_CATEGORY_LABELS } from "@/components/innovation/bits";
import { TrakLoader } from "@/components/ui/TrakLoader";
import { INNOVATION_CATEGORIES } from "@/lib/types";
import type { Innovation, InnovationCategory } from "@/lib/types";

type Tab = "hub" | "mine";
type SortOpt = "newest" | "oldest" | "name-asc" | "name-desc";

export default function InnovationHubPage() {
  const { sessionUser } = useTrak();

  const [activeTab, setActiveTab] = useState<Tab>("hub");
  const [innovations, setInnovations] = useState<Innovation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<InnovationCategory | "ALL">("ALL");
  const [sort, setSort] = useState<SortOpt>("newest");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailInnovation, setDetailInnovation] = useState<Innovation | null>(null);

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
        sort,
      });
      const endpoint =
        activeTab === "mine"
          ? `/api/innovation-hub/mine?${q}`
          : `/api/innovation-hub?${q}`;
      const data = await apiGet<{
        innovations: Innovation[];
        meta: { total: number };
      }>(endpoint);
      setInnovations(data.innovations);
      setTotal(data.meta.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load innovations.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, debouncedSearch, category, sort]);

  useEffect(() => {
    fetchInnovations();
  }, [fetchInnovations]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, sort, activeTab]);

  function handleCreated(innovation: Innovation) {
    // Go to "My Submissions" after creating
    if (activeTab !== "mine") {
      setActiveTab("mine");
    } else {
      fetchInnovations();
    }
  }

  return (
    <div className="pb-24">
      {/* Tabs — directly under the Innovation Hub topbar */}
      <div className="mb-5 flex w-fit rounded-full bg-surface-muted p-1 border border-border">
        {(
          [
            { key: "hub" as const, label: "Innovation Hub" },
            { key: "mine" as const, label: "My Submissions" },
          ] as const
        ).map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative cursor-pointer rounded-full border-none px-6 py-2.5 text-[13.5px] font-semibold transition-colors duration-150 ${
                active
                  ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Supporting text + Submit Idea — same row below tabs */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[15px] text-foreground-secondary">
          Browse and submit ideas to improve the unit.
        </p>
        <button
          type="button"
          onClick={() => setSubmitOpen(true)}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground shadow-sm transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <BulbIcon size={16} />
          Submit Idea
        </button>
      </div>

      {/* Filters — hub tab only */}
      {activeTab === "hub" && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="relative w-full">
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
          <div className="flex flex-wrap gap-3">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as InnovationCategory | "ALL")
              }
              className="flex-1 rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
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
              className="flex-1 rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl bg-critical-surface p-4 text-center text-sm font-semibold text-critical-semantic">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <TrakLoader className="h-14 w-14" />
        </div>
      ) : innovations.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {innovations.map((inno) => (
              <InnovationCard
                key={inno.id}
                innovation={inno}
                onOpen={() => setDetailInnovation(inno)}
                showStatus={activeTab === "mine"}
              />
            ))}
          </div>
          {/* Pagination */}
          {total > limit && (
            <div className="mt-8 flex justify-center gap-2">
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
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-foreground-faint">
            <BulbIcon size={28} />
          </div>
          <h3 className="mb-1.5 font-display text-[18px] font-bold text-foreground">
            {activeTab === "hub" ? "No ideas yet" : "No submissions yet"}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-foreground-secondary">
            {activeTab === "hub"
              ? "Be the first to submit an innovation idea to the unit."
              : "You haven't submitted any innovation ideas yet. Share your first idea!"}
          </p>
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <BulbIcon size={15} />
            Submit first idea
          </button>
        </div>
      )}

      <SubmitInnovationModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onCreated={handleCreated}
      />

      <InnovationDetailModal
        innovation={detailInnovation}
        showStatus={activeTab === "mine"}
        onClose={() => setDetailInnovation(null)}
      />
    </div>
  );
}
