// POST { email } — send Pro magic link (same behavior as /api/auth/request-link).

import { applyCors } from "./_cors.js";
import Stripe from "stripe";
import { getEnv } from "./_env.js";
import { getClientIp } from "./_rateLimitUrTake.js";
import { MAGIC_LINK_GENERIC_MESSAGE, trySendProMagicLink } from "./auth/magicLinkCore.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = body.email;
  if (!isValidEmail(String(email || "").trim().toLowerCase())) {
    return res.status(200).json({ ok: true, message: MAGIC_LINK_GENERIC_MESSAGE });
  }

  const ip = getClientIp(req);
  await trySendProMagicLink({ email, clientIp: ip, stripe });

  return res.status(200).json({ ok: true, message: MAGIC_LINK_GENERIC_MESSAGE });
}
