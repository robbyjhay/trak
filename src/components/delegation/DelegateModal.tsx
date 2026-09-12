"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { apiSend } from "@/lib/api/client";
import { GhostBtn, PrimaryBtn } from "@/components/ui/Buttons";
import {
  ModalBackdrop,
  ModalPanel,
} from "@/components/ui/Modal";
import { TrakLoader } from "@/components/ui/TrakLoader";
import type { Activity, DelegationType } from "@/lib/types";

type Kind = "unit" | "library" | "innovation";

export function DelegateModal({
  kind,
  targetId,
  title,
  open,
  onClose,
  onSuccess,
}: {
  kind: Kind;
  targetId: string;
  title: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (activity: Activity) => void;
}) {
  const { users, showToast } = useTrak();
  const members = users.filter((u) => u.role !== "head" && u.isActive);

  const [assigneeId, setAssigneeId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAssigneeId("");
    setDueAt("");
    setNotes("");
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const routeKind: Record<Kind, string> = {
    unit: `/api/activities/${targetId}/delegate`,
    library: `/api/library/${targetId}/delegate`,
    innovation: `/api/innovation-cloud/${targetId}/delegate`,
  };

  const body: Record<string, unknown> = { assigneeId };
  if (kind !== "unit") {
    body.dueAt = dueAt || null;
    body.notes = notes || undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneeId) {
      setError("Select a member to delegate to.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await apiSend<{ activity: Activity }>(
        routeKind[kind],
        "POST",
        body,
      );
      showToast("Work delegated", "The member has been notified.");
      reset();
      onSuccess(res.activity);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delegation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const label =
    kind === "unit"
      ? "Delegate Task"
      : kind === "library"
        ? "Delegate for Self-Development"
        : "Assign as Collaborator";

  return (
    <ModalBackdrop
      open={open}
      onClose={handleClose}
      labelledBy="delegate-title"
      bottomSheetOnMobile
    >
      <ModalPanel bottomSheetOnMobile className="w-[480px] max-w-[94vw]">
        <h2
          id="delegate-title"
          className="font-display text-[20px] font-bold text-foreground"
        >
          {label}
        </h2>
        <p className="mt-1 text-[13px] text-foreground-secondary">
          {kind === "unit"
            ? "Assign this activity to a member. They will see it in their Pending Tasks and receive a notification."
            : kind === "library"
              ? "Assign a self-development task based on this resource. The member will be able to submit a report when complete."
              : "Assign a member to collaborate on this idea. They will be able to submit a collaboration task report."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="delegate-member"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >
              Assign to <span className="text-critical-semantic">*</span>
            </label>
            <select
              id="delegate-member"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5 text-[13.5px] font-medium text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none"
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {kind !== "unit" && (
            <>
              <div>
                <label
                  htmlFor="delegate-due"
                  className="mb-1.5 block text-[12.5px] font-bold text-foreground"
                >
                  Due date
                </label>
                <input
                  id="delegate-due"
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5 text-[13.5px] text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="delegate-notes"
                  className="mb-1.5 block text-[12.5px] font-bold text-foreground"
                >
                  Instructions for the member
                </label>
                <textarea
                  id="delegate-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional context or instructions for the task…"
                  className="w-full resize-y rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5 text-[13.5px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-critical-surface px-3.5 py-2 text-[12.5px] font-semibold text-critical-semantic">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <GhostBtn type="button" onClick={handleClose} disabled={submitting}>
              Cancel
            </GhostBtn>
            <PrimaryBtn type="submit" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <TrakLoader className="h-4 w-4" /> Delegating…
                </span>
              ) : (
                label
              )}
            </PrimaryBtn>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}