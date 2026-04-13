// Shared CORS helper for all API endpoints.
// Explicitly allows under-review.app + vercel preview URLs.
// Add more origins to EXTRA_ORIGINS if needed.

const CORE_ORIGINS = [
“https://under-review.app”,
“https://www.under-review.app”,
];

const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || “”)
.split(”,”)
.map(s => s.trim())
.filter(Boolean);

const ALL_ORIGINS = […new Set([…CORE_ORIGINS, …EXTRA_ORIGINS])];

export function getAllowedOrigin(req) {
const origin = req.headers?.origin || “”;

// Always allow vercel preview deployments for this project
if (origin.endsWith(”.vercel.app”)) return origin;

// Allow localhost in development
if (origin.startsWith(“http://localhost”) || origin.startsWith(“http://127.0.0.1”)) return origin;

// Check explicit allowlist
if (ALL_ORIGINS.includes(origin)) return origin;

// No match
return null;
}

export function applyCors(req, res, { methods = “GET, OPTIONS” } = {}) {
const allowedOrigin = getAllowedOrigin(req);

if (!allowedOrigin) {
res.setHeader(“Content-Type”, “application/json”);
res.status(403).json({ error: “Forbidden”, origin: req.headers?.origin || “none” });
return false;
}

res.setHeader(“Access-Control-Allow-Origin”, allowedOrigin);
res.setHeader(“Access-Control-Allow-Methods”, methods);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type, Authorization”);
res.setHeader(“Vary”, “Origin”);

if (req.method === “OPTIONS”) {
res.status(200).end();
return false;
}

return true;
}