const BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { body, method = body ? "POST" : "GET", headers, ...rest } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Requested-With": "CryptoCopilot", ...headers },
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });
  } catch {
    throw new ApiError("Can't reach the Crypto Copilot server. Is it running?", 0, "NETWORK");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.code);
  return data;
}
