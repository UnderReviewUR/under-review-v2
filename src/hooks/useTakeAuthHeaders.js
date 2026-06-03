import { useCallback } from "react";
import {
  applyFreeTierLimitReachedFromServer,
  syncQuotaFromServer,
} from "../lib/freeTierLimits.js";
import { getOrCreateUrSessionId } from "../lib/urSessionId.js";

const TAKE_SKEW_MS = 45_000;

/**
 * Headers for `/api/ur-take`, `/api/performance`, `/api/take-bet-signal`, and `/api/estimated-edge-outcome`:
 * prefers `ur_access_token`, else short-lived `issue_take_token` session token.
 * Anonymous users get session-scoped tokens (no email until after 3 questions).
 */
export function useTakeAuthHeaders() {
  return useCallback(async () => {
    if (typeof window === "undefined") return {};

    const access = localStorage.getItem("ur_access_token");
    if (access) {
      return { Authorization: `Bearer ${access}` };
    }

    const sessionId = getOrCreateUrSessionId();
    const email = localStorage.getItem("ur_email") || "";
    const hasEmail = email.includes("@");

    let tok = sessionStorage.getItem("ur_take_token");
    const exp = Number(sessionStorage.getItem("ur_take_exp") || 0);
    if (!tok || Date.now() > exp - TAKE_SKEW_MS) {
      const body = hasEmail
        ? { action: "issue_take_token", email, sessionId }
        : { action: "issue_take_token", sessionId };

      const r = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.takeToken) {
        if (d.reason === "email_required" || d.code === "email_required") {
          applyFreeTierLimitReachedFromServer(d.freeQuota || { scope: "session", used: 3, limit: 3 });
        } else if (d.reason === "limit_reached" || d.code === "limit_reached") {
          applyFreeTierLimitReachedFromServer(d.freeQuota || d);
        }
        return {};
      }
      if (d.freeQuota) {
        syncQuotaFromServer(d.freeQuota);
      }
      tok = d.takeToken;
      const ttlSec = Number(d.expiresInSeconds) || 540;
      sessionStorage.setItem("ur_take_token", tok);
      sessionStorage.setItem("ur_take_exp", String(Date.now() + ttlSec * 1000));
    }

    return { Authorization: `Bearer ${tok}` };
  }, []);
}
