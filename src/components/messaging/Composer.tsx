import React, { useRef, useEffect, useState } from "react";
import { PATHS } from "@/components/icons";
import type { SendMessageAttachmentInput } from "@/lib/types";

const EXT_MIME: Record<string, string> = {
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function resolveMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const name = file.name.toLowerCase();
  for (const [ext, mime] of Object.entries(EXT_MIME)) {
    if (name.endsWith(ext)) return mime;
  }
  return file.type || "application/octet-stream";
}

export function Composer({
  value,
  onChange,
  placeholder,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSend: (attachments?: SendMessageAttachmentInput[]) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mentionOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
        mentionStartRef.current = -1;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mentionOpen]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;
      onChange(newValue);

      if (showMentions) {
        const mention = parseMentionQuery(newValue, cursorPos);
        if (mention) {
          setMentionOpen(true);
          setMentionQuery(mention.query);
          mentionStartRef.current = mention.start;
        } else {
          setMentionOpen(false);
        }
      }
    },
    [onChange, showMentions],
  );

  const handleMentionSelect = useCallback(
    (mention: MentionSelect) => {
      if (mentionStartRef.current === -1) return;
      const cursorPos = textareaRef.current?.selectionStart ?? value.length;
      const mentionInsertPos = mentionStartRef.current;
      const mentionData = { userId: mention.userId, displayName: mention.displayName, position: mentionInsertPos };
      const result = insertMention(value, mentionInsertPos, cursorPos, mentionData);
      const mentionText = `@${mention.displayName}`;
      const mentionLen = mentionText.length + 1;
      setPendingMentions((prev) => {
        if (prev.some((m) => m.userId === mention.userId)) return prev;
        const updated = prev.map((m) => ({
          ...m,
          position: m.position >= mentionInsertPos ? m.position + mentionLen : m.position,
        }));
        return [...updated, { userId: mention.userId, displayName: mention.displayName, position: mentionInsertPos }];
      });
      onChange(result.text);
      setMentionOpen(false);
      mentionStartRef.current = -1;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(result.cursorPos, result.cursorPos);
        }
      });
    },
    [value, onChange],
  );

  const handleMentionClose = useCallback(() => {
    setMentionOpen(false);
    mentionStartRef.current = -1;
    textareaRef.current?.focus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploadError(null);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadError(null);
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed && !file) return;
    if (uploading) return;

    if (mentionOpen) return;

    const mentionsToSend = pendingMentions.length > 0 ? [...pendingMentions] : undefined;

    if (!file) {
      onSend(undefined, mentionsToSend);
      setPendingMentions([]);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      // 1. Get signed URL
      const res = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "message_attachment",
          contentType: resolveMimeType(file),
          filename: file.name,
          size: file.size,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to sign upload");
      }
      const { uploadUrl, key, method } = await res.json();

      // 2. Upload file
      const putRes = await fetch(uploadUrl, {
        method,
        headers: { "Content-Type": resolveMimeType(file) },
        body: file,
      });
      if (!putRes.ok) throw new Error("Failed to upload file");

      const att: SendMessageAttachmentInput = {
        name: file.name,
        size: file.size,
        contentType: resolveMimeType(file),
        storageKey: key,
      };

      onSend([att], mentionsToSend);
      setPendingMentions([]);
      removeFile();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const canSend = Boolean(value.trim() || file);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setUploadError(null);
      if (f.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(f));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col z-10 relative ${isDragging ? 'bg-primary/5 border-primary border-dashed border-t-2' : 'bg-background transition-colors'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {showMentions && users && currentUserId && (
        <MentionAutocomplete
          query={mentionQuery}
          users={users}
          currentUserId={currentUserId}
          onSelect={handleMentionSelect}
          onClose={handleMentionClose}
          isOpen={mentionOpen}
        />
      )}
      {file && (
        <div className="px-4 pt-4 sm:px-6 md:px-8">
          <div className="relative inline-flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-2 shadow-sm max-w-[200px]">
            <button
              type="button"
              onClick={removeFile}
              disabled={uploading}
              className="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-critical-semantic text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50"
              aria-label="Remove attachment"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-h-[120px] rounded-lg object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-foreground-secondary">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span className="truncate w-full text-center text-xs font-medium">{file.name}</span>
                <span className="text-[10px] mt-1 opacity-70">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-xs">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            )}
            {uploadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-critical-surface/90 backdrop-blur-xs p-2 text-center">
                <span className="text-xs font-bold text-critical-semantic mb-1">Failed</span>
                <span className="text-[10px] text-critical-semantic/80 leading-tight">{uploadError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex px-4 py-3 pb-[env(safe-area-inset-bottom)] sm:px-6 md:px-8 md:pb-4">
        <div className="flex flex-1 items-end gap-1.5 rounded-[24px] bg-surface border border-transparent focus-within:border-border focus-within:ring-2 focus-within:ring-foreground/10 px-1.5 py-1.5 shadow-sm transition-all">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground active:bg-surface-interactive disabled:opacity-50 mb-0.5"
            aria-label="Attach file"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d={PATHS.plus} />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            placeholder={file ? "Add a caption..." : placeholder}
            className="w-full resize-none border-none outline-none ring-0 bg-transparent text-[15px] leading-[20px] text-foreground placeholder-input-placeholder scrollbar-thin self-center max-h-[120px] py-[9.5px] px-1"
            rows={1}
            disabled={uploading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                if (mentionOpen) return;
                e.preventDefault();
                handleSend();
              }
            }}
            suppressHydrationWarning
          />

          <button
            type="button"
            onClick={handleSend}
            className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-none transition-all duration-200 mb-0.5 ${
              canSend && !uploading && !mentionOpen
                ? "cursor-pointer bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 hover:bg-primary-hover" 
                : "bg-transparent text-foreground-faint cursor-default"
            }`}
            aria-label="Send message"
            disabled={!canSend || uploading || mentionOpen}
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-[2px] mt-[1px]">
                <path d={PATHS.send} />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
