// api/_env.js
// Centralized environment reads — one place to audit secrets and config.

import crypto from "crypto";

/**
 * Read an environment variable.
 * By default, empty string is treated as unset (returns undefined).
 *
 * @param {string} name
 * @param {{ treatEmptyAsMissing?: boolean, required?: boolean, productionRequired?: boolean }} [options]
 * @returns {string | undefined}
 */
export function getEnv(name, options = {}) {
  const {
    treatEmptyAsMissing = true,
    required = false,
    productionRequired = false,
  } = options;
  void required;
  void productionRequired;
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  if (treatEmptyAsMissing && raw === "") return undefined;
  return raw;
}

/** True when running on Vercel production (VERCEL_ENV === "production"). */
export function isProduction() {
  return getEnv("VERCEL_ENV") === "production";
}

/** Primary and alternate env keys (trimmed; whitespace-only counts as unset). */
const ACCESS_TOKEN_SECRET_KEYS = ["ACCESS_TOKEN_SECRET", "UR_ACCESS_TOKEN_SECRET"];

/**
 * Resolved HMAC secret for access / UR TAKE tokens. Tries alternate names; trims whitespace.
 * @returns {string | undefined}
 */
export function getResolvedAccessTokenSecret() {
  for (const key of ACCESS_TOKEN_SECRET_KEYS) {
    const raw = process.env[key];
    if (raw === undefined || raw === "") continue;
    const trimmed = String(raw).trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

export function isAccessTokenSecretConfigured() {
  return Boolean(getResolvedAccessTokenSecret());
}

/** Shown in API responses when production is missing ACCESS_TOKEN_SECRET (also use in Vercel dashboard). */
export const ACCESS_TOKEN_SECRET_MISSING_MESSAGE =
  "Server misconfiguration: ACCESS_TOKEN_SECRET is not set for this deployment. In Vercel → Settings → Environment Variables: add ACCESS_TOKEN_SECRET (long random string), enable it for Production (and Preview if you test on *.vercel.app), save, then Redeploy. Check GET /api/health — accessTokenSecretConfigured should be true.";

// ── ACCESS_TOKEN_SECRET (dev fallback is unstable by design) ─────────────────
let devAccessTokenSecretCache = null;

function getDevAccessTokenSecretFallback() {
  if (devAccessTokenSecretCache === null) {
    devAccessTokenSecretCache =
      "DO_NOT_USE_IN_PROD_" + crypto.randomBytes(12).toString("hex");
  }
  return devAccessTokenSecretCache;
}

/**
 * Respond with 500 when ACCESS_TOKEN_SECRET is missing in production (used by gate.js too).
 *
 * @param {import("http").ServerResponse} res
 */
export function sendAccessTokenSecretMissingError(res) {
  console.error(
    "[env] ACCESS_TOKEN_SECRET is required in production — refusing to sign or verify tokens",
    {
      vercelEnv: process.env.VERCEL_ENV,
      has_ACCESS_TOKEN_SECRET: Boolean(process.env.ACCESS_TOKEN_SECRET),
      has_UR_ACCESS_TOKEN_SECRET: Boolean(process.env.UR_ACCESS_TOKEN_SECRET),
    },
  );
  res.status(500).json({
    error: "server_misconfigured",
    message: ACCESS_TOKEN_SECRET_MISSING_MESSAGE,
  });
}

/**
 * Resolves HMAC secret for signing access/pro tokens.
 * In production, ACCESS_TOKEN_SECRET is mandatory — otherwise responds 500 and returns null.
 * In dev/preview, uses a random per-cold-start fallback (never a hardcoded string).
 *
 * @param {import("http").ServerResponse} res
 * @returns {string | null}
 */
export function resolveAccessTokenSecretForHandler(res) {
  const secret = getResolvedAccessTokenSecret();
  if (secret) return secret;

  if (isProduction()) {
    sendAccessTokenSecretMissingError(res);
    return null;
  }

  return getDevAccessTokenSecretFallback();
}

/**
 * Same secret as resolveAccessTokenSecretForHandler, without needing `res`.
 * Production: ACCESS_TOKEN_SECRET only (no random fallback).
 * Non-production: dev per-process fallback when unset.
 * @returns {string | null}
 */
export function getAccessTokenSecretSync() {
  const secret = getResolvedAccessTokenSecret();
  if (secret) return secret;
  if (isProduction()) return null;
  return getDevAccessTokenSecretFallback();
}

// ── Owner code (production: OWNER_CODE only; dev: OWNER_CODE_DEV fallback) ─
let warnedOwnerCodeMissingInProd = false;

function warnOwnerCodeUnsetInProduction() {
  if (warnedOwnerCodeMissingInProd) return;
  if (isProduction() && !getEnv("OWNER_CODE")) {
    warnedOwnerCodeMissingInProd = true;
    console.warn(
      "[access] OWNER_CODE is not configured in production — no owner code configured.",
    );
  }
}

/**
 * Owner redeem code: production uses OWNER_CODE only.
 * Non-production: OWNER_CODE, else OWNER_CODE_DEV (never hardcoded).
 */
export function resolveOwnerCodeForRegistry() {
  warnOwnerCodeUnsetInProduction();
  const primary = getEnv("OWNER_CODE");
  if (primary) return primary;
  if (isProduction()) return undefined;
  return getEnv("OWNER_CODE_DEV");
}
