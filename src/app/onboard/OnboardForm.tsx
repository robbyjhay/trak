"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { suggestUsername } from "@/lib/utils";

const FIELD_INPUT =
  "w-full rounded-[10px] border-[1.5px] border-input-border bg-input px-3.5 py-2.5 text-[13px] text-foreground placeholder-input-placeholder outline-none focus:border-border-strong sm:py-3 sm:text-[14px]";

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const NIGERIA = { flag: "🇳🇬", iso: "NG", code: "+234", label: "Nigeria" };

export function OnboardForm({ token }: { token: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    designation: "",
    gradeLevel: "",
    sex: "",
    phone: "",
    stateOfOrigin: "",
    dateJoined: "",
  });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = [
      !form.name.trim() ? "full name" : null,
      !form.username.trim() ? "username" : null,
      !form.email.trim() ? "email" : null,
      !form.designation.trim() ? "designation" : null,
      !form.sex ? "sex" : null,
      !form.phone.trim() ? "phone" : null,
      !form.stateOfOrigin ? "state of origin" : null,
      !form.dateJoined ? "date joined" : null,
    ].filter(Boolean) as string[];
    if (missing.length) {
      setError(`The following fields are required: ${missing.join(", ")}.`);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const fullPhone = `+234 ${form.phone.trim()}`.replace(/\s+/g, " ").trim();
      const res = await fetch("/api/auth/invite/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: form.name.trim(),
          username: form.username.trim() || undefined,
          email: form.email.trim(),
          designation: form.designation.trim(),
          gradeLevel: form.gradeLevel.trim(),
          sex: form.sex,
          phone: fullPhone,
          stateOfOrigin: form.stateOfOrigin,
          dateJoined: form.dateJoined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string | { message?: string };
        status?: string;
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Could not submit your request.";
        setError(msg);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="m-0 mb-4 font-display text-xl text-primary">
          Request submitted
        </h2>
        <p className="mx-auto max-w-sm mb-5 text-[12.5px] text-foreground-secondary">
          Your Unit Head has been notified and needs to approve your onboarding.
          Once approved, you&apos;ll receive your login details by email at{" "}
          <span className="font-semibold text-foreground">{form.email}</span>.
        </p>
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-[10px] border-[1.5px] border-border bg-surface px-4 py-2.5 text-[12px] font-bold text-foreground-secondary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Awaiting approval
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="w-full cursor-pointer rounded-[10px] border-[1.5px] border-border bg-surface py-3.5 font-bold transition-colors hover:border-primary hover:text-foreground"
            onClick={() => router.push("/login")}
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="m-0 mb-1.5 font-display text-xl text-foreground">
        Add member
      </h1>
      <p className="mb-5 text-[12.5px] text-foreground-secondary">
        You&apos;ve been invited to join your unit on Trak. Fill in your
        details to create your account — your role is set to Member and
        you&apos;ll set your own password on first sign-in.
      </p>
      <form onSubmit={onSubmit} noValidate>
      <Field label="Full name *">
        <input
          value={form.name}
          onChange={(e) => {
            const value = e.target.value;
            set("name", value);
            if (!usernameTouched) {
              set("username", suggestUsername(value, []));
            }
          }}
          placeholder="Firstname Middlename Surname"
          className={FIELD_INPUT}
          autoComplete="name"
        />
        <p className="mt-1 text-[11px] text-foreground-faint">
          Enter your names as Firstname Middlename (other name) Surname. Your  
          username is auto-generated from your surname.
        </p>
      </Field>
      <Field label="Username *">
        <input
          value={form.username}
          onChange={(e) => {
            setUsernameTouched(true);
            set("username", e.target.value);
          }}
          placeholder="Auto-generated from surname"
          className={FIELD_INPUT}
          autoComplete="username"
        />
        <p className="mt-1 text-[11px] text-foreground-faint">
          Leave blank to auto-generate (DLU + surname), you can override.
        </p>
      </Field>
      <Field label="Email *">
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="name@example.gov.ng"
          className={FIELD_INPUT}
          autoComplete="email"
        />
        <p className="mt-1 text-[11px] text-foreground-faint">
          Required — we&apos;ll email your login details once your Unit Head approves.
        </p>
      </Field>
      <Field label="Designation *">
        <input
          value={form.designation}
          onChange={(e) => set("designation", e.target.value)}
          placeholder="e.g. Learning Technologies Officer"
          className={FIELD_INPUT}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
        <Field label="Grade level (optional)">
          <input
            value={form.gradeLevel}
            onChange={(e) => set("gradeLevel", e.target.value)}
            placeholder="e.g. GL 09"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="Sex *">
          <select
            value={form.sex}
            onChange={(e) => set("sex", e.target.value)}
            className={FIELD_INPUT}
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
      </div>

      <Field label="Role type">
        <div className="flex items-center justify-between rounded-[10px] border-[1.5px] border-border bg-surface-interactive px-3.5 py-3 text-[13px] text-foreground-secondary sm:text-[14px]">
          <span>Member</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">Locked</span>
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
<Field label="Phone *">
          <div className="flex items-stretch overflow-hidden rounded-[10px] border-[1.5px] border-input-border bg-input focus-within:border-border-strong">
            <span className="flex shrink-0 items-center gap-1.5 border-r-[1.5px] border-input-border bg-surface-interactive px-3 text-[13px] font-medium text-foreground sm:text-[14px]">
              <span className="text-base leading-none sm:text-lg">{NIGERIA.flag}</span>
              +234
            </span>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="8012345678"
              className="w-full min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-foreground placeholder-input-placeholder outline-none sm:py-3 sm:text-[14px]"
              inputMode="tel"
              autoComplete="tel-national"
            />
          </div>
          <p className="mt-1 text-[11px] text-foreground-faint">
            🇳🇬 Nigeria (+234) — enter your number after the country code.
          </p>
        </Field>
        <Field label="State of origin *">
          <select
            value={form.stateOfOrigin}
            onChange={(e) => set("stateOfOrigin", e.target.value)}
            className={FIELD_INPUT}
          >
            <option value="">Select state…</option>
            {STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Date joined PSSDC *">
        <input
          type="date"
          value={form.dateJoined}
          onChange={(e) => set("dateJoined", e.target.value)}
          className={FIELD_INPUT}
        />
      </Field>

      {error && (
        <div
          role="alert"
          className="mb-1 rounded-lg bg-critical-surface px-3 py-2 text-[12px] font-semibold text-critical-semantic"
        >
          {error}
        </div>
      )}

      <div className="mt-[22px] flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          className="w-full sm:w-auto sm:flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-border bg-surface py-3 font-bold text-foreground hover:bg-surface-hover transition-colors"
          onClick={() => router.push("/login")}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="w-full sm:w-auto sm:flex-[1.3] flex cursor-pointer items-center justify-center rounded-[10px] border-none bg-primary py-3 font-bold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {pending ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-foreground-secondary uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}