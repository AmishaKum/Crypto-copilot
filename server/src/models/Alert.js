import mongoose from "mongoose";

export const ALERT_KINDS = ["price_above", "price_below", "fee_above", "fee_below"];

const alertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ALERT_KINDS, required: true },
    currency: { type: String, enum: ["USD", "INR"], default: "USD" }, // price alerts only
    threshold: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, default: true },
    // True while the condition holds; an alert fires only on the false -> true edge (no duplicates).
    conditionMet: { type: Boolean, default: false },
    lastTriggeredAt: Date,
    triggerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
alertSchema.index({ user: 1 });
alertSchema.index({ enabled: 1 });

const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    alert: { type: mongoose.Schema.Types.ObjectId, ref: "Alert" },
    kind: String,
    currency: String,
    threshold: Number,
    observedValue: Number,
    source: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
eventSchema.index({ user: 1, createdAt: -1 });

export const Alert = mongoose.model("Alert", alertSchema);
export const AlertEvent = mongoose.model("AlertEvent", eventSchema);
