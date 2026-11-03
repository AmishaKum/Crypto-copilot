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
  if ([500, 502, 503, 504].includes(res.status)) {
    throw new HttpError(503, `${name} is busy or temporarily unavailable right now. Please try again in a minute.`, "AI_OVERLOADED");
  }
  if (res.status === 404) throw new HttpError(502, `The AI model was not found on ${name}. Set AI_MODEL in server/.env to a current model name.`, "AI_MODEL_NOT_FOUND");
  if (!res.ok) throw new HttpError(502, `The AI provider returned an error (${res.status}).`, "AI_ERROR");
  return res.json();
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

const isTextFlash = (n) => /flash/.test(n) && !/(image|tts|live|audio|embed|thinking|exp)/.test(n);
const version = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);

/** Flash text models the key can use, best first: newest version, stable before preview, full before lite. */
export function rankGeminiModels(models) {
  const rank = (n) => version(n) * 100 + (/preview/.test(n) ? 0 : 2) + (/lite/.test(n) ? 0 : 1);
  return models
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter(isTextFlash)
    .sort((a, b) => rank(b) - rank(a));
}

/** Picks the newest non-lite Flash model (used when the configured model name no longer exists). */
export function pickGeminiModel(models) {
  return rankGeminiModels(models).find((n) => !/lite/.test(n)) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let resolvedGeminiModel = null; // cached replacement when the configured model no longer exists
let modelList = null; // cached result of the models listing

/** Clears cached model choices (used by tests). */
export function resetGeminiState() {
  resolvedGeminiModel = null;
  modelList = null;
}

async function listModels(apiKey) {
  if (!modelList) {
    const list = await call(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey } }, "Gemini");
    modelList = list.models || [];
  }
  return modelList;
}

const gemini = {
  defaultModel: "gemini-flash-latest",
  activeModel: (configured) => resolvedGeminiModel || configured,
  retryDelaysMs: [1000, 2500], // waits before retrying the same model when Google is overloaded
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
  async generateWithRetry(opts) {
    for (let i = 0; ; i++) {
      try {
        return await this.generate(opts);
      } catch (err) {
        if (err.code !== "AI_OVERLOADED" || i >= this.retryDelaysMs.length) throw err;
        await sleep(this.retryDelaysMs[i]);
      }
    }
  },
  async complete(opts) {
    const model = resolvedGeminiModel || opts.model;
    try {
      return await this.generateWithRetry({ ...opts, model });
    } catch (err) {
      if (err.code === "AI_MODEL_NOT_FOUND") {
        // The model name was retired: switch to the newest Flash model this key can use.
        const replacement = pickGeminiModel(await listModels(opts.apiKey));
        if (!replacement || replacement === model) throw err;
        console.warn(`[ai] Gemini model "${model}" not found; switching to "${replacement}". Set AI_MODEL to make this permanent.`);
        resolvedGeminiModel = replacement;
        return this.generateWithRetry({ ...opts, model: replacement });
      }
      if (err.code === "AI_OVERLOADED") {
        // Still busy after retries: try up to two other Flash models for this one request.
        const others = rankGeminiModels(await listModels(opts.apiKey).catch(() => [])).filter((n) => n !== model).slice(0, 2);
        for (const alt of others) {
          try {
            console.warn(`[ai] Gemini model "${model}" is overloaded; trying "${alt}" for this request.`);
            return await this.generate({ ...opts, model: alt });
          } catch (e) {
            if (e.code !== "AI_OVERLOADED" && e.code !== "AI_MODEL_NOT_FOUND") throw e;
          }
        }
      }
      throw err;
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
