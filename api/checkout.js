// api/checkout.js
// Creates a Stripe Checkout session for Under Review Pro.
// Called when the user starts checkout from App.jsx (full paywall after one free UR Take).

import { applyCors } from "./_cors.js";
import { getClerkUserIdFromAuthorizationHeader, getClerkBackendClient, isClerkSecretConfigured } from "./_clerkAuth.js";
import { getEnv } from "./_env.js";
import Stripe from "stripe";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { evaluateCheckoutBlockWithClerk } from "./_stripeProSync.js";

const CHECKOUT_COOLDOWN_MS = 8 * 1000;
const CHECKOUT_SESSION_REUSE_MS = 2 * 60 * 1000;
const CHECKOUT_STATE_TTL_SECONDS = 10 * 60;

function getCheckoutKey(req, email) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const realIp = String(req.headers["x-real-ip"] || "").trim();
  const ip = forwardedFor || realIp || "anon";
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail || ip;
}

function getCheckoutStateStorageKey(checkoutKey) {
  return `checkout:${checkoutKey}`;
}

function isValidCheckoutEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  const STRIPE_PRICE_ID   = getEnv("STRIPE_PRICE_ID");

  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  if (!STRIPE_PRICE_ID)   return res.status(500).json({ error: "Missing STRIPE_PRICE_ID" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  try {
    const clerkUserId = await getClerkUserIdFromAuthorizationHeader(req.headers.authorization);
    const { email: rawBodyEmail } = req.body || {};

    let email = "";
    if (isClerkSecretConfigured()) {
      if (!clerkUserId) {
        return res.status(401).json({
          error: "sign_in_required",
          message: "Sign in to your UnderReview account to subscribe. Email-only checkout is disabled when accounts are enabled.",
        });
      }
      const client = getClerkBackendClient();
      if (!client) {
        return res.status(500).json({ error: "Clerk is not configured" });
      }
      const u = await client.users.getUser(clerkUserId);
      email = String(u.primaryEmailAddress?.emailAddress || "").trim().toLowerCase();
      if (!isValidCheckoutEmail(email)) {
        return res.status(400).json({
          error: "email_required",
          message: "Your account must have a primary email to subscribe.",
        });
      }
    } else {
      email = String(rawBodyEmail || "").trim().toLowerCase();
      if (!isValidCheckoutEmail(email)) {
        return res.status(400).json({
          error: "email_required",
          message: "Enter a valid email to continue — we need it for Pro access and receipts.",
        });
      }
    }

    const checkoutKey = getCheckoutKey(req, email);
    const stateKey = getCheckoutStateStorageKey(checkoutKey);
    const now = Date.now();
    let prior;
    try {
      prior = await getDurableJson(stateKey);
    } catch {
      return res.status(500).json({ error: "checkout_unavailable" });
    }

    if (prior && now - prior.lastAttemptAt < CHECKOUT_COOLDOWN_MS) {
      if (prior.url && now - prior.sessionCreatedAt < CHECKOUT_SESSION_REUSE_MS) {
        return res.status(200).json({ url: prior.url, reused: true });
      }
      return res.status(200).json({
        error: "Please wait a few seconds and try again.",
        retryAfterSeconds: Math.ceil((CHECKOUT_COOLDOWN_MS - (now - prior.lastAttemptAt)) / 1000),
      });
    }

    try {
      await setDurableJson(stateKey, {
        ...prior,
        lastAttemptAt: now,
      }, { ttlSeconds: CHECKOUT_STATE_TTL_SECONDS });
    } catch {
      return res.status(500).json({ error: "checkout_unavailable" });
    }

    const duplicateGate = await evaluateCheckoutBlockWithClerk(stripe, { email, clerkUserId });
    if (duplicateGate.block) {
      return res.status(403).json({
        error: "already_pro",
        message: "You already have Pro access",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: email,
      success_url: "https://under-review.app?pro=success",
      cancel_url:  "https://under-review.app?pro=cancelled",
      metadata: {
        product: "under_review_pro",
        tier: "pro",
        ...(clerkUserId ? { clerk_user_id: clerkUserId } : {}),
      },
    }, {
      idempotencyKey: `under-review-checkout:${checkoutKey}:${Math.floor(now / CHECKOUT_COOLDOWN_MS)}`,
    });

    try {
      await setDurableJson(stateKey, {
        lastAttemptAt: now,
        sessionCreatedAt: Date.now(),
        url: session.url,
      }, { ttlSeconds: CHECKOUT_STATE_TTL_SECONDS });
    } catch {
      return res.status(500).json({ error: "checkout_unavailable" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    if (err?.statusCode === 429 || err?.code === "rate_limit") {
      return res.status(200).json({
        error: "Checkout is temporarily busy. Please retry in a few seconds.",
        retryAfterSeconds: 5,
      });
    }
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
