"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATHS } from "@/components/icons";
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
  { href: "/settings", label: "Settings", path: PATHS.settings },
];

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
  const { isMobileThreadOpen } = useConnectNav();

  const isActive = (item: { href: string; also?: string[] }) => {
    if (pathname === item.href) return true;
    if (item.href === "/settings" && pathname.startsWith("/settings")) return true;
    if (item.href === "/activities" && pathname.startsWith("/activity/")) return true;
    if (item.also?.some((p) => pathname.startsWith(p))) return true;
    return false;
  };

  if (isMobileThreadOpen && (pathname === "/messages" || pathname === "/contacts")) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 z-[60] w-full md:hidden">
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
                        active ? "text-saffron" : "text-aztec/70 hover:text-aztec dark:text-white/70 dark:hover:text-white"
                    )}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                      <path d={item.path} />
                    </svg>
                    <span className="text-[10px] font-bold truncate w-full text-center">{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="w-[80px] shrink-0" />

            <div className="flex flex-1 items-center justify-around">
              {NAV_RIGHT.map((item) => {
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
                        active ? "text-saffron" : "text-aztec/70 hover:text-aztec dark:text-white/70 dark:hover:text-white"
                    )}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                      <path d={item.path} />
                    </svg>
                    <span className="text-[10px] font-bold truncate w-full text-center">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

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

      {/* Drawer for Settings / More */}
      {/* Settings can be accessed via Profile in Topbar typically, but we'll leave a hook just in case, or remove MORE_NAV.
          Since we moved Responsibilities to NAV_RIGHT, and Topbar handles profile/settings, the drawer might be unnecessary,
          but let's preserve it to not break functionality if it was triggered elsewhere. */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-overlay backdrop-blur-[2px] transition-opacity md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 w-full animate-in slide-in-from-bottom-full rounded-t-[24px] bg-surface-elevated p-6 text-foreground shadow-[0_-10px_40px_rgba(0,0,0,0.2)] duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-xl font-semibold text-foreground">
                More Options
              </span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
              {MORE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-surface-muted/50 px-4 py-3.5 text-[14px] font-bold text-foreground transition-colors hover:bg-surface-muted"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={item.path} />
                  </svg>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
