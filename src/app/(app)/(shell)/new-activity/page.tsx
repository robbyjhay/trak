"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { TYPE_COLOR } from "@/lib/constants";
import { TypeIcon } from "@/components/icons";
import { PrimaryBtn } from "@/components/ui/Buttons";
import { fmtDate, fmtTime } from "@/lib/dates";
import type { ActivityType } from "@/lib/types";
import { PATHS } from "@/components/icons";

const TYPES: ActivityType[] = ["Meeting", "Project", "Program", "Task"];

export default function NewActivityPage() {
  const router = useRouter();
  const { createActivity, responsibilities, showToast } = useTrak();
  const respMap = Object.fromEntries(
    responsibilities.map((r) => [r.id, r]),
  );
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [selectedResp, setSelectedResp] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [hasBudget, setHasBudget] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState("");

  const multiDay = !!(start && end && end > start);
  const ok =
    activityType &&
    title.trim().length > 2 &&
    start &&
    time &&
    selectedResp.size > 0;

  function toggleResp(id: string) {
    setSelectedResp((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div>
      <div className="mb-[22px]">
        <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-foreground-secondary uppercase">
          Create &amp; Log
        </div>
        <h1 className="m-0 mb-1.5 text-[30px] font-semibold">
          New Activity
        </h1>
        <p className="m-0 text-[13.5px] text-foreground-secondary">
          Saves straight to your Pending Activities.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Live preview */}
        <div className="h-fit rounded-[18px] border-none bg-linear-to-br from-aztec via-aztec-2 to-aztec-3 px-[26px] py-6 text-paper lg:sticky lg:top-[92px]">
          <div className="mb-1 text-[10.5px] tracking-[0.12em] text-paper/55 uppercase">
            Live preview
          </div>
          <div className="mb-4 inline-flex rounded-full bg-saffron/15 px-2.5 py-1 text-[11.5px] font-bold text-saffron uppercase">
            {activityType || "Select a type"}
          </div>
          <div className="mb-1.5 min-h-14 text-[22px] leading-snug font-semibold">
            {title.trim() || "Untitled activity"}
          </div>
          <div className="mb-[18px] text-[12.5px] leading-snug text-paper/60">
            {desc.trim() || "Your description will appear here as you type."}
          </div>
          <div className="my-4 border-t border-dashed border-paper/22" />
          <Row label="Starts" value={start ? fmtDate(start) : "—"} />
          <Row label="Ends" value={end ? fmtDate(end) : "—"} />
          <Row label="Start time" value={time ? fmtTime(time) : "—"} />
          {hasBudget && (
            <Row
              label="Est. budget"
              value={
                estimatedAmount
                  ? `₦${Number(estimatedAmount).toLocaleString()}`
                  : "—"
              }
            />
          )}
          <div className="my-4 border-t border-dashed border-paper/22" />
          <div className="mb-1.5 text-[12.5px] text-paper/50">Responsibilities</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedResp.size ? (
              [...selectedResp].map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-paper/10 px-2.5 py-0.5 text-[10.5px]"
                >
                  {respMap[id]?.code}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-paper/10 px-2.5 py-0.5 text-[10.5px]">
                None linked yet
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
          <Section label="Activity type" required>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map((t) => {
                const sel = activityType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 py-4 text-center transition-colors ${
                      sel
                        ? "border-primary bg-primary/10 shadow-[0_0_0_3px_rgba(246,198,66,0.22)] text-foreground"
                        : "border-border bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground"
                    }`}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-[11px]"
                      style={{ background: TYPE_COLOR[t] }}
                    >
                      <TypeIcon type={t} />
                    </div>
                    <div className="text-[12.5px] font-bold">{t}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Digital literacy training — SS2 batch"
              className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-primary"
            />
          </Section>

          <Section label="Brief description">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this activity about?"
              className="min-h-[88px] w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-primary"
            />
          </Section>

          <Section label="Dates" required>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-bold text-foreground-faint uppercase">
                  Start date
                </div>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (!end || end < e.target.value) setEnd(e.target.value);
                  }}
                  className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 outline-none focus:border-primary"
                />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold text-foreground-faint uppercase">
                  End date
                </div>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 outline-none focus:border-primary"
                />
              </div>
            </div>
            {multiDay && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-[11px] border border-success/30 bg-success-surface px-3.5 py-3 text-[12.5px] leading-snug text-success">
                This spans multiple days — you&apos;ll get a daily &quot;Submit
                today&apos;s activity&quot; prompt for each day.
              </div>
            )}
          </Section>

          <Section label="Start time" required>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-[220px] rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 outline-none focus:border-primary"
            />
          </Section>

          <Section
            label="Location / Platform"
            optional
          >
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. PSSDC ICT Hub, Room 204 — or a Zoom / Google Meet link"
              className="w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-primary"
            />
          </Section>

          <Section label="Budget tracking" optional>
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setHasBudget(!hasBudget)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  hasBudget ? "bg-primary" : "bg-surface-muted border border-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    hasBudget ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-[13px] font-semibold">
                {hasBudget ? "This activity has a budget" : "No budget tracking"}
              </span>
            </div>
            {hasBudget && (
              <div>
                <div className="mb-2 text-[11px] font-bold text-foreground-faint uppercase">
                  Estimated amount (NGN)
                </div>
                <input
                  type="number"
                  min="0"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  placeholder="e.g. 250000"
                  className="w-full max-w-[300px] rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
          </Section>

          <Section label="Linked responsibilities" required>
            <div className="flex flex-wrap gap-2">
              {responsibilities.filter((r) => r.isActive !== false).map((r) => {
                const on = selectedResp.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleResp(r.id)}
                    className={`cursor-pointer rounded-full border-[1.5px] px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground-secondary hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    <b className="mr-1 opacity-60">{r.code}</b>
                    {r.name}
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="sticky bottom-0 z-10 mt-9 flex items-center justify-end border-t border-border bg-surface pt-6 pb-6">
            <PrimaryBtn
              disabled={!ok}
              onClick={async () => {
                if (!activityType || !ok) return;
                try {
                  const act = await createActivity({
                    title: title.trim(),
                    type: activityType,
                    description: desc.trim(),
                    startDate: start,
                    endDate: end || start,
                    startTime: time,
                    endTime: "",
                    responsibilityIds: [...selectedResp],
                    location: location.trim(),
                    hasBudget,
                    estimatedAmountNgn: hasBudget && estimatedAmount
                      ? Number(estimatedAmount)
                      : null,
                  });
                  showToast(
                    "Saved to Pending Activities",
                    `"${act.title}" is ready whenever you want to open it.`,
                  );
                  router.push("/dashboard");
                } catch {
                  showToast("Could not create activity", "Please try again.");
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.plus} />
              </svg>
              Create Activity
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[30px] last:mb-0">
      <div className="mb-3 text-[11.5px] font-bold tracking-wider text-foreground-secondary uppercase">
        {label}{" "}
        {required && <span className="text-critical-semantic">*</span>}
        {optional && (
          <span className="font-medium normal-case text-foreground-faint">
            — optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex justify-between text-[12.5px] last:mb-0">
      <span className="text-paper/50">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}
