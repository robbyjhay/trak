"use client";

import { use, useMemo, useState } from "react";
import { fromBase64Url } from "@/lib/utils";
import { fmtDate } from "@/lib/dates";
import { PATHS } from "@/components/icons";

/**
 * Public RSVP form. Payload is self-contained in the URL (base64url JSON).
 * Submissions POST to /api/rsvp and persist on the shared server store.
 */
export default function RsvpPage({
  params,
}: {
  params: Promise<{ encoded: string }>;
}) {
  const { encoded } = use(params);
  const payload = useMemo(() => {
    const decoded = encoded ? fromBase64Url(encoded) : null;
    try {
      return decoded ? JSON.parse(decoded) : null;
    } catch {
      return null;
    }
  }, [encoded]);

  const valid = !!(payload && payload.logId && payload.title && payload.date);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function shell(inner: React.ReactNode) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-neutral-bg p-8">
        <div className="w-full max-w-[480px] rounded-[18px] border-[1.5px] border-line bg-white px-9 py-[38px] shadow-[0_10px_40px_rgba(13,29,26,0.08)]">
          <div className="mb-[26px] flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-linear-to-br from-saffron to-[#d9a72c]">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v2h18V7L12 2z" fill="#0d1d1a" />
                <path
                  d="M4 10v9h2v-9H4zm14 0v9h2v-9h-2zM9 10v9h2v-9H9zm4 0v9h2v-9h-2z"
                  fill="#0d1d1a"
                />
                <path d="M2 21h20v1.6H2z" fill="#0d1d1a" />
              </svg>
            </div>
            <div className="text-[11px] font-bold tracking-[0.14em] text-ink-faint uppercase">
              Trak · Attendance
            </div>
          </div>
          {inner}
        </div>
      </div>
    );
  }

  if (!valid) {
    return shell(
      <>
        <h2 className="m-0 mb-2.5 font-display text-[22px] font-semibold">
          Link not valid
        </h2>
        <p className="m-0 text-sm leading-relaxed text-ink-soft">
          This attendance link looks incomplete or was cut off when it was
          copied. Ask the activity owner to generate and resend it.
        </p>
      </>,
    );
  }

  if (done) {
    return shell(
      <div className="py-5 text-center">
        <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#e8f5ee] text-[#1b8a4c]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d={PATHS.check} />
          </svg>
        </div>
        <div className="mb-1.5 font-display text-[19px] font-semibold">
          You&apos;re marked present
        </div>
        <div className="text-[13.5px] text-ink-soft">
          Thanks, {name} — your attendance for &quot;{payload.title}&quot; has
          been recorded.
        </div>
      </div>,
    );
  }

  return shell(
    <>
      <div className="mb-1 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
        {payload.title}
      </div>
      <h2 className="m-0 mb-1.5 font-display text-[22px] font-semibold">
        Confirm your attendance
      </h2>
      <p className="mb-6 text-[13.5px] text-ink-soft">
        {fmtDate(payload.date)} · Hosted by {payload.owner || "Unit"}
      </p>
      <div className="mb-3.5">
        <label
          htmlFor="rsvpName"
          className="mb-2 block text-[11.5px] font-bold tracking-wider text-ink-soft uppercase"
        >
          Full name
        </label>
        <input
          id="rsvpName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-[11px] border-[1.5px] border-line px-4 py-3.5 text-[14.5px] outline-none focus:border-aztec-3"
        />
      </div>
      <div className="mb-3.5">
        <label
          htmlFor="rsvpPhone"
          className="mb-2 block text-[11.5px] font-bold tracking-wider text-ink-soft uppercase"
        >
          Phone number
        </label>
        <input
          id="rsvpPhone"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="080..."
          className="w-full rounded-[11px] border-[1.5px] border-line px-4 py-3.5 text-[14.5px] outline-none focus:border-aztec-3"
        />
      </div>
      <div className="mb-2">
        <label
          htmlFor="rsvpEmail"
          className="mb-2 block text-[11.5px] font-bold tracking-wider text-ink-soft uppercase"
        >
          Email address
        </label>
        <input
          id="rsvpEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-[11px] border-[1.5px] border-line px-4 py-3.5 text-[14.5px] outline-none focus:border-aztec-3"
        />
      </div>
      {error && (
        <div className="my-2.5 text-[12.5px] font-semibold text-critical">
          {error}
        </div>
      )}
      <button
        type="button"
        className="mt-3.5 w-full cursor-pointer rounded-xl border-none bg-linear-to-br from-aztec-3 to-aztec py-3.5 text-[14.5px] font-bold text-paper"
        onClick={async () => {
          if (!name.trim()) {
            setError("Please enter your name.");
            return;
          }
          setError("");
          try {
            const res = await fetch("/api/rsvp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                logId: payload.logId,
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
              }),
            });
            if (!res.ok) {
              const body = (await res.json().catch(() => null)) as {
                error?: string;
              } | null;
              setError(body?.error || "Could not submit attendance.");
              return;
            }
            setDone(true);
          } catch {
            setError("Network error — please try again.");
          }
        }}
      >
        Submit attendance
      </button>
      <div className="mt-3.5 text-center text-[11px] text-ink-faint">
        Your attendance is saved for the activity organizer in Trak.
      </div>
    </>,
  );
}
