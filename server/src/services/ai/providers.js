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
  if (res.status === 404) throw new HttpError(502, `The AI model was not found on ${name}. Set AI_MODEL in server/.env to a current model name.`, "AI_MODEL_NOT_FOUND");
  if (!res.ok) throw new HttpError(502, `The AI provider returned an error (${res.status}).`, "AI_ERROR");
  return res.json();
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

/** Picks the newest stable "flash" text model the key can use (model names change as Google releases new ones). */
export function pickGeminiModel(models) {
  const usable = models
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/.test(n) && !/(lite|image|tts|live|audio|embed|thinking|exp)/.test(n));
  const version = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
  const rank = (n) => version(n) * 100 + (/preview/.test(n) ? 0 : 1) + (/latest/.test(n) ? 0.5 : 0);
  return usable.sort((a, b) => rank(b) - rank(a))[0] || null;
}

let resolvedGeminiModel = null; // cached replacement when the configured model no longer exists

const gemini = {
  defaultModel: "gemini-flash-latest",
  activeModel: (configured) => resolvedGeminiModel || configured,
  async generate({ apiKey, model, system, messages, maxTokens }) {
    const data = await call(
      `${GEMINI}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          // Newer Gemini models count internal "thinking" toward this limit, so leave headroom.
          generationConfig: { maxOutputTokens: Math.max(maxTokens, 2048), temperature: 0.3 },
        }),
      },
      "Gemini"
    );
    return (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
  },
  async complete(opts) {
    const model = resolvedGeminiModel || opts.model;
    try {
      return await this.generate({ ...opts, model });
    } catch (err) {
      if (err.code !== "AI_MODEL_NOT_FOUND") throw err;
      // The model name was retired: ask Google which models this key can use and retry once.
      const list = await call(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": opts.apiKey } }, "Gemini");
      const replacement = pickGeminiModel(list.models || []);
      if (!replacement || replacement === model) throw err;
      console.warn(`[ai] Gemini model "${model}" not found; switching to "${replacement}". Set AI_MODEL to make this permanent.`);
      resolvedGeminiModel = replacement;
      return this.generate({ ...opts, model: replacement });
    }
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
