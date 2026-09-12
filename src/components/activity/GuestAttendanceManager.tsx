"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { GhostBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";
import { CopyButton, CopyPill } from "@/components/ui/CopyButton";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function GuestAttendanceManager({
  activityId,
  logId,
}: {
  activityId: string;
  logId: string;
}) {
  const [activeTab, setActiveTab] = useState<"qr" | "link" | "code" | null>(null);
  
  const [qrToken, setQrToken] = useState("");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrExpiryCountdown, setQrExpiryCountdown] = useState(0);

  const [guestCode, setGuestCode] = useState("");
  const reduceMotion = useReducedMotion();

  const [attendees, setAttendees] = useState<any[]>([]);

  const fetchAttendees = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/logs/${logId}/attendees`);
      if (res.ok) {
        const data = await res.json();
        setAttendees(data.attendees || []);
      }
    } catch (e) {}
  };

  const fetchQrToken = async (showLoading = true) => {
    if (showLoading) setIsGeneratingQr(true);
    try {
      const startTime = Date.now();
      const res = await fetch(`/api/activities/${activityId}/logs/${logId}/qr-token`);
      if (res.ok) {
        const data = await res.json();
        
        if (showLoading) {
          const elapsed = Date.now() - startTime;
          const waitTime = Math.max(0, 1200 - elapsed);
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        setQrToken(data.token);
        // data.expiresAt is available, but for simplicity of the UI we can just reset our internal 60s countdown
        // to sync exactly with the moment we received it, rather than dealing with client/server clock skew.
        setQrExpiryCountdown(60);
      }
    } catch (e) {}
    if (showLoading) setIsGeneratingQr(false);
  };

  const fetchGuestSession = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/logs/${logId}/guest-session`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setGuestCode(data.guestCode);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAttendees();
    const interval = setInterval(fetchAttendees, 15000);
    return () => clearInterval(interval);
  }, [activityId, logId]);

  useEffect(() => {
    let interval: any;
    if (activeTab === "qr") {
      if (!qrToken) fetchQrToken(true);
      interval = setInterval(() => {
        setQrExpiryCountdown((prev) => {
          // At 15 seconds remaining (which is 45 seconds elapsed), fetch the next token in background
          if (prev === 16) {
            fetchQrToken(false);
          }
          if (prev <= 1) {
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setQrToken("");
    }
    return () => clearInterval(interval);
  }, [activeTab, qrToken]);

  useEffect(() => {
    if (activeTab === "link" || activeTab === "code") {
      fetchGuestSession();
    }
  }, [activeTab]);

  const updateStatus = async (attendeeId: string, status: "verified" | "declined") => {
    try {
      await fetch("/api/attendance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId, status })
      });
      fetchAttendees();
    } catch (e) {}
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h3 className="mb-4 text-[13px] font-bold text-foreground uppercase tracking-wider">
        Guest Attendance
      </h3>
      
      <div className="mb-4 flex flex-wrap gap-2">
        <GhostBtn onClick={() => setActiveTab(activeTab === "qr" ? null : "qr")} className={activeTab === "qr" ? "bg-surface-muted" : ""}>
          Generate QR
        </GhostBtn>
        <GhostBtn onClick={() => setActiveTab(activeTab === "link" ? null : "link")} className={activeTab === "link" ? "bg-surface-muted" : ""}>
          Get Link
        </GhostBtn>
        <GhostBtn onClick={() => setActiveTab(activeTab === "code" ? null : "code")} className={activeTab === "code" ? "bg-surface-muted" : ""}>
          Show Code
        </GhostBtn>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "qr" && (
          <motion.div
            key="qr"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.99 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mb-6 rounded-xl border border-border bg-surface px-6 py-6 text-center shadow-sm overflow-hidden"
          >
            {isGeneratingQr && !qrToken ? (
              <div className="text-sm font-semibold text-foreground-secondary">Generating QR code…</div>
            ) : qrToken ? (
              <div className="flex flex-col items-center">
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG value={typeof window !== "undefined" ? `${window.location.origin}/guest?token=${qrToken}` : qrToken} size={160} imageSettings={{ src: "/logo-black.png", height: 36, width: 36, excavate: true }} />
                </div>
                <div className="mt-3 text-[12px] font-semibold text-foreground-secondary">
                  Expires in {qrExpiryCountdown === 60 ? "01:00" : `00:${qrExpiryCountdown.toString().padStart(2, "0")}`}
                </div>
                <button
                  onClick={() => { setQrToken(""); fetchQrToken(true); }}
                  className="mt-3 text-[12px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Regenerate QR
                </button>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "link" && (
          <motion.div
            key="link"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.99 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mb-6 rounded-xl border border-border bg-surface px-6 py-6 shadow-sm">
              <div className="text-[11px] font-bold text-foreground-faint uppercase mb-2">Guest Check-in Link</div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/guest?code=${guestCode}` : ""}
                  className="flex-1 rounded-md border border-input-border bg-input px-3 py-2 text-[13px] font-mono outline-none"
                />
                <CopyButton
                  text={typeof window !== "undefined" ? `${window.location.origin}/guest?code=${guestCode}` : ""}
                  label="Copy Link"
                  successLabel="Copied"
                  variant="ghost"
                  size="md"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "code" && (
          <motion.div
            key="code"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.99 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mb-6 rounded-xl border border-border bg-surface px-6 py-6 text-center shadow-sm">
              <div className="text-[11px] font-bold text-foreground-faint uppercase mb-2">Guest Check-in Code</div>
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl font-display font-bold tracking-widest text-foreground">
                  {guestCode ? guestCode.substring(0, 3) + " " + guestCode.substring(3) : "..."}
                </div>
                {guestCode && (
                  <CopyPill
                    text={guestCode}
                    valueLabel={guestCode.substring(0, 3) + " " + guestCode.substring(3)}
                  />
                )}
              </div>
              <div className="mt-3 text-[12px] text-foreground-secondary">
                Guests can enter this code at {typeof window !== "undefined" ? window.location.host : ""}/guest
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        <h4 className="mb-3 text-[12px] font-bold text-foreground-secondary uppercase tracking-wider">
          Guest Attendance Requests
        </h4>
        {attendees.length === 0 ? (
          <div className="text-[13px] text-foreground-faint">No guest requests yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {attendees.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-4 py-3">
                <div>
                  <div className="text-[14px] font-bold">{a.name}</div>
                  <div className="text-[11px] text-foreground-secondary mt-0.5">
                    {[a.phone, a.email].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-[10px] text-foreground-faint uppercase mt-1 font-bold">
                    {a.status === "pending" ? "🟡 Pending" : a.status === "verified" ? "🟢 Verified" : "🔴 Declined"}
                    {" · " + new Date(a.registeredAt || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(a.id, "verified")} className="rounded bg-success/10 px-3 py-1.5 text-[12px] font-bold text-success hover:bg-success/20 cursor-pointer">Verify</button>
                    <button onClick={() => updateStatus(a.id, "declined")} className="rounded bg-critical/10 px-3 py-1.5 text-[12px] font-bold text-critical hover:bg-critical/20 cursor-pointer">Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
