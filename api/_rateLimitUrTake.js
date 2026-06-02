// api/_rateLimitUrTake.js — sliding-window rate limits for UR TAKE (memory + optional KV later).
import { getEnv } from "./_env.js";

const buckets = new Map();

const WINDOW_MS = 60_000;

function limitFromEnv(name, fallback) {
  const v = Number(getEnv(name));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

function cleanup(now) {
  for (const [k, b] of buckets) {
    if (now > b.reset) buckets.delete(k);
  }
}

/**
 * @param {string} key
 * @param {number} maxPerWindow
 * @returns {boolean} true if allowed
 */
export function allowRateLimit(key, maxPerWindow) {
  if (!key || maxPerWindow <= 0) return true;
  const now = Date.now();
  if (buckets.size > 5000) cleanup(now);

  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS };
  }
  b.count += 1;
  buckets.set(key, b);
  return b.count <= maxPerWindow;
}

export function getClientIp(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  if (forwarded) return forwarded;
  const real = String(req.headers?.["x-real-ip"] || "").trim();
  if (real) return real;
  return String(req.socket?.remoteAddress || "unknown");
}

export function ipLimit() {
  return limitFromEnv("UR_TAKE_RATE_IP_PER_MIN", 90);
}

export function emailLimit() {
  return limitFromEnv("UR_TAKE_RATE_EMAIL_PER_MIN", 45);
}

/** Pro status / Stripe email sync — anti-enumeration (override via PRO_STATUS_RATE_IP_PER_MIN). */
export function proStatusIpLimit() {
  return limitFromEnv("PRO_STATUS_RATE_IP_PER_MIN", 3);
}

/** POST /api/gate — all actions (override via GATE_IP_PER_MIN). */
export function gateIpPerMin() {
  return limitFromEnv("GATE_IP_PER_MIN", 30);
}

/** POST /api/gate issue_take_token only (override via GATE_ISSUE_TAKE_TOKEN_IP_PER_HOUR). */
export function gateIssueTakeTokenIpPerHour() {
  return limitFromEnv("GATE_ISSUE_TAKE_TOKEN_IP_PER_HOUR", 10);
}

const windowBuckets = new Map();

/**
 * Sliding-window rate limit with configurable duration.
 * @param {string} key
 * @param {number} maxPerWindow
 * @param {number} windowMs
 * @returns {boolean} true if allowed
 */
export function allowRateLimitWindow(key, maxPerWindow, windowMs) {
  if (!key || maxPerWindow <= 0) return true;
  const win = Number(windowMs) > 0 ? Number(windowMs) : WINDOW_MS;
  const now = Date.now();
  if (windowBuckets.size > 5000) {
    for (const [k, b] of windowBuckets) {
      if (now > b.reset) windowBuckets.delete(k);
    }
  }

  let b = windowBuckets.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + win };
  }
  b.count += 1;
  windowBuckets.set(key, b);
  return b.count <= maxPerWindow;
}
