// api/checkout.js
// Creates a Stripe Checkout session for the $9.99/month Pro subscription.
// Security:
//   - STRIPE_SECRET_KEY never leaves the server
//   - ALLOWED_ORIGINS blocks cross-site abuse
//   - Webhook signature verification (in api/webhook.js) prevents fake events
//   - No card data ever touches your server — Stripe hosts the payment page

import { applyCors } from "./_cors.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  // The origin of the request becomes the base URL for success/cancel redirects
  const origin = req.headers.origin || "https://underreview.gg";

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "line_items[0][price]": process.env.STRIPE_PRICE_ID,
        "line_items[0][quantity]": "1",
        "success_url": `${origin}/?pro=success`,
        "cancel_url": `${origin}/?pro=cancel`,
        // Collect email for future user management
        "customer_creation": "always",
        // Allow promo codes
        "allow_promotion_codes": "true",
        // 7-day free trial — great for conversion
        "subscription_data[trial_period_days]": "7",
      }).toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe error:", session);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
