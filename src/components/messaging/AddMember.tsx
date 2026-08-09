"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { pickUserColor } from "@/lib/utils";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import type { User } from "@/lib/types";

const FIELD_INPUT =
  "w-full rounded-[10px] border-[1.5px] border-line bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-aztec-3";

export function AddMember({ onClose }: { onClose: () => void }) {
  const { addUser, showToast } = useTrak();
  const [form, setForm] = useState({
    name: "",
    username: "",
    designation: "",
    gradeLevel: "",
    sex: "",
    phone: "",
    stateOfOrigin: "",
    dateJoined: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError("");
  }

  function save() {
    const name = form.name.trim();
    const username = form.username.trim();
    const phone = form.phone.trim();
    if (!name || !username || !phone) {
      setError("Full name, username and phone are required.");
      return;
    }
    const u: User = {
      id: "",
      name,
      username,
      role: "member",
      isSecretary: false,
      isCorps: false,
      color: pickUserColor(name),
      phone,
      designation: form.designation.trim(),
      gradeLevel: form.gradeLevel.trim(),
      sex: form.sex,
      stateOfOrigin: form.stateOfOrigin.trim(),
      dateJoined: form.dateJoined,
      photoUrl: null,
    };
    setSaving(true);
    void addUser(u)
      .then(() => {
        setSaving(false);
        onClose();
        showToast("Member added", `${name} is now on the unit roster.`);
      })
      .catch((err) => {
        setSaving(false);
        setError(
          err instanceof Error ? err.message : "Could not add member.",
        );
      });
  }

  return (
    <ModalBackdrop open onClose={onClose}>
      <ModalPanel>
        <h3 className="m-0 mb-1.5 font-display text-xl">Add member</h3>
        <p className="mb-5 text-[12.5px] text-ink-soft">
          Adds a roster entry to the unit contacts. No sign-in account is
          created.
        </p>

        <Field label="Full name *">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Adaeze Nwosu"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="Username *">
          <input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="e.g. DLUADO"
            className={FIELD_INPUT}
          />
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
        <Field label="Phone *">
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="e.g. +234 80 1234 5678"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="State of origin">
          <input
            value={form.stateOfOrigin}
            onChange={(e) => set("stateOfOrigin", e.target.value)}
            className={FIELD_INPUT}
          />
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
          <div className="mb-1 rounded-lg bg-critical-bg px-3 py-2 text-[12px] font-semibold text-critical">
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
