"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTrak } from "@/context/TrakStore";
import { roleLabel } from "@/lib/permissions";
import { initials, firstName } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { formatRelativeDate } from "@/lib/dates";
import { logoutAction, switchUserAction } from "@/lib/auth/actions";
import { NOTIF_PATHS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useConnectNav } from "@/context/ConnectNav";
import { ConnectTabs } from "@/components/messaging/ConnectTabs";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sessionUser, myNotifications, markNotifRead, markAllNotifsRead } =
    useTrak();
  const { isMobileThreadOpen } = useConnectNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifs = myNotifications();
  const unread = notifs.filter((n) => !n.read).length;

  const isConnect = pathname === "/messages" || pathname === "/contacts";
  const isSettings = pathname.startsWith("/settings");

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  const greeting = `${getGreeting()}, ${firstName(sessionUser.name)}`;

  return (
    <header className="sticky top-0 z-40 flex h-[88px] shrink-0 items-center justify-between gap-4 bg-background px-6 sm:px-10 relative">
      <div className="flex flex-col justify-center">
        <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
          {isSettings ? "Settings" : isConnect ? "Connect" : greeting}
        </h1>
      </div>

      {isConnect && (
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <ConnectTabs />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={`${unread} unread notifications`}
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.bell} />
            </svg>
            {unread > 0 && (
              <span className="absolute top-0 right-0 flex h-4 min-w-4 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-critical-semantic px-1 font-sans text-[9.5px] font-extrabold text-critical-foreground ring-2 ring-surface">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-[42px] right-[-10px] sm:right-[-6px] z-[70] flex max-h-[420px] w-[340px] max-w-[calc(100vw-36px)] flex-col overflow-hidden rounded-[18px] border border-border bg-surface-elevated text-foreground shadow-modal">
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5 text-[12.5px] font-extrabold">
                <span>Notifications</span>
                {unread > 0 && (
                  <button
                    type="button"
                    className="border-none bg-transparent text-[11px] font-bold text-foreground-secondary hover:text-foreground"
                    onClick={() => {
                      void markAllNotifsRead();
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="px-4 py-[26px] text-center text-[13px] text-foreground-faint">
                    No notifications yet.
                  </div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left hover:bg-surface-hover ${
                        !n.read ? "bg-warning-surface/40 hover:bg-warning-surface/60" : ""
                      }`}
                      onClick={() => {
                        void markNotifRead(n.id);
                        setNotifOpen(false);
                        if (n.activityId) router.push(`/activity/${n.activityId}`);
                        else if (n.type === "dm" || n.type === "mention" || n.type === "broadcast") router.push("/messages");
                      }}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-navigation-hover text-primary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={NOTIF_PATHS[n.type] || NOTIF_PATHS.broadcast} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] leading-snug">{n.text}</div>
                        <div className="mt-0.5 text-[10.5px] text-foreground-faint">
                          {n.createdAt ? formatRelativeDate(n.createdAt) : ""}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="relative ml-2" ref={chipRef}>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-3 rounded-full border border-border/50 bg-surface p-1.5 sm:pr-4 transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shadow-sm"
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div
              className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full font-display text-[13px] font-bold text-white shadow-sm"
              style={{ background: sessionUser.color }}
            >
              {sessionUser.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sessionUser.photoUrl}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials(sessionUser.name)
              )}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[13.5px] leading-tight font-bold text-foreground">
                {sessionUser.name}
              </div>
              <div className="text-[11.5px] font-medium text-foreground-faint mt-0.5">
                {roleLabel(sessionUser)}
              </div>
            </div>
          </button>

          {menuOpen && (
            <div
              className="absolute top-[42px] right-0 z-[60] w-[180px] rounded-[16px] border border-border bg-surface-elevated p-1.5 shadow-modal"
              role="menu"
            >
              <MenuBtn
                href="/profile"
                onClick={() => setMenuOpen(false)}
                path={PATHS.user}
              >
                My Profile
              </MenuBtn>
              <MenuBtn
                href="/settings"
                onClick={() => setMenuOpen(false)}
                path={PATHS.settings}
              >
                Settings
              </MenuBtn>
              <form action={switchUserAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[12.5px] font-semibold text-foreground hover:bg-surface-hover"
                  role="menuitem"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.switchUser} />
                  </svg>
                  Switch user
                </button>
              </form>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[12.5px] font-semibold text-critical hover:bg-critical-bg"
                  role="menuitem"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.logout} />
                  </svg>
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuBtn({
  children,
  onClick,
  path,
  href,
}: {
  children: React.ReactNode;
  onClick: () => void;
  path: string;
  href?: string;
}) {
  const content = (
    <>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={path} />
      </svg>
      {children}
    </>
  );
  
  const className = "flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[12.5px] font-semibold text-foreground hover:bg-surface-hover";

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className} role="menuitem">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} role="menuitem">
      {content}
    </button>
  );
}
