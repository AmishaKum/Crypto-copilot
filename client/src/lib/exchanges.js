// Real exchanges users can open to buy for real. Crypto Copilot is not affiliated with them and never handles money.
// URL patterns use the coin symbol (BTC) or CoinGecko id (bitcoin); availability of each coin varies by exchange.
export const EXCHANGES = [
  { id: "coindcx", name: "CoinDCX", region: "India · INR", url: (c) => `https://coindcx.com/trade/${c.symbol}INR` },
  { id: "wazirx", name: "WazirX", region: "India · INR", url: (c) => `https://wazirx.com/exchange/${c.symbol}-INR` },
  { id: "binance", name: "Binance", region: "Global · USDT", url: (c) => `https://www.binance.com/en-IN/trade/${c.symbol}_USDT` },
  { id: "coinbase", name: "Coinbase", region: "Global", url: (c) => `https://www.coinbase.com/price/${c.id}` },
];
