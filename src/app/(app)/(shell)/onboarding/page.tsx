"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { apiGet, apiSend } from "@/lib/api/client";
import { fmtDate, fmtDateShort, formatRelativeDate } from "@/lib/dates";
import { CopyButton } from "@/components/ui/CopyButton";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { TrakLoader } from "@/components/ui/TrakLoader";
import { PATHS } from "@/components/icons";
import type { OnboardingRequestView } from "@/lib/services/onboarding.service";

type StatusTab = "pending" | "approved" | "declined" | "all";

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast, refresh, sessionUser } = useTrak();

  const [requests, setRequests] = useState<OnboardingRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<StatusTab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mintOpen, setMintOpen] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<{ link: string; expiresAt: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState<{
    memberName: string;
    username: string;
    starterPassword: string;
  } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (tab !== "all") q.set("status", tab);
      const data = await apiGet<{ requests: OnboardingRequestView[] }>(
        `/api/onboarding/requests?${q.toString()}`,
      );
      setRequests(data.requests);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load onboarding requests.";
      setError(msg);
      if (msg.includes("Head")) router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [tab, router]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const isHeadUser = sessionUser?.role === "head";
  useEffect(() => {
    if (!isHeadUser) {
      router.replace("/dashboard");
    }
  }, [isHeadUser, router]);

  async function handleMint() {
    setMinting(true);
    setError("");
    try {
      const data = await apiSend<{ link: string; expiresAt: string }>(
        "/api/onboarding/mint",
        "POST",
      );
      setMinted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate an invite link.");
    } finally {
      setMinting(false);
    }
  }

  async function handleDecide(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const data = await apiSend<{
        ok: boolean;
        status: string;
        credentials?: {
          username: string;
          starterPassword: string;
          memberName: string;
        };
      }>(`/api/onboarding/requests/${id}/decide`, "POST", { action });

      if (action === "approve" && data.credentials) {
        setShowCredentials(data.credentials);
        showToast("Approved", `${data.credentials.memberName} has been onboarded.`);
        await refresh();
      } else {
        showToast(
          action === "approve" ? "Approved" : "Declined",
          action === "approve"
            ? "The member has been emailed their login details."
            : "The member has been notified.",
        );
      }
      fetchRequests();
    } catch (err) {
      showToast(
        action === "approve" ? "Error approving" : "Error declining",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
  };

  const tabs: { key: StatusTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "declined", label: "Declined" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="pb-24">
      {/* Page head */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">
            Onboarding approvals
          </h1>
          <p className="mt-1 text-[14px] text-foreground-secondary">
            Review and decide on members who used your invite links.
          </p>
        </div>
        {isHeadUser && (
          <button
            type="button"
            onClick={() => {
              setMinted(null);
              setMintOpen(true);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-[10px] border-none bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            New invite link
          </button>
        )}
      </div>

      {!isHeadUser ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center">
          <p className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Heads only
          </p>
          <p className="text-sm text-foreground-secondary">
            This page is only available to your Unit Head.
          </p>
        </div>
      ) : (
        <>

      {error && (
        <div className="mb-6 rounded-xl bg-critical-surface p-4 text-center text-sm font-semibold text-critical-semantic">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-surface-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 cursor-pointer rounded-lg border-none py-2 text-[12.5px] font-bold transition-colors ${
              tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <TrakLoader className="h-14 w-14" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground-faint">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13l2 2 4-4" />
            </svg>
          </div>
          <p className="mb-1 text-[14px] font-semibold text-foreground">
            No {tab !== "all" ? statusLabel[tab].toLowerCase() : ""} requests
          </p>
          <p className="text-sm text-foreground-secondary">
            {tab === "pending"
              ? "Members who use your invite links will appear here."
              : "Nothing to show in this list yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14.5px] font-bold text-foreground">{r.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      r.status === "approved"
                        ? "bg-success-surface text-success"
                        : r.status === "declined"
                          ? "bg-critical-surface text-critical-semantic"
                          : "bg-warning-surface text-warning-foreground"
                    }`}
                  >
                    {statusLabel[r.status]}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-foreground-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {r.phone}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                    {r.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Requested {fmtDate(r.createdAt)}
                  </span>
                  {r.decidedAt && (
                    <span className="inline-flex items-center gap-1.5">
                      {r.decidedBy ? `${r.decidedBy.name || r.decidedBy.username} · ` : ""}
                      {fmtDateShort(r.decidedAt)}
                    </span>
                  )}
                </div>
                {r.gradeLevel || r.sex || r.stateOfOrigin ? (
                  <div className="mt-1 text-[11.5px] text-foreground-faint">
                    {[r.designation, r.gradeLevel, r.sex, r.stateOfOrigin].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {r.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => handleDecide(r.id, "decline")}
                      className="cursor-pointer rounded-[9px] border-[1.5px] border-critical-semantic/40 px-3.5 py-2 text-xs font-bold text-critical-semantic transition-colors hover:bg-critical-surface disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => handleDecide(r.id, "approve")}
                      className="cursor-pointer rounded-[9px] border-none bg-success px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
                    >
                      {busyId === r.id ? "…" : "Accept"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mint link modal */}
      {isHeadUser && (
        <ModalBackdrop
          open={mintOpen}
          onClose={() => !minting && setMintOpen(false)}
          labelledBy="mint-link-title"
        >
        <ModalPanel>
          <h2 id="mint-link-title" className="font-display text-[20px] font-bold text-foreground">
            Invite a new member
          </h2>
          <p className="mt-1 text-[13px] text-foreground-secondary">
            Generate a link you can share. It expires 12 hours after creation and works once.
          </p>

          {!minted ? (
            <button
              type="button"
              disabled={minting}
              onClick={handleMint}
              className="mt-5 w-full cursor-pointer rounded-[11px] border-none bg-primary py-3.5 text-[14px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {minting ? "Generating…" : "Generate invite link"}
            </button>
          ) : (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-border bg-surface-muted px-3.5 py-3">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
                  {minted.link}
                </span>
                <CopyButton text={minted.link} label="Copy" successLabel="Copied" size="md" />
              </div>
              <p className="mt-2 text-[11.5px] text-foreground-faint">
                Expires {formatRelativeDate(minted.expiresAt)}
              </p>
              <button
                type="button"
                disabled={minting}
                onClick={handleMint}
                className="mt-4 w-full cursor-pointer rounded-[10px] border-[1.5px] border-border bg-surface py-3 font-bold text-foreground transition-colors hover:border-primary disabled:opacity-50"
              >
                {minting ? "Generating…" : "Generate another"}
              </button>
            </div>
          )}
        </ModalPanel>
      </ModalBackdrop>
      )}

      {/* Approval credentials modal */}
      {isHeadUser && (
        <ModalBackdrop
          open={Boolean(showCredentials)}
          onClose={() => setShowCredentials(null)}
          labelledBy="approve-creds-title"
        >
        <ModalPanel>
          <h2 id="approve-creds-title" className="font-display text-[20px] font-bold text-foreground">
            {showCredentials?.memberName} is onboarded
          </h2>
          <p className="mt-1 text-[13px] text-foreground-secondary">
            The member was emailed these sign-in details. You can also copy the starter password here.
          </p>
          <div className="mt-4 rounded-xl bg-surface-muted p-4 font-mono text-[13px] leading-relaxed text-foreground">
            <div className="mb-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-foreground-faint">Username</span>
              <div className="text-[14px] font-bold">{showCredentials?.username}</div>
            </div>
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-foreground-faint">Initial password</span>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[14px] font-bold">{showCredentials?.starterPassword}</span>
                <CopyButton
                  text={showCredentials?.starterPassword ?? ""}
                  label="Copy"
                  successLabel="Copied"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </ModalPanel>
        </ModalBackdrop>
      )}

        </>
      )}
    </div>
  );
}