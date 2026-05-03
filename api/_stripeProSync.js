/**
 * Shared Stripe lookups for Pro entitlement — used by pro-status, restore-subscription, checkout guard.
 */
import { getClerkBackendClient } from "./_clerkAuth.js";
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
 * Same as evaluateCheckoutBlock but uses Clerk-linked Stripe customer id when present.
 */
export async function evaluateCheckoutBlockWithClerk(stripe, { email, clerkUserId }) {
  if (clerkUserId) {
    const client = getClerkBackendClient();
    if (client) {
      try {
        const user = await client.users.getUser(clerkUserId);
        const custId = user.privateMetadata?.stripeCustomerId;
        if (typeof custId === "string" && custId.startsWith("cus_")) {
          const activeSub = await getActiveOrTrialingSubscription(stripe, custId);
          if (activeSub) return { block: true, reason: "active_subscription" };
          const recent = await hasRecentSuccessfulPayment(stripe, custId, RECENT_PAYMENT_GUARD_MS);
          if (recent) return { block: true, reason: "recent_payment" };
        }
      } catch (e) {
        console.error("[stripe] evaluateCheckoutBlockWithClerk:", e?.message || e);
      }
    }
  }
  return evaluateCheckoutBlock(stripe, email);
}

/**
 * Pro status for a Clerk user: Stripe customer from Clerk privateMetadata, else lookup by primary email.
 */
/**
 * Persist Stripe customer id on the Clerk user (webhook + migration from verified email match).
 */
export async function persistStripeCustomerForClerkUser(clerkUserId, stripeCustomerId, stripeSubscriptionId) {
  const clerk = getClerkBackendClient();
  if (!clerk || !clerkUserId || !String(stripeCustomerId || "").startsWith("cus_")) return;
  try {
    const existing = await clerk.users.getUser(clerkUserId);
    const prev = existing.privateMetadata || {};
    await clerk.users.updateUser(clerkUserId, {
      privateMetadata: {
        ...prev,
        stripeCustomerId,
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      },
    });
  } catch (e) {
    console.error("[stripe] persistStripeCustomerForClerkUser:", e?.message || e);
  }
}

export async function buildProStatusForClerkUserId(clerkUserId, stripe, tokenSecret) {
  const client = getClerkBackendClient();
  if (!client) {
    return { ok: false, status: 500, body: { error: "Clerk is not configured on the server" } };
  }

  try {
    const user = await client.users.getUser(clerkUserId);
    const md = user.privateMetadata || {};
    const stripeCustomerId = typeof md.stripeCustomerId === "string" ? md.stripeCustomerId : null;
    const primaryEmail =
      user.primaryEmailAddress?.emailAddress ||
      (user.emailAddresses && user.emailAddresses[0]?.emailAddress) ||
      "";

    let customer = null;
    let resolvedViaEmailLookup = false;
    if (stripeCustomerId?.startsWith("cus_")) {
      try {
        customer = await stripe.customers.retrieve(stripeCustomerId);
        if (customer?.deleted) customer = null;
      } catch {
        customer = null;
      }
    }
    if (!customer && primaryEmail) {
      customer = await findCustomerByEmail(stripe, primaryEmail);
      if (customer) resolvedViaEmailLookup = true;
    }
    if (!customer) {
      return { ok: true, status: 200, body: { pro: false, reason: "No customer found" } };
    }

    const activeSub = await getActiveOrTrialingSubscription(stripe, customer.id);
    if (!activeSub) {
      return { ok: true, status: 200, body: { pro: false, reason: "No active subscription" } };
    }

    if (resolvedViaEmailLookup) {
      const em = String(primaryEmail || "").trim().toLowerCase();
      const custEmail = String(customer.email || "").trim().toLowerCase();
      if (em && custEmail === em) {
        await persistStripeCustomerForClerkUser(clerkUserId, customer.id, activeSub.id);
      }
    }

    const normalized = String(primaryEmail || customer.email || "").trim().toLowerCase();
    const expiresAt = new Date(activeSub.current_period_end * 1000).toISOString();
    const payload = {
      tier: "pro",
      email: normalized,
      stripeCustomer: customer.id,
      subscription: activeSub.id,
      issuedAt: new Date().toISOString(),
      expiresAt,
      clerkUserId,
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
    console.error("Stripe Pro sync (Clerk) error:", err.message);
    return {
      ok: false,
      status: 500,
      body: { error: "Something went wrong. Please try again." },
    };
  }
}

/**
 * Build the same JSON shape as GET /api/pro-status — issue token when subscription is active/trialing.
 */
/** Stripe-only: active or trialing subscription for this email (no token issuance). */
export async function hasActiveProSubscription(stripe, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  try {
    const customer = await findCustomerByEmail(stripe, normalized);
    if (!customer) return false;
    const activeSub = await getActiveOrTrialingSubscription(stripe, customer.id);
    return Boolean(activeSub);
  } catch {
    return false;
  }
}

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
