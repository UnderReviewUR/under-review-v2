// api/restore-subscription.js
// POST { email } — force-sync Pro entitlement from Stripe (same payload as GET /api/pro-status).
// Use after checkout redirect or “Restore access” when webhooks lag.

import { applyCors } from "./_cors.js";
import Stripe from "stripe";
import { getEnv, resolveAccessTokenSecretForHandler } from "./_env.js";
import { buildProStatusResponse } from "./_stripeProSync.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tokenSecret = resolveAccessTokenSecretForHandler(res);
  if (tokenSecret === null) return;

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const { email } = req.body || {};
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  const result = await buildProStatusResponse(email, stripe, tokenSecret);
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  return res.status(result.status).json(result.body);
}
