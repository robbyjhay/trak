"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { roleLabel } from "@/lib/permissions";
import { initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { fmtDate } from "@/lib/dates";
import { logoutAction, switchUserAction } from "@/lib/auth/actions";
import { NOTIF_PATHS } from "@/lib/constants";
import { ConnectTabs } from "@/components/messaging/ConnectTabs";

const CRUMBS: Record<string, string> = {
  dashboard: "Dashboard",
  "new-activity": "New Activity",
  activities: "Activities",
  responsibilities: "Responsibilities",
  contacts: "Connect",
  messages: "Connect",
  settings: "Settings",
  activity: "Activity",
  member: "Activities",
  profile: "My Profile",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sessionUser, myNotifications, markNotifRead, markAllNotifsRead } =
    useTrak();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const segment = pathname.split("/").filter(Boolean)[0] || "dashboard";
  let crumb = CRUMBS[segment] || "Dashboard";
  if (segment === "dashboard" && sessionUser.role === "head") {
    crumb = "Head of Unit";
  }

  const notifs = myNotifications();
  const unread = notifs.filter((n) => !n.read).length;

  const isConnect = pathname === "/messages" || pathname === "/contacts";

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

  return (
    <header className="sticky top-0 z-40 flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-line bg-card px-[18px] sm:px-[34px] relative">
      <div className="crumb min-w-0 truncate text-[13px] text-ink-soft">
        Digital Learning Unit &nbsp;/&nbsp;{" "}
        <b className="font-bold text-ink" id="crumbLabel">
          {crumb}
        </b>
      </div>

      {isConnect && (
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <ConnectTabs />
        </div>
      )}

      <div className="flex items-center gap-[18px]">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-neutral-bg focus-visible:ring-2 focus-visible:ring-saffron focus-visible:outline-none"
            aria-label={`${unread} unread notifications`}
            onClick={(e) => {
              e.stopPropagation();
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.bell} />
            </svg>
            {unread > 0 && (
              <span className="absolute top-0 right-0 flex h-4 min-w-4 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-critical px-1 font-sans text-[9.5px] font-extrabold text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-[38px] right-[-6px] z-70 flex max-h-[420px] w-[340px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_20px_40px_rgba(0,0,0,0.16)]">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 text-[12.5px] font-extrabold">
                <span>Notifications</span>
                {unread > 0 && (
                  <button
                    type="button"
                    className="border-none bg-transparent text-[11px] font-bold text-aztec-3"
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
                  <div className="px-4 py-[26px] text-center text-[13px] text-ink-faint">
                    No notifications yet.
                  </div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`flex w-full items-start gap-2.5 border-b border-neutral-bg px-4 py-3 text-left hover:bg-neutral-bg ${
                        !n.read ? "bg-[#fffaf0] hover:bg-[#fdf3dc]" : ""
                      }`}
                      onClick={() => {
                        void markNotifRead(n.id);
                        setNotifOpen(false);
                        if (n.activityId) router.push(`/activity/${n.activityId}`);
                        else if (n.type === "dm") router.push("/messages");
                      }}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-aztec-2 text-saffron">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={NOTIF_PATHS[n.type] || NOTIF_PATHS.broadcast} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] leading-snug">{n.text}</div>
                        <div className="mt-0.5 text-[10.5px] text-ink-faint">
                          {n.createdAt ? fmtDate(n.createdAt) : ""}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="relative ml-[18px] pl-[18px]" ref={chipRef}>
          <div className="absolute top-1/2 left-0 h-6 w-px -translate-y-1/2 bg-line" />
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2.5"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div
              className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full font-display text-[13px] font-bold text-white"
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
              <div className="text-[13px] leading-tight font-bold">
                {sessionUser.name}
              </div>
              <div className="text-[11px] text-ink-faint">
                {roleLabel(sessionUser)} · {sessionUser.username}
              </div>
            </div>
          </button>

          {menuOpen && (
            <div
              className="absolute top-12 right-0 z-60 w-[170px] rounded-xl border border-line bg-white p-1.5 shadow-md"
              role="menu"
            >
              <MenuBtn
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                path={PATHS.user}
              >
                My Profile
              </MenuBtn>
              <MenuBtn
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/activities");
                }}
                path={PATHS.checkList}
              >
                My Activities
              </MenuBtn>
              <form action={switchUserAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[12.5px] font-semibold text-ink hover:bg-neutral-bg"
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
                  className="flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[12.5px] font-semibold text-critical hover:bg-neutral-bg"
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-[12.5px] font-semibold text-ink hover:bg-neutral-bg"
      onClick={onClick}
      role="menuitem"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={path} />
      </svg>
      {children}
    </button>
  );
}
