# Startup strategy (₹0 budget, 2–3 h/day)

## Positioning
"The **honest** Bitcoin copilot for Indian beginners": real data, explained with sources and confidence levels, plus risk-free practice. Most apps either sell trading or dump raw data — few teach while showing evidence.

## Competitors (landscape)
| Product | Strength | Gap we exploit |
|---|---|---|
| CoinGecko / CoinMarketCap | Prices, breadth | No personal guidance, no "why did it move" |
| mempool.space | Best on-chain explorer | Expert-oriented; jargon-heavy |
| Glassnode / CryptoQuant | Pro on-chain analytics | Paid, complex |
| CoinDCX / CoinSwitch learn sections | Indian audience, INR | Incentive to make you trade |
| Binance Academy / River Learn | Good lessons | Not tied to your own simulated portfolio |
| General AI chatbots | Easy Q&A | No live data, no sources, hallucination risk |

## Distinctive features (pick 1–2 for MVP)
1. **Evidence cards**: every AI answer shows the data used, sources, timestamp and a confidence meter (High/Medium/Low).
2. **"Explain this transaction"**: paste a txid → plain-language story (fee paid in ₹, confirmations, was it overpaid?).
3. **Fee-saver alerts**: "fees dropped below X sat/vB — good time to move coins".
4. **Crash rehearsal**: replay 2018/2022 drawdowns on your virtual portfolio.
5. **Scam dojo**: interactive fake DMs/websites — spot the scam, earn badges. Highly shareable, India-relevant.
6. **INR-first**: ₹ everywhere, lakh/crore formatting, Indian tax-awareness notes (education only).

## MVP order (≈6–8 weeks at 2–3 h/day)
Dashboard ✅ → Auth → Charts + Tx Detective → AI Assistant → Virtual Portfolio → Alerts → Academy/Admin.

## Free stack
Vercel (client) · Render (API) · MongoDB Atlas M0 · CoinGecko public API · mempool.space · AI via a free tier or credits · email alerts via Resend/Brevo free tier · analytics via Umami/PostHog free tier.

## Low-cost validation experiments
1. **Landing page + waitlist**: share in 5 Reddit/Discord/Telegram communities. Target 100 signups in 2 weeks.
2. **Scam-dojo quiz** as a standalone page — measure share rate before building the full Academy.
3. **Concierge "explain my txid"**: answer 20 requests by hand to test demand.
4. **5 user interviews** with students / new investors: what confuses them, what they'd pay for.
5. **Fake-door test**: "Pro alerts — ₹49/mo" button; count clicks, no payment.

Success metric: users returning ≥2×/week; academy completion rate.
