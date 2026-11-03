import { Alert, AlertEvent } from "../models/Alert.js";
import { getBtcSnapshot, getFees } from "./marketService.js";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { sendEmail, layout } from "./emailService.js";

const LABELS = {
  price_above: "BTC price rose to or above",
  price_below: "BTC price fell to or below",
  fee_above: "Next-block fee rose to or above",
  fee_below: "Next-block fee fell to or below",
};
const fmtValue = (kind, currency, v) =>
  kind.startsWith("price")
    ? new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v)
    : `${v} sat/vB`;

/** Emails the alert owner if they opted in. Failures are logged, never thrown. */
async function emailAlert(alert, value, source) {
  try {
    const user = await User.findById(alert.user);
    if (!user?.preferences?.emailAlerts) return;
    const what = `${LABELS[alert.kind]} ${fmtValue(alert.kind, alert.currency, alert.threshold)}`;
    const lines = [
      `Hi ${user.name},`,
      `Your alert was triggered: ${what}.`,
      `Observed value: ${fmtValue(alert.kind, alert.currency, value)} (source: ${source}, ${new Date().toUTCString()}).`,
      "This alert won't fire again until the condition becomes false and then true again.",
    ];
    await sendEmail({
      to: user.email,
      subject: `Crypto Copilot alert: ${what}`,
      text: `${lines.join("\n\n")}\n\nView alerts: ${env.appUrl}/app/alerts`,
      html: layout({ title: "Your alert was triggered", lines, button: { label: "View alerts", url: `${env.appUrl}/app/alerts` },
        footer: "You're receiving this because email alerts are on in Settings. Not financial advice." }),
    });
  } catch (e) {
    console.error("[alerts] email failed:", e.message);
  }
}

export function observedValue(alert, snap, fees) {
  if (alert.kind.startsWith("price")) return snap?.[alert.currency.toLowerCase()]?.price ?? null;
  return fees?.fastest ?? null;
}

export function isConditionMet(kind, threshold, value) {
  if (value == null) return null; // unknown - leave state unchanged
  return kind.endsWith("_above") ? value >= threshold : value <= threshold;
}

let lastRun = null;
export const schedulerStatus = () => lastRun;

/** Evaluates enabled alerts (optionally for one user). Fires only on false -> true transitions. */
export async function evaluateAlerts(userId) {
  const filter = { enabled: true, ...(userId && { user: userId }) };
  const alerts = await Alert.find(filter);
  if (!alerts.length) return { evaluated: 0, triggered: 0 };
  const needsPrice = alerts.some((a) => a.kind.startsWith("price"));
  const needsFee = alerts.some((a) => a.kind.startsWith("fee"));
  const [snap, fees] = await Promise.all([
    needsPrice ? getBtcSnapshot().catch(() => null) : null,
    needsFee ? getFees().catch(() => null) : null,
  ]);
  let triggered = 0;
  for (const a of alerts) {
    // Don't trigger on stale data.
    const src = a.kind.startsWith("price") ? snap : fees;
    const value = src?.stale ? null : observedValue(a, snap, fees);
    const met = isConditionMet(a.kind, a.threshold, value);
    if (met === null || met === a.conditionMet) continue;
    // Conditional update prevents two concurrent evaluations from double-firing.
    const res = await Alert.updateOne(
      { _id: a._id, conditionMet: a.conditionMet },
      met ? { $set: { conditionMet: true, lastTriggeredAt: new Date() }, $inc: { triggerCount: 1 } } : { $set: { conditionMet: false } }
    );
    if (met && res.modifiedCount) {
      triggered++;
      await AlertEvent.create({
        user: a.user, alert: a._id, kind: a.kind, currency: a.kind.startsWith("price") ? a.currency : "sat/vB",
        threshold: a.threshold, observedValue: value, source: src.source,
      });
      await emailAlert(a, value, src.source);
    }
  }
  lastRun = new Date().toISOString();
  return { evaluated: alerts.length, triggered };
}

export function startAlertScheduler(intervalMs) {
  const tick = () => evaluateAlerts().catch((e) => console.error("[alerts]", e.message));
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  console.log(`[alerts] checking every ${Math.round(intervalMs / 1000)}s while the server is running`);
  return timer;
}
