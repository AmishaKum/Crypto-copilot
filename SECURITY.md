# Security checklist

## Done (Step 1)
- [x] `helmet` security headers, `x-powered-by` disabled
- [x] CORS restricted to `CLIENT_ORIGIN`
- [x] Rate limit on `/api` (300 req / 15 min / IP)
- [x] JSON body size limit (100 kb)
- [x] Errors never leak stack traces; upstream failures → 502
- [x] Secrets only in `server/.env` (git-ignored); `.env.example` has placeholders
- [x] External API calls server-side with timeouts + caching

## Planned
- [ ] Passwords hashed with bcrypt (cost ≥ 12); never returned in responses
- [ ] JWT in `httpOnly`, `secure`, `sameSite` cookie; short expiry
- [ ] Stricter rate limit on `/api/auth/*` (brute-force protection)
- [ ] `zod` validation on every request body/query/params
- [ ] Ownership checks: users can only read/modify their own portfolios, trades, alerts
- [ ] Admin routes behind `requireRole("admin")`; admin cannot see passwords
- [ ] Mongo injection protection (strict schemas, `sanitizeFilter`)
- [ ] AI prompt-injection guardrails; AI key server-side only; per-user AI quota
- [ ] Reject any input that looks like a seed phrase / private key (BIP-39 word check)
- [ ] `npm audit` in CI; Dependabot enabled

## Hard rules
- Never store private keys, seed phrases or exchange API keys.
- No real-money trading, deposits, withdrawals or custody in the MVP.
