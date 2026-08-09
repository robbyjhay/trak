import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createNow } from "@/lib/dates";
import { seedDb } from "@/lib/mockDb/seed";
import type { TrakDb, User } from "@/lib/types";

export interface TrakState {
  users: User[];
  db: TrakDb;
  /** Counter used by uid() — kept in sync with mutation helpers. */
  uidN: number;
  seededAt: string;
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
  for (const m of state.db.community) scan(m.id);
  for (const b of state.db.broadcasts) scan(b.id);
  for (const n of state.db.notifications) scan(n.id);
  return max + 1;
}

function buildSeedState(): TrakState {
  const now = createNow();
  const { db, users } = seedDb(now);
  return {
    users,
    db,
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
    parsed.db.community ||= [];
    parsed.db.broadcasts ||= [];
    parsed.db.notifications ||= [];
    parsed.uidN = Math.max(parsed.uidN || 1000, maxUidFromState(parsed));
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
  serverTime: string;
}> {
  const state = await getState();
  return {
    users: structuredClone(state.users),
    db: structuredClone(state.db),
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
