const CORE_ORIGINS = [
  "https://under-review.app",
  "https://www.under-review.app",
];

const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALL_ORIGINS = [...new Set([...CORE_ORIGINS, ...EXTRA_ORIGINS])];

export function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";

  // No Origin usually means same-origin/server-to-server request.
  // Allow it and simply don't set ACAO.
  if (!origin) return null;

  if (origin.endsWith(".vercel.app")) return origin;

  if (
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  ) {
    return origin;
  }

  if (ALL_ORIGINS.includes(origin)) return origin;

  return false;
}

export function applyCors(req, res, { methods = "GET, OPTIONS" } = {}) {
  const allowedOrigin = getAllowedOrigin(req);

  // Explicit reject only when an Origin exists and is not allowed
  if (allowedOrigin === false) {
    res.setHeader("Content-Type", "application/json");
    res.status(403).json({
      error: "Forbidden",
      origin: req.headers?.origin || "none",
    });
    return false;
  }

  // Only set CORS headers when an Origin is present and allowed
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }

  return true;
}
