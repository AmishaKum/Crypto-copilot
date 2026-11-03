import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;
const outbox = []; // last few messages, kept for tests and console mode

export const emailConfigured = () => Boolean(env.smtpHost);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Simple branded HTML layout. `lines` are plain text paragraphs; `button` is { label, url }. */
export function layout({ title, lines, button, footer }) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
  <div style="font-size:20px;font-weight:bold"><span style="background:#f7931a;color:#0f172a;border-radius:6px;padding:2px 8px">&#8383;</span> Crypto<span style="color:#d97706">Copilot</span></div>
  <h2 style="margin:20px 0 8px">${escape(title)}</h2>
  ${lines.map((l) => `<p style="margin:8px 0;line-height:1.5">${escape(l)}</p>`).join("")}
  ${button ? `<p style="margin:22px 0"><a href="${escape(button.url)}" style="background:#f7931a;color:#0f172a;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${escape(button.label)}</a></p>` : ""}
  <p style="margin-top:28px;font-size:12px;color:#64748b">${escape(footer || "Educational tool, not financial advice. We will never ask for your seed phrase or private keys.")}</p>
</div>`;
}

/** Sends an email, or prints it to the console when SMTP is not configured. Never throws to callers that ignore it. */
export async function sendEmail({ to, subject, text, html }) {
  const msg = { to, subject, text, html, at: new Date().toISOString() };
  outbox.push(msg);
  if (outbox.length > 50) outbox.shift();
  if (!emailConfigured()) {
    console.log(`\n[email] (SMTP not configured - printing instead of sending)\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false, mode: "console" };
  }
  await getTransporter().sendMail({ from: env.emailFrom, to, subject, text, html });
  return { delivered: true, mode: "smtp" };
}

export const lastEmails = () => [...outbox];
export const clearOutbox = () => outbox.splice(0, outbox.length);
