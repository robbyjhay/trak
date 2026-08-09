"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATHS } from "@/components/icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", path: PATHS.dashboard },
  { href: "/new-activity", label: "New Activity", path: PATHS.plus },
  { href: "/activities", label: "Activities", path: PATHS.checkList },
  { href: "/responsibilities", label: "Responsibilities", path: PATHS.responsibilities },
  { href: "/messages", label: "Connect", path: PATHS.messages },
  { href: "/settings", label: "Settings", path: PATHS.settings },
];

/** Compact bottom / drawer nav for viewports where the 76px rail is cramped. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 left-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-aztec text-saffron shadow-toast md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-[rgba(13,29,26,0.55)] md:hidden"
          onClick={() => setOpen(false)}
        >
          <nav
            className="absolute bottom-0 left-0 w-full rounded-t-[20px] bg-aztec p-6 text-paper"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">
                Trak<span className="text-saffron">.</span>
              </span>
              <button
                type="button"
                className="border-none bg-transparent text-2xl text-paper/70"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/messages" && pathname.startsWith("/contacts"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-[11px] font-bold",
                      active ? "bg-saffron/16 text-saffron" : "text-white",
                    )}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={active ? "#f6c642" : "#ffffff"}
                      strokeWidth="2"
                    >
                      <path d={item.path} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
