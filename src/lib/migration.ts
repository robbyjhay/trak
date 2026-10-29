/**
 * Domain migration constants + host detection.
 *
 * The retired (old) domain must serve the migration page only; the new Vercel
 * domain must keep serving the application. Hosts are matched exactly after
 * normalisation (lowercase, no port, no leading "www."), so localhost and any
 * unlisted host never trigger the migration page.
 */

export const NEW_TRAK_URL = "https://trak-dlu.vercel.app";
export const NEW_TRAK_LOGIN_URL = `${NEW_TRAK_URL}/login`;

/** Built-in retired hosts (Render deployment). */
const DEFAULT_OLD_HOSTS = ["trak-dlu.onrender.com"];

/** The new domain — never treated as retired, even if listed as old. */
const NEW_HOSTS = ["trak-dlu.vercel.app"];

function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  let host = raw.split(",")[0].trim().toLowerCase();
  if (!host) return "";
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end > 0) host = host.slice(0, end + 1);
  } else {
    const colon = host.lastIndexOf(":");
    if (colon > 0 && /^\d+$/.test(host.slice(colon + 1))) {
      host = host.slice(0, colon);
    }
  }
  if (host.startsWith("www.")) host = host.slice(4);
  return host;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => normalizeHost(entry))
    .filter(Boolean);
}

type MigrationEnv = Record<string, string | undefined>;

function dedupe(hosts: string[]): string[] {
  return Array.from(new Set(hosts));
}

/** Retired hosts: built-in default plus any `TRAK_OLD_DOMAINS` additions. */
export function oldTrakHosts(
  env: MigrationEnv = process.env,
): string[] {
  return dedupe([...DEFAULT_OLD_HOSTS, ...parseList(env.TRAK_OLD_DOMAINS)]);
}

/** Hosts that must always keep serving the real application. */
export function newTrakHosts(
  env: MigrationEnv = process.env,
): string[] {
  return dedupe([...NEW_HOSTS, ...parseList(env.TRAK_NEW_DOMAINS)]);
}

/**
 * True only for a configured retired host. The new domain, localhost and any
 * unlisted host return false, so the application routing is untouched there.
 */
export function isOldTrakHost(
  host: string | null | undefined,
  env?: MigrationEnv,
): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (newTrakHosts(env ?? process.env).includes(normalized)) return false;
  return oldTrakHosts(env ?? process.env).includes(normalized);
}
