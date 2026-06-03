// api/gate.js
// Tracks free-tier query usage and handles email gate.
// Anonymous: 3 questions per sessionId (wc_quota:session:*), no email.
// Identified: 3 questions per UTC day per email (wc_quota:email:*).
// Client mirrors via freeQuota payloads (src/lib/freeTierLimits.js).

import { applyCors } from "./_cors.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { signToken, verifyToken } from "./_hmacToken.js";
import {
  getAccessTokenSecretSync,
  sendAccessTokenSecretMissingError,
} from "./_env.js";
import {
  allowRateLimit,
  allowRateLimitWindow,
  gateIpPerMin,
  gateIssueTakeTokenIpPerHour,
  getClientIp,
} from "./_rateLimitUrTake.js";
import {
  checkGateQuotaAllowed,
  checkSessionQuotaAllowed,
  consumeGateQuery,
  consumeSessionQuery,
  FREE_QUERIES_PER_DAY,
  getFreeQuotaStatus,
  getSessionQuotaStatus,
  isGateServerQuotaEnforce,
  isValidSessionId,
  migrateSessionQuotaToEmail,
  normalizeSessionId,
} from "./_gateQuota.js";

const TAKE_TOKEN_TTL_MS = 10 * 60 * 1000;
const GATE_REGISTER_TTL_SECONDS = 60 * 60 * 24 * 8;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function issueFreeTakeToken(res, secret, { email = null, sessionId = null, freeQuota = null }) {
  const expiresAt = new Date(Date.now() + TAKE_TOKEN_TTL_MS).toISOString();
  const payload = {
    purpose: "ur-take",
    tier: "free",
    expiresAt,
  };
  if (email) payload.email = email;
  if (sessionId) payload.sessionId = sessionId;

  const takeToken = signToken(payload, secret);
  return res.status(200).json({
    takeToken,
    expiresInSeconds: Math.floor(TAKE_TOKEN_TTL_MS / 1000),
    ...(freeQuota ? { freeQuota } : {}),
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const clientIp = getClientIp(req);
    if (!allowRateLimit(`gate:post:ip:${clientIp}`, gateIpPerMin())) {
      return res.status(429).json({ error: "rate_limited", reason: "gate_ip_rate_limit" });
    }

    const { action, email, accessToken, sessionId, fingerprint: _fingerprint } = req.body || {};
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedSessionId = normalizeSessionId(sessionId);

    // ── action: "issue_take_token" — short-lived HMAC for /api/ur-take + /api/performance ──
    if (action === "issue_take_token") {
      if (
        !allowRateLimitWindow(
          `gate:issue:ip:${clientIp}`,
          gateIssueTakeTokenIpPerHour(),
          60 * 60 * 1000,
        )
      ) {
        return res.status(429).json({
          error: "rate_limited",
          reason: "gate_issue_take_token_ip_hourly",
        });
      }

      const secret = getAccessTokenSecretSync();
      if (!secret) {
        sendAccessTokenSecretMissingError(res);
        return;
      }

      if (accessToken) {
        const payload = verifyToken(String(accessToken).trim(), secret);
        if (!payload || (payload.expiresAt && new Date(payload.expiresAt) < new Date())) {
          return res.status(401).json({ error: "Invalid or expired access token" });
        }
        if (
          payload.tier === "pro" ||
          payload.tier === "owner" ||
          payload.tier === "friend"
        ) {
          const expiresAt = new Date(Date.now() + TAKE_TOKEN_TTL_MS).toISOString();
          const emailForToken =
            payload.email ||
            (normalizedEmail && isValidEmail(normalizedEmail) ? normalizedEmail : null);
          const takeToken = signToken(
            {
              purpose: "ur-take",
              email: emailForToken,
              tier: payload.tier,
              expiresAt,
            },
            secret,
          );
          return res.status(200).json({
            takeToken,
            expiresInSeconds: Math.floor(TAKE_TOKEN_TTL_MS / 1000),
          });
        }
        return res.status(401).json({ error: "Unsupported access token" });
      }

      if (normalizedEmail && isValidEmail(normalizedEmail)) {
        if (isGateServerQuotaEnforce()) {
          const check = await checkGateQuotaAllowed(normalizedEmail);
          if (!check.allowed && check.reason === "limit_reached") {
            return res.status(200).json({
              ok: false,
              reason: "limit_reached",
              code: "limit_reached",
              used: check.freeQuota.used,
              limit: check.freeQuota.limit,
              remaining: check.freeQuota.remaining,
              freeQuota: check.freeQuota,
            });
          }
        } else {
          const freeQuota = await getFreeQuotaStatus(normalizedEmail);
          if (freeQuota.used >= FREE_QUERIES_PER_DAY) {
            return res.status(200).json({
              ok: false,
              reason: "limit_reached",
              code: "limit_reached",
              used: freeQuota.used,
              limit: FREE_QUERIES_PER_DAY,
              freeQuota,
            });
          }
        }

        const freeQuota = await getFreeQuotaStatus(normalizedEmail);
        return issueFreeTakeToken(res, secret, {
          email: normalizedEmail,
          sessionId: isValidSessionId(normalizedSessionId) ? normalizedSessionId : null,
          freeQuota,
        });
      }

      if (isValidSessionId(normalizedSessionId)) {
        const check = await checkSessionQuotaAllowed(normalizedSessionId);
        if (!check.allowed) {
          return res.status(200).json({
            ok: false,
            reason: "email_required",
            code: "email_required",
            used: check.freeQuota.used,
            limit: check.freeQuota.limit,
            remaining: check.freeQuota.remaining,
            freeQuota: check.freeQuota,
          });
        }
        const freeQuota = await getSessionQuotaStatus(normalizedSessionId);
        return issueFreeTakeToken(res, secret, {
          sessionId: normalizedSessionId,
          freeQuota,
        });
      }

      return res.status(400).json({ error: "Valid email or sessionId required" });
    }

    // ── action: "bind_email" — migrate session quota → email, issue take token ──
    if (action === "bind_email") {
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: "Valid email required" });
      }
      if (!isValidSessionId(normalizedSessionId)) {
        return res.status(400).json({ error: "Valid sessionId required" });
      }

      const secret = getAccessTokenSecretSync();
      if (!secret) {
        sendAccessTokenSecretMissingError(res);
        return;
      }

      const migrated = await migrateSessionQuotaToEmail(normalizedSessionId, normalizedEmail);
      const check = await checkGateQuotaAllowed(normalizedEmail);
      if (!check.allowed && check.reason === "limit_reached") {
        return res.status(200).json({
          ok: false,
          reason: "limit_reached",
          code: "limit_reached",
          migrated: migrated.ok,
          freeQuota: check.freeQuota,
        });
      }

      const key = "gate:" + normalizedEmail;
      const existing = await getDurableJson(key);
      if (!existing) {
        await setDurableJson(
          key,
          { queries: [], emailVerified: false, registeredAt: Date.now() },
          { ttlSeconds: GATE_REGISTER_TTL_SECONDS },
        );
      }

      return issueFreeTakeToken(res, secret, {
        email: normalizedEmail,
        sessionId: normalizedSessionId,
        freeQuota: migrated.freeQuota,
      });
    }

    // ── action: "check" — can this user ask a question? ──────────────────────
    if (action === "check") {
      if (normalizedEmail && isValidEmail(normalizedEmail)) {
        const check = await checkGateQuotaAllowed(normalizedEmail);
        if (!check.allowed) {
          return res.status(200).json({
            allowed: false,
            reason: check.reason || "limit_reached",
            used: check.freeQuota.used,
            limit: check.freeQuota.limit,
            remaining: check.freeQuota.remaining,
            freeQuota: check.freeQuota,
          });
        }
        return res.status(200).json({
          allowed: true,
          used: check.freeQuota.used,
          remaining: check.freeQuota.remaining,
          limit: check.freeQuota.limit,
          freeQuota: check.freeQuota,
        });
      }

      if (isValidSessionId(normalizedSessionId)) {
        const check = await checkSessionQuotaAllowed(normalizedSessionId);
        if (!check.allowed) {
          return res.status(200).json({
            allowed: false,
            reason: check.reason || "email_required",
            used: check.freeQuota.used,
            limit: check.freeQuota.limit,
            remaining: check.freeQuota.remaining,
            freeQuota: check.freeQuota,
          });
        }
        return res.status(200).json({
          allowed: true,
          used: check.freeQuota.used,
          remaining: check.freeQuota.remaining,
          limit: check.freeQuota.limit,
          freeQuota: check.freeQuota,
        });
      }

      return res.status(200).json({ allowed: true, reason: "anonymous", freeQuota: null });
    }

    // ── action: "consume" — record that a query was used (legacy / debug) ─────
    if (action === "consume") {
      if (normalizedEmail && isValidEmail(normalizedEmail)) {
        const result = await consumeGateQuery(normalizedEmail);
        return res.status(200).json({
          ok: result.ok,
          used: result.used,
          remaining: result.remaining,
          freeQuota: result.freeQuota,
        });
      }
      if (isValidSessionId(normalizedSessionId)) {
        const result = await consumeSessionQuery(normalizedSessionId);
        return res.status(200).json({
          ok: result.ok,
          used: result.used,
          remaining: result.remaining,
          emailRequired: result.emailRequired,
          freeQuota: result.freeQuota,
        });
      }
      return res.status(400).json({ error: "Valid email or sessionId required" });
    }

    // ── action: "register" — save email for first-time gate ──────────────────
    if (action === "register") {
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(200).json({ ok: false, error: "Invalid email" });
      }

      const key = "gate:" + normalizedEmail;
      const existing = await getDurableJson(key);
      if (!existing) {
        await setDurableJson(
          key,
          { queries: [], emailVerified: false, registeredAt: Date.now() },
          { ttlSeconds: GATE_REGISTER_TTL_SECONDS },
        );
      }

      if (isValidSessionId(normalizedSessionId)) {
        await migrateSessionQuotaToEmail(normalizedSessionId, normalizedEmail);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch {
    return res.status(500).json({ error: "gate_error" });
  }
}
