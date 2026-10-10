import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    tokenVersion: { type: Number, default: 0 },
    preferences: {
      currency: { type: String, enum: ["USD", "INR"], default: "USD" },
      aiIncludePortfolio: { type: Boolean, default: false },
    },
    watchlist: { type: [String], default: ["bitcoin"] },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    preferences: this.preferences,
    watchlist: this.watchlist,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
