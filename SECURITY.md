# Security checklist

## Implemented
- [x] Passwords hashed with bcrypt (cost 12); hash never returned (`select: false`)
- [x] JWT in an `HttpOnly` cookie (`Secure` + `SameSite=None` in cross-site production), 7-day expiry
- [x] Token invalidation: `tokenVersion` bumps on "log out everywhere" and password change
- [x] CSRF: state-changing requests require `X-Requested-With: CryptoCopilot` (forces CORS preflight against the allowlist)
- [x] CORS restricted to `CLIENT_ORIGIN` list, credentials only for those origins
- [x] Helmet headers; `x-powered-by` off; JSON body limit 20 kb
- [x] Rate limits: 300 req/15 min per IP on `/api`; 10 failed auth attempts/15 min; 20 AI questions/hour per user; global AI daily cap
- [x] Generic login errors with constant-time comparison against a dummy hash (reduces account enumeration); generic duplicate-registration message
- [x] Zod validation on every body/params/query (strict schemas reject unknown fields like `role` or `priceCents`)
- [x] NoSQL injection: Mongoose `sanitizeFilter` + `strictQuery`, plus Zod types (tested)
- [x] Authorization: every user query is scoped by the authenticated user ID from the token, never from the client (cross-user tests)
- [x] Admin access via server-side `ADMIN_EMAILS` only; admin endpoint returns aggregates, no emails
- [x] Trade prices come from the server; client prices are rejected. Integer money maths, optimistic concurrency
- [x] AI: key server-side only; only aggregate simulated numbers sent (opt-in); seed-phrase/WIF/xprv detection blocks the request; prompt instructs against fabrication; provider errors mapped to safe messages
- [x] No secrets in logs (DB URI never printed); production refuses to start without a strong `JWT_SECRET`
- [x] `.env` git-ignored; `.env.example` contains placeholders only
- [x] XSS: React escaping; AI output rendered without `dangerouslySetInnerHTML`
- [x] `npm audit --omit=dev`: 0 vulnerabilities (dev-only Tailwind v3 advisories remain)
- [x] Account deletion removes all user data; data export available

## Before going public
- [ ] Rotate any credential that was ever shared in chat or committed anywhere (e.g. the MongoDB password)
- [ ] Set `JWT_SECRET` (32+ random chars) and `NODE_ENV=production` on the host
- [ ] Restrict Atlas network access as far as your host allows; use a least-privilege DB user
- [ ] Enable GitHub Dependabot alerts and secret scanning
- [ ] Add email verification and password reset (not implemented in the MVP)
- [ ] Consider a CSP tuned for the deployed domains

## Hard rules
- Never store private keys, seed phrases or exchange API keys.
- No real-money trading, deposits, withdrawals or custody.
