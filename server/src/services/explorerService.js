import { cached } from "./cache.js";
import { upstream } from "./http.js";

const MEMPOOL = process.env.MEMPOOL_API_URL || "https://mempool.space/api";
const WEB = "https://mempool.space";
const MAX_IO = 50;
const mp = (path, opts) => upstream(`${MEMPOOL}${path}`, { name: "mempool.space", ...opts });

export const TXID_RE = /^[0-9a-fA-F]{64}$/;

async function tipHeight() {
  const r = await cached("tip-height", 30_000, async () => Number(await mp("/blocks/tip/height", { text: true })));
  return r.value;
}

export async function getTransaction(txid) {
  const id = txid.toLowerCase();
  // Confirmed transactions never change, so cache them longer.
  const r = await cached(`tx-${id}`, 60_000, () => mp(`/tx/${id}`));
  const tx = r.value;
  const tip = tx.status?.confirmed ? await tipHeight().catch(() => null) : null;
  const vsize = Math.ceil(tx.weight / 4);
  const inputs = tx.vin.slice(0, MAX_IO).map((i) => ({
    coinbase: !!i.is_coinbase,
    address: i.prevout?.scriptpubkey_address ?? null,
    valueSats: i.prevout?.value ?? null,
    txid: i.txid,
    vout: i.vout,
  }));
  const outputs = tx.vout.slice(0, MAX_IO).map((o) => ({
    address: o.scriptpubkey_address ?? null,
    type: o.scriptpubkey_type,
    valueSats: o.value,
  }));
  return {
    txid: tx.txid,
    confirmed: !!tx.status?.confirmed,
    blockHeight: tx.status?.block_height ?? null,
    blockHash: tx.status?.block_hash ?? null,
    blockTime: tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
    confirmations: tx.status?.confirmed && tip ? tip - tx.status.block_height + 1 : 0,
    feeSats: tx.fee,
    vsize,
    weight: tx.weight,
    sizeBytes: tx.size,
    feeRate: tx.fee != null ? +(tx.fee / vsize).toFixed(2) : null,
    inputCount: tx.vin.length,
    outputCount: tx.vout.length,
    totalOutputSats: tx.vout.reduce((s, o) => s + o.value, 0),
    inputs,
    outputs,
    truncated: tx.vin.length > MAX_IO || tx.vout.length > MAX_IO,
    source: "mempool.space",
    sourceUrl: `${WEB}/tx/${tx.txid}`,
    fetchedAt: new Date(r.fetchedAt).toISOString(),
  };
}

export async function getBlock(query) {
  const hash = /^\d+$/.test(query) ? await mp(`/block-height/${Number(query)}`, { text: true }) : query.toLowerCase();
  const r = await cached(`block-${hash}`, 60_000, () => mp(`/block/${hash}`));
  const b = r.value;
  const tip = await tipHeight().catch(() => null);
  return {
    hash: b.id,
    height: b.height,
    time: new Date(b.timestamp * 1000).toISOString(),
    txCount: b.tx_count,
    sizeBytes: b.size,
    weight: b.weight,
    difficulty: b.difficulty,
    previousHash: b.previousblockhash,
    confirmations: tip ? tip - b.height + 1 : null,
    source: "mempool.space",
    sourceUrl: `${WEB}/block/${b.id}`,
    fetchedAt: new Date(r.fetchedAt).toISOString(),
  };
}

export async function getRecentBlocks() {
  const r = await cached("recent-blocks", 60_000, () => mp("/v1/blocks"));
  return {
    blocks: r.value.slice(0, 8).map((b) => ({
      height: b.height, hash: b.id, time: new Date(b.timestamp * 1000).toISOString(), txCount: b.tx_count,
      medianFeeRate: b.extras?.medianFee ?? null,
    })),
    source: "mempool.space",
    fetchedAt: new Date(r.fetchedAt).toISOString(),
    stale: r.stale,
  };
}
