// POST { email } — Pro magic link via Resend (no password auth).

import { applyCors } from "../_cors.js";
import { getEnv } from "../_env.js";
import Stripe from "stripe";
import { getClientIp } from "../_rateLimitUrTake.js";
import { MAGIC_LINK_GENERIC_MESSAGE, trySendProMagicLink } from "./magicLinkCore.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = body.email;
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  const ip = getClientIp(req);

  await trySendProMagicLink({ email, clientIp: ip, stripe });

  return res.status(200).json({ ok: true, message: MAGIC_LINK_GENERIC_MESSAGE });
}
