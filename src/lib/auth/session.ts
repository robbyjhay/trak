import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/types";
import { SEED_USERS } from "@/lib/mockDb/users";

const COOKIE_NAME = "trak_session";
const secret = new TextEncoder().encode(
  process.env.TRAK_SESSION_SECRET ||
    "trak-dev-secret-change-me-in-production-32b",
);

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    isSecretary: user.isSecretary,
    isCorps: user.isCorps,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: String(payload.id),
      name: String(payload.name),
      username: String(payload.username),
      role: payload.role as SessionUser["role"],
      isSecretary: Boolean(payload.isSecretary),
      isCorps: Boolean(payload.isCorps),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function sessionUserFromId(id: string): SessionUser | null {
  const u = SEED_USERS.find((x) => x.id === id);
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    isSecretary: u.isSecretary,
    isCorps: u.isCorps,
  };
}

export { COOKIE_NAME };
