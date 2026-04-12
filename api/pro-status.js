// api/pro-status.js
// Checks whether a given email has an active Stripe subscription.
// Called on app load if the user has a stored email but no valid token,
// or after a successful checkout to issue a fresh access token.
//
// GET /api/pro-status?email=user@example.com
// Returns: { pro: true, tier: "pro", token: "...", expiresAt: "..." }
//       or { pro: false, reason: "..." }

import { applyCors } from "./_cors.js";
import Stripe from "stripe";
import crypto from "crypto";

const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "ur-dev-secret-changeme";

function signToken(payload) {
  const data = JSON.stringify(payload);
  const sig  = crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("hex");
  return Buffer.from(data).toString("base64") + "." + sig;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  try {
    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return res.status(200).json({ pro: false, reason: "No customer found" });
    }

    const customer = customers.data[0];

    // Check for active or trialing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status:   "all",
      limit:    5,
    });

    const activeSub = subscriptions.data.find(s =>
      s.status === "active" || s.status === "trialing"
    );

    if (!activeSub) {
      return res.status(200).json({ pro: false, reason: "No active subscription" });
    }

    // Issue a signed token valid until end of current billing period
    const expiresAt = new Date(activeSub.current_period_end * 1000).toISOString();
    const payload = {
      tier:           "pro",
      email,
      stripeCustomer: customer.id,
      subscription:   activeSub.id,
      issuedAt:       new Date().toISOString(),
      expiresAt,
    };

    const token = signToken(payload);

    return res.status(200).json({
      pro:       true,
      tier:      "pro",
      token,
      expiresAt,
      status:    activeSub.status, // "active" or "trialing"
    });

  } catch (err) {
    console.error("Pro status check error:", err.message);
    return res.status(500).json({ error: "Failed to check pro status", details: err.message });
  }
}
