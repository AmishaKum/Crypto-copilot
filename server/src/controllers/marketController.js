import * as market from "../services/marketService.js";

export const snapshot = async (req, res) => res.json(await market.getBtcSnapshot());
export const fees = async (req, res) => res.json(await market.getFees());
export const chart = async (req, res) => res.json(await market.getBtcChart(req.validatedQuery.days, req.validatedQuery.currency));
export const watch = async (req, res) => res.json(await market.getWatchPrices(req.validatedQuery.ids.split(",").map((s) => s.trim())));
export const coins = (req, res) => res.json({ coins: Object.entries(market.WATCHABLE).map(([id, name]) => ({ id, name })) });
