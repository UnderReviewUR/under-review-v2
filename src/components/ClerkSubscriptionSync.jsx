import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";

/**
 * Syncs Clerk primary email to ur_email, refetches Pro via Bearer JWT,
 * and mirrors post-checkout restore when ?pro=success.
 */
export default function ClerkSubscriptionSync({
  proSuccess,
  userEmail,
  setUserEmail,
  setAccessTier,
  setAccessToken,
  setShowUpgradeModal,
  isUnlimited,
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

  useEffect(() => {
    if (!isSignedIn || isUnlimited) return;

    let cancelled = false;

    const run = async () => {
      try {
        const jwt = await getToken();
        if (!jwt || cancelled) return;
        const email =
          user?.primaryEmailAddress?.emailAddress || userEmail || localStorage.getItem("ur_email") || "";
        const q = email ? `?email=${encodeURIComponent(email)}` : "";
        const r = await fetch(`/api/pro-status${q}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (data.pro && data.token) {
          localStorage.setItem("ur_access_token", data.token);
          setAccessToken(data.token);
          setAccessTier("pro");
          setShowUpgradeModal(false);
        }
      } catch {
        /* ignore */
      }
    };

    void run();
  }, [
    isSignedIn,
    isUnlimited,
    getToken,
    user,
    userEmail,
    setAccessTier,
    setAccessToken,
    setShowUpgradeModal,
  ]);

  useEffect(() => {
    if (!proSuccess || !isSignedIn) return;
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      userEmail ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
      "";
    if (!email) return;

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
          body: JSON.stringify({ email }),
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

    void sync();
    const t2 = setTimeout(() => void sync(), 2000);
    const t5 = setTimeout(() => void sync(), 5000);
    const t8 = setTimeout(() => void sync(), 8000);

    const alertTimer = setTimeout(() => {
      if (cancelled) return;
      if (!accessTierRef.current?.isUnlimited) {
        console.error("[UR_ENTITLEMENT_DESYNC]", { paymentSuccessRedirect: true, clerk: true });
        void fetch("/api/entitlement-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "post_checkout_10s_clerk" }),
        }).catch(() => {});
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
