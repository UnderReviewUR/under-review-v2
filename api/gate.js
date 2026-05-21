// api/gate.js
// Tracks free-tier query usage and handles email gate.
// Free tier: N lifetime free questions per email (never resets). Match src/lib/freeTierLimits.js.
// Conversion: lifetime=2 is aggressive; consider weekly/daily reset — see freeTierLimits.js note.
// Uses Vercel KV if available, falls back to in-memory (resets on cold start).
// No user accounts. Identity = email stored in localStorage.

import { applyCors } from "./_cors.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { signToken, verifyToken } from "./_hmacToken.js";
import {
  getAccessTokenSecretSync,
  sendAccessTokenSecretMissingError,
} from "./_env.js";

const GATE_TTL_SECONDS = 60 * 60 * 24 * 8; // 8 days

async function getRecord(email) {
  const key = "gate:" + email.toLowerCase().trim();
  return await getDurableJson(key);
}

async function setRecord(email, record) {
  const key = "gate:" + email.toLowerCase().trim();
  await setDurableJson(key, record, { ttlSeconds: GATE_TTL_SECONDS });
}

const FREE_QUERIES_LIFETIME = 2;
const TAKE_TOKEN_TTL_MS = 10 * 60 * 1000;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, email, accessToken, fingerprint: _fingerprint } = req.body || {};

  // ── action: "issue_take_token" — short-lived HMAC for /api/ur-take + /api/performance ──
  if (action === "issue_take_token") {
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

    const record = (await getRecord(email)) || { queries: [], emailVerified: true };
    const now = Date.now();
    const queries = record.queries || [];

    if (queries.length >= FREE_QUERIES_LIFETIME) {
      return res.status(200).json({
        ok: false,
        reason: "limit_reached",
        used: queries.length,
        limit: FREE_QUERIES_LIFETIME,
      });
    }

    const expiresAt = new Date(now + TAKE_TOKEN_TTL_MS).toISOString();
    const takeToken = signToken(
      {
        purpose: "ur-take",
        email: normalizedEmail,
        tier: "free",
        expiresAt,
      },
      secret,
    );
    return res.status(200).json({
      takeToken,
      expiresInSeconds: Math.floor(TAKE_TOKEN_TTL_MS / 1000),
    });
  }

  // ── action: "check" — can this user ask a question? ──────────────────────
  if (action === "check") {
    if (!email || !isValidEmail(email)) {
      return res.status(200).json({ allowed: false, reason: "email_required" });
    }

    const record = await getRecord(email) || { queries: [], emailVerified: true };
    const queries = record.queries || [];

    if (queries.length >= FREE_QUERIES_LIFETIME) {
      return res.status(200).json({
        allowed: false,
        reason: "limit_reached",
        used: queries.length,
        limit: FREE_QUERIES_LIFETIME,
      });
    }

    return res.status(200).json({
      allowed: true,
      used: queries.length,
      remaining: FREE_QUERIES_LIFETIME - queries.length,
      limit: FREE_QUERIES_LIFETIME,
    });
  }

  // ── action: "consume" — record that a query was used ─────────────────────
  if (action === "consume") {
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const record = await getRecord(email) || { queries: [], emailVerified: true };
    const now = Date.now();
    const queries = [...(record.queries || []), now];

    await setRecord(email, { ...record, queries, lastSeen: now });

    return res.status(200).json({
      ok: true,
      used: queries.length,
      remaining: Math.max(0, FREE_QUERIES_LIFETIME - queries.length),
    });
  }

  // ── action: "register" — save email for first-time gate ──────────────────
  if (action === "register") {
    if (!email || !isValidEmail(email)) {
      return res.status(200).json({ ok: false, error: "Invalid email" });
    }

    const existing = await getRecord(email);
    if (!existing) {
      await setRecord(email, { queries: [], emailVerified: false, registeredAt: Date.now() });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
  } catch {
    return res.status(500).json({ error: "gate_error" });
  }
}
