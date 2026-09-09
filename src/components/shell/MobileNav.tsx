"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LibraryIcon, PATHS } from "@/components/icons";
import { cn } from "@/lib/utils";

import { useConnectNav } from "@/context/ConnectNav";

const NAV_LEFT = [
  { href: "/dashboard", defaultLabel: "Dashboard", path: PATHS.dashboard },
  { href: "/activities", defaultLabel: "Activities", path: PATHS.checkList },
];

const NAV_RIGHT = [
  { href: "/messages", defaultLabel: "Messages", path: PATHS.messages, also: ["/contacts"] },
  { href: "/responsibilities", defaultLabel: "Responsibilities", path: PATHS.responsibilities },
];

const MORE_NAV = [
  {
    href: "/library",
    label: "Library",
    icon: <LibraryIcon size={22} />,
  },
  {
    href: "/innovation-hub",
    label: "Innovation Hub",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d={PATHS.bulb} />
      </svg>
    ),
  },
  {
    href: "/responsibilities",
    label: "Responsibilities",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d={PATHS.responsibilities} />
      </svg>
    ),
  },
];

// Hamburger / more icon
function MoreIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      {open ? (
        <path d="M18 6L6 18M6 6l12 12" />
      ) : (
        <>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </>
      )}
    </svg>
  );
}

