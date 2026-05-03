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
        const jwt = await getToken();
        if (!jwt || cancelled) return;
        const r = await fetch("/api/pro-status", {
          headers: { Authorization: `Bearer ${jwt}` },
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

    const sync = async () => {
      try {
        const jwt = await getToken();
        if (!jwt || cancelled) return;
        const res = await fetch("/api/restore-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.pro && data.token) {
          localStorage.setItem("ur_access_token", data.token);
          setAccessToken(data.token);
          setAccessTier("pro");
          setShowUpgradeModal(false);
        }
      } catch {
        /* retry */
      }
    };

    const email =
      user?.primaryEmailAddress?.emailAddress ||
      userEmail ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
      "";

    void sync();
    const t2 = setTimeout(() => void sync(), 2000);
    const t5 = setTimeout(() => void sync(), 5000);
    const t8 = setTimeout(() => void sync(), 8000);

    const alertTimer = setTimeout(() => {
      if (cancelled) return;
      if (!accessTierRef.current?.isUnlimited) {
        console.error("[UR_ENTITLEMENT_DESYNC]", { paymentSuccessRedirect: true, clerk: true });
        if (email) {
          void fetch("/api/entitlement-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, source: "post_checkout_10s_clerk" }),
          }).catch(() => {});
        }
      }
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(t2);
      clearTimeout(t5);
      clearTimeout(t8);
      clearTimeout(alertTimer);
    };
  }, [
    proSuccess,
    isSignedIn,
    getToken,
    user,
    userEmail,
    setAccessTier,
    setAccessToken,
    setShowUpgradeModal,
  ]);

  return null;
}
