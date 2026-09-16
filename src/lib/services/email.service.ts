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
    subject: "You are invited to Trak",
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
    text: `Your Trak password has been changed successfully. If you did not make this change, contact your Unit Head immediately.`,
    html: `<p>Your Trak password has been changed successfully.</p><p style="color:#5f7069;font-size:13px">If you did not make this change, contact your Unit Head immediately.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info("email_password_changed_sent", { to });
  } catch (err) {
    log.error("email_password_changed_failed", err, { to });
  }
}

/**
 * Onboarding approval — the member's login details (username + starter password).
 * Email is compulsory on the onboarding form exactly so this can be delivered.
 */
export async function sendOnboardingApprovedEmail(
  to: string,
  opts: { name: string; username: string; starterPassword: string },
) {
  const loginLink = `${appUrl()}/login`;
  const terms = `Your username is <code>${opts.username}</code> and your initial password is <code>${opts.starterPassword}</code>.`;
  const mailOptions = {
    from,
    to,
    subject: "You have been onboarded to Trak — sign in",
    text: `Hi ${opts.name},\n\nYour Unit Head has approved your onboarding to Trak (Digital Learning Unit activity register).\n\nUsername: ${opts.username}\nInitial password: ${opts.starterPassword}\n\nSign in at ${loginLink}. You will be asked to set your own password on first sign-in.\n\nIf you did not expect this, ignore this email.`,
    html: `<p>Hi ${opts.name},</p><p>Your Unit Head has approved your onboarding to <strong>Trak</strong> (Digital Learning Unit activity register).</p><p>${terms}</p><p><a href="${loginLink}">Sign in to Trak</a>. You will be asked to set your own password on first sign-in.</p><p style="color:#5f7069;font-size:13px">If you did not expect this, ignore this email.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info("email_onboarding_approved_sent", { to });
  } catch (err) {
    log.error("email_onboarding_approved_failed", err, { to });
    throw err;
  }
}

/** Onboarding decline — member was not accepted (email is best-effort). */
export async function sendOnboardingDeclinedEmail(to: string, name: string) {
  const mailOptions = {
    from,
    to,
    subject: "Update on your Trak onboarding request",
    text: `Hi ${name},\n\nYour Unit Head declined your onboarding request to Trak. If you believe this is a mistake, please speak with your Unit Head.`,
    html: `<p>Hi ${name},</p><p>Your Unit Head declined your onboarding request to <strong>Trak</strong>.</p><p>If you believe this is a mistake, please speak with your Unit Head.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info("email_onboarding_declined_sent", { to });
  } catch (err) {
    log.error("email_onboarding_declined_failed", err, { to });
  }
}
