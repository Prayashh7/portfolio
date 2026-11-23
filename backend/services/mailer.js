import nodemailer from "nodemailer";
import { env } from "../config/env.js";

/*
  Email is optional. With no SMTP_HOST configured the contact form still works —
  messages are stored and read in the dashboard — and this module reports that it
  did nothing rather than pretending to have sent anything.
*/

let transport = null;

function getTransport() {
  if (!env.smtp.host) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transport;
}

export const isMailConfigured = () => Boolean(env.smtp.host);

function plainText({ name, email, subject, message }) {
  return [`From: ${name} <${email}>`, subject ? `Subject: ${subject}` : null, "", message]
    .filter((line) => line !== null)
    .join("\n");
}

export async function sendContactNotification(entry, recipient) {
  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: "smtp-not-configured" };

  const to = recipient || env.smtp.notifyTo;
  if (!to) return { sent: false, reason: "no-recipient" };

  await mailer.sendMail({
    to,
    from: env.smtp.from || env.smtp.user || to,
    replyTo: `${entry.name} <${entry.email}>`,
    subject: entry.subject ? `Portfolio: ${entry.subject}` : `Portfolio message from ${entry.name}`,
    text: plainText(entry),
  });

  return { sent: true };
}
