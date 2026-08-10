import nodemailer from 'nodemailer';
import { log } from '@/lib/log';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const from = process.env.EMAIL_FROM || "Trak <noreply@example.com>";

export async function sendInviteEmail(to: string, token: string) {
  const inviteLink = `${process.env.APP_URL}/rsvp/${token}`;
  const mailOptions = {
    from,
    to,
    subject: 'You are invited to Trak',
    text: `Please join Trak by clicking the following link: ${inviteLink}`,
    html: `<p>Please join Trak by clicking the following link: <a href="${inviteLink}">Join Trak</a></p>`,
  };
  
  try {
    await transporter.sendMail(mailOptions);
    log.info('email_invite_sent', { to });
  } catch (err) {
    log.error('email_invite_failed', err, { to });
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;
  const mailOptions = {
    from,
    to,
    subject: 'Password Reset Request',
    text: `Reset your password here: ${resetLink}`,
    html: `<p>Reset your password here: <a href="${resetLink}">Reset Password</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info('email_reset_sent', { to });
  } catch (err) {
    log.error('email_reset_failed', err, { to });
  }
}

export async function sendPasswordChangedEmail(to: string) {
  const mailOptions = {
    from,
    to,
    subject: 'Your password was changed',
    text: `Your Trak password has been changed successfully.`,
    html: `<p>Your Trak password has been changed successfully.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    log.info('email_password_changed_sent', { to });
  } catch (err) {
    log.error('email_password_changed_failed', err, { to });
  }
}
