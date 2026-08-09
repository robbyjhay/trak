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

/** Deterministic avatar palette for users (matches seed roster colors). */
const USER_COLORS = [
  "#8a6a1f",
  "#12915f",
  "#c1613f",
  "#1f7fa8",
  "#5a4413",
  "#193b34",
  "#7a4b1e",
  "#c99f2f",
  "#3a5a1f",
];

export function pickUserColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return USER_COLORS[h % USER_COLORS.length];
}
