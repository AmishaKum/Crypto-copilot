import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { sendEmail, layout } from "../services/emailService.js";
import mongoose from "mongoose";
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

const RESET_TTL_MIN = 30;
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
const FORGOT_MSG = "If an account exists for that email, we've sent a password reset link. It expires in 30 minutes.";

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email });
  // Same response whether or not the email exists, so accounts can't be discovered.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MIN * 60_000);
    await user.save();
    const url = `${env.appUrl}/reset-password?token=${token}`;
    const lines = [
      `Hi ${user.name},`,
      "We received a request to reset your Crypto Copilot password. Click the button below to choose a new one.",
      `This link expires in ${RESET_TTL_MIN} minutes and can be used once. If you didn't ask for this, you can ignore this email.`,
    ];
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Crypto Copilot password",
        text: `${lines.join("\n\n")}\n\nReset link: ${url}`,
        html: layout({ title: "Reset your password", lines, button: { label: "Reset password", url } }),
      });
    } catch (e) {
      console.error("[email] reset email failed:", e.message);
    }
  }
  res.json({ ok: true, message: FORGOT_MSG });
}

export async function resetPassword(req, res) {
  const user = await User.findOne({
    resetTokenHash: hashToken(req.body.token),
    resetTokenExpires: mongoose.trusted({ $gt: new Date() }),
  }).select("+resetTokenHash +resetTokenExpires");
  if (!user) throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.", "RESET_INVALID");
  user.passwordHash = await bcrypt.hash(req.body.password, ROUNDS);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.tokenVersion += 1; // log out every existing session
  await user.save();
  res.json({ ok: true, message: "Your password has been reset. Please log in with your new password." });
}
