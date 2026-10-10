import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.js";
import { HttpError } from "../utils/httpError.js";

export const COOKIE = "cc_token";

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    maxAge: env.jwtTtlDays * 86_400_000,
    path: "/",
  };
}

export function issueToken(res, user) {
  const token = jwt.sign({ sub: String(user._id), tv: user.tokenVersion }, env.jwtSecret, {
    expiresIn: `${env.jwtTtlDays}d`,
  });
  res.cookie(COOKIE, token, cookieOptions());
}

export function clearToken(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE, opts);
}

async function resolveUser(req) {
  const token = req.cookies?.[COOKIE];
  if (!token || mongoose.connection.readyState !== 1) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    // tokenVersion lets "log out everywhere" and password changes invalidate old tokens.
    if (!user || user.tokenVersion !== payload.tv) return null;
    return user;
  } catch {
    return null;
  }
}

export const requireDb = (req, res, next) =>
  mongoose.connection.readyState === 1
    ? next()
    : next(new HttpError(503, "Database is not connected. Set MONGODB_URI on the server.", "DB_UNAVAILABLE"));

export async function requireAuth(req, res, next) {
  const user = await resolveUser(req);
  if (!user) return next(new HttpError(401, "Please log in to continue.", "UNAUTHENTICATED"));
  req.user = user;
  next();
}

export async function optionalAuth(req, res, next) {
  req.user = await resolveUser(req);
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return next(new HttpError(403, "Admin access required.", "FORBIDDEN"));
  next();
}
