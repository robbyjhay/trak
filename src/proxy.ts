import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware — cookie presence + public allowlist only (AUDIT_05 A).
 * Full session validation (DB) happens in server layouts and requireSession().
 * Do NOT blanket-allow /api/auth/* — only explicit public auth routes.
 *
 * Phase 4 (AUDIT_08): attaches x-request-id + CSP nonce and emits security
 * headers (CSP, HSTS production-only, nosniff, referrer, permissions-policy).
 */

const COOKIE_NAME = "trak_session";

/** Exact or prefix public page paths. */
const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/rsvp",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
];

/** Exact public API paths (not prefixes under /api/auth). */
const PUBLIC_API_EXACT = new Set([
  "/api/auth/login",
  "/api/health",
  "/api/ready",
  "/api/rsvp",
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
  "/api/auth/invite/accept",
]);

/** Public API path prefixes (parameterized routes). */
const PUBLIC_API_PREFIXES = [
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
  "/api/auth/invite/accept",
];

function isPublicApi(pathname: string): boolean {
  if (PUBLIC_API_EXACT.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isStaticOrInternal(pathname: string): boolean {
  return (pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon") || /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname));
}

/**
 * Security headers applied to every response. HSTS and CSP are production
 * hardening (AUDIT_06 §5); dev builds skip them so local tooling is unaffected.
 */
function applySecurityHeaders(
  res: NextResponse,
  requestId: string,
  nonce: string,
  isHttpsRequest: boolean,
) {
  
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set(
    "referrer-policy",
    "strict-origin-when-cross-origin",
  );
  res.headers.set(
    "permissions-policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
  );
  res.headers.set("x-frame-options", "DENY");

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "strict-transport-security",
      "max-age=63072000; includeSubDomains; preload",
    );
    const upgrade = isHttpsRequest ? "upgrade-insecure-requests; " : "";
    res.headers.set(
      "content-security-policy",
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "media-src 'self' blob: data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        ...(upgrade ? [upgrade.trim()] : []),
      ].join("; "),
    );
  }
}

/**
 * Phase 0F: CSRF Origin validation for state-changing API requests.
 * Returns a 403 response if CSRF validation fails, or null if it passes.
 */
function csrfCheck(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;
  if (!req.nextUrl.pathname.startsWith("/api/")) return null;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin) {
    return new NextResponse(
      JSON.stringify({ error: "CSRF failed: Missing Origin header" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host !== host) {
      return new NextResponse(
        JSON.stringify({ error: "CSRF failed: Origin mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new NextResponse(
      JSON.stringify({ error: "CSRF failed: Invalid Origin" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return null;
}

/** Route the request, enforce CSRF, and decorate the response with Phase 4 headers. */
export async function proxy(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const nonce = crypto.randomUUID();
  req.headers.set("x-request-id", requestId);
  req.headers.set("x-trak-nonce", nonce);

  const { pathname } = req.nextUrl;
  const isHttps = req.nextUrl.protocol === "https:";

  if (isStaticOrInternal(pathname)) {
    const res = NextResponse.next();
    res.headers.set("x-request-id", requestId);
    return res;
  }

  // Phase 0F: CSRF check on all state-changing API requests
  const csrfResult = csrfCheck(req);
  if (csrfResult) {
    applySecurityHeaders(csrfResult, requestId, nonce, isHttps);
    return csrfResult;
  }

  // Dev-fill is gated in the route handler; allow through only non-production
  // and only this exact path (handler enforces ENABLE_DEV_LOGIN).
  if (pathname === "/api/auth/dev-fill") {
    const res = NextResponse.next();
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) {
      const res = NextResponse.next();
      applySecurityHeaders(res, requestId, nonce, isHttps);
      return res;
    }
    // Protected API: require cookie presence (full validation in handler)
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const res = NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        },
        { status: 401 },
      );
      applySecurityHeaders(res, requestId, nonce, isHttps);
      return res;
    }
    const res = NextResponse.next();
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  let res: NextResponse;

  const hasCookie = Boolean(req.cookies.get(COOKIE_NAME)?.value);

  if (pathname === "/login") {
    res = NextResponse.next();
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  // set-password requires a session cookie
  if (pathname === "/set-password" || pathname.startsWith("/set-password/")) {
    if (!hasCookie) {
      res = NextResponse.redirect(new URL("/login", req.url));
    } else {
      res = NextResponse.next();
    }
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  if (isPublicPage(pathname)) {
    res = NextResponse.next();
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  if (!hasCookie) {
    const login = new URL("/login", req.url);
    if (pathname !== "/") {
      login.searchParams.set("next", pathname);
    }
    res = NextResponse.redirect(login);
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  if (pathname === "/") {
    res = NextResponse.redirect(new URL("/dashboard", req.url));
    applySecurityHeaders(res, requestId, nonce, isHttps);
    return res;
  }

  res = NextResponse.next();
  applySecurityHeaders(res, requestId, nonce, isHttps);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
