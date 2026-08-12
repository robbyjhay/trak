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
  body{ color:#1a1a1a; font-size:11.5pt; line-height:1.6; margin:0; padding:0; background:#f2f1ec; }
  .letterhead{ background:#0d1d1a; color:#fbfaf6; padding:22px 44px; }
  .letterhead .top{ display:flex; align-items:center; justify-content:space-between; }
  .letterhead .org{ font-size:9pt; letter-spacing:.14em; text-transform:uppercase; color:#f6c642; margin-bottom:3px; }
  .letterhead .unit{ font-size:15pt; font-weight:700; color:#fbfaf6; }
  .letterhead .meta{ text-align:right; font-size:8.5pt; color:rgba(251,250,246,.7); line-height:1.5; }
  .doc-wrap{ max-width:740px; margin:0 auto; background:#fff; padding:0 44px 46px; }
  .titleblock{ text-align:center; padding:30px 0 18px; }
  .titleblock h1{ font-size:19pt; letter-spacing:.06em; margin:0 0 8px 0; color:#0d1d1a; }
  .titleblock .ref{ font-size:9.5pt; color:#666; font-family:"Courier New",monospace; }
  .titleblock .name{ font-size:14pt; font-weight:700; margin-top:8px; }
  .titleblock .by{ font-size:11pt; font-weight:500; font-style:italic; color:#555; margin-top:3px; }
  hr.rule{ border:none; border-top:2.5px solid #0d1d1a; margin:0 0 28px; }
  h2{ font-size:12pt; text-transform:uppercase; letter-spacing:.04em; border-bottom:1.5px solid #0d1d1a; padding-bottom:5px; margin:24px 0 10px 0; color:#0d1d1a; }
  p{ margin:0 0 8px 0; }
  table{ border-collapse:collapse; width:100%; margin-top:6px; }
  th,td{ border:1px solid #ccc; padding:7px 10px; text-align:left; font-size:10.5pt; vertical-align:top; }
  th{ background:#f4f2ec; font-weight:700; }
  ul{ margin:6px 0; padding-left:22px; }
  li{ margin-bottom:5px; }
  .field{ margin-bottom:10px; }
  .field b{ display:inline-block; min-width:150px; }
  .note{ color:#8a6a1f; font-style:italic; font-size:10pt; }
  .sign-table{ border:none; margin-top:46px; }
  .sign-table td{ border:none; width:50%; vertical-align:top; padding:0 14px 0 0; }
  .sign-line{ border-top:1px solid #333; width:230px; margin-top:38px; padding-top:6px; font-size:10pt; line-height:1.5; }
  .remarks-block{ margin-top:64px; padding-top:22px; border-top:1px dashed #ccc; }
  .attendance-page{ page-break-before:always; break-before:page; padding-top:6px; }
  .attendance-page .pagelabel{ font-size:8.5pt; letter-spacing:.1em; text-transform:uppercase; color:#999; margin-bottom:2px; }
  .footer{ margin-top:40px; padding-top:12px; border-top:1px solid #ddd; font-size:8.5pt; color:#888; text-align:center; }
</style></head>
<body>
  <div class="letterhead">
    <div class="top">
      <div>
        <div class="org">Lagos State Government</div>
        <div class="unit">PSSDC — Digital Learning Unit</div>
      </div>
      <div class="meta">Generated via Trak<br>${fmtDateFull(iso(now))}</div>
    </div>
  </div>
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
    <table><tr><th>Name</th><th>Role</th><th>Specific Responsibility</th></tr>${personsRows.join("")}</table>

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
    <table><tr><th>Description</th><th>Amount (₦)</th></tr>
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
          ? `<p>${totalAttendance} attendee${totalAttendance !== 1 ? "s" : ""} recorded${days > 1 ? " across the logged day(s) of this activity" : ""}.</p><table><tr><th>Date</th><th>Name</th><th>Phone</th><th>Email</th><th>Source</th></tr>${attendanceRows}</table>`
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

export function downloadReportDoc(html: string, title: string) {
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const safeName = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 80);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Trak Activity Report — ${safeName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
