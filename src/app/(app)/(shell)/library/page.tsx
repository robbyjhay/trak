"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { LibraryIcon, PATHS } from "@/components/icons";
import { ResourceCard } from "@/components/library/ResourceCard";
import { AddResourceModal } from "@/components/library/AddResourceModal";
import { ResourceDetailModal } from "@/components/library/ResourceDetailModal";
import { TrakLoader } from "@/components/ui/TrakLoader";
import type { LibraryResource, LibraryCategory } from "@/lib/types";

/* ── helper ────────────────────────────────────────────────────────── */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

type SortKey = "newest" | "oldest" | "name-asc" | "name-desc";

/* ── tab content (kept mounted so the slide is smooth) ─────────────── */
function TabContent({
  tab,
  showStatus,
  search,
  category,
  sort,
  onOpen,
  onAdd,
}: {
  tab: "library" | "mine";
  showStatus: boolean;
  search: string;
  category: LibraryCategory | "ALL";
  sort: SortKey;
  onOpen: (r: LibraryResource) => void;
  onAdd: () => void;
}) {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [search, category, sort]);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        sort,
      });

      const endpoint =
        tab === "mine" ? `/api/library/mine?${q.toString()}` : `/api/library?${q.toString()}`;

      const data = await apiGet<{
        resources: LibraryResource[];
        meta: { total: number };
      }>(endpoint);
      setResources(data.resources);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, category, sort]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  if (error) {
    return (
      <div className="rounded-xl bg-critical-surface p-4 text-center text-sm font-semibold text-critical-semantic">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 w-full items-center justify-center">
        <TrakLoader className="h-14 w-14" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-foreground-faint">
          <LibraryIcon size={28} strokeWidth={1.6} />
        </div>
        <h3 className="mb-1.5 font-display text-lg font-bold text-foreground">
          {tab === "library" ? "No resources yet" : "No submissions"}
        </h3>
        <p className="mb-6 max-w-sm text-sm text-foreground-secondary">
          {tab === "library"
            ? "Be the first to contribute a useful resource to the library."
            : "You haven't submitted any resources to the library yet."}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          Add the first resource
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resources.map((res) => (
          <ResourceCard key={res.id} resource={res} onOpen={() => onOpen(res)} showStatus={showStatus} />
        ))}
      </div>

      {total > limit && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function LibraryPage() {
  const reducedMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<"library" | "mine">("library");

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LibraryCategory | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [detailResource, setDetailResource] = useState<LibraryResource | null>(null);

  const TABS: { key: "library" | "mine"; label: string }[] = [
    { key: "library", label: "Approved Resources" },
    { key: "mine", label: "My Submissions" },
  ];

  return (
    <div>
      {/* ── tabs — directly under the Library topbar ───────────────── */}
      <div className="mb-5 flex w-fit rounded-full bg-surface-muted p-1 border border-border">
        {TABS.map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative cursor-pointer rounded-full border-none px-6 py-2.5 text-[14px] font-semibold transition-colors duration-150 ${
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

      {/* ── supporting text + Add Resource — same row below tabs ──── */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[15px] text-foreground-secondary">
          Shared resources contributed by members of the unit.
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground shadow-sm transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d={PATHS.plus} />
          </svg>
          Add Resource
        </button>
      </div>

      {/* ── filters (library tab only) ────────────────────────────── */}
      {activeTab === "library" && (
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
              placeholder="Search library..."
              className="w-full rounded-[10px] border border-border bg-surface-muted py-2 pl-9 pr-4 text-[13px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LibraryCategory | "ALL")}
              className="flex-1 rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
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
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="flex-1 rounded-[10px] border border-border bg-surface-muted py-2 pl-3 pr-8 text-[13px] font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>
        </div>
      )}

      {/* ── content — smooth horizontal slide between tabs ────────── */}
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex w-[200%]",
            !reducedMotion && "transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            activeTab === "mine" ? "-translate-x-1/2" : "translate-x-0",
          )}
        >
          <div className="w-1/2 shrink-0">
            <TabContent
              tab="library"
              showStatus={false}
              search={search}
              category={category}
              sort={sort}
              onOpen={setDetailResource}
              onAdd={() => setAddOpen(true)}
            />
          </div>
          <div className="w-1/2 shrink-0">
            <TabContent
              tab="mine"
              showStatus
              search={search}
              category={category}
              sort={sort}
              onOpen={setDetailResource}
              onAdd={() => setAddOpen(true)}
            />
          </div>
        </div>
      </div>

      <AddResourceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setActiveTab("mine");
        }}
      />

      <ResourceDetailModal
        resource={detailResource}
        showStatus={activeTab === "mine"}
        onClose={() => setDetailResource(null)}
      />
    </div>
  );
}
