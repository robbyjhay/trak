import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isIosUserAgent, isStandaloneMode } from "@/hooks/usePwaInstall";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("iOS / standalone detection", () => {
  test("detects iPhone and iPad user agents", () => {
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "iPhone",
        5,
      ),
    ).toBe(true);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "iPad",
        5,
      ),
    ).toBe(true);
  });

  test("detects iPadOS desktop-mode UA via touch points", () => {
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
        "MacIntel",
        5,
      ),
    ).toBe(true);
  });

  test("does not flag desktop or Android as iOS", () => {
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Win32",
        0,
      ),
    ).toBe(false);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        "Linux armv8l",
        5,
      ),
    ).toBe(false);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
        "MacIntel",
        0,
      ),
    ).toBe(false);
  });

  test("standalone is true when either signal is present", () => {
    expect(isStandaloneMode(true, false)).toBe(true);
    expect(isStandaloneMode(false, true)).toBe(true);
    expect(isStandaloneMode(true, true)).toBe(true);
    expect(isStandaloneMode(false, false)).toBe(false);
  });
});

describe("manifest — single installable source", () => {
  test("route manifest exists and meets Chrome installability requirements", () => {
    const manifest = readSrc("src/app/manifest.ts");
    expect(manifest).toContain('start_url: "/dashboard"');
    expect(manifest).toContain('scope: "/"');
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain('sizes: "192x192"');
    expect(manifest).toContain('sizes: "512x512"');
    // Installability requires purpose "any" icons — maskable-only does not count.
    expect(manifest).toContain('purpose: "any"');
    expect(manifest).toContain('purpose: "maskable"');
    expect(manifest).toContain('theme_color: "#0d1d1a"');
  });

  test("no conflicting static public/manifest.webmanifest", () => {
    expect(existsSync(join(process.cwd(), "public/manifest.webmanifest"))).toBe(false);
  });

  test("layout links the manifest and iOS touch icon", () => {
    const layout = readSrc("src/app/layout.tsx");
    expect(layout).toContain('manifest: "/manifest.webmanifest"');
    expect(layout).toContain("apple-touch-icon");
    expect(layout).toContain("appleWebApp");
  });

  test("real icon files exist at manifest sizes", () => {
    expect(existsSync(join(process.cwd(), "public/icon-192.png"))).toBe(true);
    expect(existsSync(join(process.cwd(), "public/icon-512.png"))).toBe(true);
  });
});

describe("service worker + proxy readiness", () => {
  test("sw.js has a fetch handler (installability requirement)", () => {
    const sw = readSrc("public/sw.js");
    expect(sw).toContain('addEventListener("fetch"');
  });

  test("proxy serves PWA assets without a session", () => {
    const proxy = readSrc("src/proxy.ts");
    expect(proxy).toContain('"/sw.js"');
    expect(proxy).toContain('"/manifest.webmanifest"');
  });
});

describe("install hook + UI behavior guards", () => {
  test("hook defers beforeinstallprompt and hides after install", () => {
    const hook = readSrc("src/hooks/usePwaInstall.ts");
    expect(hook).toContain("beforeinstallprompt");
    expect(hook).toContain("preventDefault");
    expect(hook).toContain("appinstalled");
    expect(hook).toContain("userChoice");
    // iOS handled separately — never a fake prompt there.
    expect(hook).toContain("ios-guidance");
  });

  test("InstallAppRow hides when installed/unavailable, guides iOS separately", () => {
    const row = readSrc("src/components/pwa/InstallAppRow.tsx");
    expect(row).toContain('"installed"');
    expect(row).toContain('"unavailable"');
    expect(row).toContain("return null");
    expect(row).toContain("ios-guidance");
    expect(row).toContain("Add to Home Screen");
  });

  test("notification architecture untouched by install work", () => {
    const policy = readSrc("src/lib/notificationPolicy.ts");
    expect(policy).not.toContain("beforeinstallprompt");
    const service = readSrc("src/lib/db/service.ts");
    expect(service).not.toContain("beforeinstallprompt");
  });
});
