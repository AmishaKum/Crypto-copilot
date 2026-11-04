import mongoose from "mongoose";

// Accounting: integer USD cents; coin amounts in "units" of 1e-8 coin (satoshis for BTC); average-cost method per coin.
const holdingSchema = new mongoose.Schema(
  { units: { type: Number, default: 0, min: 0 }, costBasisCents: { type: Number, default: 0, min: 0 } }, // cost incl. fees of units held
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    startingCashCents: { type: Number, required: true, min: 0 },
    cashCents: { type: Number, required: true, min: 0 },
    holdings: { type: Map, of: holdingSchema, default: {} }, // keyed by CoinGecko id
    // Legacy single-BTC fields, migrated into holdings.bitcoin on first read.
    btcSats: { type: Number, default: 0, min: 0 },
    costBasisCents: { type: Number, default: 0, min: 0 },
    rev: { type: Number, default: 0 }, // optimistic-concurrency revision
    realizedPnlCents: { type: Number, default: 0 },
    feesPaidCents: { type: Number, default: 0, min: 0 },
    tradeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", portfolioSchema);
