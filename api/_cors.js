import { getEnv } from "./_env.js";

const CORE_ORIGINS = [
  "https://under-review.app",
  "https://www.under-review.app",
];

const EXTRA_ORIGINS = (getEnv("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALL_ORIGINS = [...new Set([...CORE_ORIGINS, ...EXTRA_ORIGINS])];

export function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";

  // Allow requests that do not send Origin (same-origin/server-side)
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

/** Use on dynamic JSON APIs so browsers/CDNs never serve stale bodies (fixes empty tennis board after deploy). */
export function applyApiNoStoreHeaders(res) {
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0",
  );
  res.setHeader("Pragma", "no-cache");
}

export function applyCors(req, res, { methods = "GET, OPTIONS" } = {}) {
  const allowedOrigin = getAllowedOrigin(req);

  if (allowedOrigin === false) {
    res.setHeader("Content-Type", "application/json");
    res.status(403).json({
      error: "Forbidden",
      origin: req.headers?.origin || "none",
    });
    return false;
  }

  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-UR-Take-Structured",
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }

  return true;
}
