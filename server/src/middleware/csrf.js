// Auth uses an HttpOnly cookie. Unsafe requests must carry a custom header, which browsers
// only send cross-origin after a CORS preflight that our allowlist controls.
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireCsrfHeader(req, res, next) {
  if (SAFE.has(req.method) || req.get("X-Requested-With") === "CryptoCopilot") return next();
  res.status(403).json({ error: "Missing request header", code: "CSRF" });
}
