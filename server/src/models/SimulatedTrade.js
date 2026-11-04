import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    coin: { type: String, default: "bitcoin" },
    side: { type: String, enum: ["buy", "sell"], required: true },
    sats: { type: Number, required: true, min: 1 }, // coin units (1e-8 of a coin; satoshis for BTC)
    priceCents: { type: Number, required: true, min: 0 },
    priceMicros: Number,
    notionalCents: { type: Number, required: true },
    feeCents: { type: Number, required: true },
    realizedPnlCents: { type: Number, default: 0 },
    cashAfterCents: Number,
    btcAfterSats: Number,
    unitsAfter: Number,
    equityAfterCents: Number,
    priceSource: String,
    priceAsOf: Date,
  },
  { timestamps: true }
);
tradeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("SimulatedTrade", tradeSchema);
