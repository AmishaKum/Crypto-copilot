import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { issueToken, clearToken } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";

const ROUNDS = 12;
// Compared against when the email doesn't exist so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", ROUNDS);
const roleFor = (email) => (env.adminEmails.includes(email) ? "admin" : "user");

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) {
    throw new HttpError(409, "Couldn't create an account with these details. If you already have an account, log in instead.", "REGISTER_FAILED");
  }
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, ROUNDS), role: roleFor(email), lastLoginAt: new Date() });
  issueToken(res, user);
  res.status(201).json({ user: user.toPublic() });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  user.role = roleFor(email) === "admin" ? "admin" : user.role;
  user.lastLoginAt = new Date();
  await user.save();
  issueToken(res, user);
  res.json({ user: user.toPublic() });
}

export function logout(req, res) {
  clearToken(res);
  res.json({ ok: true });
}

export async function logoutAll(req, res) {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearToken(res);
  res.json({ ok: true });
}
