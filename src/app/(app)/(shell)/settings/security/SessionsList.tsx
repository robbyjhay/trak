"use client";

import { useState } from "react";
import { formatRelativeDate } from "@/lib/dates";
import { revokeSessionAction } from "./actions";

function parseUserAgent(ua: string) {
  if (!ua) return { device: "Unknown Device", browser: "Unknown Browser" };
  
  let device = "Desktop";
  if (ua.includes("iPhone")) device = "Apple iPhone";
  else if (ua.includes("iPad")) device = "Apple iPad";
  else if (ua.includes("Android")) {
    device = ua.includes("Mobile") ? "Android Phone" : "Android Tablet";
  } else if (ua.includes("Mac OS X")) device = "Mac";
  else if (ua.includes("Windows")) device = "Windows PC";
  else if (ua.includes("Linux")) device = "Linux PC";
  else if (ua.includes("CrOS")) device = "Chrome OS";

  let browser = "Unknown Browser";
  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  return { device, browser };
}

export function SessionsList({
  sessions,
  currentSessionId,
}: {
  sessions: any[];
  currentSessionId: string;
}) {
  return (
    <div className="divide-y divide-border">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isCurrent={session.id === currentSessionId}
        />
      ))}
      {sessions.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">No sessions found.</div>
      )}
    </div>
  );
}

function SessionItem({ session, isCurrent }: { session: any; isCurrent: boolean }) {
  const [revoking, setRevoking] = useState(false);
  const isRevoked = !!session.revokedAt;
  const isExpired = new Date(session.expiresAt) < new Date();
  const isActive = !isRevoked && !isExpired;

  const { device, browser } = parseUserAgent(session.userAgent);

  async function handleRevoke() {
    if (!confirm("This will sign out this device from your account.")) return;
    setRevoking(true);
    await revokeSessionAction(session.id);
    setRevoking(false);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-[14.5px]">
            {device}
          </span>
          {isCurrent && (
            <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-green-700 uppercase tracking-wider">
              Current device
            </span>
          )}
          {!isActive && !isCurrent && (
            <span className="rounded bg-neutral-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-neutral-600 uppercase tracking-wider">
              {isRevoked ? "Signed Out" : "Expired"}
            </span>
          )}
        </div>
        <div className="text-[12.5px] text-muted-foreground flex flex-col gap-0.5">
          <span>Browser: {browser}</span>
          <span>IP Address: {session.ipAddress || "Unknown"}</span>
          <span>Last Used: {formatRelativeDate(session.lastUsedAt)}</span>
        </div>
      </div>
      <div className="shrink-0">
        {!isCurrent && isActive && (
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {revoking ? "Removing..." : "Remove Device"}
          </button>
        )}
      </div>
    </div>
  );
}
