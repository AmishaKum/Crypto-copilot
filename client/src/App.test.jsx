import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import App from "./App";
import { money, pct } from "./lib/format";

beforeEach(() => {
  globalThis.fetch = vi.fn((url) => {
    const body = url.includes("health") ? { status: "ok", db: "connected" }
      : url.includes("price") ? { usd: 60000, inr: 5000000, change24h: { usd: 2, inr: 2 }, updatedAt: new Date().toISOString(), source: "CoinGecko" }
      : { fastest: 20, halfHour: 15, hour: 10, economy: 5, source: "mempool.space" };
    return Promise.resolve({ ok: true, json: async () => body });
  });
});

const renderApp = () => render(<ThemeProvider><MemoryRouter><App /></MemoryRouter></ThemeProvider>);

test("format helpers", () => {
  expect(money(60000, "USD")).toBe("$60,000");
  expect(money(5000000, "INR")).toBe("₹50,00,000");
  expect(pct(1.234)).toBe("+1.23%");
});

test("dashboard shows price and switches to INR", async () => {
  renderApp();
  expect(await screen.findByText("$60,000")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "INR" }));
  expect(await screen.findByText("₹50,00,000")).toBeInTheDocument();
  expect(await screen.findByText("20 sat/vB")).toBeInTheDocument();
});

test("theme toggle switches dark/light", () => {
  renderApp();
  fireEvent.click(screen.getByRole("button", { name: /switch to light/i }));
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});