function ScoopBackground() {
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[-40px] z-[-1] flex flex-col pointer-events-none">
      {/* TOP PART: The scoop edge (height 88px, covers from y=-40 to y=48 relative to navbar) */}
      <div className="relative h-[88px] w-full overflow-hidden shrink-0">
        <svg
          width="1200"
          height="88"
          viewBox="0 0 1200 88"
          className="absolute left-1/2 bottom-0 -translate-x-1/2 drop-shadow-[0_-8px_24px_rgba(0,0,0,0.06)] text-[#F8F9FA] dark:text-[color:var(--aztec)]"
        >
          <defs>
            <radialGradient id="mobile-nav-scoop-gradient" cx="600" cy="40" r="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--aztec-3)" />
              <stop offset="100%" stopColor="var(--aztec)" />
            </radialGradient>
          </defs>
          {/* Base solid fill to prevent WebKit transparency bug outside gradient radius */}
          <path
            fill="currentColor"
            d="M 0 40 L 530 40 C 550 40 555 88 600 88 C 645 88 650 40 670 40 L 1200 40 V 88 H 0 Z"
          />
          {/* Gradient glow over the center */}
          <path
            fill="currentColor"
            d="M 0 40 L 530 40 C 550 40 555 88 600 88 C 645 88 650 40 670 40 L 1200 40 V 88 H 0 Z"
          />
          {/* Top edge highlight stroke */}
          <path
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.25"
            strokeLinejoin="round"
            fill="none"
            d="M 0 40 L 530 40 C 550 40 555 88 600 88 C 645 88 650 40 670 40 L 1200 40"
          />
        </svg>
      </div>
      {/* BOTTOM PART: Solid rectangle filling the rest of the height and safe area */}
      <div className="flex-1 w-full bg-[#F8F9FA] dark:bg-[color:var(--aztec)] mt-[-1px]" />
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const { isMobileThreadOpen } = useConnectNav();
  const panelRef = useRef<HTMLDivElement>(null);

  const isActive = (item: { href: string; also?: string[] }) => {
    if (pathname === item.href) return true;
    if (item.href === "/settings" && pathname.startsWith("/settings")) return true;
    if (item.href === "/activities" && pathname.startsWith("/activity/")) return true;
    if (item.also?.some((p) => pathname.startsWith(p))) return true;
    return false;
  };

  const isMoreActive = MORE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  // Hide the navbar while the on-screen keyboard is up (iOS pushes bottom-fixed
  // bars above the keyboard on input focus). Using visualViewport lets us detect
  // it and slide the nav out of the way; it returns to the bottom when the
  // keyboard closes.
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const diff = Math.max(0, window.innerHeight - vv.height);
      setKbOpen(diff > 50);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (isMobileThreadOpen && (pathname === "/messages" || pathname === "/contacts")) {
    return null;
  }

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 z-[60] w-full md:hidden",
          "transition-transform duration-200 ease-out will-change-transform",
          kbOpen && "translate-y-[110%] pointer-events-none",
        )}
      >
        <div className="relative isolate w-full pb-[env(safe-area-inset-bottom)]">
          <ScoopBackground />

          <div className="flex h-[76px] w-full px-2">
            <div className="flex flex-1 items-center justify-around">
              {NAV_LEFT.map((item) => {
                const active = isActive(item);
                const label = item.defaultLabel;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-full w-14 flex-col items-center justify-center gap-1 bg-transparent transition-colors hover:bg-transparent",
                      active ? "text-saffron" : "text-aztec dark:text-white hover:text-aztec dark:hover:text-white",
                    )}
                  >
                    <svg className={cn(active && "text-saffron")} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                      <path d={item.path} />
                    </svg>
                    <span className={cn("w-full truncate text-center text-[10px] font-bold", active ? "text-saffron" : "text-aztec dark:text-white")}>{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="w-[80px] shrink-0" />

            <div className="flex flex-1 items-center justify-around">
              {/* Messages on the right */}
              {NAV_RIGHT.slice(0, 1).map((item) => {
                const active = isActive(item);
                let label = item.defaultLabel;
                if (item.href === "/messages" && pathname.startsWith("/contacts")) {
                  label = "Contacts";
                } else if (item.href === "/messages" && active) {
                  label = "Messages";
                }
                return (
                  <Link
                    key={item.href}
                    href={pathname.startsWith("/contacts") && item.href === "/messages" ? "/contacts" : item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-full w-14 flex-col items-center justify-center gap-1 bg-transparent transition-colors hover:bg-transparent",
                      active ? "text-saffron" : "text-aztec dark:text-white hover:text-aztec dark:hover:text-white",
                    )}
                  >
                    <svg className={cn(active && "text-saffron")} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                      <path d={item.path} />
                    </svg>
                    <span className={cn("w-full truncate text-center text-[10px] font-bold", active ? "text-saffron" : "text-aztec dark:text-white")}>{label}</span>
                  </Link>
                );
              })}

              {/* More / hamburger */}
              <button
                type="button"
                aria-label="More options"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "flex h-full w-14 flex-col items-center justify-center gap-1 bg-transparent transition-colors hover:bg-transparent",
                  open || isMoreActive ? "text-saffron" : "text-aztec dark:text-white",
                )}
              >
                <MoreIcon open={open} />
                <span className={cn("text-[10px] font-bold", open || isMoreActive ? "text-saffron" : "text-aztec dark:text-white")}>
                  More
                </span>
              </button>
            </div>
          </div>

          {/* New Activity FAB */}
          <div className="absolute left-1/2 top-[-24px] -translate-x-1/2">
            <Link
              href="/new-activity"
              className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_24px_-4px_rgba(246,198,66,0.4)] transition-transform active:scale-95"
              aria-label="New Activity"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d={PATHS.plus} />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── More popover (light frosted-glass, keeps page visible) ─── */}
      {open && (
        <>
          {/* Dim backdrop — taps anywhere except the popover close it.
              Very light so the underlying page stays clearly visible. */}
          <div
            className="fixed inset-0 z-[59] bg-black/10 dark:bg-black/25 backdrop-blur-[1px] md:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          {/* Floating frosted-glass card anchored above the More button */}
          <div
            ref={panelRef}
            className="fixed bottom-[calc(76px+env(safe-area-inset-bottom)+12px)] right-2 z-[61] w-[248px] max-w-[calc(100vw-16px)] overflow-hidden rounded-[20px] border border-white/40 dark:border-white/10 bg-white/75 dark:bg-[#122824]/80 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] md:hidden"
            role="menu"
            aria-label="More options panel"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
              <span className="text-[13px] font-bold tracking-wide text-foreground-secondary uppercase">More</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-foreground-secondary transition-colors hover:bg-surface-hover"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1 p-2">
              {MORE_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={cn(
                      "flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-[14.5px] font-semibold transition-colors",
                      active
                        ? "bg-saffron/15 text-saffron dark:bg-saffron/20"
                        : "text-foreground hover:bg-white/60 dark:hover:bg-white/5",
                    )}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
