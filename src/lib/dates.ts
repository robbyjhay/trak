/**
 * UTC-anchored calendar date math — matches the prototype.
 * Avoids Lagos UTC+1 off-by-one when converting local midnights.
 */

export function createNow(): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 9, 30, 0),
  );
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

export function iso(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function parseSafeDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v.includes("T") ? v : v + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(v: string | null | undefined): string {
  const d = parseSafeDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: v?.includes("T") ? undefined : "UTC",
  });
}

export function fmtDateShort(v: string | null | undefined): string {
  const d = parseSafeDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: v?.includes("T") ? undefined : "UTC",
  });
}

export function fmtDateFull(v: string | null | undefined): string {
  const d = parseSafeDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: v?.includes("T") ? undefined : "UTC",
  });
}

export function fmtTime(v: string | null | undefined): string {
  if (!v) return "—";
  if (v.includes("T")) {
    const d = parseSafeDate(v);
    if (!d) return "—";
    return d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const [h, m] = v.split(":");
  if (!h || !m) return "—";
  const hh = parseInt(h, 10);
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}

export function daysBetween(a: string | null | undefined, b: string | null | undefined): number {
  const da = parseSafeDate(a);
  const db = parseSafeDate(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function longDateLabel(now: Date): string {
  if (!(now instanceof Date) || isNaN(now.getTime())) return "—";
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatRelativeDate(value: string | Date | null | undefined): string {
  if (!value) return "—";

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    date = parseSafeDate(value) as Date;
  }
  
  if (!date || isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
