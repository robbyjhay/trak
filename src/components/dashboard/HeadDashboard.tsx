"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { MemberDashboard, Card, RespBars, QuickActionTile } from "./MemberDashboard";
import { addDays, fmtDate, iso, longDateLabel, formatRelativeDate } from "@/lib/dates";
import { firstName, initials } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import { TYPE_COLOR } from "@/lib/constants";
import { TypeIcon, PATHS } from "@/components/icons";
import { GhostBtn } from "@/components/ui/Buttons";
import { Switch } from "@/components/ui/Switch";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { AddMember } from "@/components/messaging/AddMember";
import { useReportPreview } from "@/components/reports/ReportPreview";
import { RespManageList } from "@/components/activity/RespManageList";

export function HeadDashboard() {
  const { userMap, users, sessionUser } = useTrak();
  const [panel, setPanel] = useState<"mine" | "ao">("ao");
  const head =
    users.find((u) => u.role === "head") ||
    userMap[sessionUser.id] ||
    sessionUser;

  return (
    <div>
      <div className="page-head mb-6">
        <div className="mb-2 text-[12px] font-bold tracking-[0.12em] text-saffron-dim dark:text-saffron uppercase">
          {longDateLabel(useTrak().now)} · PSSDC — Digital Learning Unit
        </div>
      </div>

      <div className="mb-8 flex w-fit rounded-full bg-surface-muted p-1 border border-border">
        {(
          [
            ["mine", "My Activities"],
            ["ao", "Accounting Officer"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPanel(key)}
            className={`cursor-pointer rounded-full border-none px-6 py-2.5 text-[14px] font-semibold transition-all duration-200 ${
              panel === key
                ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                : "bg-transparent text-foreground-secondary hover:text-foreground hover:bg-surface-hover/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {panel === "mine" ? (
        <MemberDashboard user={head} />
      ) : (
        <AccountingOfficer />
      )}
    </div>
  );
}

function AccountingOfficer() {
  const router = useRouter();
  const [resetCredentials, setResetCredentials] = useState<{username: string; starterPassword: string} | null>(null);
  const {
    db,
    users,
    userMap,
    now,
    activitiesFor,
    createActivity,
    addComment,
    updateUserProfile,
    showToast,
    responsibilities,
    toggleActivityHidden,
    softDeleteActivity,
    sessionUser,
  } = useTrak();
  const { openReport } = useReportPreview();
  const head =
    users.find((u) => u.role === "head") ||
    userMap[sessionUser.id] ||
    sessionUser;

  const allActive = db.activities;
  const thisMonth = allActive.filter((a) => a.createdAt >= iso(addDays(now, -30)));
  const completedMonth = thisMonth.filter((a) => a.status === "completed").length;
  const missedAll = allActive.filter((a) => a.status === "missed").length;
  const completionRate = thisMonth.length
    ? Math.round((completedMonth / thisMonth.length) * 100)
    : 0;

  const [delegateOpen, setDelegateOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentActId, setCommentActId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editUserId, setEditUserId] = useState("");
  const [pe, setPe] = useState({
    designation: "",
    gradeLevel: "",
    sex: "",
    phone: "",
    stateOfOrigin: "",
    dateJoined: "",
    roleType: "",
  });
  const [taskTitle, setTaskTitle] = useState("");
  const [assignTo, setAssignTo] = useState(
    () => users.find((u) => u.role !== "head")?.id || "",
  );
  const [taskResp, setTaskResp] = useState(
    () => responsibilities.find((r) => r.isActive)?.id || "",
  );
  const [taskDue, setTaskDue] = useState(iso(addDays(now, 5)));
  const [feedFilter, setFeedFilter] = useState<"all" | "week" | "month" | "quarter">("all");
  const [showHidden, setShowHidden] = useState(false);

  const activeUsers = users.filter((u) => u.isActive);
  const teamCounts = activeUsers
    .map((u) => ({
      u,
      count: activitiesFor(u.id).filter(
        (a) => a.status === "completed" && a.createdAt >= iso(addDays(now, -30)),
      ).length,
    }))
    .sort((a, b) => b.count - a.count);
  const teamMax = Math.max(1, ...teamCounts.map((t) => t.count));

  const unitAll = showHidden
    ? [...allActive]
    : allActive.filter((a) => !a.hidden);
  const unitFiltered = unitAll.filter((a) => {
    if (feedFilter === "all") return true;
    const d = new Date(a.createdAt);
    const diffMs = now.getTime() - d.getTime();
    if (feedFilter === "week") return diffMs <= 7 * 86400_000;
    if (feedFilter === "month") return diffMs <= 30 * 86400_000;
    if (feedFilter === "quarter") return diffMs <= 90 * 86400_000;
    return true;
  });
  const unitSorted = [...unitFiltered].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const unitShown = unitSorted.slice(0, 8);

  // type stack
  const acts90 = allActive.filter((a) => a.createdAt >= iso(addDays(now, -90)));
  const tb = { Task: 0, Meeting: 0, Program: 0, Project: 0 };
  acts90.forEach((a) => {
    tb[a.type] = (tb[a.type] || 0) + 1;
  });
  const typeOrder: [keyof typeof tb, string][] = [
    ["Task", "var(--cat-task)"],
    ["Meeting", "var(--cat-meeting)"],
    ["Program", "var(--cat-program)"],
    ["Project", "var(--cat-project)"],
  ];
  const stackTotal = Math.max(1, typeOrder.reduce((s, [k]) => s + tb[k], 0));

  return (
    <div>
      {/* Featured Summary & Unit Status */}
      <div className="mb-8 rounded-3xl bg-surface p-8 shadow-sm border border-border">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="flex-1">
            <h2 className="mb-3 font-display text-3xl font-semibold text-foreground tracking-tight">Unit Performance</h2>
            <p className="text-[15px] leading-relaxed text-foreground-secondary max-w-lg">
              Monitoring {users.length} active personnel. This month, the unit has logged <span className="font-semibold text-foreground">{thisMonth.length}</span> activities with a completion rate of <span className="font-semibold text-foreground">{completionRate}%</span>.
            </p>
          </div>
          <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:w-auto lg:min-w-[420px]">
            <div className="row-span-2 flex flex-col justify-center rounded-2xl bg-surface-muted p-6 border border-border shadow-sm">
              <div className="text-[36px] leading-none font-extrabold text-foreground mb-2">{completionRate}%</div>
              <div className="text-[14px] font-semibold text-foreground-secondary">Completion Rate</div>
            </div>
            <div className="flex flex-col justify-center items-start rounded-2xl bg-surface-muted px-5 py-3 border border-border min-w-0">
              <span className="text-2xl font-bold text-foreground">{thisMonth.length}</span>
              <span className="text-xs text-foreground-secondary">Monthly Activities</span>
            </div>
            <div className="flex flex-col justify-center items-start rounded-2xl bg-critical-surface/40 px-5 py-3 border border-critical-surface min-w-0">
              <span className="text-2xl font-bold text-critical">{missedAll}</span>
              <span className="text-xs text-critical">Missed (All Time)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionTile 
          icon={PATHS.send} 
          label="Delegate Task" 
          onClick={() => setDelegateOpen(true)}
          primary 
        />
        <QuickActionTile 
          icon={PATHS.messages} 
          label="Broadcast" 
          onClick={() => router.push("/messages")} 
        />
        <QuickActionTile 
          icon={PATHS.users} 
          label="Add Member" 
          onClick={() => setAddMemberOpen(true)} 
        />
        <QuickActionTile 
          icon={PATHS.chart} 
          label="Unit Reports" 
          onClick={() => router.push("/reports")} 
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Team performance" sub="Completed this month" large>
            {teamCounts.map(({ u, count }) => (
              <div key={u.id} className="mb-3 flex items-center gap-3 last:mb-0">
                <button
                  type="button"
                  className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none font-display text-xs font-bold text-white"
                  style={{ background: u.color }}
                  onClick={() => router.push(`/member/${u.id}`)}
                  title={`View ${firstName(u.name)}'s activities`}
                >
                  {initials(u.name)}
                </button>
                <button
                  type="button"
                  className="w-[90px] shrink-0 cursor-pointer truncate border-none bg-transparent text-left text-[12.5px] font-bold text-foreground transition-colors hover:text-primary sm:w-[118px]"
                  onClick={() => router.push(`/member/${u.id}`)}
                >
                  {u.name}
                </button>
                <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-surface-muted">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(count / teamMax) * 100}%`,
                      background: u.color,
                    }}
                  />
                </div>
                <div className="w-5 text-right font-mono text-[11.5px] font-bold text-foreground">{count}</div>
                <div className="ml-1.5 hidden shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-foreground-faint uppercase sm:inline-flex">
                  {roleLabel(u)}
                </div>
              </div>
            ))}
          </Card>

          <Card
            title="Unit Activities"
            sub={
              unitSorted.length > 8
                ? `Most recent 8 of ${unitSorted.length}`
                : "Most recent across the unit"
            }
            large
            action={
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-lg bg-surface-muted p-0.5">
                  {(
                    [
                      ["all", "All"],
                      ["week", "Week"],
                      ["month", "Month"],
                      ["quarter", "Quarter"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFeedFilter(key)}
                      className={`cursor-pointer rounded-md border-none px-2.5 py-1 text-[10.5px] font-bold transition-colors ${
                        feedFilter === key
                          ? "bg-surface text-foreground shadow-sm"
                          : "bg-transparent text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="show-hidden-feed"
                    checked={showHidden}
                    onChange={setShowHidden}
                    aria-label="Show hidden activities"
                  />
                  <label
                    htmlFor="show-hidden-feed"
                    className={`cursor-pointer text-[10.5px] font-bold whitespace-nowrap transition-colors ${
                      showHidden
                        ? "text-warning-ink"
                        : "text-foreground-faint hover:text-foreground"
                    }`}
                  >
                    {showHidden ? "Showing hidden" : "Show hidden"}
                  </label>
                </div>
              </div>
            }
          >
            {unitShown.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-foreground-faint">
                No activities logged yet.
              </div>
            ) : (
              unitShown.map((a) => {
                const owner = userMap[a.createdBy];
                const isDone = a.status === "completed";
                const statusText =
                  a.status === "pending"
                    ? "Pending"
                    : a.status === "completed"
                      ? "Completed"
                      : "Missed";
                return (
                  <div
                    key={a.id}
                    onClick={() => router.push(`/activity/${a.id}`)}
                    className="mb-3.5 rounded-[14px] border border-border bg-surface px-[18px] py-4 last:mb-0 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                  >
                    <div className="mb-2.5 flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                        style={{ background: owner?.color }}
                      >
                        {initials(owner?.name || "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-foreground flex items-center flex-wrap gap-2">
                          {a.title}
                          {a.hidden && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[9.5px] font-bold text-foreground-secondary border border-border" title="Hidden from unit feed">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d={PATHS.eyeOff} />
                              </svg>
                              Hidden
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-foreground-faint">
                          {owner?.name} · {formatRelativeDate(a.createdAt)} ·{" "}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                              a.status === "pending"
                                ? "bg-warning-surface text-warning-foreground"
                                : a.status === "completed"
                                  ? "bg-success-surface text-good"
                                  : "bg-critical-surface text-critical"
                            }`}
                          >
                            {statusText}
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px]"
                        style={{ background: TYPE_COLOR[a.type] }}
                      >
                        <TypeIcon type={a.type} size={14} />
                      </div>
                    </div>
                    <div className="mt-1 flex gap-4" onClick={(e) => e.stopPropagation()}>
                      <UaBtn
                        title="Download Report"
                        disabled={!isDone}
                        onClick={(e) => { e.stopPropagation(); if (isDone) openReport(a.id); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.download} />
                        </svg>
                      </UaBtn>
                      <UaBtn
                        title="Comment"
                        disabled={!isDone}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDone) return;
                          setCommentActId(a.id);
                          setCommentText("");
                          setCommentOpen(true);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.messages} />
                        </svg>
                      </UaBtn>
                      <UaBtn
                        title={a.hidden ? "Unhide in feed" : "Hide from feed"}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleActivityHidden(a.id)
                            .then(() =>
                              showToast(
                                a.hidden ? "Activity unhidden" : "Activity hidden",
                                a.hidden
                                   ? `"${a.title}" is now visible to the unit.`
                                  : `"${a.title}" is now hidden from the unit feed.`,
                              ),
                            )
                            .catch(() =>
                              showToast("Could not update activity", "Please try again."),
                            );
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={a.hidden ? PATHS.eye : PATHS.eyeOff} />
                        </svg>
                      </UaBtn>
                      <UaBtn
                        title="Delete"
                        className="text-critical-semantic hover:border-critical-semantic hover:bg-critical-surface hover:text-critical-semantic"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm(`Soft delete "${a.title}"? It can be restored later.`)) return;
                          void softDeleteActivity(a.id)
                            .then(() =>
                              showToast("Activity deleted", `"${a.title}" has been removed from view.`),
                            )
                            .catch(() =>
                              showToast("Could not delete activity", "Please try again."),
                            );
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.trash} />
                        </svg>
                      </UaBtn>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Unit activities by type" sub="Last 90 days">
            <div className="mb-3 flex h-[26px] overflow-hidden rounded-md">
              {typeOrder.map(([name, color]) => {
                const pct = (tb[name] / stackTotal) * 100;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-center text-[10.5px] font-bold text-white first:rounded-l-md last:rounded-r-md"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      borderLeft: "2px solid var(--surface)",
                    }}
                  >
                    {pct > 10 ? tb[name] : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3.5">
              {typeOrder.map(([name, color]) => (
                 <div key={name} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground-secondary">
                  <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                  {name} ({tb[name]})
                </div>
              ))}
            </div>
          </Card>

          <Card title="By responsibility" sub="Last 90 days">
            <RespBars userId={null} />
          </Card>

          <Card title="Manage responsibilities">
            <RespManageList />
          </Card>

          <Card
            title="Team profiles"
            sub="Personnel record — you edit this for the unit"
            action={
              <GhostBtn
                className="px-3.5 py-2 text-xs"
                onClick={() => setAddMemberOpen(true)}
              >
                + Add member
              </GhostBtn>
            }
          >
            {users.map((u) => (
              <div key={u.id} className={`mb-3 flex items-center gap-3 last:mb-0 ${!u.isActive ? "opacity-50 grayscale" : ""}`}>
                <div
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-xs font-bold text-white"
                  style={{ background: u.color }}
                >
                  {u.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(u.name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-foreground">
                    {u.name}
                    {!u.isActive && <span className="ml-2 rounded bg-critical-surface px-1.5 py-0.5 text-[10px] text-critical">Deactivated</span>}
                  </div>
                  <div className="text-[11px] font-medium text-foreground-faint">
                    {u.designation || "No designation set"}
                    {u.gradeLevel ? ` · ${u.gradeLevel}` : ""}
                  </div>
                </div>
                <GhostBtn
                  className="px-3.5 py-2 text-xs"
                  onClick={() => {
                    setEditUserId(u.id);
                    setPe({
                      designation: u.designation || "",
                      gradeLevel: u.gradeLevel || "",
                      sex: u.sex || "",
                      phone: u.phone || "",
                      stateOfOrigin: u.stateOfOrigin || "",
                      dateJoined: u.dateJoined || "",
                      roleType: u.isSecretary ? "secretary" : u.isCorps ? "corps" : u.isIntern ? "intern" : "member",
                    });
                    setProfileOpen(true);
                  }}
                >
                  Edit
                </GhostBtn>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Delegate modal */}
      <ModalBackdrop open={delegateOpen} onClose={() => setDelegateOpen(false)}>
        <ModalPanel>
          <h3 className="m-0 mb-1.5 font-display text-xl text-foreground">Delegate a Task</h3>
          <p className="mb-5 text-[12.5px] text-foreground-secondary">
            Lands in the member&apos;s activity list, tagged &quot;Delegated by Unit Head.&quot;
          </p>
          <Field label="Assign to">
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="field-input"
            >
              {activeUsers
                .filter((u) => u.id !== head.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Task title">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Prepare Q3 studio equipment inventory"
              className="field-input"
            />
          </Field>
          <Field label="Linked responsibility">
            <select
              value={taskResp}
              onChange={(e) => setTaskResp(e.target.value)}
              className="field-input"
            >
              {responsibilities.filter((r) => r.isActive !== false).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
              className="field-input"
            />
          </Field>
          <div className="mt-[22px] flex gap-2.5">
            <button
              type="button"
              className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-border bg-transparent py-3 font-bold text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
              onClick={() => setDelegateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              onClick={() => {
                const title = taskTitle.trim() || "New task";
                void createActivity({
                  title,
                  type: "Task",
                  description: "",
                  createdBy: assignTo,
                  delegatedBy: head.id,
                  startDate: taskDue,
                  endDate: taskDue,
                  startTime: "09:00",
                  responsibilityIds: [taskResp],
                })
                  .then(() => {
                    setDelegateOpen(false);
                    setTaskTitle("");
                    showToast(
                      `Delegated to ${firstName(userMap[assignTo].name)}`,
                      `"${title}" now appears in their activities, tagged Delegated by Unit Head.`,
                    );
                  })
                  .catch(() =>
                    showToast("Could not delegate task", "Please try again."),
                  );
              }}
            >
              Delegate Task
            </button>
          </div>
        </ModalPanel>
      </ModalBackdrop>

      {/* Comment modal */}
      <ModalBackdrop open={commentOpen} onClose={() => setCommentOpen(false)}>
        <ModalPanel>
          <h3 className="m-0 mb-1.5 font-display text-xl text-foreground">Add a remark</h3>
          <p className="mb-5 text-[12.5px] text-foreground-secondary">
            Comment, don&apos;t approve — it folds into the report.
          </p>
          <Field label="Remark">
            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment — it's included in the report…"
              className="field-input"
            />
          </Field>
          <div className="mt-[22px] flex gap-2.5">
            <button
              type="button"
              className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-border bg-transparent py-3 font-bold text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
              onClick={() => setCommentOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              onClick={() => {
                if (!commentText.trim() || !commentActId) return;
                const act = db.activities.find((x) => x.id === commentActId);
                void addComment(commentActId, commentText.trim(), head.id)
                  .then(() => {
                    setCommentOpen(false);
                    showToast(
                      "Comment sent",
                      `${firstName(userMap[act?.createdBy || ""]?.name || "")} will see this on their activity.`,
                    );
                  })
                  .catch(() =>
                    showToast("Could not send comment", "Please try again."),
                  );
              }}
            >
              Send
            </button>
          </div>
        </ModalPanel>
      </ModalBackdrop>

      {/* Profile edit modal */}
      <ModalBackdrop open={profileOpen} onClose={() => setProfileOpen(false)}>
        <ModalPanel>
          <h3 className="m-0 mb-1.5 font-display text-xl text-foreground">Edit personnel record</h3>
          <p className="mb-5 text-[12.5px] text-foreground-secondary">
            Update {userMap[editUserId]?.name}&apos;s details.
          </p>
          {(
            [
              ["designation", "Designation", "text"],
              ["gradeLevel", "Grade level", "text"],
              ["sex", "Sex", "select"],
              ["phone", "Phone", "text"],
              ["stateOfOrigin", "State of origin", "text"],
              ["dateJoined", "Date joined PSSDC", "date"],
            ] as const
          ).map(([key, label, type]) => (
            <Field key={key} label={label}>
              {type === "select" ? (
                <select
                  value={pe.sex}
                  onChange={(e) => setPe((p) => ({ ...p, sex: e.target.value }))}
                  className="field-input"
                >
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              ) : (
                <input
                  type={type}
                  value={pe[key]}
                  onChange={(e) => setPe((p) => ({ ...p, [key]: e.target.value }))}
                  className="field-input"
                />
              )}
            </Field>
          ))}
          <Field label="Role type">
            <select
              value={pe.roleType}
              onChange={(e) => setPe((p) => ({ ...p, roleType: e.target.value }))}
              className="field-input"
            >
              <option value="member">Member</option>
              <option value="secretary">Secretary</option>
              <option value="corps">NYSC Corps</option>
              <option value="intern">Intern</option>
            </select>
          </Field>
          <div className="mt-[22px] flex gap-2.5">
            <button
              type="button"
              className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-border bg-transparent py-3 font-bold text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
              onClick={() => setProfileOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border border-border bg-transparent py-3 font-bold text-foreground-secondary transition-colors hover:bg-surface-muted"
              onClick={async () => {
                const { resetMemberPasswordAction } = await import("@/lib/auth/actions");
                if (confirm(`Are you sure you want to reset ${userMap[editUserId]?.name}'s password to the default?`)) {
                  const res = await resetMemberPasswordAction(editUserId);
                  if (res.ok && res.password) {
                    setProfileOpen(false); // Close profile modal
                    setResetCredentials({ username: userMap[editUserId]?.username || "", starterPassword: res.password });
                  } else {
                    showToast("Reset failed", res.error || "An error occurred.");
                  }
                }
              }}
            >
              Reset Password
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              onClick={() => {
                const patch = {
                  ...pe,
                  isSecretary: pe.roleType === "secretary",
                  isCorps: pe.roleType === "corps",
                  isIntern: pe.roleType === "intern",
                };
                void updateUserProfile(editUserId, patch)
                  .then(() => {
                    setProfileOpen(false);
                    showToast(
                      "Personnel record updated",
                      `${userMap[editUserId]?.name}'s details are saved.`,
                    );
                  })
                  .catch(() =>
                    showToast("Could not save profile", "Please try again."),
                  );
              }}
            >
              Save
            </button>
          </div>
          {editUserId !== head.id && (
            <div className="mt-4 border-t border-line pt-4">
              {userMap[editUserId]?.isActive !== false ? (
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-[10px] border border-critical bg-critical-bg py-3 font-bold text-critical"
                  onClick={() => {
                    if (confirm(`Are you sure you want to deactivate ${userMap[editUserId]?.name}? They will no longer be able to log in.`)) {
                      void updateUserProfile(editUserId, { isActive: false })
                        .then(() => {
                          setProfileOpen(false);
                          showToast(
                            "Account deactivated",
                            `${userMap[editUserId]?.name}'s account has been deactivated.`,
                          );
                        })
                        .catch((err) =>
                          showToast("Could not deactivate", err.message || "Please try again."),
                        );
                    }
                  }}
                >
                  Deactivate Account
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-[10px] border border-good bg-good-bg py-3 font-bold text-good"
                  onClick={() => {
                    void updateUserProfile(editUserId, { isActive: true })
                      .then(() => {
                        setProfileOpen(false);
                        showToast(
                          "Account reactivated",
                          `${userMap[editUserId]?.name}'s account is active again.`,
                        );
                      })
                      .catch((err) =>
                        showToast("Could not reactivate", err.message || "Please try again."),
                      );
                  }}
                >
                  Reactivate Account
                </button>
              )}
            </div>
          )}
        </ModalPanel>
      </ModalBackdrop>

      {resetCredentials && (
        <ModalBackdrop open onClose={() => setResetCredentials(null)} labelledBy="reset-member-title">
          <ModalPanel>
            <div className="text-center">
              <h3 id="reset-member-title" className="m-0 mb-4 font-display text-xl text-primary">
                Password Reset Successfully
              </h3>
              <div className="mb-6 rounded-xl bg-neutral-bg p-5 text-left font-mono text-[13px] leading-relaxed text-ink shadow-sm border border-line">
                <div className="mb-2">
                  <span className="font-bold text-ink-soft uppercase tracking-wider text-[11px]">Username</span>
                  <div className="mt-1 text-[15px] font-bold text-ink">{resetCredentials.username}</div>
                </div>
                <div>
                  <span className="font-bold text-ink-soft uppercase tracking-wider text-[11px]">New temporary password</span>
                  <div className="mt-1 text-[15px] font-bold text-ink">{resetCredentials.starterPassword}</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-[10px] border-none bg-aztec py-3.5 font-bold text-white transition-colors hover:bg-aztec-3"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resetCredentials.starterPassword);
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
                  onClick={() => setResetCredentials(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {addMemberOpen && <AddMember onClose={() => setAddMemberOpen(false)} />}

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 11px 13px;
          border-radius: 10px;
          border: 1.5px solid var(--input-border);
          background: var(--input);
          color: var(--foreground);
          font-family: var(--font-archivo), sans-serif;
          font-size: 13px;
          outline: none;
        }
        .field-input:focus {
          border-color: var(--input-focus);
        }
      `}</style>
    </div>
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

function UaBtn({
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-border bg-surface px-2.5 py-2 text-[11.5px] font-bold text-foreground-secondary transition-all hover:border-primary hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-foreground-secondary ${className || ""}`} title={title}
    >
      {children}
    </button>
  );
}
