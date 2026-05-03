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
 * Pro via magic link + Bearer refresh only.
 * GET /api/pro-status runs only when ur_access_token is present (same-email refresh).
 * After ?pro=success: POST /api/auth/request-link once (no auto-grant).
 */
export default function StripeSubscriptionSync({
  proSuccess,
  proCheckoutEmail,
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

    let bearer = "";
    try {
      bearer = localStorage.getItem("ur_access_token") || "";
    } catch {
      /* ignore */
    }
    if (!bearer) return;

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

    const fromCheckout = String(proCheckoutEmail || "").trim().toLowerCase();
    const raw =
      (fromCheckout && isValidEmail(fromCheckout)
        ? fromCheckout
        : typeof localStorage !== "undefined" && localStorage.getItem("ur_email")) ||
      userEmail ||
      "";
    const email = String(raw).trim().toLowerCase();
    if (!isValidEmail(email)) return;

    try {
      localStorage.setItem("ur_email", email);
    } catch {
      /* ignore */
    }
    setUserEmail?.(email);

    try {
      const dedupeKey = `ur_checkout_magic_sent:${email}`;
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(dedupeKey)) {
        return;
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(dedupeKey, "1");
      }
    } catch {
      /* ignore */
    }

    const sendLink = async () => {
      try {
        await fetch("/api/auth/request-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {
        /* ignore */
      }
    };

    void sendLink();
  }, [proSuccess, proCheckoutEmail, userEmail, setUserEmail]);

  return null;
}
