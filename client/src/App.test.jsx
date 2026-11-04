import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import { money, pct, cents, signedCents, btc } from "./lib/format";

const USER = { id: "1", name: "Asha Rao", email: "a@b.co", role: "user", preferences: { currency: "USD", aiIncludePortfolio: false }, watchlist: ["bitcoin"] };
const snapshot = {
  usd: { price: 60000, high24h: 61000, low24h: 59000, marketCap: 1.2e12, volume24h: 3e10, change24hPct: 2 },
  inr: { price: 5000000, high24h: 5100000, low24h: 4900000, marketCap: 1e14, volume24h: 2e12, change24hPct: 2 },
  source: "CoinGecko", fetchedAt: new Date().toISOString(), stale: false,
};

function mockApi({ loggedIn = false, overrides = {} } = {}) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init = {}) => {
    calls.push({ url, init });
    const path = url.replace(/^.*\/api/, "");
    const routes = {
      "/me": loggedIn ? { user: USER } : [401, { error: "Please log in to continue." }],
      "/market/snapshot": snapshot,
      "/market/fees": { fastest: 20, halfHour: 15, hour: 10, economy: 5, source: "mempool.space", fetchedAt: new Date().toISOString() },
      "/explorer/blocks": { blocks: [], source: "mempool.space" },
      "/market/chart": { points: [{ t: 1, p: 1 }, { t: 2, p: 2 }], source: "CoinGecko", fetchedAt: new Date().toISOString() },
      "/market/watch": { items: [{ id: "bitcoin", name: "Bitcoin", usd: 60000, inr: 5000000, change24hPct: 2 }], source: "CoinGecko" },
      "/market/coins": { coins: [{ id: "bitcoin", name: "Bitcoin" }, { id: "ethereum", name: "Ethereum" }] },
      ...overrides,
    };
    const key = Object.keys(routes).sort((a, b) => b.length - a.length).find((k) => path.startsWith(k));
    let v = key ? routes[key] : [404, { error: "Not found" }];
    if (key === "/me" && init.method === "PATCH") {
      const patch = JSON.parse(init.body);
      v = { user: { ...USER, preferences: { ...USER.preferences, ...patch.preferences } } };
    }
    const [status, body] = Array.isArray(v) ? v : [200, v];
    return { ok: status < 400, status, json: async () => body };
  });
  return calls;
}

const renderAt = (path) => render(<ThemeProvider><AuthProvider><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></AuthProvider></ThemeProvider>);

test("format helpers", () => {
  expect(money(60000, "USD")).toBe("$60,000");
  expect(money(5000000, "INR")).toBe("₹50,00,000");
  expect(pct(1.234)).toBe("+1.23%");
  expect(cents(123456)).toBe("$1,234.56");
  expect(signedCents(-500)).toBe("−$5.00");
  expect(btc(150_000_000)).toBe("1.50 BTC");
});

test("landing shows live snapshot with source", async () => {
  mockApi();
  renderAt("/");
  expect(await screen.findByText("$60,000")).toBeInTheDocument();
  expect(screen.getByText(/Understand Bitcoin/)).toBeInTheDocument();
  expect(screen.getAllByText(/CoinGecko/).length).toBeGreaterThan(0);
});

test("landing shows an honest message when market data is down", async () => {
  mockApi({ overrides: { "/market/snapshot": [503, { error: "CoinGecko rate limit reached." }] } });
  renderAt("/");
  expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
});

test("protected routes redirect to login", async () => {
  mockApi();
  renderAt("/app/portfolio");
  expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
});

test("login sends CSRF header and shows server errors", async () => {
  const calls = mockApi({ overrides: { "/auth/login": [401, { error: "Invalid email or password." }] } });
  renderAt("/login");
  fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "a@b.co" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  const login = calls.find((c) => c.url.includes("/auth/login"));
  expect(login.init.headers["X-Requested-With"]).toBe("CryptoCopilot");
});

test("dashboard for a logged-in user shows price and switches to INR", async () => {
  mockApi({ loggedIn: true, overrides: { "/me": { user: USER } } });
  renderAt("/app");
  expect(await screen.findByText("Market pulse")).toBeInTheDocument();
  expect((await screen.findAllByText("$60,000")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "INR" }));
  await waitFor(() => expect(screen.getAllByText("₹50,00,000").length).toBeGreaterThan(0));
});

