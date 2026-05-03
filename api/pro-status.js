// api/pro-status.js
// GET — email via ?email= or X-UR-Email header. Returns token only when Bearer matches email (refresh).
// Email-only requests return { pro: false } (no Stripe enumeration). Rate limit by IP unless Bearer matches.

import { applyCors } from "./_cors.js";
import Stripe from "stripe";
import { getAccessTokenSecretSync, getEnv, resolveAccessTokenSecretForHandler } from "./_env.js";
import { verifyToken } from "./_hmacToken.js";
import { allowRateLimit, getClientIp, proStatusIpLimit } from "./_rateLimitUrTake.js";
import { buildProStatusResponse } from "./_stripeProSync.js";

function emailFromRequest(req) {
  const q = String(req.query?.email || "").trim().toLowerCase();
  if (q) return q;
  const h = req.headers["x-ur-email"] || req.headers["X-UR-Email"];
  return String(h || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

/**
 * Valid Pro Bearer for the same email — refresh path; skips IP rate limit.
 */
function bearerMatchesEmail(authHeader, requestedEmail) {
  const secret = getAccessTokenSecretSync();
  if (!secret) return false;
  const m = /^Bearer\s+(\S+)/i.exec(String(authHeader || ""));
  if (!m) return false;
  const payload = verifyToken(m[1].trim(), secret);
  if (!payload || payload.tier !== "pro" || !payload.email) return false;
  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) return false;
  return String(payload.email).toLowerCase() === String(requestedEmail).toLowerCase();
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const email = emailFromRequest(req);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Missing or invalid email" });
  }

  const skipIpLimit = bearerMatchesEmail(req.headers.authorization, email);
  if (!skipIpLimit) {
    const ip = getClientIp(req);
    if (!allowRateLimit(`prostatus:ip:${ip}`, proStatusIpLimit())) {
      return res.status(200).json({ pro: false });
    }
    // Email alone does not unlock Pro — magic link or Bearer required (no enumeration, no token).
    return res.status(200).json({ pro: false });
  }

  const tokenSecret = resolveAccessTokenSecretForHandler(res);
  if (tokenSecret === null) return;

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  const result = await buildProStatusResponse(email, stripe, tokenSecret);

  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  return res.status(result.status).json(result.body);
}
