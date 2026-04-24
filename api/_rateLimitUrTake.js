// api/_rateLimitUrTake.js — sliding-window rate limits for UR TAKE, backed by durable store.
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

const WINDOW_MS = 60_000;
const KV_TTL_SECONDS = 65; // window + 5s buffer so KV entry outlives the window

function limitFromEnv(name, fallback) {
  const v = Number(getEnv(name));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

/**
 * @param {string} key
 * @param {number} maxPerWindow
 * @returns {Promise<boolean>} true if allowed
 */
export async function allowRateLimit(key, maxPerWindow) {
  if (!key || maxPerWindow <= 0) return true;
  const now = Date.now();
  const storeKey = `rl:${key}`;

  let bucket = await getDurableJson(storeKey);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + WINDOW_MS };
  }
  bucket.count += 1;
  await setDurableJson(storeKey, bucket, { ttlSeconds: KV_TTL_SECONDS });
  return bucket.count <= maxPerWindow;
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
