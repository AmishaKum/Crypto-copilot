import { getBtcPrice, getFees } from "../services/marketService.js";

export async function price(req, res, next) {
  try { res.json(await getBtcPrice()); } catch (e) { next(e); }
}

export async function fees(req, res, next) {
  try { res.json(await getFees()); } catch (e) { next(e); }
}
