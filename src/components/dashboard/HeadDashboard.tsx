"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrak } from "@/context/TrakStore";
import { MemberDashboard, Kpi, Card, RespBars } from "./MemberDashboard";
import { addDays, fmtDate, iso, longDateLabel } from "@/lib/dates";
import { firstName, initials } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import { TYPE_COLOR } from "@/lib/constants";
import { TypeIcon, PATHS } from "@/components/icons";
import { GhostBtn, PrimaryMini } from "@/components/ui/Buttons";
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
      <div className="page-head mb-[22px]">
        <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
          {longDateLabel(useTrak().now)} · PSSDC — Digital Learning Unit
        </div>
        <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
          Good day, {firstName(head.name || sessionUser.name)}
        </h1>
        <p className="m-0 text-[13.5px] text-ink-soft">Unit Head view.</p>
      </div>

      <div className="mb-7 flex w-fit gap-2 rounded-[14px] bg-aztec p-1.5">
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
            className={`cursor-pointer rounded-[10px] border-none px-5 py-2.5 text-[13px] font-bold ${
              panel === key
                ? "bg-saffron text-aztec"
                : "bg-transparent text-paper/60"
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

  const teamCounts = users
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
      <div className="mb-[26px] grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi kind="neutral" value={thisMonth.length} label="Unit Activities This Month" path={PATHS.chart} />
        <Kpi kind="completed" value={`${completionRate}%`} label="Unit Completion Rate" path={PATHS.check} />
        <Kpi kind="missed" value={missedAll} label="Missed, Unit-Wide" path={PATHS.alert} />
        <Kpi kind="neutral" value={`${users.length}/${users.length}`} label="Personnel Active" path={PATHS.users} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <Card title="Team performance" sub="Completed this month">
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
                  className="w-[90px] shrink-0 cursor-pointer truncate border-none bg-transparent text-left text-[12.5px] font-bold sm:w-[118px]"
                  onClick={() => router.push(`/member/${u.id}`)}
                >
                  {u.name}
                </button>
                <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-neutral-bg">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(count / teamMax) * 100}%`,
                      background: u.color,
                    }}
                  />
                </div>
                <div className="w-5 text-right font-mono text-[11.5px] font-bold">{count}</div>
                <div className="ml-1.5 hidden shrink-0 rounded-full bg-neutral-bg px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-ink-faint uppercase sm:inline-flex">
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
            action={
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-lg bg-neutral-bg p-0.5">
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
                      className={`cursor-pointer rounded-md border-none px-2.5 py-1 text-[10.5px] font-bold ${
                        feedFilter === key
                          ? "bg-card text-ink shadow-sm"
                          : "bg-transparent text-ink-faint"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowHidden(!showHidden)}
                  className={`cursor-pointer rounded-md border-[1.5px] px-2.5 py-1 text-[10.5px] font-bold transition-colors ${
                    showHidden
                      ? "border-saffron bg-[#fff8e6] text-saffron-dim"
                      : "border-line bg-transparent text-ink-faint hover:border-saffron-dim"
                  }`}
                >
                  {showHidden ? "Showing hidden" : "Show hidden"}
                </button>
              </div>
            }
          >
            {unitShown.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-ink-faint">
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
                    className="mb-3.5 rounded-[14px] border border-line px-[18px] py-4 last:mb-0"
                  >
                    <div className="mb-2.5 flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                        style={{ background: owner?.color }}
                      >
                        {initials(owner?.name || "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold">{a.title}</div>
                        <div className="text-[11px] text-ink-faint">
                          {owner?.name} · {fmtDate(a.createdAt)} ·{" "}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                              a.status === "pending"
                                ? "bg-warning-bg text-warning-ink"
                                : a.status === "completed"
                                  ? "bg-good-bg text-good"
                                  : "bg-critical-bg text-critical"
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
                    <div className="mt-1 flex gap-2">
                      <UaBtn onClick={() => router.push(`/activity/${a.id}`)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.eye} />
                        </svg>
                        View
                      </UaBtn>
                      <UaBtn
                        disabled={!isDone}
                        onClick={() => isDone && openReport(a.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.download} />
                        </svg>
                        Download
                      </UaBtn>
                      <UaBtn
                        disabled={!isDone}
                        onClick={() => {
                          if (!isDone) return;
                          setCommentActId(a.id);
                          setCommentText("");
                          setCommentOpen(true);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={PATHS.messages} />
                        </svg>
                        Comment
                      </UaBtn>
                      <UaBtn
                        onClick={() => {
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
                        {a.hidden ? "Unhide" : "Hide"}
                      </UaBtn>
                      <UaBtn
                        onClick={() => {
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
                        Delete
                      </UaBtn>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

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
                      borderLeft: "2px solid var(--paper)",
                    }}
                  >
                    {pct > 10 ? tb[name] : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3.5">
              {typeOrder.map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft">
                  <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                  {name} ({tb[name]})
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Quick actions">
            <PrimaryMini
              className="mb-2.5 w-full justify-center py-3"
              onClick={() => setDelegateOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.send} />
              </svg>
              Delegate a Task
            </PrimaryMini>
            <GhostBtn
              className="w-full justify-center py-3"
              onClick={() => router.push("/messages")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.send} />
              </svg>
              Broadcast to Unit
            </GhostBtn>
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
              <div key={u.id} className="mb-3 flex items-center gap-3 last:mb-0">
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
                  <div className="text-[12.5px] font-bold">{u.name}</div>
                  <div className="text-[11px] font-medium text-ink-faint">
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
          <h3 className="m-0 mb-1.5 font-display text-xl">Delegate a Task</h3>
          <p className="mb-5 text-[12.5px] text-ink-soft">
            Lands in the member&apos;s activity list, tagged &quot;Delegated by Unit Head.&quot;
          </p>
          <Field label="Assign to">
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="field-input"
            >
              {users
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
              className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line bg-transparent py-3 font-bold"
              onClick={() => setDelegateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white"
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
          <h3 className="m-0 mb-1.5 font-display text-xl">Add a remark</h3>
          <p className="mb-5 text-[12.5px] text-ink-soft">
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
              className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line bg-transparent py-3 font-bold"
              onClick={() => setCommentOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white"
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
          <h3 className="m-0 mb-1.5 font-display text-xl">Edit personnel record</h3>
          <p className="mb-5 text-[12.5px] text-ink-soft">
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
          <div className="mt-[22px] flex gap-2.5">
            <button
              type="button"
              className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line bg-transparent py-3 font-bold"
              onClick={() => setProfileOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white"
              onClick={() => {
                void updateUserProfile(editUserId, pe)
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
        </ModalPanel>
      </ModalBackdrop>

      {addMemberOpen && <AddMember onClose={() => setAddMemberOpen(false)} />}

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 11px 13px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          font-family: var(--font-archivo), sans-serif;
          font-size: 13px;
          outline: none;
        }
        .field-input:focus {
          border-color: var(--aztec-3);
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
      <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-line bg-white px-2.5 py-2 text-[11.5px] font-bold text-ink-soft transition-all hover:border-saffron-dim hover:bg-[#fffaf0] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-white disabled:hover:text-ink-soft`}
    >
      {children}
    </button>
  );
}
