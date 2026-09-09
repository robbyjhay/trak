"use client";

import { useEffect, useRef, useState } from "react";
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

const inputClass = (hasErr: boolean) =>
  `w-full rounded-[12px] border-[1.5px] ${
    hasErr ? "border-critical" : "border-border"
  } bg-surface-muted px-3.5 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`;

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

  const titleErr = !cleanTitle;
  const titleTooLong = cleanTitle.length > 300;
  const categoryErr = !category;
  const urlMissing = !cleanUrl;
  const urlInvalid = Boolean(cleanUrl) && !urlValid;
  const descTooLong = description.trim().length > 5000;
  const thumbErr = urlValid && category && !thumbnailSatisfied;

  const hasErrors =
    titleErr || titleTooLong || categoryErr || urlMissing || urlInvalid || descTooLong || thumbErr;
  const canSubmit = !hasErrors && !submitting && uploadState !== "uploading";

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
      <ModalPanel wide bottomSheetOnMobile className="sm:w-[900px] sm:max-w-[95vw]">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-aztec-3 to-aztec text-white"
            aria-hidden
          >
            <LibraryIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="add-resource-title" className="font-display text-[20px] font-bold text-foreground">
              Add a resource
            </h2>
            <p id="add-resource-desc" className="text-[12.5px] text-foreground-secondary">
              Share a link to a useful resource. The file stays where it is — TRAK only keeps the link and details.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          noValidate
          className="flex flex-col gap-4"
        >
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
              className={inputClass(titleErr || titleTooLong)}
              autoComplete="off"
            />
            {titleErr && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Enter a resource name.
              </p>
            )}
            {!titleErr && titleTooLong && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Name must be 300 characters or fewer.
              </p>
            )}
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
              className={`${inputClass(categoryErr)} appearance-none cursor-pointer`}
            >
              <option value="">Select a type…</option>
              {ORDER.map((c) => (
                <option key={c} value={c}>
                  {LIBRARY_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            {categoryErr && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Choose a resource type.
              </p>
            )}
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
              className={`${inputClass(descTooLong)} resize-y`}
            />
            {descTooLong && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Description must be 5000 characters or fewer.
              </p>
            )}
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
              className={inputClass(urlMissing || urlInvalid)}
              aria-describedby={urlInvalid ? undefined : "lib-url-hint"}
            />
            {urlMissing ? (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Paste the resource link.
              </p>
            ) : urlInvalid ? (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Enter a valid http(s) link.
              </p>
            ) : (
              <p id="lib-url-hint" className="mt-1 text-[11.5px] text-foreground-faint">
                {isYouTube
                  ? "YouTube link detected — the video thumbnail will be used automatically."
                  : "Paste the share link from Drive, YouTube, Dropbox or any trusted host."}
              </p>
            )}
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
            {thumbErr && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                Add a cover image for this resource.
              </p>
            )}
          </div>

          {formError ? (
            <p role="alert" className="rounded-[10px] bg-critical-surface px-3 py-2 text-[12.5px] font-semibold text-critical-semantic">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-[11px] border border-border bg-surface-muted px-[26px] py-3.5 text-[13.5px] font-bold text-foreground-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-[11px] bg-primary px-[26px] py-3.5 text-[13.5px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}