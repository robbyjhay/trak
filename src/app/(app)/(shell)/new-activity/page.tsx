"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { RESPONSIBILITIES, RESP } from "@/lib/mockDb";
import { TYPE_COLOR } from "@/lib/constants";
import { TypeIcon } from "@/components/icons";
import { PrimaryBtn } from "@/components/ui/Buttons";
import { fmtDate, fmtTime } from "@/lib/dates";
import type { ActivityType } from "@/lib/types";
import { PATHS } from "@/components/icons";

const TYPES: ActivityType[] = ["Meeting", "Project", "Program", "Task"];

export default function NewActivityPage() {
  const router = useRouter();
  const { createActivity, showToast } = useTrak();
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [selectedResp, setSelectedResp] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

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
        <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
          Create &amp; Log
        </div>
        <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
          New Activity
        </h1>
        <p className="m-0 text-[13.5px] text-ink-soft">
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
          <div className="mb-1.5 min-h-14 font-display text-[22px] leading-snug font-semibold">
            {title.trim() || "Untitled activity"}
          </div>
          <div className="mb-[18px] text-[12.5px] leading-snug text-paper/60">
            {desc.trim() || "Your description will appear here as you type."}
          </div>
          <div className="my-4 border-t border-dashed border-paper/22" />
          <Row label="Starts" value={start ? fmtDate(start) : "—"} />
          <Row label="Ends" value={end ? fmtDate(end) : "—"} />
          <Row label="Start time" value={time ? fmtTime(time) : "—"} />
          <div className="my-4 border-t border-dashed border-paper/22" />
          <div className="mb-1.5 text-[12.5px] text-paper/50">Responsibilities</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedResp.size ? (
              [...selectedResp].map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-paper/10 px-2.5 py-0.5 text-[10.5px]"
                >
                  {RESP[id]?.code}
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
        <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
          <Section label="Activity type" required>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map((t) => {
                const sel = activityType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 py-4 text-center ${
                      sel
                        ? "border-saffron bg-linear-to-b from-[#fffaf0] to-white shadow-[0_0_0_3px_rgba(246,198,66,0.22)]"
                        : "border-line bg-white"
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
              className="w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 text-sm outline-none focus:border-aztec-3"
            />
          </Section>

          <Section label="Brief description">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this activity about?"
              className="min-h-[88px] w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 text-sm outline-none focus:border-aztec-3"
            />
          </Section>

          <Section label="Dates" required>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-bold text-ink-faint uppercase">
                  Start date
                </div>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (!end || end < e.target.value) setEnd(e.target.value);
                  }}
                  className="w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 outline-none focus:border-aztec-3"
                />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold text-ink-faint uppercase">
                  End date
                </div>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 outline-none focus:border-aztec-3"
                />
              </div>
            </div>
            {multiDay && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-[11px] border border-[#cdead9] bg-good-bg px-3.5 py-3 text-[12.5px] leading-snug text-[#215c42]">
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
              className="w-[220px] rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 outline-none focus:border-aztec-3"
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
              className="w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 text-sm outline-none focus:border-aztec-3"
            />
          </Section>

          <Section label="Linked responsibilities" required>
            <div className="flex flex-wrap gap-2">
              {RESPONSIBILITIES.map((r) => {
                const on = selectedResp.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleResp(r.id)}
                    className={`cursor-pointer rounded-full border-[1.5px] px-4 py-2 text-[12.5px] font-semibold ${
                      on
                        ? "border-aztec-3 bg-aztec-3 text-white"
                        : "border-line bg-white text-ink-soft"
                    }`}
                  >
                    <b className="mr-1 opacity-60">{r.code}</b>
                    {r.name}
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="mt-9 flex items-center justify-end border-t border-line pt-6">
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
      <div className="mb-3 text-[11.5px] font-bold tracking-wider text-ink-soft uppercase">
        {label}{" "}
        {required && <span className="text-critical">*</span>}
        {optional && (
          <span className="font-medium normal-case text-ink-faint">
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
