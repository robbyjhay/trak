import nodemailer from "nodemailer";
import { log } from "@/lib/log";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  auth:
    process.env.SMTP_USER || process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

const from = process.env.EMAIL_FROM || "Trak <noreply@example.com>";

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Invite a provisioned user to set their password via a one-time token.
 * Link goes to accept-invite (not RSVP — RSVP is attendance-only).
 */
export async function sendInviteEmail(
  to: string,
  token: string,
  opts?: { username?: string; name?: string },
) {
  const inviteLink = `${appUrl()}/accept-invite?token=${encodeURIComponent(token)}`;
  const greet = opts?.name ? `Hi ${opts.name},` : "Hello,";
  const userLine = opts?.username
    ? `Your username is ${opts.username}. `
    : "";
  const mailOptions = {
    from,
    to,
    subject: "You are invited to Trak — Digital Learning Unit",
    text: `${greet}\n\nYou have been added to Trak (Digital Learning Unit activity register).\n${userLine}Set your password here (link expires in 7 days):\n${inviteLink}\n\nIf you did not expect this, ignore this email.`,
    html: `<p>${greet}</p><p>You have been added to <strong>Trak</strong> (Digital Learning Unit activity register).</p>${
      opts?.username
        ? `<p>Your username is <code>${opts.username}</code>.</p>`
        : ""
    }<p><a href="${inviteLink}">Set your password and join Trak</a> (link expires in 7 days).</p><p style="color:#5f7069;font-size:13px">If you did not expect this, ignore this email.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info("email_invite_sent", { to });
  } catch (err) {
    log.error("email_invite_failed", err, { to });
    throw err;
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetLink = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const mailOptions = {
    from,
    to,
    subject: "Reset your Trak password",
    text: `Reset your Trak password using this link (expires in 1 hour):\n${resetLink}\n\nIf you did not request a reset, ignore this email.`,
    html: `<p>Reset your Trak password using this link (expires in 1 hour):</p><p><a href="${resetLink}">Reset password</a></p><p style="color:#5f7069;font-size:13px">If you did not request a reset, ignore this email.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info("email_reset_sent", { to });
  } catch (err) {
    log.error("email_reset_failed", err, { to });
    throw err;
  }
}

export async function sendPasswordChangedEmail(to: string) {
  const mailOptions = {
    from,
    to,
    subject: "Your Trak password was changed",
    text: `Your Trak password has been changed successfully. If you did not make this change, contact your Head of Unit immediately.`,
    html: `<p>Your Trak password has been changed successfully.</p><p style="color:#5f7069;font-size:13px">If you did not make this change, contact your Head of Unit immediately.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info("email_password_changed_sent", { to });
  } catch (err) {
    log.error("email_password_changed_failed", err, { to });
  }
}
