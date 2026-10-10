import { Alert, AlertEvent } from "../models/Alert.js";
import { evaluateAlerts, schedulerStatus } from "../services/alertService.js";
import { HttpError } from "../utils/httpError.js";

const MAX_ALERTS = 20;

export async function list(req, res) {
  const [alerts, events, unread] = await Promise.all([
    Alert.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    AlertEvent.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    AlertEvent.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ alerts, events, unread, lastCheckedAt: schedulerStatus() });
}

export async function create(req, res) {
  if ((await Alert.countDocuments({ user: req.user._id })) >= MAX_ALERTS) {
    throw new HttpError(400, `You can have up to ${MAX_ALERTS} alerts.`, "LIMIT");
  }
  const alert = await Alert.create({ ...req.body, user: req.user._id });
  res.status(201).json({ alert });
}

// Every query is scoped by user, so one user can never read or change another's alerts.
export async function update(req, res) {
  const set = { ...req.body };
  if (set.threshold != null || set.enabled != null) set.conditionMet = false; // re-arm on change
  const alert = await Alert.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: set }, { new: true });
  if (!alert) throw new HttpError(404, "Alert not found.", "NOT_FOUND");
  res.json({ alert });
}

export async function remove(req, res) {
  const r = await Alert.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!r.deletedCount) throw new HttpError(404, "Alert not found.", "NOT_FOUND");
  res.json({ ok: true });
}

export async function checkNow(req, res) {
  const result = await evaluateAlerts(req.user._id);
  res.json(result);
}

export async function markRead(req, res) {
  await AlertEvent.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
}
