import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";

/**
 * Syncs Clerk primary email to ur_email, validates Pro via Bearer-only API (authoritative),
 * and retries restore after checkout (?pro=success).
 */
export default function ClerkSubscriptionSync({
  proSuccess,
  userEmail,
  setUserEmail,
  setAccessTier,
  setAccessToken,
  setShowUpgradeModal,
  isUnlimited,
  accessTier,
}) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const accessTierRef = useRef(null);

  useEffect(() => {
    accessTierRef.current = { isUnlimited };
  }, [isUnlimited]);

  useEffect(() => {
    const addr = user?.primaryEmailAddress?.emailAddress;
    if (!addr) return;
    try {
      localStorage.setItem("ur_email", addr);
    } catch {
      /* ignore */
    }
    setUserEmail(addr);
  }, [user, setUserEmail]);

  /** Authoritative Pro sync — overwrites stale localStorage Pro tokens when Stripe says no access */
  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;

    const run = async () => {
      try {
        await getToken();
        if (cancelled) return;
        const addr = user?.primaryEmailAddress?.emailAddress;
        if (!addr) return;
        let urTok = "";
        try {
          urTok = localStorage.getItem("ur_access_token") || "";
        } catch {
          /* ignore */
        }
        const headers = {};
        if (urTok) headers.Authorization = `Bearer ${urTok}`;
        const r = await fetch(`/api/pro-status?email=${encodeURIComponent(addr)}`, {
          headers,
        });
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;

        if (data.pro && data.token) {
          localStorage.setItem("ur_access_token", data.token);
          setAccessToken(data.token);
          setAccessTier("pro");
          setShowUpgradeModal(false);
          return;
        }

        if (accessTier === "pro") {
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
  }, [
    isSignedIn,
    getToken,
    user,
    accessTier,
    setAccessTier,
    setAccessToken,
    setShowUpgradeModal,
  ]);

  useEffect(() => {
    if (!proSuccess || !isSignedIn) return;

    let cancelled = false;

    const sendMagicLink = async () => {
      const email = String(
        user?.primaryEmailAddress?.emailAddress ||
          userEmail ||
          (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
          "",
      ).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      try {
        if (cancelled) return;
        await fetch("/api/auth/request-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {
        /* ignore */
      }
    };

    void sendMagicLink();

    const email =
      user?.primaryEmailAddress?.emailAddress ||
      userEmail ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
      "";

    const alertTimer = setTimeout(() => {
      if (cancelled) return;
      if (!accessTierRef.current?.isUnlimited) {
        console.error("[UR_ENTITLEMENT_DESYNC]", { paymentSuccessRedirect: true, clerk: true });
        if (email) {
          void fetch("/api/entitlement-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, source: "post_checkout_10s_clerk" }),
          }).catch((err) => { console.warn("[ClerkSubscriptionSync] entitlement alert failed:", err?.message || err); });
        }
      }
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(alertTimer);
    };
  }, [proSuccess, isSignedIn, user, userEmail]);

  return null;
}
