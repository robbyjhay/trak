"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { canComment } from "@/lib/permissions";
import { fmtDate, fmtTime } from "@/lib/dates";
import { firstName, initials, toBase64Url } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { PrimaryBtn, GhostBtn } from "@/components/ui/Buttons";
import { useReportPreview } from "@/components/reports/ReportPreview";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { Attendee, Attachment } from "@/lib/types";

export function ActivityDetail({
  activityId,
  onSubmitted,
}: {
  activityId: string;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const {
    getActivity,
    getLogs,
    getComments,
    sessionUser,
    userMap,
    addComment,
    showToast,
    submitDailyLog,
    updateActivityWrapup,
    setLogRsvpToken,
    refresh,
    users,
    responsibilities,
  } = useTrak();
  const respMap = Object.fromEntries(
    responsibilities.map((r) => [r.id, r]),
  );
  const { openReport } = useReportPreview();

  // Refresh so public RSVP submissions appear while this page is open.
  useEffect(() => {
    const onFocus = () => {
      refresh().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    const poll = setInterval(() => {
      refresh().catch(() => {});
    }, 15_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(poll);
    };
  }, [refresh]);

  const act = getActivity(activityId);
  if (!act) {
    return (
      <div className="py-10 text-center text-[13px] text-ink-faint">
        Activity not found.
      </div>
    );
  }

  const logs = getLogs(act.id);
  const owner = userMap[act.createdBy];
  const comments = getComments(act.id);
  const isMine = sessionUser.id === act.createdBy;
  const headCanComment = canComment(sessionUser);

  return (
    <div>
      <div className="mb-[22px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11.5px] font-bold text-ink-soft transition-colors hover:border-saffron-dim hover:text-ink cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-ink-soft uppercase">
          {act.type} ·{" "}
          {act.status === "completed"
            ? "Completed"
            : act.status === "missed"
              ? "Missed"
              : "Pending"}
          {owner && owner.id !== sessionUser.id ? ` · ${owner.name}` : ""}
        </div>
        <h1 className="m-0 max-w-[640px] text-[30px] font-semibold">
          {act.title}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <span className="rounded-full bg-aztec-2 px-2.5 py-1 text-[11px] font-bold text-saffron">
            {act.type}
          </span>
          <span className="rounded-full bg-neutral-bg px-2.5 py-1 text-[11px] font-bold text-ink-soft">
            {fmtDate(act.startDate)}
            {act.startDate !== act.endDate ? ` – ${fmtDate(act.endDate)}` : ""} ·{" "}
            {fmtTime(act.startTime)}
          </span>
          {act.responsibilityIds.map((id) => (
            <span
              key={id}
              className="rounded-full bg-neutral-bg px-2.5 py-1 text-[11px] font-bold text-ink-soft"
            >
              {respMap[id]?.code} — {respMap[id]?.name}
            </span>
          ))}
          {act.delegatedBy && (
            <span className="rounded-full bg-warning-bg px-2.5 py-1 text-[9.5px] font-bold tracking-wide text-warning-ink uppercase">
              Delegated by{" "}
              {act.delegatedBy === "babajide"
                ? "Unit Head"
                : firstName(userMap[act.delegatedBy]?.name || "")}
            </span>
          )}
          {act.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-bg px-2.5 py-1 text-[11px] font-bold text-ink-soft">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d={PATHS.pin} />
              </svg>
              {act.location}
            </span>
          )}
          {act.hasBudget && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-bold text-[#9a7b4f]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              {act.estimatedAmountNgn
                ? `₦${act.estimatedAmountNgn.toLocaleString()}`
                : "Budget tracked"}
            </span>
          )}
        </div>
      </div>

      {act.status === "missed" && (
        <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-critical-bg text-critical">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.alert} />
              </svg>
            </div>
            <div>
              <div className="mb-1 font-bold">
                This activity passed its date with nothing submitted.
              </div>
              <div className="text-[13px] text-ink-soft">
                It&apos;s recorded as Missed.{" "}
                {isMine
                  ? "You can still create a fresh activity to cover this work if needed."
                  : ""}
              </div>
            </div>
          </div>
        </div>
      )}

      {act.status === "completed" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            {logs.map((l) => (
              <div
                key={l.id}
                className="mb-6 rounded-[18px] border border-line bg-card px-[26px] py-6 last:mb-0"
              >
                <div className="mb-[18px] flex items-center justify-between">
                  <h2 className="m-0 font-display text-[17px] font-semibold">
                    {logs.length > 1 ? fmtDate(l.date) : "Activity log"}
                  </h2>
                  <span className="text-[11.5px] text-ink-faint">
                    Submitted {l.submittedAt ? fmtDate(l.submittedAt) : ""}
                  </span>
                </div>
                <FieldBlock label="Objectives">{l.objectives || "—"}</FieldBlock>
                <FieldBlock label="Description of activity done">
                  {l.activityDescription || "—"}
                </FieldBlock>
                {l.transcript && (
                  <FieldBlock label="Transcript summary" soft>
                    {l.transcript}
                  </FieldBlock>
                )}
                {l.attendees?.length ? (
                  <div className="mb-3.5">
                    <div className="mb-1.5 text-[11px] font-bold text-ink-faint uppercase">
                      Attendance — {l.attendees.length} present
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {l.attendees.map((a, i) => (
                        <span
                          key={i}
                          title={[a.phone, a.email].filter(Boolean).join(" · ")}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-bg px-3 py-1.5 text-xs font-semibold"
                        >
                          {a.name}
                          <span className="text-[9.5px] font-bold text-ink-faint uppercase">
                            {a.source === "link"
                              ? "· via link"
                              : a.source === "manual"
                                ? "· manual"
                                : ""}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : l.attendanceCount ? (
                  <FieldBlock label="Attendance">
                    {l.attendanceCount} present
                    {l.attendanceNotes ? ` · ${l.attendanceNotes}` : ""}
                  </FieldBlock>
                ) : null}
                {act.hasBudget &&
                  (l.amountReleasedNgn != null ||
                    l.amountSpentNgn != null ||
                    (l.spendingItems && l.spendingItems.length > 0)) && (
                    <div className="mb-3.5">
                      <div className="mb-1.5 text-[11px] font-bold text-ink-faint uppercase">
                        Budget &amp; spending
                      </div>
                      <div className="rounded-[11px] bg-[#fcfbf8] border border-[#f0dba9] p-3 text-[12.5px]">
                        {l.amountReleasedNgn != null && (
                          <div className="mb-1">
                            <span className="text-ink-faint">Released:</span>{" "}
                            <span className="font-bold">
                              ₦{l.amountReleasedNgn.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {l.amountSpentNgn != null && (
                          <div className="mb-1">
                            <span className="text-ink-faint">Spent:</span>{" "}
                            <span className="font-bold">
                              ₦{l.amountSpentNgn.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {l.spendingItems && l.spendingItems.length > 0 && (
                          <div className="mt-2 border-t border-[#f0dba9] pt-2">
                            <div className="mb-1 text-[10.5px] font-bold text-ink-faint uppercase">
                              Items
                            </div>
                            {l.spendingItems.map((s, i) => (
                              <div key={i} className="flex justify-between text-[12px]">
                                <span>{s.description}</span>
                                <span className="font-bold">
                                  ₦{s.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
            {(act.initiativeTeamwork ||
              act.challenges ||
              act.outcomes ||
              act.nextSteps) && (
              <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
                <h2 className="mb-[18px] font-display text-[17px] font-semibold">
                  Wrap-up notes
                </h2>
                {act.initiativeTeamwork && (
                  <FieldBlock label="Initiative & teamwork">
                    {act.initiativeTeamwork}
                  </FieldBlock>
                )}
                {act.challenges && (
                  <FieldBlock label="Challenges encountered">
                    {act.challenges}
                  </FieldBlock>
                )}
                {act.outcomes && (
                  <FieldBlock label="Outcomes / impact">{act.outcomes}</FieldBlock>
                )}
                {act.nextSteps && (
                  <FieldBlock label="Next steps / recommendations">
                    {act.nextSteps}
                  </FieldBlock>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="mb-6 rounded-[18px] border border-line bg-card px-[26px] py-6">
              <h2 className="mb-[18px] font-display text-[17px] font-semibold">
                Unit Head&apos;s remarks
              </h2>
              {comments.length ? (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="mb-2.5 rounded-[11px] bg-neutral-bg p-3 text-[12.5px] leading-relaxed"
                  >
                    <b>{firstName(userMap[c.authorId]?.name || "")}:</b> {c.text}
                    <div className="mt-1 text-[10.5px] text-ink-faint">
                      {fmtDate(c.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-[13px] text-ink-faint">
                  No comments yet.
                </div>
              )}
              {headCanComment && (
                <CommentInput
                  onSend={(text) => {
                    void addComment(act.id, text)
                      .then(() =>
                        showToast(
                          "Comment sent",
                          `${firstName(owner?.name || "")} will see this on their activity.`,
                        ),
                      )
                      .catch(() =>
                        showToast("Could not send comment", "Please try again."),
                      );
                  }}
                />
              )}
            </div>
            <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
              <h2 className="mb-[18px] text-[17px] font-semibold">
                Report
              </h2>
              <PrimaryBtn
                className="w-full justify-center py-3 shadow-md"
                onClick={() => openReport(act.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={PATHS.download} />
                </svg>
                Preview &amp; Download Report
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {act.status === "pending" && (
        <PendingForm
          act={act}
          logs={logs}
          ownerName={owner?.name || ""}
          users={users}
          setLogRsvpToken={setLogRsvpToken}
          submitDailyLog={submitDailyLog}
          updateActivityWrapup={updateActivityWrapup}
          showToast={showToast}
          onSubmitted={onSubmitted}
        />
      )}
    </div>
  );
}

function FieldBlock({
  label,
  children,
  soft,
}: {
  label: string;
  children: React.ReactNode;
  soft?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-[11px] font-bold text-ink-faint uppercase">
        {label}
      </div>
      <div
        className={`text-[13.5px] leading-relaxed ${soft ? "text-ink-soft" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function CommentInput({ onSend }: { onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a remark — it folds into the report…"
        className="flex-1 rounded-[9px] border-[1.5px] border-line px-3 py-2 text-[12.5px] outline-none focus:border-aztec-3"
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            onSend(text.trim());
            setText("");
          }
        }}
      />
      <button
        type="button"
        className="cursor-pointer rounded-[9px] border-[1.5px] border-line bg-neutral-bg px-3.5 py-2 text-xs font-bold text-ink-soft hover:bg-line hover:text-ink transition-colors"
        onClick={() => {
          if (!text.trim()) return;
          onSend(text.trim());
          setText("");
        }}
      >
        Send
      </button>
    </div>
  );
}

function PendingForm({
  act,
  logs,
  ownerName,
  users,
  setLogRsvpToken,
  submitDailyLog,
  updateActivityWrapup,
  showToast,
  onSubmitted,
}: {
  act: NonNullable<ReturnType<ReturnType<typeof useTrak>["getActivity"]>>;
  logs: ReturnType<ReturnType<typeof useTrak>["getLogs"]>;
  ownerName: string;
  users: ReturnType<typeof useTrak>["users"];
  setLogRsvpToken: (id: string, t?: string) => Promise<string>;
  submitDailyLog: ReturnType<typeof useTrak>["submitDailyLog"];
  updateActivityWrapup: ReturnType<typeof useTrak>["updateActivityWrapup"];
  showToast: ReturnType<typeof useTrak>["showToast"];
  onSubmitted?: () => void;
}) {
  const activeLogIndex = logs.findIndex((l) => l.status === "pending");
  const activeLog = logs[activeLogIndex];
  const speech = useSpeechRecognition();

  const [objectives, setObjectives] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [initiative, setInitiative] = useState(act.initiativeTeamwork);
  const [challenges, setChallenges] = useState(act.challenges);
  const [outcomes, setOutcomes] = useState(act.outcomes);
  const [nextSteps, setNextSteps] = useState(act.nextSteps);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [manualAttendees, setManualAttendees] = useState<Attendee[]>([]);
  const [manName, setManName] = useState("");
  const [manPhone, setManPhone] = useState("");
  const [manEmail, setManEmail] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [rsvpLink, setRsvpLink] = useState("");
  const [showRsvp, setShowRsvp] = useState(false);
  const [amountReleased, setAmountReleased] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  const [spendingItems, setSpendingItems] = useState<
    { description: string; amount: string }[]
  >([]);
  const [spendDesc, setSpendDesc] = useState("");
  const [spendAmt, setSpendAmt] = useState("");

  const canSubmit =
    objectives.trim().length > 3 && activityDescription.trim().length > 3;
  const isLastDay = activeLogIndex === logs.length - 1;

  if (!activeLog) {
    return (
      <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
        <div className="py-8 text-center text-[13px] text-ink-faint">
          All days for this activity have been submitted.
        </div>
      </div>
    );
  }

  return (
    <div>
      {logs.length > 1 && (
        <div className="mb-[26px] flex flex-col gap-2.5 sm:flex-row">
          {logs.map((l, i) => {
            const state =
              l.status === "submitted"
                ? "done"
                : i === activeLogIndex
                  ? "active"
                  : "locked";
            return (
              <div
                key={l.id}
                className={`flex-1 rounded-[14px] border-[1.5px] px-4 py-3.5 ${
                  state === "done"
                    ? "border-[#bfe3cf] bg-good-bg"
                    : state === "active"
                      ? "border-saffron bg-saffron/10"
                      : "border-line bg-surface opacity-50"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-extrabold uppercase ${
                      state === "done"
                        ? "text-good"
                        : state === "active"
                          ? "text-saffron-dim"
                          : "text-ink-faint"
                    }`}
                  >
                    Day {i + 1}
                  </span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${
                      state === "done"
                        ? "bg-good"
                        : state === "active"
                          ? "bg-saffron text-aztec"
                          : "bg-[#e2e2dc]"
                    }`}
                  >
                    {state === "done" ? "✓" : state === "active" ? "●" : "🔒"}
                  </div>
                </div>
                <div className="text-[13px] font-bold">
                  {new Date(l.date + "T00:00:00Z").toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-faint">
                  {state === "done"
                    ? "Submitted"
                    : state === "active"
                      ? "In progress — log below"
                      : "Unlocks after previous day"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
            <Section label="Today's objectives" required>
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="What are you covering / aiming to achieve today?"
                className="min-h-[90px] w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 text-sm outline-none focus:border-aztec-3"
              />
            </Section>
            <Section label="Description of activity done" required hint="— explain what was done">
              <textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Explain what was actually done during this session — this is what shows up in the report's Scope of Work."
                className="min-h-[100px] w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 text-sm outline-none focus:border-aztec-3"
              />
            </Section>
            <Section label="Record objectives / summary" optional>
              <div className="rounded-2xl border-[1.5px] border-line bg-[#fcfbf8] p-[22px]">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={speech.toggle}
                    className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-linear-to-br from-[#c0392b] to-[#8f2a20] text-white"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d={PATHS.mic} />
                    </svg>
                  </button>
                  <div>
                    <div className="text-[13.5px] font-bold">
                      {speech.isRecording
                        ? "Recording…"
                        : speech.transcript
                          ? "Recording complete"
                          : "Tap to record — optional"}
                    </div>
                    <div className="font-mono text-xs text-ink-faint">
                      {speech.timerLabel}
                    </div>
                  </div>
                </div>
                {(speech.transcript || !speech.isRecording) &&
                  (speech.transcript || speech.seconds > 0) && (
                    <div className="mt-4">
                      <textarea
                        value={speech.transcript}
                        onChange={(e) => speech.setTranscript(e.target.value)}
                        className="min-h-[90px] w-full rounded-[11px] border-[1.5px] border-[#f0dba9] bg-[#fffaf0] px-[15px] py-3.5 text-sm"
                      />
                      <div className="mt-2.5 text-[11.5px] text-ink-faint">
                        Audio is never stored — only this transcript is kept.
                      </div>
                    </div>
                  )}
              </div>
            </Section>

            <Section label="Attach images & documents" optional hint="— optional, as evidence">
              <div className="rounded-2xl border-[1.5px] border-dashed border-line bg-[#fcfbf8] px-[22px] py-[18px]">
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-aztec-2 text-saffron">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={PATHS.paperclip} />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold">
                      Attach photos, scans or documents
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-ink-faint">
                      Attendance sheets, session photos, output files — anything
                      as evidence.
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setAttachedFiles((prev) => [
                        ...prev,
                        ...files.map((f) => ({
                          name: f.name,
                          size: f.size,
                          type: f.type,
                          url: URL.createObjectURL(f),
                        })),
                      ]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {attachedFiles.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {attachedFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface py-1.5 pr-2 pl-3 text-xs font-semibold"
                      >
                        {f.name}
                        <button
                          type="button"
                          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-neutral-bg text-xs text-ink-soft"
                          onClick={() =>
                            setAttachedFiles((prev) =>
                              prev.filter((_, j) => j !== i),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <Section label="Attendance" optional>
              <div className="rounded-2xl border-[1.5px] border-line bg-[#fcfbf8] px-[22px] py-5">
                <div className="mb-2.5 text-xs font-bold text-ink-soft">
                  Pick unit members who attended
                </div>
                <div className="mb-5 flex flex-wrap gap-2">
                  {users.map((u) => {
                    const on = selectedUnitIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUnitIds((prev) => {
                            const n = new Set(prev);
                            if (n.has(u.id)) n.delete(u.id);
                            else n.add(u.id);
                            return n;
                          });
                        }}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] py-2 pr-3.5 pl-2 text-[12.5px] font-semibold ${
                          on
                            ? "border-aztec-2 bg-aztec-2 text-paper"
                            : "border-line bg-surface text-ink"
                        }`}
                      >
                        <span
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[10px] font-semibold text-white"
                          style={{ background: u.color }}
                        >
                          {initials(u.name)}
                        </span>
                        {firstName(u.name)}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-2.5 text-xs font-bold text-ink-soft">
                  Add someone manually
                </div>
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_1.3fr_auto]">
                  <input
                    value={manName}
                    onChange={(e) => setManName(e.target.value)}
                    placeholder="Name"
                    className="rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                  />
                  <input
                    value={manPhone}
                    onChange={(e) => setManPhone(e.target.value)}
                    placeholder="Phone"
                    className="rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                  />
                  <input
                    type="email"
                    value={manEmail}
                    onChange={(e) => setManEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                  />
                  <GhostBtn
                    onClick={() => {
                      if (!manName.trim()) return;
                      setManualAttendees((prev) => [
                        ...prev,
                        {
                          name: manName.trim(),
                          phone: manPhone.trim(),
                          email: manEmail.trim(),
                          source: "manual",
                        },
                      ]);
                      setManName("");
                      setManPhone("");
                      setManEmail("");
                    }}
                  >
                    Add
                  </GhostBtn>
                </div>
                {manualAttendees.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {manualAttendees.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface py-1.5 pr-2 pl-3 text-xs font-semibold"
                      >
                        {a.name}
                        <button
                          type="button"
                          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-neutral-bg text-xs"
                          onClick={() =>
                            setManualAttendees((prev) =>
                              prev.filter((_, j) => j !== i),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <div className="max-w-[280px] text-xs leading-snug text-ink-faint">
                    Or let attendees self-register from their own device
                  </div>
                  <GhostBtn
                    onClick={() => {
                      void (async () => {
                        // Always mint/refresh a cryptographic server token
                        const token = await setLogRsvpToken(activeLog.id);
                        if (!token || token === "set") {
                          showToast(
                            "Could not generate link",
                            "Server did not return an RSVP token.",
                          );
                          return;
                        }
                        const payload = {
                          logId: activeLog.id,
                          tok: token,
                          title: act.title,
                          date: activeLog.date,
                          owner: ownerName,
                        };
                        const link =
                          window.location.origin +
                          "/rsvp/" +
                          toBase64Url(JSON.stringify(payload));
                        setRsvpLink(link);
                        setShowRsvp(true);
                      })().catch(() =>
                        showToast(
                          "Could not generate link",
                          "Please try again.",
                        ),
                      );
                    }}
                  >
                    Generate attendance link
                  </GhostBtn>
                </div>
                {showRsvp && (
                  <div className="mt-3.5 rounded-[11px] border-[1.5px] border-line bg-surface px-4 py-3.5">
                    <div className="mb-2 text-[11px] font-bold text-ink-faint uppercase">
                      Shareable link
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        readOnly
                        value={rsvpLink}
                        className="min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line bg-neutral-bg px-3 py-2.5 font-mono text-[11.5px]"
                      />
                      <GhostBtn
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(rsvpLink)
                            .then(() =>
                              showToast(
                                "Link copied",
                                "Share it with attendees to self-register.",
                              ),
                            )
                            .catch(() => {});
                        }}
                      >
                        Copy
                      </GhostBtn>
                      <GhostBtn
                        onClick={() => {
                          if (rsvpLink) window.location.href = rsvpLink;
                        }}
                      >
                        Open form
                      </GhostBtn>
                    </div>
                    <div className="mt-2.5 text-[11.5px] leading-snug text-ink-faint">
                      The form opens correctly for anyone.{" "}
                      {(activeLog.attendees || []).filter(
                        (a) => a.source === "link",
                      ).length}{" "}
                      submitted so far via link.
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {act.hasBudget && (
              <Section label="Budget & spending" optional>
                <div className="rounded-2xl border-[1.5px] border-line bg-[#fcfbf8] px-[22px] py-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <div className="mb-2 text-xs font-bold text-ink-soft">
                        Amount released (NGN)
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={amountReleased}
                        onChange={(e) => setAmountReleased(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-bold text-ink-soft">
                        Amount spent (NGN)
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={amountSpent}
                        onChange={(e) => setAmountSpent(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="mb-2 text-xs font-bold text-ink-soft">
                    Spending items
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_auto]">
                    <input
                      value={spendDesc}
                      onChange={(e) => setSpendDesc(e.target.value)}
                      placeholder="Description"
                      className="rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                    />
                    <input
                      type="number"
                      min="0"
                      value={spendAmt}
                      onChange={(e) => setSpendAmt(e.target.value)}
                      placeholder="Amount"
                      className="rounded-[10px] border-[1.5px] border-line px-3 py-2.5 text-[13px]"
                    />
                    <GhostBtn
                      onClick={() => {
                        if (!spendDesc.trim() || !spendAmt) return;
                        setSpendingItems((prev) => [
                          ...prev,
                          { description: spendDesc.trim(), amount: spendAmt },
                        ]);
                        setSpendDesc("");
                        setSpendAmt("");
                      }}
                    >
                      Add
                    </GhostBtn>
                  </div>
                  {spendingItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {spendingItems.map((item, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface py-1.5 pr-2 pl-3 text-xs font-semibold"
                        >
                          {item.description} — ₦{Number(item.amount).toLocaleString()}
                          <button
                            type="button"
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-neutral-bg text-xs text-ink-soft"
                            onClick={() =>
                              setSpendingItems((prev) =>
                                prev.filter((_, j) => j !== i),
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}

            <div className="sticky bottom-0 z-10 mt-9 flex justify-end border-t border-line bg-card pt-6 pb-6 shadow-[0_-12px_24px_rgba(255,255,255,0.9)]">
              <PrimaryBtn
                disabled={!canSubmit}
                onClick={() => {
                  void (async () => {
                    const unitAttendees = users
                      .filter((u) => selectedUnitIds.has(u.id))
                      .map((u) => ({
                        name: u.name,
                        phone: u.phone || "",
                        email: "",
                        source: "unit" as const,
                      }));
                    const linkAttendees = (activeLog.attendees || []).filter(
                      (a) => a.source === "link",
                    );
                    const attendees = [
                      ...unitAttendees,
                      ...manualAttendees,
                      ...linkAttendees,
                    ];
                    await submitDailyLog(act.id, activeLog.date, {
                      objectives: objectives.trim(),
                      activityDescription: activityDescription.trim(),
                      transcript: speech.transcript.trim(),
                      attendanceCount: String(attendees.length),
                      attendees,
                      attachments: attachedFiles,
                      amountReleasedNgn: amountReleased
                        ? Number(amountReleased)
                        : null,
                      amountSpentNgn: amountSpent ? Number(amountSpent) : null,
                      spendingItems: spendingItems.map((s) => ({
                        description: s.description,
                        amount: Number(s.amount),
                      })),
                    });
                    if (isLastDay) {
                      await updateActivityWrapup(act.id, {
                        initiativeTeamwork: initiative,
                        challenges,
                        outcomes,
                        nextSteps,
                      });
                    }
                    showToast(
                      logs.length > 1
                        ? `Day ${activeLogIndex + 1} submitted`
                        : "Activity submitted",
                      "Saved successfully.",
                    );
                    onSubmitted?.();
                  })().catch(() =>
                    showToast("Could not submit log", "Please try again."),
                  );
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={PATHS.send} />
                </svg>
                Submit{" "}
                {logs.length > 1
                  ? `Day ${activeLogIndex + 1} of ${logs.length}`
                  : "Activity"}
              </PrimaryBtn>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="h-fit rounded-[18px] border border-line bg-card px-[26px] py-6">
            <h2 className="mb-[18px] text-[17px] font-semibold">
              Activity details
            </h2>
            <DetailRow label="Type" value={act.type} />
            <DetailRow
              label="Dates"
              value={`${fmtDate(act.startDate)}${act.startDate !== act.endDate ? ` – ${fmtDate(act.endDate)}` : ""}`}
            />
            <DetailRow label="Time" value={fmtTime(act.startTime)} />
            {act.location && (
              <DetailRow label="Location" value={act.location} />
            )}
          </div>

          {isLastDay && (
            <div className="rounded-[18px] border border-line bg-card px-[26px] py-6">
              <div className="mb-[18px] flex flex-col gap-1">
                <h2 className="m-0 text-[17px] font-semibold">
                  Wrap up this activity
                </h2>
                <span className="text-[11.5px] text-ink-faint">
                  Optional — feeds straight into the report
                </span>
              </div>
              {(
                [
                  ["initiative", "Initiative & teamwork", initiative, setInitiative],
                  ["challenges", "Challenges encountered", challenges, setChallenges],
                  ["outcomes", "Outcomes / impact", outcomes, setOutcomes],
                  ["next", "Next steps / recommendations", nextSteps, setNextSteps],
                ] as const
              ).map(([key, label, val, set]) => (
                <Section key={key} label={label} optional>
                  <textarea
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="min-h-[70px] w-full rounded-[11px] border-[1.5px] border-line px-[15px] py-3.5 text-sm outline-none focus:border-aztec-3"
                  />
                </Section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[30px] last:mb-0">
      <div className="mb-3 text-[11.5px] font-bold tracking-wider text-ink-soft uppercase">
        {label}{" "}
        {required && <span className="text-critical">*</span>}
        {(optional || hint) && (
          <span className="font-medium normal-case text-ink-faint">
            {hint || "— optional"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 last:mb-0">
      <span className="text-ink-faint">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}
