/**
 * Per-user "when did I last view this section" timestamps, stored locally.
 *
 * Drives the NEW markers on content cards and (for Responsibilities, whose
 * full list lives on the client) the section badge. The timestamps are
 * deliberately device-local — "read" is a per-device concept for content
 * feeds like the Library and Innovation Cloud.
 */

export type SeenSection = "responsibilities" | "library" | "innovation";

const KEY = "trak:seen";

function storageKey(userId: string, section: SeenSection): string {
  return `${KEY}:${userId}:${section}`;
}

/** Milliseconds since epoch of the last visit, or 0 if never visited. */
export function getSeenTime(userId: string, section: SeenSection): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(storageKey(userId, section));
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Record that the user just viewed a section (clears its badge/markers). */
export function markSectionSeen(
  userId: string,
  section: SeenSection,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId, section), String(Date.now()));
}

/** True when an item created at `createdAt` is newer than the last visit. */
export function isNewSinceSeen(
  userId: string,
  section: SeenSection,
  createdAt: string,
): boolean {
  return new Date(createdAt).getTime() > getSeenTime(userId, section);
}

/** Count of items (by `createdAt`) newer than the last visit. */
export function countNewSinceSeen<T>(
  userId: string,
  section: SeenSection,
  items: T[],
  createdAtOf: (item: T) => string,
): number {
  const seen = getSeenTime(userId, section);
  return items.reduce(
    (total, item) => total + (new Date(createdAtOf(item)).getTime() > seen ? 1 : 0),
    0,
  );
}