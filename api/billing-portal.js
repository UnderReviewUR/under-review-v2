import Stripe from "stripe";
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { findCustomerByEmail } from "./_stripeProSync.js";

const PORTAL_RETURN_URL = "https://under-review.app";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  try {
    let email = "";
    if (req.method === "POST" && req.body && typeof req.body === "object") {
      email = String(req.body.email || "").trim().toLowerCase();
    }
    if (!email && req.method === "GET") {
      email = String(req.query?.email || "").trim().toLowerCase();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Missing or invalid email" });
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

    const wantsJson =
      String(req.headers.accept || "").includes("application/json") ||
      req.method === "POST";
    if (wantsJson) {
      return res.status(200).json({ url: session.url });
    }
    return res.redirect(303, session.url);
  } catch (err) {
    console.error("Billing portal error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
