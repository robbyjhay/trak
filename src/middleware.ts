import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "trak_session";
const secret = new TextEncoder().encode(
  process.env.TRAK_SESSION_SECRET ||
    "trak-dev-secret-change-me-in-production-32b",
);

const PUBLIC_PREFIXES = ["/login", "/rsvp"];
const PUBLIC_API = ["/api/auth", "/api/rsvp"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static / next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Public RSVP page + public RSVP API
  if (
    pathname.startsWith("/rsvp") ||
    pathname === "/api/rsvp" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (pathname === "/login") {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      // Require session for all non-public APIs
      if (!PUBLIC_API.some((p) => pathname.startsWith(p))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }
    if (!PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (pathname === "/" && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
