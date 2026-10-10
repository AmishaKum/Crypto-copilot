# Crypto Copilot ₿

An AI-powered **Bitcoin intelligence** platform built with the MERN stack: live market and on-chain data, a transaction
explorer, an evidence-backed AI assistant, paper trading, risk scenarios, alerts and a learning academy.
Educational only: **no real money, no custody, no keys.**

## Features

| Area | What it does |
|---|---|
| Landing page | Value proposition, live BTC snapshot, recent blocks, security messaging, FAQ, legal pages |
| Accounts | Register / login / logout / log out everywhere, bcrypt hashing, HttpOnly JWT cookie, CSRF header check, rate-limited auth, profile, preferences, data export, account deletion |
| Dashboard | BTC price in USD/INR, 24h change/high/low, market cap, volume, 24H–1Y chart, mempool fee estimates, watchlist, source + freshness on every number |
| Tx Detective | Look up a transaction (status, confirmations, fee, fee rate, inputs/outputs) or a block by height/hash, with plain-English interpretation and a link to verify on mempool.space |
| AI assistant | Gemini or Anthropic (swappable). Sends live data with sources/timestamps, returns an answer + evidence list + data-quality badge, blocks seed phrases/private keys, per-user and daily limits |
| Virtual portfolio | Simulated buy/sell at the server's live price, 0.10% simulated fee, average-cost P&L (realized/unrealized), history chart, confirmed reset |
| Risk simulator | Price shocks (−99% … +500%) on one or two portfolios, concentration warning, calculations and assumptions shown |
| Alerts | Price above/below (USD/INR) and fee above/below; fire once per crossing; in-app history |
| Academy | 8 lessons incl. a Scam Dojo; server-scored quizzes with explanations and progress |
| Admin | Aggregate platform stats for emails listed in `ADMIN_EMAILS` (no personal data) |
| UX | Dark navy / Bitcoin-orange theme with light mode, responsive with a mobile menu, loading/empty/error/stale states, keyboard-accessible |

## Tech

React 18 + Vite + Tailwind CSS + React Router + Recharts + Lucide · Node.js + Express 5 · MongoDB Atlas + Mongoose · Zod ·
Helmet · express-rate-limit · Vitest + Supertest + mongodb-memory-server + Testing Library.

```
server/src/
  config/       env + MongoDB connection
  routes/       all API routes (index.js) + health
  controllers/  HTTP layer per feature
  services/     market, explorer, portfolio, risk, alerts, ai/ (provider adapters)
  models/       User, Portfolio, SimulatedTrade, Alert/AlertEvent, LearningProgress
  middleware/   auth, CSRF, validation, rate limits, errors
  validation/   Zod schemas
  data/         academy lessons (answers stay server-side)
client/src/
  pages/  components/ (ui kit, layouts, market widgets)  context/ (auth, theme)  lib/ (api client, formatting)
```

## Run locally on Windows (PowerShell)

Requirements: Node.js 20+ and Git.

```powershell
cd "F:\Crypto pilot"            # your clone of github.com/AmishaKum/Crypto-copilot
git pull
npm install
if (!(Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
notepad server\.env              # fill in MONGODB_URI and JWT_SECRET at minimum
npm run dev                      # API http://localhost:5000 · app http://localhost:5173
```

Generate a JWT secret in PowerShell:
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

What works without which setting:

| Missing | Effect |
|---|---|
| `MONGODB_URI` | Landing, dashboard data and explorer APIs work; login/portfolio/alerts/academy progress return a clear "database not connected" error |
| `AI_API_KEY` | Assistant page shows a configuration message; everything else works |
| `COINGECKO_API_KEY` | Uses CoinGecko's keyless access if available; a free Demo key is recommended for higher, more reliable limits |
| Internet access to CoinGecko/mempool.space | UI shows "temporarily unavailable"; trading pauses rather than using a fake price |

