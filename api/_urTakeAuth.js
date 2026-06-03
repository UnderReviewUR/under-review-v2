// api/_urTakeAuth.js — verify Authorization bearer for /api/ur-take and /api/performance.
import { verifyToken } from "./_hmacToken.js";
import { getAccessTokenSecretSync, getEnv } from "./_env.js";

/** When false, UR TAKE skips bearer verification (local dev only — set in .env). */
export function shouldRequireUrTakeAuth() {
  return getEnv("UR_TAKE_REQUIRE_AUTH") !== "false";
}

/**
 * @returns {{ ok: true, email: string | null, tier: string } | { ok: false, reason: string }}
 */
export function verifyBearerForUrTake(authHeader) {
  const secret = getAccessTokenSecretSync();
  if (!secret) {
    return { ok: false, reason: "server_misconfigured" };
  }

  const raw = String(authHeader || "").trim();
  const m = /^Bearer\s+([\s\S]+)$/i.exec(raw);
  if (!m) return { ok: false, reason: "missing_bearer" };

  const token = m[1].trim();
  const payload = verifyToken(token, secret);
  if (!payload) return { ok: false, reason: "invalid_token" };

  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
    return { ok: false, reason: "expired" };
  }

  if (payload.purpose === "ur-take") {
    if (payload.email) {
      return {
        ok: true,
        email: String(payload.email).toLowerCase().trim(),
        sessionId: payload.sessionId ? String(payload.sessionId).trim() : null,
        tier: String(payload.tier || "free"),
      };
    }
    if (payload.sessionId) {
      return {
        ok: true,
        email: null,
        sessionId: String(payload.sessionId).trim(),
        tier: String(payload.tier || "free"),
      };
    }
    return { ok: false, reason: "invalid_take_token" };
  }

  if (payload.tier === "pro" && payload.email) {
    return {
      ok: true,
      email: String(payload.email).toLowerCase().trim(),
      tier: "pro",
    };
  }

  if (payload.tier === "owner" || payload.tier === "friend") {
    return {
      ok: true,
      email: payload.email ? String(payload.email).toLowerCase().trim() : null,
      tier: payload.tier,
    };
  }

  return { ok: false, reason: "unsupported_token" };
}
