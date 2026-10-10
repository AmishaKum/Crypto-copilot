import LearningProgress from "../models/LearningProgress.js";
import { LESSONS, publicLesson, scoreQuiz, PASS_PCT } from "../data/lessons.js";
import { HttpError } from "../utils/httpError.js";

const findLesson = (id) => {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) throw new HttpError(404, "Lesson not found.", "NOT_FOUND");
  return l;
};

export async function list(req, res) {
  const progress = req.user ? await LearningProgress.find({ user: req.user._id }).lean() : [];
  const byId = Object.fromEntries(progress.map((p) => [p.lessonId, p]));
  res.json({
    passPct: PASS_PCT,
    lessons: LESSONS.map((l) => {
      const { sections, quiz, ...rest } = publicLesson(l);
      const p = byId[l.id];
      return { ...rest, progress: p ? { bestScore: p.bestScore, completed: p.completed, attempts: p.attempts } : null };
    }),
  });
}

export const get = (req, res) => res.json({ lesson: publicLesson(findLesson(req.params.id)), passPct: PASS_PCT });

export async function submit(req, res) {
  const lesson = findLesson(req.params.id);
  if (req.body.answers.length !== lesson.quiz.length) throw new HttpError(400, "Please answer every question.", "VALIDATION");
  const result = scoreQuiz(lesson, req.body.answers);
  const prev = await LearningProgress.findOne({ user: req.user._id, lessonId: lesson.id });
  const progress = await LearningProgress.findOneAndUpdate(
    { user: req.user._id, lessonId: lesson.id },
    {
      $inc: { attempts: 1 },
      $max: { bestScore: result.score },
      ...(result.passed && !prev?.completed && { $set: { completed: true, completedAt: new Date() } }),
    },
    { upsert: true, new: true }
  );
  res.json({ ...result, progress: { bestScore: progress.bestScore, completed: progress.completed, attempts: progress.attempts } });
}