### Free AI key
- **Gemini** (default): create a key in Google AI Studio, then set `AI_PROVIDER=gemini` and `AI_API_KEY=...`. Free-tier quotas change often and are per project; check your quota in AI Studio. `AI_DAILY_LIMIT` keeps usage under it.
- **Anthropic**: `AI_PROVIDER=anthropic`, `AI_API_KEY=...` (paid usage).

### Tests
```powershell
npm test          # server (53 tests, in-memory MongoDB) + client (9 tests)
npm run build     # production build of the client
```
The first server test run downloads a MongoDB binary (~100 MB) for `mongodb-memory-server`.

## API overview

Public: `GET /api/health`, `/api/market/{snapshot,fees,chart?days=&currency=,watch?ids=,coins}`, `/api/explorer/{tx/:txid,block/:heightOrHash,blocks}`, `POST /api/risk/simulate`, `GET /api/assistant/status`, `GET /api/academy/lessons[/:id]`.
Authenticated: `/api/auth/*`, `/api/me` (+ `/password`, `/watchlist/:id`, `/export`), `/api/portfolio` (+ `/trades`, `/reset`), `/api/alerts` (+ `/:id`, `/check`, `/events/read`), `POST /api/assistant/chat`, `POST /api/academy/lessons/:id/submit`, `GET /api/admin/stats` (admin).
All state-changing requests must send `X-Requested-With: CryptoCopilot` (the client does this automatically).

### Accounting (virtual portfolio)
Money is stored as integers (USD cents, satoshis). Buys debit `notional + fee` and add that to cost basis; sells credit
`notional − fee` and remove cost basis proportionally (average cost); realized P&L = proceeds − removed basis.
Trades use the server's live CoinGecko price and are refused if the price is missing or stale. Updates use optimistic
concurrency so simultaneous trades can't overspend.

## Deployment (free tiers; limits change, so check each provider's current terms)

1. **MongoDB Atlas (M0 free):** create a database user with a strong password; under Network Access allow your host's
   outbound IPs (Render's free tier has no static IP, so `0.0.0.0/0` is the usual compromise; a strong password is then essential).
2. **API on Render (free Web Service):** New → Web Service → this repo, Root Directory `server`, Build `npm install`,
   Start `npm start`, Health check path `/api/health`. Environment: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`
   (32+ chars, the server refuses to start without it), `CLIENT_ORIGIN=https://<your-app>.vercel.app`,
   `COOKIE_SAMESITE=none`, optional `AI_*`, `COINGECKO_API_KEY`, `ADMIN_EMAILS`. Free instances sleep when idle: the first request is
   slow and alerts are only evaluated while awake.
3. **Client on Vercel (Hobby):** import the repo, Root Directory `client`, Framework Vite, env `VITE_API_URL=https://<your-api>.onrender.com`.
   `client/vercel.json` rewrites routes to `index.html`.
4. Both platforms serve HTTPS. Verify: `https://<api>/api/health` shows `"db":"connected"`, register works, and cookies are set
   (`SameSite=None; Secure`). Some browsers block third-party cookies; if login doesn't stick, serve the API from a subdomain
   of the same site (custom domain) or proxy `/api` through Vercel rewrites.

## Known limitations
- Market and chain data depend on free public APIs (CoinGecko, mempool.space) which have undisclosed or changing rate limits; responses are cached (30 s–10 min) and stale data is labelled.
- Alerts are in-app only and run only while the API process is up (no email/push yet).
- The virtual portfolio is BTC/USD only; INR is display-only for market data.
- The AI assistant has no news feed, so it cannot confirm causes of price moves (it says so).
- Tailwind CSS v3 has dev-only `npm audit` advisories in its file-watching dependencies (not shipped to users); fix by migrating to Tailwind v4.

See [SECURITY.md](SECURITY.md) and [docs/STRATEGY.md](docs/STRATEGY.md).

> Educational software. Not financial advice. Never enter a seed phrase or private key anywhere.
