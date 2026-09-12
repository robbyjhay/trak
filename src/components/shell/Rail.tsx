"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LibraryIcon, PATHS } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useTrak } from "@/context/TrakStore";
import { countUnreadMessages } from "@/lib/unreadMessages";

function RailSvg({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d={path} />
    </svg>
  );
}

const NAV: {
  href: string;
  label: string;
  icon: (cls?: string) => React.ReactNode;
  also?: string[];
  bottom?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: (c) => <RailSvg path={PATHS.dashboard} className={c} /> },
  { href: "/new-activity", label: "New Activity", icon: (c) => <RailSvg path={PATHS.plus} className={c} /> },
  { href: "/activities", label: "Activities", icon: (c) => <RailSvg path={PATHS.checkList} className={c} /> },
  { href: "/responsibilities", label: "Responsibilities", icon: (c) => <RailSvg path={PATHS.responsibilities} className={c} /> },
  { href: "/messages", label: "Connect", icon: (c) => <RailSvg path={PATHS.messages} className={c} />, also: ["/contacts"] },
  { href: "/library", label: "Library", icon: (c) => <LibraryIcon size={19} className={c} />, also: ["/library/manage"] },
  { href: "/innovation-cloud", label: "Innovation Cloud", icon: (c) => <RailSvg path={PATHS.bulb} className={c} />, also: ["/innovation-cloud/manage"] },
  { href: "/settings", label: "Settings", icon: (c) => <RailSvg path={PATHS.settings} className={c} />, bottom: true },
];

export function Rail() {
  const pathname = usePathname();
  const { myNotifications } = useTrak();
  const unread = countUnreadMessages(myNotifications());

  return (
    <nav
      className="sticky top-0 z-50 flex h-screen w-rail shrink-0 flex-col items-center gap-1.5 bg-[#F8F9FA] dark:bg-linear-to-b dark:from-aztec dark:to-aztec-2 border-r border-border/50 dark:border-transparent py-[22px]"
      aria-label="Main"
    >
      <Link
        href="/dashboard"
        className="mb-[26px] flex h-[38px] w-[38px] items-center justify-center transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        aria-label="Trak home"
      >
        <img src="/logo-black.png" alt="Trak" className="h-full w-full object-contain dark:hidden" />
        <img src="/logo-white.png" alt="Trak" className="h-full w-full object-contain hidden dark:block" />
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
          badge={item.href === "/messages" ? unread : 0}
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
  icon,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: (cls?: string) => React.ReactNode;
  active: boolean;
  badge?: number;
}) {
  const activeCls = cn(active ? "text-white dark:text-aztec" : "dark:text-white");
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-12 w-12 items-center justify-center rounded-rail transition-colors focus-visible:ring-2 focus-visible:ring-saffron focus-visible:outline-none",
        active
          ? "bg-saffron text-white dark:text-aztec"
          : "text-aztec hover:bg-aztec/5 hover:text-aztec dark:text-white dark:hover:bg-white/5 dark:hover:text-white",
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <span className="pointer-events-none absolute left-16 z-20 rounded-[7px] bg-aztec px-2.5 py-1.5 text-[11px] whitespace-nowrap text-white dark:bg-white dark:text-aztec opacity-0 shadow-[0_6px_16px_rgba(0,0,0,0.3)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
      {icon(activeCls)}
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-success px-1 text-[10px] font-extrabold text-success-foreground ring-2 ring-[#F8F9FA] dark:ring-[#0d1d1a]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
