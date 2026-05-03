import { useEffect, useRef } from "react";

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function proStatusHeaders() {
  const h = {};
  try {
    const tok = localStorage.getItem("ur_access_token");
    if (tok) {
      h.Authorization = `Bearer ${tok}`;
    }
  } catch {
    /* ignore */
  }
  return h;
}

/**
 * Syncs Pro from Stripe via email (ur_email). No Clerk.
 * Sends Bearer ur_access_token when present — server skips IP rate limit for same-email refresh.
 * On mount: if ur_email exists, !isUnlimited, and not post-checkout — GET /api/pro-status.
 * After ?pro=success: two attempts (0s, 5s) to stay within default 3 anonymous IP checks/min.
 */
export default function StripeSubscriptionSync({
  proSuccess,
  userEmail,
  setUserEmail,
  setAccessTier,
  setAccessToken,
  setShowUpgradeModal,
  isUnlimited,
  accessTier,
}) {
  const accessTierRef = useRef(null);
  const tierRef = useRef(accessTier);

  useEffect(() => {
    accessTierRef.current = { isUnlimited };
  }, [isUnlimited]);

  useEffect(() => {
    tierRef.current = accessTier;
  }, [accessTier]);

  useEffect(() => {
    if (isUnlimited) return;
    if (proSuccess) return;

    const raw =
      (typeof localStorage !== "undefined" && localStorage.getItem("ur_email")) || userEmail || "";
    const email = String(raw).trim().toLowerCase();
    if (!isValidEmail(email)) return;

    let cancelled = false;

    const run = async () => {
      try {
        const r = await fetch(`/api/pro-status?email=${encodeURIComponent(email)}`, {
          headers: proStatusHeaders(),
        });
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;

        if (data.pro && data.token) {
          try {
            localStorage.setItem("ur_access_token", data.token);
            localStorage.setItem("ur_email", email);
          } catch {
            /* ignore */
          }
          setUserEmail?.(email);
          setAccessToken(data.token);
          setAccessTier("pro");
          setShowUpgradeModal(false);
          return;
        }

        if (tierRef.current === "pro") {
          try {
            localStorage.removeItem("ur_access_token");
          } catch {
            /* ignore */
          }
          setAccessToken("");
          setAccessTier("free");
        }
      } catch {
        /* ignore */
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isUnlimited,
    proSuccess,
    userEmail,
    accessTier,
    setAccessTier,
    setAccessToken,
    setShowUpgradeModal,
    setUserEmail,
  ]);

  useEffect(() => {
    if (!proSuccess) return;

    const raw =
      (typeof localStorage !== "undefined" && localStorage.getItem("ur_email")) ||
      userEmail ||
      "";
    const email = String(raw).trim().toLowerCase();
    if (!isValidEmail(email)) return;

    let cancelled = false;

    const sync = async () => {
      try {
        const r = await fetch(`/api/pro-status?email=${encodeURIComponent(email)}`, {
          headers: proStatusHeaders(),
        });
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (data.pro && data.token) {
          try {
            localStorage.setItem("ur_access_token", data.token);
            localStorage.setItem("ur_email", email);
          } catch {
            /* ignore */
          }
          setUserEmail?.(email);
          setAccessToken(data.token);
          setAccessTier("pro");
          setShowUpgradeModal(false);
        }
      } catch {
        /* retry */
      }
    };

    void sync();
    const t5 = setTimeout(() => void sync(), 5000);

    const alertTimer = setTimeout(() => {
      if (cancelled) return;
      if (!accessTierRef.current?.isUnlimited && email) {
        console.error("[UR_ENTITLEMENT_DESYNC]", { paymentSuccessRedirect: true, email });
        void fetch("/api/entitlement-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "post_checkout_10s_stripe" }),
        }).catch(() => {});
      }
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(t5);
      clearTimeout(alertTimer);
    };
  }, [
    proSuccess,
    userEmail,
    setAccessTier,
    setAccessToken,
    setShowUpgradeModal,
    setUserEmail,
  ]);

  return null;
}
