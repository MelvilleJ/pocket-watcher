import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Sign-in and signup codes come from the company mailbox. Only the password is required; the rest defaults to
// the Zoho account behind hello@devlogstudios.com and can be overridden for another region or provider.
function smtpConfig() {
  const password = process.env.SMTP_PASSWORD;
  if (!password) return null;
  return {
    host: process.env.SMTP_HOST || "smtp.zoho.com",
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || "hello@devlogstudios.com",
    password,
    from: process.env.EMAIL_FROM || "Pocket Watcher <hello@devlogstudios.com>",
  };
}

export function isEmailSendingConfigured() {
  return smtpConfig() !== null;
}

let transporter: Transporter | null = null;

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const config = smtpConfig();
  if (!config) throw new Error("Email sending isn't set up on this server (SMTP_PASSWORD is missing).");
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 15_000,
  });
  await transporter.sendMail({ from: config.from, ...message });
}