test("explorer validates transaction IDs client-side", async () => {
  mockApi({ loggedIn: true });
  renderAt("/app/explorer");
  fireEvent.change(await screen.findByLabelText(/Transaction ID or block height/), { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: /Search/ }));
  expect(await screen.findByText(/64-character transaction ID/)).toBeInTheDocument();
});

test("assistant explains when AI isn't configured", async () => {
  mockApi({ loggedIn: true, overrides: { "/assistant/status": { configured: false } } });
  renderAt("/app/assistant");
  expect(await screen.findByText(/isn't configured on this server/)).toBeInTheDocument();
});

test("theme toggle switches dark/light", async () => {
  mockApi();
  renderAt("/");
  fireEvent.click(await screen.findByRole("button", { name: /switch to light/i }));
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

test("login page links to forgot password, which shows a generic confirmation", async () => {
  const calls = mockApi({ overrides: { "/auth/forgot-password": { ok: true, message: "If an account exists for that email, we've sent a password reset link." } } });
  renderAt("/login");
  fireEvent.click(await screen.findByRole("link", { name: "Forgot password?" }));
  fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "a@b.co" } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  expect(await screen.findByText(/If an account exists/)).toBeInTheDocument();
  expect(calls.some((c) => c.url.includes("/auth/forgot-password"))).toBe(true);
});

test("reset page rejects a missing token and validates matching passwords", async () => {
  mockApi();
  renderAt("/reset-password");
  expect(await screen.findByText(/incomplete or invalid/)).toBeInTheDocument();
});

test("reset page checks that passwords match", async () => {
  mockApi();
  renderAt(`/reset-password?token=${"a".repeat(64)}`);
  fireEvent.change(await screen.findByLabelText("New password"), { target: { value: "newpass123" } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different123" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
  expect(await screen.findByText(/don't match/)).toBeInTheDocument();
});

test("portfolio shows multi-coin holdings and the Buy-for-real warning", async () => {
  const holding = (coin, symbol, name, amount, value) => ({ coin, symbol, name, units: amount * 1e8, amount, costBasisCents: value, avgCostMicros: 1e6, priceMicros: 1e6, valueCents: value, change24hPct: 1, unrealizedPnlCents: 0, allocationPct: 10 });
  mockApi({
    loggedIn: true,
    overrides: {
      "/portfolio/trades": { trades: [], curve: [] },
      "/portfolio": { startingCashCents: 1_000_000, cashCents: 800_000, holdings: [holding("ethereum", "ETH", "Ethereum", 0.5, 125_000), holding("dogecoin", "DOGE", "Dogecoin", 600, 75_000)], holdingsValueCents: 200_000, equityCents: 1_000_000, totalPnlCents: 0, cashPct: 80, realizedPnlCents: 0, unrealizedPnlCents: 0, feesPaidCents: 0, tradeCount: 2, feeBps: 10, priceSource: "CoinGecko", priceAsOf: new Date().toISOString() },
      "/market/coins": { coins: [{ id: "bitcoin", name: "Bitcoin", symbol: "BTC" }, { id: "ethereum", name: "Ethereum", symbol: "ETH" }, { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" }] },
      "/market/watch": { items: [{ id: "bitcoin", usd: 60000 }, { id: "ethereum", usd: 2500 }, { id: "dogecoin", usd: 0.125 }], source: "CoinGecko" },
    },
  });
  renderAt("/app/portfolio");
  expect(await screen.findByText("Holdings")).toBeInTheDocument();
  expect((await screen.findAllByText("ETH")).length).toBeGreaterThan(0); // table row + allocation legend
  expect(screen.getAllByText("DOGE").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Buy ETH for real" }));
  expect(await screen.findByText(/You're leaving Crypto Copilot/)).toBeInTheDocument();
  const link = screen.getByRole("link", { name: /Binance/ });
  expect(link).toHaveAttribute("href", "https://www.binance.com/en-IN/trade/ETH_USDT");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});
