"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PATHS } from "@/components/icons";
import { PrimaryBtn, GhostBtn } from "@/components/ui/Buttons";

export function GuestClientPage({ 
  userName, 
  isAuthenticated, 
  memberDetails 
}: { 
  userName?: string; 
  isAuthenticated: boolean;
  memberDetails?: { name: string; email: string; phone: string } | null;
}) {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";
  const initialCode = searchParams.get("code") || "";

  const [token, setToken] = useState(initialToken);
  const [code, setCode] = useState(initialCode);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  const [step, setStep] = useState<"code" | "choice" | "guest_form" | "auth_confirm" | "success" | "already_submitted">("code");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-validate if token/code exists in URL on mount
  useEffect(() => {
    if (initialToken || initialCode) {
      validateSession(initialToken, initialCode);
    }
  }, []);

  async function validateSession(t: string, c: string) {
    if (!t && !c) {
      setErrorMsg("Please enter an attendance code");
      setStatus("error");
      return;
    }
    
    setStatus("loading");
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/attendance/validate-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, code: c })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(body?.error || "Invalid attendance session");
        setStatus("error");
        setStep("code");
        // Clear the token so that manual code entry works
        setToken("");
        return;
      }
      setStatus("idle");
      if (isAuthenticated) {
        if (body?.alreadySubmitted) {
          setStep("already_submitted");
        } else {
          setStep("auth_confirm");
        }
      } else {
        setStep("choice");
      }
    } catch (e) {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    validateSession(token, code);
  }

  async function submitAttendance(e?: React.FormEvent) {
    if (e) e.preventDefault();
    
    if (!isAuthenticated) {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
        setErrorMsg("All fields are required");
        setStatus("error");
        return;
      }
    }

    setStatus("loading");
    setErrorMsg("");
    
    const fullName = isAuthenticated ? userName : `${firstName.trim()} ${lastName.trim()}`;
    
    try {
      const res = await fetch("/api/attendance/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          code, 
          name: fullName, 
          phone: isAuthenticated ? "" : phone, 
          email: isAuthenticated ? "" : email 
        })
      });
      if (!res.ok) {
        if (res.status === 409) {
          setStep("already_submitted");
          setStatus("idle");
          return;
        }
        const body = await res.json().catch(() => null);
        setErrorMsg(body?.error || "Could not submit attendance");
        setStatus("error");
        return;
      }
      setStep("success");
      setStatus("idle");
    } catch (e) {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  function handleLoginRedirect() {
    let url = "/guest";
    if (token) url += `?token=${encodeURIComponent(token)}`;
    else if (code) url += `?code=${encodeURIComponent(code)}`;
    window.location.href = `/login?callbackUrl=${encodeURIComponent(url)}`;
  }

  function shell(inner: React.ReactNode) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-8 text-foreground">
        <div className="w-full max-w-[480px] rounded-xl border-[1.5px] border-border bg-surface px-9 py-[38px] shadow-card">
          <div className="mb-[26px] flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center">
              <img src="/logo-black.png" alt="Trak Logo" className="h-full w-full object-contain dark:hidden" />
              <img src="/logo-white.png" alt="Trak Logo" className="h-full w-full object-contain hidden dark:block" />
            </div>
            <div className="text-[11px] font-bold tracking-[0.14em] text-foreground-faint uppercase">
              Trak · Guest Attendance
            </div>
          </div>
          {inner}
        </div>
      </div>
    );
  }

  if (step === "already_submitted") {
    return shell(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-surface-muted text-foreground-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="mb-1.5 font-display text-[19px] font-semibold text-foreground">
          Already submitted
        </div>
        <div className="text-[13.5px] text-foreground-secondary">
          Your attendance request is awaiting verification.
        </div>
      </div>
    );
  }

  if (step === "success") {
    return shell(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-success-surface text-success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d={PATHS.check} />
          </svg>
        </div>
        <div className="mb-1.5 font-display text-[19px] font-semibold text-foreground">
          Attendance request submitted
        </div>
        <div className="text-[13.5px] text-foreground-secondary">
          Your attendance is awaiting verification by the activity owner.
        </div>
      </div>
    );
  }

  return shell(
    <div>
      {step === "code" && (
        <form onSubmit={handleCodeSubmit} suppressHydrationWarning>
          <h2 className="m-0 mb-2 font-display text-[22px] font-semibold text-foreground">
            Guest Attendance
          </h2>
          <p className="mb-6 text-[13.5px] text-foreground-secondary">
            Enter the attendance code provided by the activity host.
          </p>
          
          <div className="mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 739421"
              className="w-full border-[1.5px] border-input-border bg-input px-4 py-3.5 text-[14.5px] text-foreground placeholder:text-input-placeholder outline-none focus:border-border-strong focus:ring-1 focus:ring-border rounded-lg font-mono tracking-widest text-center"
              disabled={status === "loading"}
              suppressHydrationWarning
            />
          </div>

          {status === "error" && (
            <div className="mb-4 rounded-lg bg-critical/10 p-3 text-sm text-critical text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full cursor-pointer rounded-xl border-none bg-primary py-3.5 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "loading" ? "Validating..." : "Continue"}
          </button>
        </form>
      )}

      {step === "choice" && (
        <div>
          <h2 className="m-0 mb-2 font-display text-[22px] font-semibold text-foreground">
            How would you like to check in?
          </h2>
          <p className="mb-6 text-[13.5px] text-foreground-secondary">
            Select your preferred method to continue.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLoginRedirect}
              className="flex flex-col items-start rounded-xl border-[1.5px] border-border bg-surface p-4 text-left hover:border-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <div className="font-bold text-[15px] text-foreground">I'm a TRAK member</div>
              <div className="text-[13px] text-foreground-secondary mt-0.5">Sign in with your TRAK account</div>
            </button>
            <button
              onClick={() => { setStep("guest_form"); setErrorMsg(""); }}
              className="flex flex-col items-start rounded-xl border-[1.5px] border-border bg-surface p-4 text-left hover:border-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <div className="font-bold text-[15px] text-foreground">Continue as guest</div>
              <div className="text-[13px] text-foreground-secondary mt-0.5">No account required</div>
            </button>
          </div>
        </div>
      )}

      {step === "guest_form" && (
        <form onSubmit={submitAttendance}>
          <h2 className="m-0 mb-2 font-display text-[22px] font-semibold text-foreground">
            Guest details
          </h2>
          <p className="mb-6 text-[13.5px] text-foreground-secondary">
            Please provide your information to check in.
          </p>
          
          <div className="flex flex-col gap-3.5 mb-6">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold tracking-wider text-foreground-secondary uppercase">
                First name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full border-[1.5px] border-input-border bg-input px-4 py-3 text-[14.5px] text-foreground placeholder:text-input-placeholder outline-none focus:border-border-strong focus:ring-1 focus:ring-border rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold tracking-wider text-foreground-secondary uppercase">
                Last name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full border-[1.5px] border-input-border bg-input px-4 py-3 text-[14.5px] text-foreground placeholder:text-input-placeholder outline-none focus:border-border-strong focus:ring-1 focus:ring-border rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold tracking-wider text-foreground-secondary uppercase">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full border-[1.5px] border-input-border bg-input px-4 py-3 text-[14.5px] text-foreground placeholder:text-input-placeholder outline-none focus:border-border-strong focus:ring-1 focus:ring-border rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold tracking-wider text-foreground-secondary uppercase">
                Phone number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full border-[1.5px] border-input-border bg-input px-4 py-3 text-[14.5px] text-foreground placeholder:text-input-placeholder outline-none focus:border-border-strong focus:ring-1 focus:ring-border rounded-lg"
              />
            </div>
          </div>

          {status === "error" && (
            <div className="mb-4 rounded-lg bg-critical/10 p-3 text-sm text-critical text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full cursor-pointer rounded-xl border-none bg-primary py-3.5 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Submit Attendance Request"}
          </button>
          
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setStep("choice")} className="text-[13px] font-bold text-foreground-secondary hover:text-foreground">
              Back
            </button>
          </div>
        </form>
      )}

      {step === "auth_confirm" && (
        <form onSubmit={submitAttendance}>
          <h2 className="m-0 mb-2 font-display text-[22px] font-semibold text-foreground">
            Confirm Check-in
          </h2>
          <div className="mb-6 rounded-xl border border-border bg-surface-muted p-5 mt-6 text-center flex flex-col gap-1.5">
            <div className="text-[13px] text-foreground-secondary mb-1">Attendance as</div>
            <div className="text-[17px] font-bold text-foreground">{memberDetails?.name || userName}</div>
            {memberDetails?.email && (
              <a href={`mailto:${memberDetails.email}`} className="text-[14px] text-primary hover:underline">
                {memberDetails.email}
              </a>
            )}
            {memberDetails?.phone && (
              <div className="text-[14px] text-foreground-secondary">
                {memberDetails.phone}
              </div>
            )}
          </div>

          {status === "error" && (
            <div className="mb-4 rounded-lg bg-critical/10 p-3 text-sm text-critical text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full cursor-pointer rounded-xl border-none bg-primary py-3.5 text-[14.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Submit Attendance Request"}
          </button>
        </form>
      )}
    </div>
  );
}
