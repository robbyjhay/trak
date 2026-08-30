import { daysBetween, fmtDate, fmtDateFull, fmtTime, iso } from "@/lib/dates";
import { roleLabel } from "@/lib/permissions";
import { escapeHtml } from "@/lib/utils";
import type {
  Activity,
  Comment,
  DailyLog,
  Responsibility,
  TrakDb,
  User,
} from "@/lib/types";

export function buildActivityReportHTML(
  act: Activity,
  db: TrakDb,
  userMap: Record<string, User>,
  responsibilities: Responsibility[],
  now: Date,
): string {
  const RESP = Object.fromEntries(
    responsibilities.map((r) => [r.id, r]),
  );
  const logs = db.dailyLogs
    .filter((l) => l.activityId === act.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const owner = userMap[act.createdBy];
  const comments = db.comments.filter((c) => c.activityId === act.id);
  const days = daysBetween(act.startDate, act.endDate) + 1;
  const respObjs = act.responsibilityIds.map((id) => RESP[id]).filter(Boolean);
  const respNames = respObjs.map((r) => `${r.code} — ${r.name}`).join("; ");
  const deliverables = [...new Set(respObjs.flatMap((r) => r.deliverables))];
  const submittedLogs = logs.filter((l) => l.status === "submitted");
  const allOnTime =
    submittedLogs.length > 0 &&
    submittedLogs.every((l) => !l.submittedAt || l.submittedAt <= l.date);
  const totalAttendance = logs.reduce(
    (sum, l) =>
      sum +
      (l.attendees?.length
        ? l.attendees.length
        : parseInt(l.attendanceCount, 10) || 0),
    0,
  );
  const attendanceSourceLabel: Record<string, string> = {
    unit: "Unit member",
    manual: "Added manually",
    link: "Self-registered (link)",
  };
  const attendanceRows = logs
    .flatMap((l) =>
      (l.attendees || []).map(
        (a) =>
          `<tr><td>${fmtDate(l.date)}</td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.phone || "—")}</td><td>${escapeHtml(a.email || "—")}</td><td>${attendanceSourceLabel[a.source] || "—"}</td></tr>`,
      ),
    )
    .join("");

  const background = act.delegatedBy
    ? `Directive from ${act.delegatedBy === "babajide" ? "the Unit Head" : escapeHtml(userMap[act.delegatedBy]?.name || "")}, assigned via Trak on ${fmtDate(act.createdAt)}.`
    : `Logged under the Digital Learning Unit's regular activity tracking (Trak), within the unit's ${escapeHtml(respNames)} responsibility area${respObjs.length > 1 ? "s" : ""}.`;

  const purpose =
    act.description?.trim()
      ? escapeHtml(act.description.trim())
      : logs[0]?.objectives
        ? escapeHtml(logs[0].objectives)
        : "Not specified.";

  const personsRows = [
    `<tr><td>${escapeHtml(owner?.name || "")}</td><td>${escapeHtml(owner ? roleLabel(owner) : "")}</td><td>Logged and delivered this activity.</td></tr>`,
  ];
  if (act.delegatedBy && userMap[act.delegatedBy]) {
    const d = userMap[act.delegatedBy];
    personsRows.push(
      `<tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(roleLabel(d))}</td><td>Assigned this task.</td></tr>`,
    );
  }

  const scopeBullets = logs
    .map((l: DailyLog) => {
      const label = days > 1 ? fmtDate(l.date) : "Scope";
      const text = l.activityDescription
        ? escapeHtml(l.activityDescription)
        : l.objectives
          ? escapeHtml(l.objectives)
          : l.status === "submitted"
            ? "—"
            : "Not yet logged.";
      return `<li><b>${label}:</b> ${text}</li>`;
    })
    .join("");

  const totalAttachments = logs.reduce(
    (sum, l) => sum + (l.attachments?.length || 0),
    0,
  );
  const totalReleased = logs.reduce(
    (sum, l) => sum + (l.amountReleasedNgn || 0),
    0,
  );
  const totalSpent = logs.reduce(
    (sum, l) => sum + (l.amountSpentNgn || 0),
    0,
  );
  const allSpendingItems = logs.flatMap((l) => l.spendingItems || []);
  const outputsLines: string[] = [];
  if (submittedLogs.length)
    outputsLines.push(
      `${submittedLogs.length} of ${days} day(s) logged, with a transcript summary on file in Trak for each.`,
    );
  if (totalAttendance > 0)
    outputsLines.push(
      `${totalAttendance} total attendance logged across the activity — see the Attendance page (next) for the full list.`,
    );
  if (totalAttachments > 0)
    outputsLines.push(
      `${totalAttachments} supporting image/document file${totalAttachments > 1 ? "s" : ""} attached as evidence (on file in Trak).`,
    );
  if (deliverables.length)
    outputsLines.push(
      `Typical deliverables for this responsibility area: ${escapeHtml(deliverables.join("; "))}.`,
    );
  if (!outputsLines.length) outputsLines.push("Not yet logged.");

  const headRemarks = comments.length
    ? comments
        .map(
          (c: Comment) =>
            `<li>${escapeHtml(c.text)} <i>— ${escapeHtml(userMap[c.authorId]?.name || "")}, ${fmtDate(c.createdAt)}</i></li>`,
        )
        .join("")
    : `<li>No Unit Head's remarks yet.</li>`;

  const conclusion = `${escapeHtml(owner?.name || "")} ${act.status === "completed" ? "completed" : "carried out"} "${escapeHtml(act.title)}" over ${days} day${days > 1 ? "s" : ""}, covering ${escapeHtml(respNames)}. ${comments.length ? "Reviewed by the Unit Head — see remarks below." : "Awaiting Unit Head review."}`;

  const refNo = `PSSDC/DLU/TRAK/${act.id.replace("act_", "").toUpperCase()}`;
  const lastReview = comments.length ? comments[comments.length - 1] : null;

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>Activity Report — ${escapeHtml(act.title)}</title>
<style>
  @page{ margin:2cm 2.2cm; }
  *{ font-family:Calibri, "Segoe UI", Arial, sans-serif; box-sizing:border-box; }
  body{ color:#1a1a1a; font-size:11.5pt; line-height:1.6; margin:0; padding:32px 16px; background:#f2f1ec; }
  @media (max-width: 600px) { body { padding: 16px 0; } }
  .letterhead{ background:#0d1d1a; color:#fbfaf6; padding:22px 44px; width: 100%; border-collapse: collapse; }
  .letterhead td { border: none; padding: 0; }
  .letterhead .org{ font-size:9pt; letter-spacing:.14em; text-transform:uppercase; color:#f6c642; margin-bottom:3px; }
  .letterhead .unit{ font-size:15pt; font-weight:700; color:#fbfaf6; }
  .letterhead .meta{ text-align:right; font-size:8.5pt; color:rgba(251,250,246,.7); line-height:1.5; }
  .doc-wrap{ width:100%; max-width:820px; min-height:1160px; margin:0 auto; background:#fff; padding:0 44px 46px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .titleblock{ text-align:center; padding:30px 0 18px; }
  .titleblock h1{ font-size:19pt; letter-spacing:.06em; margin:0 0 8px 0; color:#0d1d1a; }
  .titleblock .ref{ font-size:9.5pt; color:#666; font-family:"Courier New",monospace; }
  .titleblock .name{ font-size:14pt; font-weight:700; margin-top:8px; }
  .titleblock .by{ font-size:11pt; font-weight:500; font-style:italic; color:#555; margin-top:3px; }
  hr.rule{ border:none; border-top:2.5px solid #0d1d1a; margin:0 0 28px; }
  h2{ font-size:12pt; text-transform:uppercase; letter-spacing:.04em; border-bottom:1.5px solid #0d1d1a; padding-bottom:5px; margin:24px 0 10px 0; color:#0d1d1a; }
  p{ margin:0 0 8px 0; }
  table.data-table{ border-collapse:collapse; width:100%; margin-top:6px; }
  table.data-table th, table.data-table td{ border:1px solid #ccc; padding:7px 10px; text-align:left; font-size:10.5pt; vertical-align:top; }
  table.data-table th{ background:#f4f2ec; font-weight:700; }
  ul{ margin:6px 0; padding-left:22px; }
  li{ margin-bottom:5px; }
  .field{ margin-bottom:10px; }
  .field b{ display:inline-block; min-width:150px; }
  .note{ color:#8a6a1f; font-style:italic; font-size:10pt; }
  .sign-table{ border-collapse:collapse; width:100%; margin-top:46px; }
  .sign-table td{ border:none; width:50%; vertical-align:top; padding:0 14px 0 0; }
  .sign-line{ border-top:1px solid #333; width:230px; margin-top:38px; padding-top:6px; font-size:10pt; line-height:1.5; }
  .remarks-block{ margin-top:64px; padding-top:22px; border-top:1px dashed #ccc; }
  .attendance-page{ page-break-before:always; break-before:page; padding-top:6px; }
  .attendance-page .pagelabel{ font-size:8.5pt; letter-spacing:.1em; text-transform:uppercase; color:#999; margin-bottom:2px; }
  .footer{ margin-top:40px; padding-top:12px; border-top:1px solid #ddd; font-size:8.5pt; color:#888; text-align:center; }
</style></head>
<body>
  <table class="letterhead">
    <tr>
      <td align="left" valign="middle">
        <div class="org">Lagos State Government</div>
        <div class="unit">PSSDC — Digital Learning Unit</div>
      </td>
      <td align="right" valign="middle" class="meta">
        Generated via Trak<br>${fmtDateFull(iso(now))}
      </td>
    </tr>
  </table>
  <div class="doc-wrap">
    <div class="titleblock">
      <h1>ACTIVITY REPORT</h1>
      <div class="ref">Ref: ${refNo}</div>
      <div class="name">${escapeHtml(act.title)}</div>
      <div class="by">by ${escapeHtml(owner?.name || "")}</div>
    </div>
    <hr class="rule">

    <h2>1. Background / Context</h2>
    <p>${background}</p>

    <h2>2. Purpose / Objective of the Activity</h2>
    <p>${purpose}</p>

    <h2>3. Activity Title</h2>
    <p>${escapeHtml(act.title)}</p>

    <h2>4. Date(s) &amp; Duration</h2>
    <div class="field"><b>Start date &amp; time:</b> ${fmtDateFull(act.startDate)}, ${fmtTime(act.startTime)}</div>
    <div class="field"><b>End date &amp; time:</b> ${fmtDateFull(act.endDate)}${act.endTime ? ", " + fmtTime(act.endTime) : ""}</div>
    <div class="field"><b>Total day(s) spent:</b> ${days}</div>

    <h2>5. Location / Platform</h2>
    <p>${act.location ? escapeHtml(act.location) : `PSSDC — Digital Learning Unit. <span class="note">(Not provided for this activity — add manually if needed.)</span>`}</p>

    <h2>6. Person(s) Involved</h2>
    <table class="data-table"><tr><th>Name</th><th>Role</th><th>Specific Responsibility</th></tr>${personsRows.join("")}</table>

    <h2>7. Activities Carried Out / Scope of Work</h2>
    <ul>${scopeBullets}</ul>

    <h2>8. Outputs / Deliverables</h2>
    <ul>${outputsLines.map((l) => `<li>${l}</li>`).join("")}</ul>

    ${act.hasBudget ? `
    <h2>8a. Budget &amp; Spending</h2>
    <div class="field"><b>Estimated budget:</b> ${act.estimatedAmountNgn ? "₦" + act.estimatedAmountNgn.toLocaleString() : "Not specified"}</div>
    <div class="field"><b>Total amount released:</b> ${totalReleased > 0 ? "₦" + totalReleased.toLocaleString() : "—"}</div>
    <div class="field"><b>Total amount spent:</b> ${totalSpent > 0 ? "₦" + totalSpent.toLocaleString() : "—"}</div>
    ${totalReleased > 0 && totalSpent > 0 ? `<div class="field"><b>Balance:</b> ₦${(totalReleased - totalSpent).toLocaleString()}</div>` : ""}
    ${allSpendingItems.length > 0 ? `
    <table class="data-table"><tr><th>Description</th><th>Amount (₦)</th></tr>
    ${allSpendingItems.map((s) => `<tr><td>${escapeHtml(s.description)}</td><td>${s.amount.toLocaleString()}</td></tr>`).join("")}
    </table>` : ""}
    ` : ""}

    <h2>9. Performance Assessment</h2>
    <div class="field"><b>Quality:</b> ${submittedLogs.length ? "Met standard, as logged." : "Not yet logged."}</div>
    <div class="field"><b>Timeliness:</b> ${submittedLogs.length ? (allOnTime ? "Delivered on schedule." : "Some days logged after the fact — see submission dates above.") : "Not yet logged."}</div>
    <div class="field"><b>Initiative &amp; Teamwork:</b> ${act.initiativeTeamwork ? escapeHtml(act.initiativeTeamwork) : '<span class="note">Not provided for this activity.</span>'}</div>
    <div class="field"><b>Challenges Encountered:</b> ${act.challenges ? escapeHtml(act.challenges) : '<span class="note">Not provided for this activity.</span>'}</div>

    <h2>10. Outcomes / Impact</h2>
    <p>${act.outcomes ? escapeHtml(act.outcomes) : '<span class="note">Not provided for this activity.</span>'}</p>

    <h2>11. Next Steps / Recommendations</h2>
    <p>${act.nextSteps ? escapeHtml(act.nextSteps) : '<span class="note">Not provided for this activity.</span>'}</p>

    <h2>12. Conclusion</h2>
    <p>${conclusion}</p>

    <div class="attendance-page">
      <div class="pagelabel">Attendance</div>
      <h2>Attendance</h2>
      ${
        attendanceRows
          ? `<p>${totalAttendance} attendee${totalAttendance !== 1 ? "s" : ""} recorded${days > 1 ? " across the logged day(s) of this activity" : ""}.</p><table class="data-table"><tr><th>Date</th><th>Name</th><th>Phone</th><th>Email</th><th>Source</th></tr>${attendanceRows}</table>`
          : totalAttendance > 0
            ? `<p>${totalAttendance} present. <span class="note">(Only an aggregate headcount was captured for this activity — no individual attendee list is on file in Trak.)</span></p>`
            : `<p class="note">No attendance was captured for this activity.</p>`
      }
    </div>

    <table class="sign-table"><tr>
      <td>
        <div class="sign-line"><b>${escapeHtml(owner?.name || "")}</b><br>${escapeHtml(owner ? roleLabel(owner) : "")}<br>Report prepared, ${fmtDateFull(iso(now))}</div>
      </td>
      <td>
        ${
          lastReview
            ? `<div class="sign-line"><b>${escapeHtml(userMap[lastReview.authorId]?.name || "")}</b><br>Unit Head<br>Reviewed, ${fmtDateFull(lastReview.createdAt)}</div>`
            : `<div class="sign-line" style="border-top-color:#ccc; color:#999;">Unit Head<br><span class="note">Pending review</span></div>`
        }
      </td>
    </tr></table>

    <div class="remarks-block">
      <h2 style="text-transform:none; border-bottom-color:#ccc;">Unit Head's Remarks</h2>
      <ul>${headRemarks}</ul>
    </div>

    <div class="footer">PSSDC — Digital Learning Unit &middot; Internal document, generated automatically from Trak &middot; ${refNo}</div>
  </div>
</body>
</html>`;
}

export function downloadReportDoc(html: string, filename: string) {
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const safeName = filename.replace(/[\\/:*?"<>|]/g, "").slice(0, 100);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName.endsWith(".doc") ? safeName : `${safeName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function buildUnitReportHTML(
  title: string,
  activities: Activity[],
  relevantLogs: DailyLog[],
  db: TrakDb,
  userMap: Record<string, User>,
  responsibilities: Responsibility[],
  now: Date,
  memberStats: { user: User, total: number, completed: number, rate: number, attendance: number }[],
  insights: string[],
  attentionItems: { id: string, title: string, desc: string, by: string }[]
): string {
  const completed = activities.filter(a => a.status === "completed").length;
  const missed = activities.filter(a => a.status === "missed").length;
  
  const totalReleased = relevantLogs.reduce((sum, l) => sum + (Number(l.amountReleasedNgn) || 0), 0);
  const totalSpent = relevantLogs.reduce((sum, l) => sum + (Number(l.amountSpentNgn) || 0), 0);
  const totalAttendance = relevantLogs.reduce((sum, l) => sum + (l.attendees?.length || parseInt(l.attendanceCount) || 0), 0);

  const actRows = activities.map(a => {
    const ownerName = escapeHtml(userMap[a.createdBy]?.name || "Unknown");
    return `<tr>
      <td>${escapeHtml(a.title)}</td>
      <td>${ownerName}</td>
      <td>${escapeHtml(a.status)}</td>
      <td>${fmtDate(a.startDate)}</td>
    </tr>`;
  }).join("");

  const memberRows = memberStats.map(m => `<tr>
    <td>${escapeHtml(m.user.name)}</td>
    <td>${m.total}</td>
    <td>${m.completed}</td>
    <td>${m.rate}%</td>
    <td>${m.attendance}</td>
  </tr>`).join("");

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>Unit Report - ${escapeHtml(title)}</title>
<style>
  @page{ margin:2cm 2.2cm; }
  *{ font-family:Calibri, "Segoe UI", Arial, sans-serif; box-sizing:border-box; }
  body{ color:#1a1a1a; font-size:11.5pt; line-height:1.6; margin:0; background:#fff; }
  table { border-collapse:collapse; width:100%; margin-top:6px; margin-bottom: 24px; }
  th, td { border:1px solid #ccc; padding:7px 10px; text-align:left; font-size:10.5pt; }
  th { background:#f4f2ec; font-weight:700; }
  h1 { font-size: 19pt; color: #0d1d1a; border-bottom: 2px solid #0d1d1a; padding-bottom: 8px; }
  h2 { font-size: 14pt; margin-top: 24px; color: #0d1d1a; border-bottom: 1px solid #ccc; }
  .metric { margin-bottom: 8px; }
  ul { padding-left: 20px; }
</style>
</head>
<body>
  <h1>Unit Report: ${escapeHtml(title)}</h1>
  <p>Generated on ${fmtDateFull(iso(now))}</p>

  <h2>Overview</h2>
  <div class="metric"><b>Total Activities:</b> ${activities.length}</div>
  <div class="metric"><b>Completed:</b> ${completed}</div>
  <div class="metric"><b>Missed:</b> ${missed}</div>
  <div class="metric"><b>Attendance:</b> ${totalAttendance}</div>
  <div class="metric"><b>Total Released:</b> ₦${totalReleased.toLocaleString()}</div>
  <div class="metric"><b>Total Spent:</b> ₦${totalSpent.toLocaleString()}</div>

  <h2>Insights</h2>
  <ul>
    ${insights.map(ins => `<li>${escapeHtml(ins)}</li>`).join("")}
  </ul>

  <h2>Attention Required</h2>
  <ul>
    ${attentionItems.length ? attentionItems.map(item => `<li><b>${escapeHtml(item.desc)}:</b> ${escapeHtml(item.title)} (${escapeHtml(userMap[item.by]?.name || "Unknown")})</li>`).join("") : "<li>None</li>"}
  </ul>

  <h2>Member Performance</h2>
  <table>
    <tr><th>Member</th><th>Assigned</th><th>Completed</th><th>Rate</th><th>Attendance Logged</th></tr>
    ${memberRows}
  </table>

  <h2>Activities</h2>
  <table>
    <tr><th>Title</th><th>Owner</th><th>Status</th><th>Date</th></tr>
    ${actRows}
  </table>
</body>
</html>`;
}
