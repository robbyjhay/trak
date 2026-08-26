export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}

export function escapeHtml(s: string | null | undefined): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function toBase64Url(str: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(str, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64Url(str: string): string | null {
  try {
    let s = String(str).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    if (typeof window === "undefined") {
      return Buffer.from(s, "base64").toString("utf8");
    }
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return null;
  }
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Format seconds as mm:ss call duration. */
export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Deterministic avatar palette for users (matches seed roster colors). */
const USER_COLORS = [
  "#8a6a1f",
  "#0e6b47",
  "#9a4428",
  "#1f7fa8",
  "#5a4413",
  "#193b34",
  "#7a4b1e",
  "#8a6c19",
  "#3a5a1f",
];

export function pickUserColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return USER_COLORS[h % USER_COLORS.length];
}

/**
 * Fixed palette for head-created members (matches the prototype's
 * MEMBER_COLORS). nextMemberColor() hands out the first color not already in
 * use, falling back to an index-based pick once the palette is exhausted.
 */
export const MEMBER_COLORS = [
  "#8a6a1f",
  "#12915f",
  "#c1613f",
  "#1f7fa8",
  "#5a4413",
  "#193b34",
  "#7a4b1e",
  "#c99f2f",
  "#3a5a1f",
  "#6b3fa0",
  "#a83250",
  "#2d6a6e",
  "#8c4f9e",
  "#2f6f47",
];

export function nextMemberColor(existing: Iterable<string>): string {
  const used = new Set(existing);
  return (
    MEMBER_COLORS.find((c) => !used.has(c)) ??
    MEMBER_COLORS[used.size % MEMBER_COLORS.length]
  );
}

/**
 * Suggest a DLU-style username from a member name: "DLU" + first 3 letters of
 * the surname (non-alpha stripped, padded to 3), uppercased — the exact
 * convention as the seeded roster (e.g. Arulogun → DLUARU). Collisions get a
 * numeric suffix (DLUOGU, DLUOGU2, …).
 */
export function suggestUsername(
  name: string,
  existing: Iterable<string>,
): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const surname = words.pop() ?? name.trim();
  const code = (surname.replace(/[^a-zA-Z]/g, "").toUpperCase() + "XXX").slice(
    0,
    3,
  );
  const base = `DLU${code}`;
  const taken = new Set<string>();
  for (const u of existing) taken.add(u.toUpperCase());
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn("navigator.clipboard failed, falling back", err);
    }
  }
  
  // Fallback for non-secure contexts (e.g., http://0.0.0.0:3000)
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (!successful) throw new Error("Fallback copy command failed");
  } finally {
    document.body.removeChild(textArea);
  }
}
