import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: String, required: true },
    bestScore: { type: Number, default: 0 }, // percent
    attempts: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  { timestamps: true }
);
progressSchema.index({ user: 1, lessonId: 1 }, { unique: true });

export default mongoose.model("LearningProgress", progressSchema);
