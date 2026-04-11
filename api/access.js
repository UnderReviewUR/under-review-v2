// api/access.js
// Validates owner and friend access codes.
// Owner code: permanent, unlimited.
// Friend codes: expire after 120 days, unlimited during window.
// Returns a signed token stored in localStorage — no login, no account.

import { applyCors } from "./_cors.js";
import crypto from "crypto";

const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "ur-dev-secret-changeme";

// ── Code registry ─────────────────────────────────────────────────────────────
// Set these in Vercel environment variables — never hardcode in production.
// OWNER_CODE=yourprivatecode
// FRIEND_CODES=code1:120,code2:120,code3:120
// (format: code:days_valid)

function getCodeRegistry() {
  const registry = {};

  // Owner — permanent
  const ownerCode = process.env.OWNER_CODE;
  if (ownerCode) {
    registry[ownerCode.toLowerCase()] = { tier: "owner", expiresAt: null };
  }

  // Friends — parse "code:days,code:days" from env
  const friendCodes = process.env.FRIEND_CODES || "";
  for (const entry of friendCodes.split(",")) {
    const [code, days] = entry.trim().split(":");
    if (!code) continue;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(days || "120", 10));
    registry[code.toLowerCase()] = { tier: "friend", expiresAt: expiresAt.toISOString() };
  }

  return registry;
}

// ── Token signing (simple HMAC — no JWT library needed) ──────────────────────
function signToken(payload) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("hex");
  return Buffer.from(data).toString("base64") + "." + sig;
}

function verifyToken(token) {
  try {
    const [b64, sig] = token.split(".");
    const data = Buffer.from(b64, "base64").toString();
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, GET, OPTIONS" })) return;

  // GET /api/access?token=xxx — verify an existing token
  if (req.method === "GET") {
    const token = req.query.token;
    if (!token) return res.status(400).json({ valid: false });
    const payload = verifyToken(token);
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
    const normalizedCode = String(code || "").trim().toLowerCase(); const entry = registry[normalizedCode];

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

    const token = signToken(payload);
    return res.status(200).json({ valid: true, tier: entry.tier, token, expiresAt: entry.expiresAt });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
