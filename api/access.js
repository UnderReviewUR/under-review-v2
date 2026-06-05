// api/access.js
// Validates owner and friend access codes.
// Owner code: permanent, unlimited.
// Friend codes: expire on a fixed date you set, unlimited during window.
// Returns a signed token stored in localStorage — no login, no account.

import { applyCors } from "./_cors.js";
import { signToken, verifyToken } from "./_hmacToken.js";
import {
  getEnv,
  resolveAccessTokenSecretForHandler,
  resolveOwnerCodeForRegistry,
} from "./_env.js";

// ── Code registry ─────────────────────────────────────────────────────────────
// Set these in Vercel environment variables — never hardcode in production.
// OWNER_CODE=yourprivatecode
// OWNER_CODE_DEV=... (non-production fallback only)
// FRIEND_CODES=code1:2026-08-13,code2:2026-08-13,code3:2026-08-13
// (format: code:YYYY-MM-DD expiry date)
// Leaving the date blank means the code never expires.

function getCodeRegistry() {
  const registry = {};

  const ownerCode = resolveOwnerCodeForRegistry();
  if (ownerCode) {
    registry[ownerCode.toLowerCase()] = { tier: "owner", expiresAt: null };
  }

  const friendCodes = getEnv("FRIEND_CODES") || "";
  for (const entry of friendCodes.split(",")) {
    const [code, expiry] = entry.trim().split(":");
    if (!code) continue;
    const expiresAt = expiry ? new Date(expiry).toISOString() : null;
    registry[code.toLowerCase()] = { tier: "friend", expiresAt };
  }

  return registry;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
  if (!applyCors(req, res, { methods: "POST, GET, OPTIONS" })) return;

  const tokenSecret = resolveAccessTokenSecretForHandler(res);
  if (tokenSecret === null) return;

  // GET /api/access?token=xxx — verify an existing token
  if (req.method === "GET") {
    const token = req.query.token;
    if (!token) return res.status(400).json({ valid: false });
    const payload = verifyToken(token, tokenSecret);
    if (!payload) return res.status(200).json({ valid: false });
    if (payload.expiresAt && new Date() > new Date(payload.expiresAt)) {
      return res.status(200).json({ valid: false, reason: "expired" });
    }
    return res.status(200).json({ valid: true, tier: payload.tier, expiresAt: payload.expiresAt });
  }

  // POST /api/access — redeem a code
  if (req.method === "POST") {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "No code provided" });

    const registry = getCodeRegistry();
    const normalizedCode = String(code || "").trim().toLowerCase();
    const entry = registry[normalizedCode];

    if (!entry) {
      return res.status(200).json({ valid: false, error: "Invalid code" });
    }

    // Check friend code expiry
    if (entry.expiresAt && new Date() > new Date(entry.expiresAt)) {
      return res.status(200).json({ valid: false, error: "This code has expired" });
    }

    const payload = {
      tier: entry.tier,
      code: normalizedCode,
      issuedAt: new Date().toISOString(),
      expiresAt: entry.expiresAt,
    };

    const token = signToken(payload, tokenSecret);
    return res.status(200).json({ valid: true, tier: entry.tier, token, expiresAt: entry.expiresAt });
  }

  return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[access]", err?.message || err);
    return res.status(500).json({ error: "access_error" });
  }
}
