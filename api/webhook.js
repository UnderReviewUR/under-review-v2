// api/webhook.js
// Handles Stripe webhook events to track active subscriptions.
// SECURITY: Stripe signs every webhook with STRIPE_WEBHOOK_SECRET.
// We verify the signature before processing — fake/tampered events are rejected.
//
// Events handled:
//   checkout.session.completed  → user subscribed
//   customer.subscription.deleted → user cancelled
//   invoice.payment_failed      → payment failed, subscription at risk

export const config = {
  api: { bodyParser: false }, // Must receive raw body for signature verification
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Stripe signature verification — pure Node crypto, no SDK needed
async function verifyStripeSignature(rawBody, signature, secret) {
  const crypto = await import("crypto");
  const parts = signature.split(",");
  const timestamp = parts.find(p => p.startsWith("t="))?.slice(2);
  const v1 = parts.find(p => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !v1) return false;

  // Reject webhooks older than 5 minutes (replay attack protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const payload = `${timestamp}.${rawBody.toString()}`;
  const expected = crypto.default
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison prevents timing attacks
  return crypto.default.timingSafeEqual(
    Buffer.from(v1, "hex"),
    Buffer.from(expected, "hex")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return res.status(500).json({ error: "Webhook not configured" });

  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).json({ error: "Missing signature" });

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch {
    return res.status(400).json({ error: "Could not read body" });
  }

  const isValid = await verifyStripeSignature(rawBody, signature, WEBHOOK_SECRET);
  if (!isValid) {
    console.warn("Invalid Stripe webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Handle events
  // In a production app with a database, you'd write subscriber status here.
  // For now we log — and the frontend uses Stripe's hosted customer portal
  // to manage subscriptions. No sensitive data stored on your server.

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("New subscriber:", session.customer_email, "| Customer:", session.customer);
      // TODO: store session.customer + session.subscription in your DB
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      console.log("Subscription cancelled:", sub.customer);
      // TODO: mark subscriber as inactive in your DB
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.warn("Payment failed:", invoice.customer_email);
      // TODO: flag account for retry
      break;
    }
    default:
      // Ignore other events
      break;
  }

  return res.status(200).json({ received: true });
}
