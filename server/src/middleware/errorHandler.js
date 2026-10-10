export function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  // Never leak stack traces or internals to clients.
  res.status(status).json({ error: status >= 500 && status !== 502 ? "Internal server error" : err.message });
}
