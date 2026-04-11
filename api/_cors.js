// Shared CORS helper for all API endpoints.
// ALLOWED_ORIGINS env var: comma-separated list of allowed origins.
// If empty → all origins allowed (development / public API mode).
// IMPORTANT: under-review.app must be in this list in production.

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  if (ALLOWED_ORIGINS.length === 0) return origin || "*";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

export function applyCors(req, res, { methods = "GET, OPTIONS" } = {}) {
  const allowedOrigin = getAllowedOrigin(req);
  if (!allowedOrigin) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }
  return true;
}
