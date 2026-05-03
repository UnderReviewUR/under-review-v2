import { track } from "@vercel/analytics";

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function resolveCheckoutEmail(setUserEmail) {
  let stored = "";
  try {
    stored = localStorage.getItem("ur_email") || "";
  } catch {
    /* ignore */
  }
  const trimmed = stored.trim();
  if (trimmed && isValidEmail(trimmed)) {
    return trimmed.toLowerCase();
  }
  const entered = window.prompt(
    "Enter the email you use for Under Review (same as at checkout):",
    trimmed || "",
  );
  if (entered == null) return null;
  const e = entered.trim().toLowerCase();
  if (!isValidEmail(e)) {
    alert("Please enter a valid email address.");
    return null;
  }
  try {
    localStorage.setItem("ur_email", e);
  } catch {
    /* ignore */
  }
  setUserEmail?.(e);
  return e;
}

function CheckoutButton({ className, restoreProEntitlement, setUserEmail, children }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          const email = resolveCheckoutEmail(setUserEmail);
          if (!email) return;
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 403 && data.error === "already_pro") {
            alert(data.message || "You already have Pro access");
            void restoreProEntitlement();
            return;
          }
          if (res.status === 400 && data.error === "email_required") {
            alert(data.message || "Enter a valid email.");
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
 * Pro subscribe — collects email and POSTs to /api/checkout (no Clerk).
 */
export default function ProCheckoutCTA({ className, restoreProEntitlement, setUserEmail, children }) {
  return (
    <CheckoutButton
      className={className}
      restoreProEntitlement={restoreProEntitlement}
      setUserEmail={setUserEmail}
    >
      {children}
    </CheckoutButton>
  );
}
