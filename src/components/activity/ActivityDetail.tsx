"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { canComment } from "@/lib/permissions";
import { fmtDate, fmtTime, formatRelativeDate } from "@/lib/dates";
import { firstName, initials, toBase64Url } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { PrimaryBtn, GhostBtn } from "@/components/ui/Buttons";
import { useReportPreview } from "@/components/reports/ReportPreview";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { Attendee, Attachment } from "@/lib/types";
import { ActivityEditModal } from "./ActivityEditModal";

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
    updateActivityEndDate,
    setLogRsvpToken,
    refresh,
    users,
    responsibilities,
  } = useTrak();
  const respMap = Object.fromEntries(
    responsibilities.map((r) => [r.id, r]),
  );
  const { openReport } = useReportPreview();
  const [editOpen, setEditOpen] = useState(false);


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
      <div className="py-10 text-center text-[13px] text-foreground-faint">
        Activity not found.
      </div>
    );
  }

  const logs = getLogs(act.id);
  const owner = userMap[act.createdBy];
  const comments = getComments(act.id);
  const isMine = sessionUser.id === act.createdBy;
  const canEditDates = isMine || sessionUser.role === "head";
  const headCanComment = canComment(sessionUser);

  return (
    <div>
      <div className="mb-[22px]">
        <div className="sticky top-0 z-40 -mx-4 -mt-6 mb-4 bg-background/95 backdrop-blur px-4 py-4 sm:-mx-8 sm:-mt-10 sm:px-8 sm:py-6 md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:m-0 md:mb-4 border-b border-border md:border-none">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-bold text-foreground-secondary transition-colors hover:border-primary hover:text-foreground shadow-sm cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
        </div>
        <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-foreground-secondary uppercase">
          {act.type} ·{" "}
          {act.status === "completed"
            ? "Completed"
            : act.status === "missed"
              ? "Missed"
              : "Pending"}
          {owner && owner.id !== sessionUser.id ? ` · ${owner.name}` : ""}
        </div>
        <h1 className="m-0 max-w-[640px] text-[30px] font-semibold flex items-center flex-wrap gap-3">
          {act.title}
          {act.hidden && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[13px] font-bold text-foreground-secondary border border-border" title="Hidden from unit feed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.eyeOff} />
              </svg>
              Hidden
            </span>
          )}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <span className="rounded-full bg-aztec-2 px-2.5 py-1 text-[11px] font-bold text-saffron">
            {act.type}
          </span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-foreground-secondary">
            {fmtDate(act.startDate)}
            {act.startDate !== act.endDate ? ` – ${fmtDate(act.endDate)}` : ""} ·{" "}
            {fmtTime(act.startTime)}
          </span>
          {act.responsibilityIds.map((id) => (
            <span
              key={id}
              className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-foreground-secondary"
            >
              {respMap[id]?.code} — {respMap[id]?.name}
            </span>
          ))}
          {act.delegatedBy && (
            <span className="rounded-full bg-warning-surface px-2.5 py-1 text-[9.5px] font-bold tracking-wide text-warning-foreground uppercase">
              Delegated by{" "}
              {act.delegatedBy === "babajide"
                ? "Unit Head"
                : firstName(userMap[act.delegatedBy]?.name || "")}
            </span>
          )}
          {act.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-foreground-secondary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d={PATHS.pin} />
              </svg>
              {act.location}
            </span>
          )}
          {act.hasBudget && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2.5 py-1 text-[11px] font-bold text-warning-foreground">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              {act.estimatedAmountNgn
                ? `₦${act.estimatedAmountNgn.toLocaleString()}`
                : "Budget tracked"}
            </span>
          )}
        </div>
        
        {canEditDates && act.status !== "completed" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <GhostBtn onClick={() => setEditOpen(true)} className="px-3 py-1.5 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Edit Activity
            </GhostBtn>
          </div>
        )}
      </div>

      {editOpen && (
        <ActivityEditModal
          activity={act}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}

      {act.status === "missed" && (
        <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6 mb-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-warning-surface text-warning-semantic">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.alert} />
              </svg>
            </div>
            <div>
              <div className="mb-1 font-bold">
                Activity Needs Attention
              </div>
              <div className="text-[13px] text-foreground-secondary">
                This activity passed its date with unsubmitted daily updates.{" "}
                {isMine
                  ? "You can still submit missed updates below, or extend the activity if you need more time."
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
                className="mb-6 rounded-[18px] border border-border bg-surface px-[26px] py-6 last:mb-0"
              >
                <div className="mb-[18px] flex items-center justify-between">
                  <h2 className="m-0 font-display text-[17px] font-semibold">
                    {logs.length > 1 ? fmtDate(l.date) : "Activity log"}
                  </h2>
                  <span className="text-[11.5px] text-foreground-faint">
                    Submitted {l.submittedAt ? formatRelativeDate(l.submittedAt) : ""}
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
                    <div className="mb-1.5 text-[11px] font-bold text-foreground-faint uppercase">
                      Attendance — {l.attendees.length} present
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {l.attendees.map((a, i) => (
                        <span
                          key={i}
                          title={[a.phone, a.email].filter(Boolean).join(" · ")}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          {a.name}
                          <span className="text-[9.5px] font-bold text-foreground-faint uppercase">
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
                      <div className="mb-1.5 text-[11px] font-bold text-foreground-faint uppercase">
                        Budget &amp; spending
                      </div>
                      <div className="rounded-[11px] bg-warning-surface/40 border border-warning-semantic/30 p-3 text-[12.5px]">
                        {l.amountReleasedNgn != null && (
                          <div className="mb-1">
                            <span className="text-foreground-faint">Released:</span>{" "}
                            <span className="font-bold">
                              ₦{l.amountReleasedNgn.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {l.amountSpentNgn != null && (
                          <div className="mb-1">
                            <span className="text-foreground-faint">Spent:</span>{" "}
                            <span className="font-bold">
                              ₦{l.amountSpentNgn.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {l.spendingItems && l.spendingItems.length > 0 && (
                          <div className="mt-2 border-t border-warning-semantic/30 pt-2">
                            <div className="mb-1 text-[10.5px] font-bold text-foreground-faint uppercase">
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
              <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
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
            <div className="mb-6 rounded-[18px] border border-border bg-surface px-[26px] py-6">
              <h2 className="mb-[18px] font-display text-[17px] font-semibold">
                Unit Head&apos;s remarks
              </h2>
              {comments.length ? (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="mb-2.5 rounded-[11px] bg-surface-muted p-3 text-[12.5px] leading-relaxed"
                  >
                    <b>{firstName(userMap[c.authorId]?.name || "")}:</b> {c.text}
                    <div className="mt-1 text-[10.5px] text-foreground-faint">
                      {formatRelativeDate(c.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-[13px] text-foreground-faint">
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
            <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
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

      {(act.status === "pending" || act.status === "missed") && (
        <PendingForm
          act={act}
          logs={logs}
          ownerName={owner?.name || ""}
          users={users}
          setLogRsvpToken={setLogRsvpToken}
          submitDailyLog={submitDailyLog}
          updateActivityWrapup={updateActivityWrapup}
          updateActivityEndDate={updateActivityEndDate}
          canEditDates={canEditDates}
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
      <div className="mb-1.5 text-[11px] font-bold text-foreground-faint uppercase">
        {label}
      </div>
      <div
        className={`text-[13.5px] leading-relaxed ${soft ? "text-foreground-secondary" : ""}`}
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
        className="flex-1 rounded-[9px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2 text-[12.5px] outline-none focus:border-border-strong"
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            onSend(text.trim());
            setText("");
          }
        }}
      />
      <button
        type="button"
        className="cursor-pointer rounded-[9px] border-[1.5px] border-border bg-surface-muted px-3.5 py-2 text-xs font-bold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
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
  updateActivityEndDate,
  canEditDates,
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
  updateActivityEndDate: ReturnType<typeof useTrak>["updateActivityEndDate"];
  canEditDates: boolean;
  showToast: ReturnType<typeof useTrak>["showToast"];
  onSubmitted?: () => void;
}) {
  const activeLogIndex = logs.findIndex((l) => l.status === "pending");
  const activeLog = logs[activeLogIndex];
  const speech = useSpeechRecognition();

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");
  const [isSavingDate, setIsSavingDate] = useState(false);

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
      <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
        <div className="py-8 text-center text-[13px] text-foreground-faint">
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
                    ? "border-success/30 bg-success-surface"
                    : state === "active"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface opacity-50"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-extrabold uppercase ${
                      state === "done"
                        ? "text-success"
                        : state === "active"
                          ? "text-primary"
                          : "text-foreground-faint"
                    }`}
                  >
                    Day {i + 1}
                  </span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      state === "done"
                        ? "bg-success text-success-foreground"
                        : state === "active"
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-muted text-foreground-faint"
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
                <div className="mt-0.5 text-[11px] text-foreground-faint">
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
          <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
            <Section label="Today's objectives" required>
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="What are you covering / aiming to achieve today?"
                className="min-h-[90px] w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-border-strong"
              />
            </Section>
            <Section label="Description of activity done" required hint="— explain what was done">
              <textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Explain what was actually done during this session — this is what shows up in the report's Scope of Work."
                className="min-h-[100px] w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-border-strong"
              />
            </Section>
            <Section label="Record objectives / summary" optional>
              <div className="rounded-2xl border-[1.5px] border-border bg-surface-muted p-[22px]">
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
                    <div className="font-mono text-xs text-foreground-faint">
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
                        className="min-h-[90px] w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-border-strong"
                      />
                      <div className="mt-2.5 text-[11.5px] text-foreground-faint">
                        Audio is never stored — only this transcript is kept.
                      </div>
                    </div>
                  )}
              </div>
            </Section>

            <Section label="Attach images & documents" optional hint="— optional, as evidence">
              <div className="rounded-2xl border-[1.5px] border-dashed border-border bg-surface-muted px-[22px] py-[18px]">
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-primary/20 text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={PATHS.paperclip} />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold">
                      Attach photos, scans or documents
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-foreground-faint">
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
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface text-foreground py-1.5 pr-2 pl-3 text-xs font-semibold"
                      >
                        {f.name}
                        <button
                          type="button"
                          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-surface-muted text-xs text-foreground-secondary hover:text-foreground"
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
              <div className="rounded-2xl border-[1.5px] border-border bg-surface-muted px-[22px] py-5">
                <div className="mb-2.5 text-xs font-bold text-foreground-secondary">
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
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] py-2 pr-3.5 pl-2 text-[12.5px] font-semibold transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface text-foreground hover:border-border-strong"
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

                <div className="mb-2.5 text-xs font-bold text-foreground-secondary">
                  Add someone manually
                </div>
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_1.3fr_auto]">
                  <input
                    value={manName}
                    onChange={(e) => setManName(e.target.value)}
                    placeholder="Name"
                    className="rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
                  />
                  <input
                    value={manPhone}
                    onChange={(e) => setManPhone(e.target.value)}
                    placeholder="Phone"
                    className="rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
                  />
                  <input
                    type="email"
                    value={manEmail}
                    onChange={(e) => setManEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
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
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface text-foreground py-1.5 pr-2 pl-3 text-xs font-semibold"
                      >
                        {a.name}
                        <button
                          type="button"
                          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-surface-muted text-xs text-foreground-secondary hover:text-foreground"
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

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="max-w-[280px] text-xs leading-snug text-foreground-faint">
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
                  <div className="mt-3.5 rounded-[11px] border-[1.5px] border-border bg-surface px-4 py-3.5">
                    <div className="mb-2 text-[11px] font-bold text-foreground-faint uppercase">
                      Shareable link
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        readOnly
                        value={rsvpLink}
                        className="min-w-0 flex-1 rounded-[9px] border-[1.5px] border-input-border bg-input text-foreground px-3 py-2.5 font-mono text-[11.5px]"
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
                    <div className="mt-2.5 text-[11.5px] leading-snug text-foreground-faint">
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
                <div className="rounded-2xl border-[1.5px] border-border bg-surface-muted px-[22px] py-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <div className="mb-2 text-xs font-bold text-foreground-secondary">
                        Amount released (NGN)
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={amountReleased}
                        onChange={(e) => setAmountReleased(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-bold text-foreground-secondary">
                        Amount spent (NGN)
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={amountSpent}
                        onChange={(e) => setAmountSpent(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
                      />
                    </div>
                  </div>
                  <div className="mb-2 text-xs font-bold text-foreground-secondary">
                    Spending items
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_auto]">
                    <input
                      value={spendDesc}
                      onChange={(e) => setSpendDesc(e.target.value)}
                      placeholder="Description"
                      className="rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
                    />
                    <input
                      type="number"
                      min="0"
                      value={spendAmt}
                      onChange={(e) => setSpendAmt(e.target.value)}
                      placeholder="Amount"
                      className="rounded-[10px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-3 py-2.5 text-[13px] outline-none focus:border-border-strong"
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
                          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface text-foreground py-1.5 pr-2 pl-3 text-xs font-semibold"
                        >
                          {item.description} — ₦{Number(item.amount).toLocaleString()}
                          <button
                            type="button"
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-surface-muted text-xs text-foreground-secondary hover:text-foreground"
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

            <div className="sticky bottom-0 z-10 mt-9 flex justify-end border-t border-border bg-surface pt-6 pb-6">
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
          <div className="h-fit rounded-[18px] border border-border bg-surface px-[26px] py-6">
            <h2 className="mb-[18px] text-[17px] font-semibold">
              Activity details
            </h2>
            <DetailRow label="Type" value={act.type} />
            {canEditDates ? (
              <div className="mb-3 flex flex-col justify-center sm:flex-row sm:items-center sm:justify-between gap-2 last:mb-0">
                <span className="text-foreground-faint">Dates</span>
                {isEditingDate ? (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-bold text-foreground-secondary">{fmtDate(act.startDate)} –</span>
                      <input
                        type="date"
                        min={act.startDate.substring(0, 10)}
                        value={newEndDate.substring(0, 10)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewEndDate(new Date(e.target.value).toISOString());
                          }
                        }}
                        className="rounded-[6px] border border-input-border bg-input text-foreground px-2 py-1 text-[12.5px] font-bold outline-none focus:border-border-strong disabled:opacity-60"
                        disabled={isSavingDate}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingDate(false);
                          setNewEndDate(act.endDate);
                        }}
                        className="text-[11.5px] font-bold text-foreground-secondary hover:text-foreground cursor-pointer disabled:opacity-50"
                        disabled={isSavingDate}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsSavingDate(true);
                          try {
                            await updateActivityEndDate(act.id, newEndDate);
                            setIsEditingDate(false);
                            showToast("Dates updated", "The activity end date has been updated.");
                          } catch (e) {
                            const err = e as Error;
                            showToast("Could not update dates", err.message || "Validation failed.");
                          } finally {
                            setIsSavingDate(false);
                          }
                        }}
                        className="rounded-[6px] bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer disabled:opacity-50"
                        disabled={isSavingDate || newEndDate < act.startDate}
                      >
                        {isSavingDate ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-right font-bold">
                      {`${fmtDate(act.startDate)}${act.startDate !== act.endDate ? ` – ${fmtDate(act.endDate)}` : ""}`}
                    </span>
                    <button
                      type="button"
                      title="Edit completion date"
                      onClick={() => {
                        setNewEndDate(act.endDate);
                        setIsEditingDate(true);
                      }}
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface-muted text-foreground-faint hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <DetailRow
                label="Dates"
                value={`${fmtDate(act.startDate)}${act.startDate !== act.endDate ? ` – ${fmtDate(act.endDate)}` : ""}`}
              />
            )}
            <DetailRow label="Time" value={fmtTime(act.startTime)} />
            {act.location && (
              <DetailRow label="Location" value={act.location} />
            )}
          </div>

          {isLastDay && (
            <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6">
              <div className="mb-[18px] flex flex-col gap-1">
                <h2 className="m-0 text-[17px] font-semibold">
                  Wrap up this activity
                </h2>
                <span className="text-[11.5px] text-foreground-faint">
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
                    className="min-h-[70px] w-full rounded-[11px] border-[1.5px] border-input-border bg-input text-foreground placeholder:text-input-placeholder px-[15px] py-3.5 text-sm outline-none focus:border-border-strong"
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
      <div className="mb-3 text-[11.5px] font-bold tracking-wider text-foreground-secondary uppercase">
        {label}{" "}
        {required && <span className="text-critical-semantic">*</span>}
        {(optional || hint) && (
          <span className="font-medium normal-case text-foreground-faint">
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
      <span className="text-foreground-faint">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}
