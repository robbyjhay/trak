import {
  findCredentialByUsername,
  verifyPassword,
} from "@/lib/auth/credentials";
import {
  createSessionToken,
  sessionUserFromId,
  setSessionCookie,
} from "@/lib/auth/session";
import { jsonError, jsonOk, parseJsonBody } from "@/lib/api/http";
import { handleServiceError } from "@/lib/api/http";

/**
 * JSON login alternative to the server-action form login.
 * POST { username, password } → sets session cookie.
 */
export async function POST(req: Request) {
  try {
    const body = await parseJsonBody<{
      username?: string;
      password?: string;
    }>(req);

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return jsonError(401, "Username or password not recognised.");
    }

    const cred = findCredentialByUsername(username);
    if (!cred || !(await verifyPassword(password, cred.passwordHash))) {
      return jsonError(401, "Username or password not recognised.");
    }

    const user = sessionUserFromId(cred.id);
    if (!user) {
      return jsonError(401, "Username or password not recognised.");
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return jsonOk({ ok: true, user });
  } catch (err) {
    return handleServiceError(err);
  }
}
