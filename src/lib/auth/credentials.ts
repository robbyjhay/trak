/**
 * Server-only credential store.
 * Passwords are bcrypt-hashed — never exposed to the client.
 * Prototype plaintext password for all accounts: DLUactsys360
 */
import "server-only";
import bcrypt from "bcryptjs";

const PLAIN_PASSWORD = "DLUactsys360";

/** Precomputed at module load so login is fast in the demo. */
const passwordHash = bcrypt.hashSync(PLAIN_PASSWORD, 10);

const CREDENTIALS: { id: string; username: string; passwordHash: string }[] = [
  { id: "babajide", username: "DLUARU", passwordHash },
  { id: "benson", username: "DLUOGU", passwordHash },
  { id: "agbaje", username: "DLUIBR", passwordHash },
  { id: "rufai", username: "DLUHAM", passwordHash },
  { id: "busari", username: "DLUQUD", passwordHash },
  { id: "omolara", username: "DLUOLA", passwordHash },
  { id: "omolola", username: "DLUAJA", passwordHash },
  { id: "oyindamola", username: "DLUADE", passwordHash },
  { id: "okikiola", username: "DLUJEF", passwordHash },
];

export function findCredentialByUsername(username: string) {
  return CREDENTIALS.find(
    (c) => c.username.toLowerCase() === username.toLowerCase(),
  );
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Dev-only: username → plaintext for quick-select (never ship to production client). */
export const DEV_PLAIN_PASSWORD = PLAIN_PASSWORD;
