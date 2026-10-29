import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import {
  NEW_TRAK_LOGIN_URL,
  NEW_TRAK_URL,
  isOldTrakHost,
  newTrakHosts,
  oldTrakHosts,
} from "@/lib/migration";

const OLD_HOST = "trak-dlu.onrender.com";
const NEW_HOST = "trak-dlu.vercel.app";

function readSrc(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isOldTrakHost", () => {
  test("retired Render host is detected", () => {
    expect(isOldTrakHost(OLD_HOST)).toBe(true);
  });

  test("normalises case, ports, www and trailing dots", () => {
    expect(isOldTrakHost("TRAK-DLU.ONRENDER.COM")).toBe(true);
    expect(isOldTrakHost(`${OLD_HOST}:443`)).toBe(true);
    expect(isOldTrakHost(`www.${OLD_HOST}`)).toBe(true);
    expect(isOldTrakHost(`${OLD_HOST}.`)).toBe(true);
    expect(isOldTrakHost(`${OLD_HOST}, secondary.internal`)).toBe(true);
  });

  test("new Vercel domain is never treated as retired", () => {
    expect(isOldTrakHost(NEW_HOST)).toBe(false);
    expect(isOldTrakHost(`www.${NEW_HOST}`)).toBe(false);
    expect(isOldTrakHost(`${NEW_HOST}:443`)).toBe(false);
    expect(isOldTrakHost(`${NEW_HOST}.`)).toBe(false);
  });

  test("localhost, IPs, other hosts and empty values are not retired", () => {
    expect(isOldTrakHost("localhost:3000")).toBe(false);
    expect(isOldTrakHost("127.0.0.1:3000")).toBe(false);
    expect(isOldTrakHost("example.com")).toBe(false);
    expect(isOldTrakHost("")).toBe(false);
    expect(isOldTrakHost(null)).toBe(false);
    expect(isOldTrakHost(undefined)).toBe(false);
  });

  test("TRAK_OLD_DOMAINS adds retired hosts without dropping the default", () => {
    vi.stubEnv("TRAK_OLD_DOMAINS", "legacy.example.gov.ng, old.example.gov.ng");
    expect(isOldTrakHost("legacy.example.gov.ng")).toBe(true);
    expect(isOldTrakHost("old.example.gov.ng")).toBe(true);
    expect(isOldTrakHost(OLD_HOST)).toBe(true);
    expect(isOldTrakHost("app.example.gov.ng")).toBe(false);
    expect(oldTrakHosts()).toEqual([
      OLD_HOST,
      "legacy.example.gov.ng",
      "old.example.gov.ng",
    ]);
  });

  test("the new domain wins even if listed as an old host", () => {
    vi.stubEnv("TRAK_OLD_DOMAINS", NEW_HOST);
    expect(isOldTrakHost(NEW_HOST)).toBe(false);
    expect(newTrakHosts()).toContain(NEW_HOST);
  });

  test("TRAK_NEW_DOMAINS force-serves the app on extra hosts", () => {
    vi.stubEnv("TRAK_OLD_DOMAINS", "alias.example.gov.ng");
    vi.stubEnv("TRAK_NEW_DOMAINS", "alias.example.gov.ng");
    expect(isOldTrakHost("alias.example.gov.ng")).toBe(false);
  });
});

describe("proxy — retired host serves only the migration page", () => {
  test("rewrites page requests to /migration (no redirect, no loop)", async () => {
    const res = await proxy(
      new NextRequest(`https://${OLD_HOST}/dashboard`, {
        headers: { host: OLD_HOST },
      }),
    );
    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite).toContain("/migration");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("serves /migration directly on the retired host", async () => {
    const res = await proxy(
      new NextRequest(`https://${OLD_HOST}/migration`, {
        headers: { host: OLD_HOST },
      }),
    );
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  test("root path on the retired host still reaches the migration page", async () => {
    const res = await proxy(
      new NextRequest(`https://${OLD_HOST}/`, { headers: { host: OLD_HOST } }),
    );
    expect(res.headers.get("x-middleware-rewrite")).toContain("/migration");
    expect(res.headers.get("location")).toBeNull();
  });

  test("retired host does not rewrite API routes", async () => {
    const res = await proxy(
      new NextRequest(`https://${OLD_HOST}/api/health`, {
        headers: { host: OLD_HOST },
      }),
    );
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  test("static assets stay on the retired host so the page can render", async () => {
    const res = await proxy(
      new NextRequest(`https://${OLD_HOST}/sw.js`, {
        headers: { host: OLD_HOST },
      }),
    );
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  test("new domain keeps normal app routing (unauthenticated → /login)", async () => {
    const res = await proxy(
      new NextRequest(`https://${NEW_HOST}/dashboard`, {
        headers: { host: NEW_HOST },
      }),
    );
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toContain("/login");
  });

  test("new domain root is not replaced by the migration page", async () => {
    const res = await proxy(
      new NextRequest(`https://${NEW_HOST}/`, { headers: { host: NEW_HOST } }),
    );
    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite === null || !rewrite.includes("/migration")).toBe(true);
  });

  test("localhost dev host is untouched", async () => {
    const res = await proxy(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { host: "localhost:3000" },
      }),
    );
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toContain("/login");
  });
});

describe("migration page content", () => {
  // JSX source wraps text across lines — assert against normalised whitespace.
  const component = readSrc("src/components/Migration.tsx").replace(/\s+/g, " ");
  const page = readSrc("src/app/migration/page.tsx").replace(/\s+/g, " ");

  test("CTA points at the new TRAK login", () => {
    expect(NEW_TRAK_LOGIN_URL).toBe("https://trak-dlu.vercel.app/login");
    expect(NEW_TRAK_URL).toBe("https://trak-dlu.vercel.app");
    expect(component).toContain("href={NEW_TRAK_LOGIN_URL}");
    expect(component).toContain("Go to the New TRAK");
  });

  test("tells users to sign in with existing credentials", () => {
    expect(component).toContain("same TRAK username and password");
    expect(component.toLowerCase()).toContain("forgot password");
  });

  test("tells installed-PWA users to reinstall from the new domain", () => {
    expect(component).toContain("Installed the app?");
    expect(component).toContain("add it again from the new address");
  });

  test("migration route exists and is noindex", () => {
    expect(page).toContain("TRAK has moved");
    expect(page).toContain("index: false");
  });
});
