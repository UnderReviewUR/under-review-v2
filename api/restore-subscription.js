// api/restore-subscription.js
// POST { email } — force-sync Pro entitlement from Stripe (same payload as GET /api/pro-status).
// With Authorization: Bearer <Clerk JWT>, ignores body email and uses Clerk-linked Stripe customer.

import { applyCors } from "./_cors.js";
import Stripe from "stripe";
import { getClerkUserIdFromAuthorizationHeader } from "./_clerkAuth.js";
import { getEnv, resolveAccessTokenSecretForHandler } from "./_env.js";
import { buildProStatusForClerkUserId, buildProStatusResponse } from "./_stripeProSync.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tokenSecret = resolveAccessTokenSecretForHandler(res);
  if (tokenSecret === null) return;

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  const clerkUserId = await getClerkUserIdFromAuthorizationHeader(req.headers.authorization);
  const { email } = req.body || {};

  const result = clerkUserId
    ? await buildProStatusForClerkUserId(clerkUserId, stripe, tokenSecret)
    : await buildProStatusResponse(email, stripe, tokenSecret);

  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  return res.status(result.status).json(result.body);
}
