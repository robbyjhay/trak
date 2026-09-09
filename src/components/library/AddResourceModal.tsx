"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { LibraryIcon } from "@/components/icons";
import { apiSend } from "@/lib/api/client";
import { useTrak } from "@/context/TrakStore";
import {
  isAllowedExternalUrl,
  isYouTubeUrl,
  LIBRARY_CATEGORY_LABELS,
  youTubeThumbnailUrl,
} from "@/lib/library/urls";
import type { LibraryCategory, LibraryResource } from "@/lib/types";
import { LIBRARY_CATEGORIES } from "@/lib/types";

const ORDER: LibraryCategory[] = [...LIBRARY_CATEGORIES];
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputClass =
  "w-full rounded-[12px] border-[1.5px] border-border bg-surface-muted px-3.5 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function AddResourceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (resource?: LibraryResource) => void;
}) {
  const { showToast } = useTrak();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LibraryCategory | "">("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setCategory("");
      setDescription("");
      setExternalUrl("");
      setThumbnailKey(null);
      setPreviewUrl(null);
      setUploadState("idle");
      setUploadError("");
      setSubmitting(false);
      setFormError("");
    }
  }, [open]);

  const cleanTitle = title.trim().replace(/\s+/g, " ");
  const cleanUrl = externalUrl.trim();
  const urlValid = isAllowedExternalUrl(cleanUrl);
  const youtubeThumb = urlValid ? youTubeThumbnailUrl(cleanUrl) : null;
  const isYouTube = urlValid && isYouTubeUrl(cleanUrl);
  const thumbnailSatisfied = Boolean(thumbnailKey) || Boolean(youtubeThumb);
  const needsUpload = Boolean(category) && !isYouTube && urlValid;

  const errors = useMemo(() => {
    const list: string[] = [];
    if (!cleanTitle) list.push("Enter a resource name.");
    else if (cleanTitle.length > 300) list.push("Name must be 300 characters or fewer.");
    if (!category) list.push("Choose a resource type.");
    if (!cleanUrl) list.push("Paste the resource link.");
    else if (!urlValid) list.push("Enter a valid http(s) link.");
    if (description.trim().length > 5000) list.push("Description must be 5000 characters or fewer.");
    if (urlValid && category && !thumbnailSatisfied) {
      list.push("Add a cover image for this resource.");
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanTitle, category, cleanUrl, urlValid, description, thumbnailSatisfied]);

  const canSubmit = errors.length === 0 && !submitting && uploadState !== "uploading";

  async function handleFilePicked(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadState("error");
      setUploadError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_COVER_BYTES) {
      setUploadState("error");
      setUploadError("Cover must be 5 MB or smaller.");
      return;
    }
    setUploadState("uploading");
    try {
      const signed = await apiSend<{ key: string; uploadUrl: string; publicUrl: string; method: "PUT" }>(
        "/api/uploads/sign",
        "POST",
        { purpose: "library_thumbnail", contentType: file.type, size: file.size },
      );
      const putRes = await fetch(signed.uploadUrl, {
        method: signed.method,
        headers: { "Content-Type": file.type },
        body: file,
        credentials: "same-origin",
      });
      if (!putRes.ok) throw new Error("Upload failed. Try again.");
      setThumbnailKey(signed.key);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadState("idle");
    } catch (err) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await apiSend<{ resource: LibraryResource }>("/api/library", "POST", {
        title: cleanTitle,
        category,
        description: description.trim(),
        externalUrl: cleanUrl,
        thumbnailKey,
      });
      showToast("Resource submitted", "The Unit Heads have been notified for review.");
      onCreated(res.resource);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit. Try again.");
      setSubmitting(false);
    }
  }

  const shownPreview = previewUrl || youtubeThumb;

  return (
    <ModalBackdrop open={open} onClose={onClose} labelledBy="add-resource-title" describedBy="add-resource-desc" bottomSheetOnMobile>
      <ModalPanel bottomSheetOnMobile className="flex flex-col overflow-hidden p-0">
        {/* ── header (sticky so the X stays visible) ─────────────── */}
        <div className="flex items-start justify-between gap-3 shrink-0 px-7 pt-[max(28px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-aztec-3 to-aztec text-white"
              aria-hidden
            >
              <LibraryIcon size={20} />
            </div>
            <div>
              <h2 id="add-resource-title" className="font-display text-[20px] font-bold text-foreground">
                Add a resource
              </h2>
              <p id="add-resource-desc" className="text-[12.5px] text-foreground-secondary">
                Share a link to a useful resource. The file stays where it is — TRAK only keeps the link and details.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── scrollable form body ────────────────────────────────── */}
        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-7">
          <div>
            <label htmlFor="lib-title" className="mb-1.5 block text-[12.5px] font-bold text-foreground">
              Name / Title <span aria-hidden className="text-critical-semantic">*</span>
            </label>
            <input
              id="lib-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Effective Meeting Facilitation"
              maxLength={320}
              className={inputClass}
              autoComplete="off"
            />
          </div>

          {/* Type — dropdown */}
          <div>
            <label htmlFor="lib-type" className="mb-1.5 block text-[12.5px] font-bold text-foreground">
              Type <span aria-hidden className="text-critical-semantic">*</span>
            </label>
            <select
              id="lib-type"
              value={category}
              onChange={(e) => setCategory(e.target.value as LibraryCategory | "")}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="">Select a type…</option>
              {ORDER.map((c) => (
                <option key={c} value={c}>
                  {LIBRARY_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lib-desc" className="mb-1.5 block text-[12.5px] font-bold text-foreground">
              Description <span className="font-medium text-foreground-faint">(optional)</span>
            </label>
            <textarea
              id="lib-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this resource about, and who is it for?"
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="lib-url" className="mb-1.5 block text-[12.5px] font-bold text-foreground">
              Resource Link <span aria-hidden className="text-critical-semantic">*</span>
            </label>
            <input
              id="lib-url"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
              autoComplete="off"
              className={inputClass}
              aria-describedby="lib-url-hint"
            />
            <p id="lib-url-hint" className="mt-1 text-[11.5px] text-foreground-faint">
              {cleanUrl && !urlValid
                ? "That link doesn't look valid — use a full http(s) address."
                : isYouTube
                  ? "YouTube link detected — the video thumbnail will be used automatically."
                  : "Paste the share link from Drive, YouTube, Dropbox or any trusted host."}
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-[12.5px] font-bold text-foreground">
              Thumbnail / Cover{" "}
              {needsUpload && !thumbnailKey ? (
                <span aria-hidden className="text-critical-semantic">*</span>
              ) : (
                <span className="font-medium text-foreground-faint">{isYouTube ? "(automatic)" : "(optional override)"}</span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-surface-muted" aria-hidden>
                {shownPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground-faint">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Upload cover image"
                  onChange={(e) => {
                    void handleFilePicked(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadState === "uploading"}
                    className="rounded-[11px] border-[1.5px] border-border px-[18px] py-2.5 text-xs font-bold text-foreground-secondary transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
                  >
                    {uploadState === "uploading" ? "Uploading…" : thumbnailKey ? "Replace cover" : "Upload cover"}
                  </button>
                  {thumbnailKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailKey(null);
                        setPreviewUrl(null);
                      }}
                      className="rounded-[11px] px-3 py-2.5 text-xs font-bold text-critical-semantic hover:bg-critical-surface"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11.5px] text-foreground-faint" role={uploadState === "error" ? "alert" : undefined}>
                  {uploadState === "error" ? uploadError : "JPG, PNG or WebP up to 5 MB."}
                </p>
              </div>
            </div>
          </div>

          {formError ? (
            <p role="alert" className="rounded-[10px] bg-critical-surface px-3 py-2 text-[12.5px] font-semibold text-critical-semantic">
              {formError}
            </p>
          ) : null}

          {!canSubmit && (cleanTitle || category || cleanUrl) ? (
            <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-foreground-secondary" aria-live="polite">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* ── footer (sticky so Cancel/Submit stay visible) ───────── */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/50 px-7 pt-4 pb-[max(28px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-[11px] border border-border bg-surface-muted px-[26px] py-3.5 text-[13.5px] font-bold text-foreground-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-[11px] bg-primary px-[26px] py-3.5 text-[13.5px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}