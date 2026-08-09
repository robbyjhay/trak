/**
 * Dev-only quick-select data. Username only — password never leaves server
 * except via a guarded API used solely in non-production.
 */
import { DEV_ROSTER } from "@/lib/mockDb/users";

export function getDevRoster() {
  if (process.env.NODE_ENV === "production") return [];
  return DEV_ROSTER;
}
