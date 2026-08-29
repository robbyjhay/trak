"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { PrimaryBtn, GhostBtn } from "@/components/ui/Buttons";
import { Switch } from "@/components/ui/Switch";
import type { Activity, ActivityType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/constants";
import { TypeIcon } from "@/components/icons";

const TYPES: ActivityType[] = ["Meeting", "Project", "Program", "Task"];

export function ActivityEditModal({
  activity,
  open,
  onClose,
}: {
  activity: Activity;
  open: boolean;
  onClose: () => void;
}) {
  const { responsibilities, updateActivityMetadata, showToast } = useTrak();
  const [activityType, setActivityType] = useState<ActivityType>(activity.type);
  const [title, setTitle] = useState(activity.title);
  const [desc, setDesc] = useState(activity.description || "");
  const [time, setTime] = useState(activity.startTime || "");
  const [location, setLocation] = useState(activity.location || "");
  const [hasBudget, setHasBudget] = useState(activity.hasBudget);
  const [estimatedAmount, setEstimatedAmount] = useState(
    activity.estimatedAmountNgn ? activity.estimatedAmountNgn.toString() : ""
  );
  const [selectedResp, setSelectedResp] = useState<Set<string>>(
    new Set(activity.responsibilityIds)
  );
  const [saving, setSaving] = useState(false);

  const ok = title.trim().length > 2 && time && selectedResp.size > 0;

  function toggleResp(id: string) {
    setSelectedResp((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <ModalBackdrop open={open} onClose={onClose} labelledBy="edit-modal-title" bottomSheetOnMobile>
      <ModalPanel className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="edit-modal-title" className="text-lg font-semibold">Edit Activity</h2>
          <button onClick={onClose} className="text-foreground-faint hover:text-foreground">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-foreground-secondary">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input px-[15px] py-3 text-sm outline-none focus:border-border-strong"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-foreground-secondary">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="min-h-[80px] w-full rounded-[11px] border-[1.5px] border-input-border bg-input px-[15px] py-3 text-sm outline-none focus:border-border-strong"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-foreground-secondary">Start Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input px-[15px] py-3 text-sm outline-none focus:border-border-strong"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-foreground-secondary">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input px-[15px] py-3 text-sm outline-none focus:border-border-strong"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-foreground-secondary">Type *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActivityType(t)}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[11px] border-[1.5px] p-2 text-center transition-colors ${
                    activityType === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface text-foreground-secondary"
                  }`}
                >
                  <div className="text-[11px] font-bold">{t}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-foreground-secondary">Responsibilities *</label>
            <div className="flex flex-wrap gap-2">
              {responsibilities.filter(r => r.isActive !== false).map((r) => {
                const on = selectedResp.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleResp(r.id)}
                    className={`cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground-secondary"
                    }`}
                  >
                    {r.code}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-3">
              <Switch id="edit-budget" checked={hasBudget} onChange={setHasBudget} />
              <label htmlFor="edit-budget" className="cursor-pointer text-[13px] font-semibold">
                Budget tracking
              </label>
            </div>
            {hasBudget && (
              <input
                type="number"
                min="0"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
                placeholder="Est. amount (NGN)"
                className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input px-[15px] py-3 text-sm outline-none focus:border-border-strong"
              />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <GhostBtn onClick={onClose} disabled={saving}>Cancel</GhostBtn>
          <PrimaryBtn
            disabled={!ok || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await updateActivityMetadata(activity.id, {
                  title: title.trim(),
                  type: activityType,
                  description: desc.trim(),
                  startTime: time,
                  location: location.trim(),
                  hasBudget,
                  estimatedAmountNgn: hasBudget && estimatedAmount ? Number(estimatedAmount) : null,
                  responsibilityIds: Array.from(selectedResp),
                });
                showToast("Activity updated", "Changes have been saved.");
                onClose();
              } catch (e: any) {
                showToast("Could not update activity", e.message || "An error occurred.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </PrimaryBtn>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
