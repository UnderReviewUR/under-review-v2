// api/gate.js
// Tracks free-tier query usage and handles email gate.
// Free tier: N questions per UTC calendar day per email (authoritative when GATE_SERVER_QUOTA_ENFORCE=1).
// Client mirrors via freeQuota payloads (src/lib/freeTierLimits.js).
// Uses Vercel KV if available, falls back to in-memory (resets on cold start).
// No user accounts. Identity = email stored in localStorage.

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
  consumeGateQuery,
  FREE_QUERIES_PER_DAY,
  getFreeQuotaStatus,
  isGateServerQuotaEnforce,
} from "./_gateQuota.js";

const TAKE_TOKEN_TTL_MS = 10 * 60 * 1000;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    const { action, email, accessToken, fingerprint: _fingerprint } = req.body || {};

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

      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();

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

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email required" });
      }

      if (isGateServerQuotaEnforce()) {
        const check = await checkGateQuotaAllowed(normalizedEmail);
        if (!check.allowed && check.reason === "limit_reached") {
          return res.status(200).json({
            ok: false,
            reason: "limit_reached",
            used: check.freeQuota.used,
            limit: check.freeQuota.limit,
            remaining: check.freeQuota.remaining,
            freeQuota: check.freeQuota,
          });
        }
      } else {
        const freeQuota = await getFreeQuotaStatus(normalizedEmail);
        const usedToday = freeQuota.used;
        if (usedToday >= FREE_QUERIES_PER_DAY) {
          return res.status(200).json({
            ok: false,
            reason: "limit_reached",
            used: usedToday,
            limit: FREE_QUERIES_PER_DAY,
            freeQuota,
          });
        }
      }

      const expiresAt = new Date(Date.now() + TAKE_TOKEN_TTL_MS).toISOString();
      const takeToken = signToken(
        {
          purpose: "ur-take",
          email: normalizedEmail,
          tier: "free",
          expiresAt,
        },
        secret,
      );
      const freeQuota = await getFreeQuotaStatus(normalizedEmail);
      return res.status(200).json({
        takeToken,
        expiresInSeconds: Math.floor(TAKE_TOKEN_TTL_MS / 1000),
        freeQuota,
      });
    }

    // ── action: "check" — can this user ask a question? ──────────────────────
    if (action === "check") {
      if (!email || !isValidEmail(email)) {
        return res.status(200).json({ allowed: false, reason: "email_required" });
      }

      const check = await checkGateQuotaAllowed(email);
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

    // ── action: "consume" — record that a query was used (legacy / debug) ─────
    if (action === "consume") {
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email" });
      }

      const result = await consumeGateQuery(email);
      return res.status(200).json({
        ok: result.ok,
        used: result.used,
        remaining: result.remaining,
        freeQuota: result.freeQuota,
      });
    }

    // ── action: "register" — save email for first-time gate ──────────────────
    if (action === "register") {
      if (!email || !isValidEmail(email)) {
        return res.status(200).json({ ok: false, error: "Invalid email" });
      }

      const key = "gate:" + email.toLowerCase().trim();
      const existing = await getDurableJson(key);
      if (!existing) {
        await setDurableJson(
          key,
          { queries: [], emailVerified: false, registeredAt: Date.now() },
          { ttlSeconds: 60 * 60 * 24 * 8 },
        );
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch {
    return res.status(500).json({ error: "gate_error" });
  }
}
