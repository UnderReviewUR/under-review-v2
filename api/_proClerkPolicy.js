/**
 * Pro APIs require Clerk server configuration and a verified session JWT.
 * Typed email / client body is never authoritative for entitlement.
 */
import { isClerkSecretConfigured } from "./_clerkAuth.js";

/**
 * @param {string | null} clerkUserId
 * @param {{ clerkSecretConfigured?: boolean }} [options] — override for tests only
 */
export function clerkAuthDenial(clerkUserId, options = {}) {
  const configured =
    options.clerkSecretConfigured !== undefined
      ? options.clerkSecretConfigured
      : isClerkSecretConfigured();
  if (!configured) {
    return {
      denied: true,
      status: 503,
      body: {
        error: "clerk_required",
        message: "Pro requires Clerk (CLERK_SECRET_KEY) on the server.",
      },
    };
  }
  if (!clerkUserId) {
    return {
      denied: true,
      status: 401,
      body: {
        error: "sign_in_required",
        message: "Sign in to continue.",
      },
    };
  }
  return { denied: false };
}

/** Document expected behavior for entitlement tests (no Stripe calls). */
export function summarizeEntitlementPolicy() {
  return {
    checkoutRequiresJwt: false,
    restoreRequiresJwt: false,
    proStatusRequiresJwt: false,
    clientEmailIgnoredForCheckout: false,
  };
}
