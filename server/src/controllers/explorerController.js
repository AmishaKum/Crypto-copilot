import * as explorer from "../services/explorerService.js";

export const tx = async (req, res) => res.json(await explorer.getTransaction(req.params.txid));
export const block = async (req, res) => res.json(await explorer.getBlock(req.params.query));
export const recentBlocks = async (req, res) => res.json(await explorer.getRecentBlocks());
