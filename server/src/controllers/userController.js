import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Portfolio from "../models/Portfolio.js";
import SimulatedTrade from "../models/SimulatedTrade.js";
import { Alert, AlertEvent } from "../models/Alert.js";
import LearningProgress from "../models/LearningProgress.js";
import { issueToken, clearToken } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";

export const me = (req, res) => res.json({ user: req.user.toPublic() });

export async function updateMe(req, res) {
  const { name, preferences = {} } = req.body;
  if (name) req.user.name = name;
  for (const [k, v] of Object.entries(preferences)) req.user.preferences[k] = v;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}

async function checkPassword(user, password) {
  const withHash = await User.findById(user._id).select("+passwordHash");
  if (!(await bcrypt.compare(password, withHash.passwordHash))) throw new HttpError(401, "Password is incorrect.", "INVALID_CREDENTIALS");
  return withHash;
}

export async function changePassword(req, res) {
  const user = await checkPassword(req.user, req.body.currentPassword);
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.tokenVersion += 1; // log out other sessions
  await user.save();
  issueToken(res, user);
  res.json({ ok: true });
}

export async function addWatch(req, res) {
  const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { watchlist: req.params.id } }, { new: true });
  res.json({ watchlist: user.watchlist });
}

export async function removeWatch(req, res) {
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { watchlist: req.params.id } }, { new: true });
  res.json({ watchlist: user.watchlist });
}

export async function exportData(req, res) {
  const uid = req.user._id;
  const [portfolio, trades, alerts, alertEvents, learning] = await Promise.all([
    Portfolio.findOne({ user: uid }).lean(), SimulatedTrade.find({ user: uid }).lean(), Alert.find({ user: uid }).lean(),
    AlertEvent.find({ user: uid }).lean(), LearningProgress.find({ user: uid }).lean(),
  ]);
  res.setHeader("Content-Disposition", 'attachment; filename="crypto-copilot-data.json"');
  res.json({ exportedAt: new Date().toISOString(), user: req.user.toPublic(), portfolio, trades, alerts, alertEvents, learning });
}

export async function deleteAccount(req, res) {
  await checkPassword(req.user, req.body.password);
  const uid = req.user._id;
  await Promise.all([
    Portfolio.deleteMany({ user: uid }), SimulatedTrade.deleteMany({ user: uid }), Alert.deleteMany({ user: uid }),
    AlertEvent.deleteMany({ user: uid }), LearningProgress.deleteMany({ user: uid }),
  ]);
  await User.deleteOne({ _id: uid });
  clearToken(res);
  res.json({ ok: true });
}
