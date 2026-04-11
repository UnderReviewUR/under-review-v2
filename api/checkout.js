// api/checkout.js
// Creates a Stripe Checkout session for Under Review Pro.
// Called from the frontend when the user clicks "Start Free Trial".

import { applyCors } from "./_cors.js";
import Stripe from "stripe";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_PRICE_ID   = process.env.STRIPE_PRICE_ID;

  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  if (!STRIPE_PRICE_ID)   return res.status(500).json({ error: "Missing STRIPE_PRICE_ID" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  // Optional: pass email from frontend if user already entered it
  const { email } = req.body || {};

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      // 7-day free trial
      subscription_data: {
        trial_period_days: 7,
      },
      // Pre-fill email if we have it
      ...(email ? { customer_email: email } : {}),
      // Where to send the user after payment
      success_url: "https://under-review.app?pro=success",
      cancel_url:  "https://under-review.app?pro=cancelled",
      // Store metadata so webhook can identify the tier
      metadata: {
        product: "under_review_pro",
        tier: "pro",
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return res.status(500).json({ error: "Failed to create checkout session", details: err.message });
  }
}
