/**
 * Shared Stripe lookups for Pro entitlement — used by pro-status, restore-subscription, checkout guard.
 */
import { signToken } from "./_hmacToken.js";

/** Window for “recent payment” duplicate-checkout guard (between 10–15 min spec). */
export const RECENT_PAYMENT_GUARD_MS = 15 * 60 * 1000;

export async function findCustomerByEmail(stripe, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  const customers = await stripe.customers.list({ email: normalized, limit: 1 });
  return customers.data[0] || null;
}

export async function getActiveOrTrialingSubscription(stripe, customerId) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return subscriptions.data.find((s) => s.status === "active" || s.status === "trialing") || null;
}

/**
 * True if customer had a successful card charge or paid invoice in the last `windowMs`.
 */
export async function hasRecentSuccessfulPayment(stripe, customerId, windowMs = RECENT_PAYMENT_GUARD_MS) {
  const since = Math.floor((Date.now() - windowMs) / 1000);

  const intents = await stripe.paymentIntents.list({
    customer: customerId,
    created: { gte: since },
    limit: 40,
  });
  if (intents.data.some((p) => p.status === "succeeded")) return true;

  const invoices = await stripe.invoices.list({
    customer: customerId,
    status: "paid",
    created: { gte: since },
    limit: 20,
  });
  return invoices.data.length > 0;
}

/**
 * Block creating another Checkout session when user already has Pro access or just paid.
 */
export async function evaluateCheckoutBlock(stripe, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return { block: false };

  const customer = await findCustomerByEmail(stripe, normalized);
  if (!customer) return { block: false };

  const activeSub = await getActiveOrTrialingSubscription(stripe, customer.id);
  if (activeSub) return { block: true, reason: "active_subscription" };

  const recent = await hasRecentSuccessfulPayment(stripe, customer.id, RECENT_PAYMENT_GUARD_MS);
  if (recent) return { block: true, reason: "recent_payment" };

  return { block: false };
}

/**
 * Build the same JSON shape as GET /api/pro-status — issue token when subscription is active/trialing.
 */
export async function buildProStatusResponse(email, stripe, tokenSecret) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { ok: false, status: 400, body: { error: "Missing email" } };
  }

  try {
    const customer = await findCustomerByEmail(stripe, normalized);
    if (!customer) {
      return { ok: true, status: 200, body: { pro: false, reason: "No customer found" } };
    }

    const activeSub = await getActiveOrTrialingSubscription(stripe, customer.id);
    if (!activeSub) {
      return { ok: true, status: 200, body: { pro: false, reason: "No active subscription" } };
    }

    const expiresAt = new Date(activeSub.current_period_end * 1000).toISOString();
    const payload = {
      tier: "pro",
      email: normalized,
      stripeCustomer: customer.id,
      subscription: activeSub.id,
      issuedAt: new Date().toISOString(),
      expiresAt,
    };

    const token = signToken(payload, tokenSecret);

    return {
      ok: true,
      status: 200,
      body: {
        pro: true,
        tier: "pro",
        token,
        expiresAt,
        status: activeSub.status,
      },
    };
  } catch (err) {
    console.error("Stripe Pro sync error:", err.message);
    return {
      ok: false,
      status: 500,
      body: { error: "Something went wrong. Please try again." },
    };
  }
}
