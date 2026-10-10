import { HttpError } from "../../utils/httpError.js";

// Each provider: ({ apiKey, model, system, messages, maxTokens }) -> Promise<string>
// messages: [{ role: "user" | "assistant", content }]. Add new providers here.

async function call(url, init, name) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new HttpError(503, `Could not reach the AI provider (${name}). Please try again.`, "AI_UNAVAILABLE");
  }
  if (res.status === 429) throw new HttpError(503, "The AI provider's free quota or rate limit was reached. Try again later.", "AI_QUOTA");
  if (res.status === 401 || res.status === 403) throw new HttpError(503, "The AI provider rejected the server's API key. Check AI_API_KEY.", "AI_AUTH");
  if (!res.ok) throw new HttpError(502, `The AI provider returned an error (${res.status}).`, "AI_ERROR");
  return res.json();
}

const gemini = {
  defaultModel: "gemini-2.5-flash",
  async complete({ apiKey, model, system, messages, maxTokens }) {
    const data = await call(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        }),
      },
      "Gemini"
    );
    return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  },
};

const anthropic = {
  defaultModel: "claude-haiku-5-5",
  async complete({ apiKey, model, system, messages, maxTokens }) {
    const data = await call(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
      },
      "Anthropic"
    );
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  },
};

export const PROVIDERS = { gemini, anthropic };
