"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import type { Responsibility } from "@/lib/types";

const FIELD_INPUT =
  "w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3.5 py-2.5 text-[13px] outline-none focus:border-aztec-3";

export function RespFormModal({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing: Responsibility | null;
}) {
  const { createResponsibility, updateResponsibility, showToast } = useTrak();
  const [form, setForm] = useState({
    code: existing?.code || "",
    name: existing?.name || "",
    desc: existing?.desc || "",
    deliverables: (existing?.deliverables || []).join("\n"),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError("");
  }

  async function save() {
    const code = form.code.trim();
    const name = form.name.trim();
    const desc = form.desc.trim();
    if (!code || !name || !desc) {
      setError("Short code, name, and description are all required.");
      return;
    }
    const deliverables = form.deliverables
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      if (existing) {
        await updateResponsibility(existing.id, { code, name, desc, deliverables });
        onClose();
        showToast("Responsibility updated", `${code} — ${name} saved to every activity form and report.`);
      } else {
        const created = await createResponsibility({ code, name, desc, deliverables });
        onClose();
        showToast("Responsibility created", `${created.code} — ${created.name} now available in every activity form and report.`);
      }
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Could not save responsibility.");
    }
  }

  return (
    <ModalBackdrop open onClose={onClose}>
      <ModalPanel>
        <h3 className="m-0 mb-1.5 font-display text-xl">
          {existing ? "Edit responsibility" : "Add responsibility"}
        </h3>
        <p className="mb-5 text-[12.5px] text-ink-soft">
          {existing
            ? "Changes apply to every activity form and generated report."
            : "Creates a new responsibility area that every activity can link to."}
        </p>

        <Field label="Short code *">
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="e.g. LMS"
            className={`${FIELD_INPUT} font-mono`}
          />
        </Field>
        <Field label="Name *">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Learning Management System"
            className={FIELD_INPUT}
          />
        </Field>
        <Field label="Description *">
          <textarea
            value={form.desc}
            onChange={(e) => set("desc", e.target.value)}
            placeholder="What this responsibility covers…"
            rows={3}
            className={`${FIELD_INPUT} resize-none`}
          />
        </Field>
        <Field label="Deliverables">
          <textarea
            value={form.deliverables}
            onChange={(e) => set("deliverables", e.target.value)}
            placeholder="One per line — e.g.&#10;Course uploads&#10;Attendance records"
            rows={4}
            className={`${FIELD_INPUT} resize-none`}
          />
          <div className="mt-1 text-[11px] text-ink-soft">
            Shown in the responsibility list and the report&apos;s deliverables.
          </div>
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
            {saving ? "Saving…" : existing ? "Save changes" : "Create"}
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
