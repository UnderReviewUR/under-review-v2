import { useAuth } from "@clerk/clerk-react";
import { track } from "@vercel/analytics";

import { isClerkEnabled } from "../clerkEnv.js";

function ProCheckoutClerk({ className, restoreProEntitlement, children }) {
  const { getToken, isSignedIn } = useAuth();

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (!isSignedIn) {
            alert("Sign in to subscribe to Pro.");
            return;
          }
          const sessionJwt = await getToken();
          if (!sessionJwt) {
            alert("Could not start checkout. Sign in again.");
            return;
          }
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionJwt}`,
            },
            body: JSON.stringify({ email: "clerk" }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 401 && data.error === "sign_in_required") {
            alert(data.message || "Sign in to continue.");
            return;
          }
          if (res.status === 403 && data.error === "already_pro") {
            alert(data.message || "You already have Pro access");
            void restoreProEntitlement();
            return;
          }
          if (res.status === 400 && data.error === "email_required") {
            alert(data.message || "Add a primary email to your account.");
            return;
          }
          if (data.url) {
            try {
              track("checkout_initiated");
            } catch {
              /* optional */
            }
            window.location.href = data.url;
          } else if (data.retryAfterSeconds) {
            alert(`Checkout is busy. Try again in ${data.retryAfterSeconds}s.`);
          } else {
            alert(data.error || "Could not start checkout. Try again.");
          }
        } catch {
          alert("Something went wrong. Try again.");
        }
      }}
    >
      {children}
    </button>
  );
}

/**
 * Pro tab primary checkout — Clerk session when enabled, else legacy email prompt (parent handler).
 */
export default function ProCheckoutCTA({ className, onLegacyCheckout, restoreProEntitlement, children }) {
  if (!isClerkEnabled) {
    return (
      <button type="button" className={className} onClick={onLegacyCheckout}>
        {children}
      </button>
    );
  }
  return <ProCheckoutClerk className={className} restoreProEntitlement={restoreProEntitlement}>{children}</ProCheckoutClerk>;
}
