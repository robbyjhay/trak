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

  const isActive = (item: { href: string; also?: string[] }) => {
    if (pathname === item.href) return true;
    if (item.href === "/activities" && pathname.startsWith("/activity/")) return true;
    if (item.also?.some((p) => pathname.startsWith(p))) return true;
    return false;
  };

  return (
    <nav
      className="sticky top-0 z-50 flex h-screen w-rail shrink-0 flex-col items-center gap-3 bg-surface py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      aria-label="Main"
    >
      <Link
        href="/dashboard"
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105"
        aria-label="Trak home"
      >
        T
      </Link>

      {NAV.filter((n) => !n.bottom).map((item) => (
        <RailItem
          key={item.href}
          {...item}
          active={isActive(item)}
        />
      ))}

      <div className="flex-1" />

      {NAV.filter((n) => n.bottom).map((item) => (
        <RailItem
          key={item.href}
          {...item}
          active={isActive(item)}
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
        "group relative flex h-[42px] w-[42px] items-center justify-center rounded-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground",
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <span className="pointer-events-none absolute left-14 z-20 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </Link>
  );
}
