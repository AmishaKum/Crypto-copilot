import mongoose from "mongoose";
import User from "../models/User.js";
import SimulatedTrade from "../models/SimulatedTrade.js";
import { Alert } from "../models/Alert.js";
import LearningProgress from "../models/LearningProgress.js";
import { LESSONS } from "../data/lessons.js";

export async function stats(req, res) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  // Server-built operators must be marked trusted because sanitizeFilter is on globally.
  const since = (d) => mongoose.trusted({ $gte: d });
  const [users, newUsers7d, activeUsers7d, trades, trades7d, alerts, activeAlerts, completions, signupsByDay, lessonStats] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: since(weekAgo) }),
    User.countDocuments({ lastLoginAt: since(weekAgo) }),
    SimulatedTrade.countDocuments(),
    SimulatedTrade.countDocuments({ createdAt: since(weekAgo) }),
    Alert.countDocuments(),
    Alert.countDocuments({ enabled: true }),
    LearningProgress.countDocuments({ completed: true }),
    User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    LearningProgress.aggregate([{ $group: { _id: "$lessonId", completed: { $sum: { $cond: ["$completed", 1, 0] } }, avgScore: { $avg: "$bestScore" } } }]),
  ]);
  const titles = Object.fromEntries(LESSONS.map((l) => [l.id, l.title]));
  // Aggregate counts only; no emails or personal data are returned.
  res.json({
    users, newUsers7d, activeUsers7d, trades, trades7d, alerts, activeAlerts, completions,
    signupsByDay: signupsByDay.map((d) => ({ date: d._id, count: d.count })),
    lessons: lessonStats.map((l) => ({ id: l._id, title: titles[l._id] || l._id, completed: l.completed, avgScore: Math.round(l.avgScore) })),
  });
}
