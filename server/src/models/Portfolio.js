import mongoose from "mongoose";

// Accounting: integer USD cents and satoshis; average-cost method.
// costBasisCents = total cost (incl. fees) of the BTC currently held.
const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    startingCashCents: { type: Number, required: true, min: 0 },
    cashCents: { type: Number, required: true, min: 0 },
    btcSats: { type: Number, default: 0, min: 0 },
    costBasisCents: { type: Number, default: 0, min: 0 },
    realizedPnlCents: { type: Number, default: 0 },
    feesPaidCents: { type: Number, default: 0, min: 0 },
    tradeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", portfolioSchema);
