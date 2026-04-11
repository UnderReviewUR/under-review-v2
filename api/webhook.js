// api/webhook.js
// Stripe webhook handler for Under Review Pro subscriptions.
//
// Events handled:
//   checkout.session.completed      → new subscriber (including trial start)
//   customer.subscription.updated  → plan change, trial ended, payment method update
//   customer.subscription.deleted  → cancellation / non-payment churn
//   invoice.payment_succeeded       → renewal confirmed (optional — keeps logs clean)
//   invoice.payment_failed          → payment failed (optional — for future dunning)
//
// Vercel requirement: bodyParser MUST be disabled for Stripe signature verification.
// Stripe sends a raw body; if Vercel parses it first, signature check always fails.

export const config = {
  api: { bodyParser: false },
};

import Stripe from "stripe";
import crypto from "crypto";

const STRIPE_SECRET_KEY    = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TOKEN_SECRET          = process.env.ACCESS_TOKEN_SECRET || "ur-dev-secret-changeme";

// ── Read raw body from Vercel serverless ─────────────────────────────────────
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ── Sign a local access token ────────────────────────────────────────────────
function signToken(payload) {
  const data = JSON.stringify(payload);
  const sig  = crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("hex");
  return Buffer.from(data).toString("base64") + "." + sig;
}

// ── Simple in-memory log (Vercel logs will capture these) ────────────────────
function log(event, email, status) {
  console.log(`[webhook] ${event} | ${email || "no-email"} | ${status}`);
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Always allow OPTIONS for preflight (shouldn't happen for webhooks but safe)
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  if (!STRIPE_SECRET_KEY)     return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  if (!STRIPE_WEBHOOK_SECRET) return res.status(500).json({ error: "Missing STRIPE_WEBHOOK_SECRET" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });

  // Read raw body BEFORE any parsing
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error("[webhook] Failed to read body:", err.message);
    return res.status(400).json({ error: "Could not read request body" });
  }

  // Verify Stripe signature
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── New subscription (checkout complete) ──────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const email   = session.customer_email || session.customer_details?.email;
        const custId  = session.customer;
        const subId   = session.subscription;
        const tier    = session.metadata?.tier || "pro";

        log("checkout.session.completed", email, `customer=${custId} sub=${subId}`);

        // Nothing to write to a DB here — token is issued on-demand by pro-status.js
        // Just log it. If you add a database later, store (email, custId, subId) here.
        break;
      }

      // ── Subscription state change ─────────────────────────────────────────
      case "customer.subscription.updated": {
        const sub    = event.data.object;
        const custId = sub.customer;
        const status = sub.status; // active | trialing | past_due | canceled | unpaid

        // Look up email from customer
        const customer = await stripe.customers.retrieve(custId);
        const email    = customer.email;

        log("customer.subscription.updated", email, status);

        // If subscription moved to active from trialing → user is now a paid subscriber
        // If status is past_due or unpaid → access should be revoked (handled by pro-status.js
        // returning false when it checks Stripe live)
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub    = event.data.object;
        const custId = sub.customer;

        const customer = await stripe.customers.retrieve(custId);
        const email    = customer.email;

        log("customer.subscription.deleted", email, "CANCELLED");

        // The next time this user hits /api/pro-status, Stripe will return no active sub
        // and the token check will fail → access naturally revoked.
        // No action needed unless you maintain a DB.
        break;
      }

      // ── Successful renewal payment ────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const email   = invoice.customer_email;
        const custId  = invoice.customer;
        log("invoice.payment_succeeded", email, `invoice=${invoice.id}`);
        // Renewal confirmed — access continues via pro-status.js live Stripe check
        break;
      }

      // ── Failed payment ────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const email   = invoice.customer_email;
        log("invoice.payment_failed", email, `attempt=${invoice.attempt_count}`);
        // Stripe will retry automatically per your retry settings.
        // After max retries, subscription moves to canceled → handled above.
        break;
      }

      // ── Ignore everything else ────────────────────────────────────────────
      default:
        // Return 200 to acknowledge — Stripe will retry if you return non-2xx
        break;
    }
  } catch (err) {
    console.error("[webhook] Event processing error:", err.message);
    // Still return 200 so Stripe doesn't retry infinitely for a processing bug
    return res.status(200).json({ received: true, warning: err.message });
  }

  return res.status(200).json({ received: true });
}
