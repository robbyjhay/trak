"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { firstName, suggestUsername } from "@/lib/utils";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";

const FIELD_INPUT =
  "w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3.5 py-2.5 text-[13px] outline-none focus:border-aztec-3";

export function AddMember({ onClose }: { onClose: () => void }) {
  const { users, addUser, showToast } = useTrak();
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
    roleType: "member",
  });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successCredentials, setSuccessCredentials] = useState<{ username: string; starterPassword: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError("");
  }

  async function save() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name || !phone) {
      setError("Full name and phone are required.");
      return;
    }
    setSaving(true);
    try {
      const email = form.email.trim() || undefined;
      const { username, starterPassword } = await addUser({
        name,
        username: form.username.trim() || undefined,
        email,
        designation: form.designation.trim(),
        gradeLevel: form.gradeLevel.trim(),
        sex: form.sex,
        phone,
        stateOfOrigin: form.stateOfOrigin.trim(),
        dateJoined: form.dateJoined,
        roleType: form.roleType as "member" | "secretary" | "corps" | "intern",
      });
      setSaving(false);
      setSuccessCredentials({ username, starterPassword });
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Could not add member.");
    }
  }

  return (
    <ModalBackdrop open onClose={onClose} labelledBy="add-member-title">
      <ModalPanel>
        {successCredentials ? (
          <div className="text-center">
            <h3 id="add-member-title" className="m-0 mb-4 font-display text-xl text-primary">
              Member created successfully
            </h3>
            <div className="mb-6 rounded-xl bg-neutral-bg p-5 text-left font-mono text-[13px] leading-relaxed text-ink shadow-sm border border-line">
              <div className="mb-2">
                <span className="font-bold text-ink-soft uppercase tracking-wider text-[11px]">Username</span>
                <div className="mt-1 text-[15px] font-bold text-ink">{successCredentials.username}</div>
              </div>
              <div>
                <span className="font-bold text-ink-soft uppercase tracking-wider text-[11px]">Initial password</span>
                <div className="mt-1 text-[15px] font-bold text-ink">{successCredentials.starterPassword}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="w-full cursor-pointer rounded-[10px] border-none bg-aztec py-3.5 font-bold text-white transition-colors hover:bg-aztec-3"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(successCredentials.starterPassword);
                    showToast("Password copied", "You can now paste it securely.");
                  } catch {
                    showToast("Copy failed", "Please copy manually.");
                  }
                }}
              >
                Copy Password
              </button>
              <button
                type="button"
                className="w-full cursor-pointer rounded-[10px] border-[1.5px] border-line bg-transparent py-3.5 font-bold transition-colors hover:bg-neutral-bg"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 id="add-member-title" className="m-0 mb-1.5 font-display text-xl">
              Add member
            </h3>
            <p className="mb-5 text-[12.5px] text-ink-soft">
              Creates their Trak login — you&apos;ll get their username &amp; a
              starter password to share, and they&apos;re prompted to set their own
              at first sign-in. With an email on file, an invite link is also sent.
            </p>

        <Field label="Full name *">
          <input
            value={form.name}
            onChange={(e) => {
              const value = e.target.value;
              set("name", value);
              if (!usernameTouched) {
                set(
                  "username",
                  suggestUsername(value, users.map((u) => u.username)),
                );
              }
            }}
            placeholder="Full name"
            className={FIELD_INPUT}
            autoComplete="name"
          />
        </Field>
        <Field label="Username">
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
          <div className="mt-1 text-[11px] text-ink-soft">
            Leave blank to auto-generate (DLU + surname) — you can override.
          </div>
        </Field>
        <Field label="Email (optional)">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@example.gov.ng"
            className={FIELD_INPUT}
            autoComplete="email"
          />
          <div className="mt-1 text-[11px] text-ink-soft">
            When set, an invite link is emailed so they can set their own
            password.
          </div>
        </Field>
        <Field label="Designation">
          <input
            value={form.designation}
            onChange={(e) => set("designation", e.target.value)}
            placeholder="e.g. Learning Technologies Officer"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="Grade level">
          <input
            value={form.gradeLevel}
            onChange={(e) => set("gradeLevel", e.target.value)}
            placeholder="e.g. GL 09"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="Sex">
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
        <Field label="Role type">
          <select
            value={form.roleType}
            onChange={(e) => set("roleType", e.target.value)}
            className={FIELD_INPUT}
          >
            <option value="member">Member</option>
            <option value="secretary">Secretary</option>
            <option value="corps">NYSC Corps</option>
            <option value="intern">Intern</option>
          </select>
        </Field>
        <Field label="Phone *">
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="e.g. +234 80 1234 5678"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="State of origin">
          <select
            value={form.stateOfOrigin}
            onChange={(e) => set("stateOfOrigin", e.target.value)}
            className={FIELD_INPUT}
          >
            <option value="">Select state…</option>
            {["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"].map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </Field>
        <Field label="Date joined PSSDC">
          <input
            type="date"
            value={form.dateJoined}
            onChange={(e) => set("dateJoined", e.target.value)}
            className={FIELD_INPUT}
          />
        </Field>

        {error && (
          <div
            className="mb-1 rounded-lg bg-critical-bg px-3 py-2 text-[12px] font-semibold text-critical"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-[22px] flex gap-2.5">
          <button
            type="button"
            className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line bg-transparent py-3 font-bold"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Adding…" : "Add member"}
          </button>
        </div>
        </>
        )}
      </ModalPanel>
    </ModalBackdrop>
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
      <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}
