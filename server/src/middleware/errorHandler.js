export function notFound(req, res) {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  const status = err.status || 500;
  if (!err.expose && status >= 500) console.error(`[error] ${req.method} ${req.path}:`, err.message);
  res.status(status).json({
    error: err.expose || status < 500 ? err.message : "Internal server error",
    ...(err.code && { code: err.code }),
  });
}
