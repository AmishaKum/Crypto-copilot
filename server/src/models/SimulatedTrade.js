import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    sats: { type: Number, required: true, min: 1 },
    priceCents: { type: Number, required: true, min: 1 },
    notionalCents: { type: Number, required: true },
    feeCents: { type: Number, required: true },
    realizedPnlCents: { type: Number, default: 0 },
    cashAfterCents: Number,
    btcAfterSats: Number,
    priceSource: String,
    priceAsOf: Date,
  },
  { timestamps: true }
);
tradeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("SimulatedTrade", tradeSchema);
