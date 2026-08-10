/**
 * @deprecated Phase 1 — domain data lives in PostgreSQL via Prisma.
 * This JSON file store is retained only for offline migration scripts.
 * Application code must use `@/lib/db/service` instead.
 */
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createNow } from "@/lib/dates";
import { seedDb } from "@/lib/mockDb/seed";
import { RESPONSIBILITIES } from "@/lib/mockDb/responsibilities";
import bcrypt from "bcryptjs";
import { getDevSeedPassword } from "@/lib/auth/password";
import type {
  Responsibility,
  TrakDb,
  User,
  UserCredentials,
} from "@/lib/types";

/**
 * Legacy JSON-store credential hashes only.
 * Uses dev seed password when ENABLE_DEV_LOGIN is set; otherwise a random
 * unusable hash so shared production passwords never land on disk.
 */
function legacyCredentialHash(): string {
  const dev = getDevSeedPassword();
  if (dev) return bcrypt.hashSync(dev, 12);
  return bcrypt.hashSync(`legacy-unused-${Date.now()}-${Math.random()}`, 12);
}

export interface TrakState {
  users: User[];
  db: TrakDb;
  responsibilities: Responsibility[];
  /** Server-only sign-in rows — never sent to the client. */
  credentials: UserCredentials[];
  /** Counter used by uid() — kept in sync with mutation helpers. */
  uidN: number;
  seededAt: string;
  /** Transient — marks a load-time backfill that needs persisting. */
  dirty?: boolean;
}

const DATA_DIR =
  process.env.TRAK_DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "trak-db.json");

type GlobalStore = {
  __trakState?: TrakState;
  __trakReady?: Promise<TrakState>;
  __trakMutex?: Promise<void>;
};

function g(): GlobalStore {
  return globalThis as unknown as GlobalStore;
}

/**
 * Read the current uid counter by scanning existing ids so restarts don't collide.
 */
function maxUidFromState(state: { users: User[]; db: TrakDb }): number {
  let max = 1000;
  const re = /_(\d+)$/;
  const scan = (id: string) => {
    const m = re.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  };
  for (const a of state.db.activities) scan(a.id);
  for (const l of state.db.dailyLogs) scan(l.id);
  for (const c of state.db.comments) scan(c.id);
  for (const d of state.db.dms) scan(d.id);
  for (const c of state.db.calls) scan(c.id);
  for (const m of state.db.community) scan(m.id);
  for (const b of state.db.broadcasts) scan(b.id);
  for (const n of state.db.notifications) scan(n.id);
  return max + 1;
}

function buildCredentials(users: User[]): UserCredentials[] {
  const hash = legacyCredentialHash();
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    passwordHash: hash,
    mustChangePassword: true,
  }));
}

function buildSeedState(): TrakState {
  const now = createNow();
  const { db, users } = seedDb(now);
  return {
    users,
    db,
    responsibilities: structuredClone(RESPONSIBILITIES),
    credentials: buildCredentials(users),
    uidN: maxUidFromState({ users, db }),
    seededAt: now.toISOString(),
  };
}

async function loadFromDisk(): Promise<TrakState | null> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as TrakState;
    if (!parsed?.db || !Array.isArray(parsed.users)) return null;
    parsed.db.activities ||= [];
    parsed.db.dailyLogs ||= [];
    parsed.db.comments ||= [];
    parsed.db.dms ||= [];
    parsed.db.calls ||= [];
    parsed.db.community ||= [];
    parsed.db.broadcasts ||= [];
    parsed.db.notifications ||= [];
    if (!Array.isArray(parsed.responsibilities)) {
      parsed.responsibilities = structuredClone(RESPONSIBILITIES);
      parsed.dirty = true;
    }
    parsed.credentials ||= [];
    // Backfill a sign-in row for any user added before credentials existed.
    if (parsed.credentials.length < parsed.users.length) {
      const hash = legacyCredentialHash();
      const credIds = new Set(parsed.credentials.map((c) => c.id));
      for (const u of parsed.users) {
        if (!credIds.has(u.id)) {
          parsed.credentials.push({
            id: u.id,
            username: u.username,
            passwordHash: hash,
            mustChangePassword: true,
          });
        }
      }
      await writeToDisk(parsed);
    }
    // Pre-existing rows predate the flag — default to forced change on next login.
    if (parsed.credentials.some((c) => c.mustChangePassword === undefined)) {
      parsed.credentials = parsed.credentials.map((c) => ({
        ...c,
        mustChangePassword: c.mustChangePassword ?? true,
      }));
      await writeToDisk(parsed);
    }
    parsed.uidN = Math.max(parsed.uidN || 1000, maxUidFromState(parsed));
    if (parsed.dirty) await writeToDisk(parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeToDisk(state: TrakState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(state), "utf8");
  await fs.rename(tmp, DB_FILE);
}

async function initState(): Promise<TrakState> {
  const existing = await loadFromDisk();
  if (existing) return existing;
  const seeded = buildSeedState();
  await writeToDisk(seeded);
  return seeded;
}

/** Ensure store is loaded (once per process). */
export async function getState(): Promise<TrakState> {
  const glob = g();
  if (glob.__trakState) return glob.__trakState;
  if (!glob.__trakReady) {
    glob.__trakReady = initState().then((s) => {
      glob.__trakState = s;
      return s;
    });
  }
  return glob.__trakReady;
}

/**
 * Mutate state under a process-wide mutex, then persist to disk.
 */
export async function withState<T>(
  fn: (state: TrakState) => T | Promise<T>,
): Promise<T> {
  const glob = g();
  const prev = glob.__trakMutex || Promise.resolve();
  let release!: () => void;
  glob.__trakMutex = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    const state = await getState();
    const result = await fn(state);
    try {
      await writeToDisk(state);
    } catch (err) {
      console.error("[trak-db] persist failed", err);
    }
    return result;
  } finally {
    release();
  }
}

/** Snapshot for client bootstrap (structured clone). */
export async function getSnapshot(): Promise<{
  users: User[];
  db: TrakDb;
  responsibilities: Responsibility[];
  serverTime: string;
}> {
  const state = await getState();
  return {
    users: structuredClone(state.users),
    db: structuredClone(state.db),
    responsibilities: structuredClone(state.responsibilities),
    serverTime: new Date().toISOString(),
  };
}

/** Allocate the next uid and advance counter (call inside withState). */
export function nextUid(state: TrakState, prefix: string): string {
  const id = `${prefix}_${state.uidN}`;
  state.uidN += 1;
  return id;
}

/** Dev helper: wipe and re-seed. */
export async function resetStore(): Promise<TrakState> {
  const seeded = buildSeedState();
  const glob = g();
  glob.__trakState = seeded;
  await writeToDisk(seeded);
  return seeded;
}
