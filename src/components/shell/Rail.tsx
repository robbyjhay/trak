"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATHS } from "@/components/icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", path: PATHS.dashboard },
  { href: "/new-activity", label: "New Activity", path: PATHS.plus },
  { href: "/activities", label: "Activities", path: PATHS.checkList },
  { href: "/responsibilities", label: "Responsibilities", path: PATHS.responsibilities },
  { href: "/messages", label: "Connect", path: PATHS.messages, also: ["/contacts"] },
  { href: "/settings", label: "Settings", path: PATHS.settings, bottom: true },
];

export function Rail() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 flex h-screen w-rail shrink-0 flex-col items-center gap-1.5 bg-linear-to-b from-aztec to-aztec-2 py-[22px]"
      aria-label="Main"
    >
      <Link
        href="/dashboard"
        className="mb-[26px] flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-linear-to-br from-saffron to-[#d9a72c] font-display text-base font-bold text-aztec shadow-rail"
        aria-label="Trak home"
      >
        T
      </Link>

      {NAV.filter((n) => !n.bottom).map((item) => (
        <RailItem
          key={item.href}
          {...item}
          active={
            pathname === item.href ||
            (item.also?.some((a) => pathname.startsWith(a)) ?? false) ||
            (item.href === "/messages" && pathname.startsWith("/contacts"))
          }
        />
      ))}

      <div className="flex-1" />

      {NAV.filter((n) => n.bottom).map((item) => (
        <RailItem
          key={item.href}
          {...item}
          active={pathname === item.href}
        />
      ))}
    </nav>
  );
}

function RailItem({
  href,
  label,
  path,
  active,
}: {
  href: string;
  label: string;
  path: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-12 w-12 items-center justify-center rounded-rail transition-colors",
        active
          ? "bg-saffron/16 text-saffron"
          : "text-white hover:bg-paper/8 hover:text-white",
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <span className="absolute top-1/2 left-[-11px] h-[22px] w-[3px] -translate-y-1/2 rounded-[3px] bg-saffron" />
      )}
      <span className="pointer-events-none absolute left-16 z-20 rounded-[7px] bg-aztec px-2.5 py-1.5 text-[11px] whitespace-nowrap text-white opacity-0 shadow-[0_6px_16px_rgba(0,0,0,0.3)] transition-opacity group-hover:opacity-100">
        {label}
      </span>
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? "#f6c642" : "#ffffff"}
        strokeWidth="2"
      >
        <path d={path} />
      </svg>
    </Link>
  );
}
