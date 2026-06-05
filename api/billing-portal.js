import Stripe from "stripe";
import { applyCors } from "./_cors.js";
import { getEnv, getAccessTokenSecretSync } from "./_env.js";
import { verifyToken } from "./_hmacToken.js";
import { findCustomerByEmail } from "./_stripeProSync.js";
import { allowRateLimit, getClientIp } from "./_rateLimitUrTake.js";

const PORTAL_RETURN_URL = "https://under-review.app";

function verifyProBearer(authHeader) {
  const secret = getAccessTokenSecretSync();
  if (!secret) return null;
  const m = /^Bearer\s+(\S+)/i.exec(String(authHeader || ""));
  if (!m) return null;
  const payload = verifyToken(m[1].trim(), secret);
  if (!payload) return null;
  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) return null;
  if (payload.tier !== "pro" && payload.tier !== "owner" && payload.tier !== "friend") return null;
  return payload;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!allowRateLimit(`billing:ip:${ip}`, 5)) {
    return res.status(429).json({ error: "rate_limited" });
  }

  const auth = verifyProBearer(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: "Valid Pro/owner/friend bearer token required" });
  }

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  try {
    let email = "";
    if (req.body && typeof req.body === "object") {
      email = String(req.body.email || "").trim().toLowerCase();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Missing or invalid email" });
    }

    if (auth.email && auth.email.toLowerCase() !== email) {
      return res.status(403).json({ error: "Email does not match token" });
    }

    const customer = await findCustomerByEmail(stripe, email);
    if (!customer) return res.status(404).json({ error: "No customer found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: PORTAL_RETURN_URL,
    });

    if (!session?.url) {
      return res.status(500).json({ error: "Could not create billing portal session" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Billing portal error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
