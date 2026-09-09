import type { LibraryCategory } from "@/lib/types";

/**
 * Client-safe Library helpers (no server imports).
 * URL validation here mirrors the server rules in `service.ts` — the server
 * always re-validates, so this module is for UX only.
 */

export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  BOOK: "Book",
  VIDEO: "Video",
  AUDIO: "Audio",
  MEMO: "Memo",
  OTHER: "Other",
};

const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "file:", "blob:", "ftp:"]);

export function isAllowedExternalUrl(raw: string): boolean {
  const value = (raw || "").trim();
  if (!value || value.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol)) return false;
  // Prefer HTTPS; HTTP is tolerated for legitimate hosts (intranet/docs).
  if (protocol !== "https:" && protocol !== "http:") return false;
  if (!parsed.hostname || parsed.hostname.length > 253) return false;
  return true;
}

export function normalizeExternalUrl(raw: string): string {
  return (raw || "").trim();
}

/** Extract a YouTube video id from watch / youtu.be / shorts / embed URLs. */
export function extractYouTubeId(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL((raw || "").trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const validId = (id: string | null | undefined) =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return validId(id);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") return validId(parsed.searchParams.get("v"));
    const parts = parsed.pathname.split("/").filter(Boolean);
    if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && parts[1]) {
      return validId(parts[1]);
    }
    return null;
  }
  if (host === "youtube-nocookie.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" && parts[1]) return validId(parts[1]);
    return null;
  }
  return null;
}

/**
 * Deterministic, provider-specific thumbnail — no arbitrary fetching, no SSRF
 * surface. Returns null for anything that is not a YouTube watch URL.
 */
export function youTubeThumbnailUrl(raw: string): string | null {
  const id = extractYouTubeId(raw);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function isYouTubeUrl(raw: string): boolean {
  return extractYouTubeId(raw) !== null;
}

/** Categories that require a manual cover/thumbnail upload. */
export function categoryRequiresUpload(category: LibraryCategory): boolean {
  return category === "BOOK" || category === "AUDIO" || category === "MEMO" || category === "OTHER";
}
