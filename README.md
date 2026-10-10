# Crypto Copilot ₿

AI-powered **Bitcoin intelligence** platform (MERN). Learn, simulate and understand Bitcoin with real data — no real money, no custody.

## Status

| Step | Scope | Status |
|---|---|---|
| 1 | Monorepo, Express API (helmet, CORS, rate limit), Vite + React + Tailwind, live BTC price (USD/INR) + mempool fees, dark/light theme, tests | ✅ done |
| 2 | MongoDB Atlas models + JWT auth (register/login, bcrypt, zod validation) + roles (user/admin) | next |
| 3 | Historical charts (Recharts) + Transaction Detective (mempool.space) | |
| 4 | AI Bitcoin Assistant (sources + uncertainty indicator) | |
| 5 | Virtual Portfolio (simulated trades, P&L, history) + Risk Simulator | |
| 6 | Smart Alerts (price / fee) | |
| 7 | Crypto Academy (lessons, quizzes, scam challenges) + Admin dashboard | |
| 8 | Deploy (Vercel + Render + Atlas) | |

## Structure

```
crypto-copilot/
├─ server/                 Express API
│  ├─ src/config/          env + MongoDB connection
│  ├─ src/routes/          URL → controller
│  ├─ src/controllers/     HTTP in/out
│  ├─ src/services/        external APIs, business logic, cache
│  ├─ src/models/          Mongoose schemas (Step 2)
│  ├─ src/middleware/      errors, auth (Step 2)
│  └─ tests/               Vitest + Supertest
└─ client/                 React + Vite + Tailwind
   └─ src/{pages,components,context,lib}
```

## Run locally (Windows PowerShell)

Requires Node.js 20+ (`node -v`) and Git.

```powershell
git clone https://github.com/AmishaKum/Crypto-copilot.git "F:\Crypto pilot"
cd "F:\Crypto pilot"
npm install
Copy-Item server\.env.example server\.env
notepad server\.env        # paste your MongoDB Atlas URI (optional for Step 1)
npm run dev                # API http://localhost:5000  ·  UI http://localhost:5173
```

Run tests: `npm test` · Production build: `npm run build`

Quick API checks:
```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/market/price
Invoke-RestMethod http://localhost:5000/api/market/fees
```

### MongoDB Atlas (free)
1. cloud.mongodb.com → create free **M0** cluster.
2. Database Access → add user (strong password). Network Access → add your IP (`0.0.0.0/0` only for Render later).
3. Connect → Drivers → copy URI into `MONGODB_URI` in `server/.env`, add `/crypto-copilot` before `?`.
4. Restart `npm run dev` — the dashboard dot shows `DB connected`.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | API + DB status |
| GET | `/api/market/price` | BTC in USD & INR, 24h change (CoinGecko, cached 60s) |
| GET | `/api/market/fees` | Recommended fees sat/vB (mempool.space, cached 30s) |

## Deployment (₹0)
- **Database:** MongoDB Atlas M0.
- **API:** Render free Web Service → root `server`, build `npm install`, start `npm start`, env vars from `.env.example`, `CLIENT_ORIGIN=https://<your-app>.vercel.app`. (Free tier sleeps after inactivity — first request is slow.)
- **Client:** Vercel → root `client`, framework Vite, env `VITE_API_URL=https://<your-api>.onrender.com`. Add a `vercel.json` rewrite to `/index.html` for client routes.

See [SECURITY.md](SECURITY.md) and [docs/STRATEGY.md](docs/STRATEGY.md).

> Educational software. Not financial advice. Never enter a seed phrase or private key anywhere in this app.
