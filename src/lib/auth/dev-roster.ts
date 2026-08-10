/**
 * Dev-only quick-select data. Username only — password never leaves server
 * except via /api/auth/dev-fill when ENABLE_DEV_LOGIN=true.
 */
import { DEV_ROSTER } from "@/lib/mockDb/users";
import { isDevLoginEnabled } from "@/lib/env";

export function getDevRoster() {
  if (!isDevLoginEnabled()) return [];
  return DEV_ROSTER;
}
