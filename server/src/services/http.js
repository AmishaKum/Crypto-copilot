import { HttpError } from "../utils/httpError.js";

/** fetch wrapper with timeout and consistent upstream error mapping. */
export async function upstream(url, { headers = {}, text = false, timeoutMs = 10_000, name } = {}) {
  const host = name || new URL(url).host;
  let res;
  try {
    res = await fetch(url, { headers: { accept: "application/json", ...headers }, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new HttpError(503, `Could not reach ${host}. Data is temporarily unavailable.`, "UPSTREAM_UNAVAILABLE");
  }
  if (res.status === 404) throw new HttpError(404, `Not found on ${host}.`, "NOT_FOUND");
  if (res.status === 400) throw new HttpError(400, `${host} rejected the request.`, "BAD_REQUEST");
  if (res.status === 429) throw new HttpError(503, `${host} rate limit reached. Please try again in a minute.`, "RATE_LIMITED");
  if (!res.ok) throw new HttpError(502, `${host} returned an error (${res.status}).`, "UPSTREAM_ERROR");
  return text ? res.text() : res.json();
}
