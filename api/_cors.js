// Shared CORS + origin validation for all API endpoints.
// Set the ALLOWED_ORIGINS env var in Vercel (comma-separated) to lock down access.
// When ALLOWED_ORIGINS is empty, all origins are allowed (development mode).
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
