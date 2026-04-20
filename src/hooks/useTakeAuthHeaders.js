import { useCallback } from "react";

const TAKE_SKEW_MS = 45_000;

/**
 * Headers for `/api/ur-take` and `/api/performance`:
 * prefers `ur_access_token`, else short-lived `issue_take_token` session token.
 */
export function useTakeAuthHeaders() {
  return useCallback(async () => {
    if (typeof window === "undefined") return {};

    const access = localStorage.getItem("ur_access_token");
    if (access) {
      return { Authorization: `Bearer ${access}` };
    }

    const email = localStorage.getItem("ur_email") || "";
    if (!email.includes("@")) {
      return {};
    }

    let tok = sessionStorage.getItem("ur_take_token");
    const exp = Number(sessionStorage.getItem("ur_take_exp") || 0);
    if (!tok || Date.now() > exp - TAKE_SKEW_MS) {
      const r = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_take_token", email }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.takeToken) {
        return {};
      }
      tok = d.takeToken;
      const ttlSec = Number(d.expiresInSeconds) || 540;
      sessionStorage.setItem("ur_take_token", tok);
      sessionStorage.setItem("ur_take_exp", String(Date.now() + ttlSec * 1000));
    }

    return { Authorization: `Bearer ${tok}` };
  }, []);
}
