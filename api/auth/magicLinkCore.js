/**
 * Resend magic-link helpers for Pro login (no passwords).
 */
import crypto from "crypto";
import { deleteDurableJson, getDurableJson, setDurableJson } from "../_durableStore.js";
import { getEnv } from "../_env.js";

export const MAGIC_LINK_GENERIC_MESSAGE =
  "If this email is linked to Pro, you'll receive a login link shortly.";

export const MAGIC_TOKEN_TTL_SECONDS = 20 * 60;
export const MAGIC_TOKEN_VALID_MS = 15 * 60 * 1000;

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_TTL_SECONDS = 3600;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

export function sha256HexUtf8(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}

export function magicRecordKeyFromHash(hexHash) {
  return `magic_${hexHash}`;
}

export function rateLimitEmailKey(email) {
  return `magicrl:email:${String(email || "").toLowerCase()}`;
}

export function rateLimitIpKey(ip) {
  return `magicrl:ip:${String(ip || "unknown")}`;
}

/** @param {number[]} hits */
export function pruneRateHits(hits, now, windowMs = RATE_WINDOW_MS) {
  return (Array.isArray(hits) ? hits : []).filter((t) => now - t < windowMs);
}

/**
 * @returns {Promise<boolean>} true if under limit (and recorded this hit)
 */
export async function recordRateLimitHit(key, maxHits) {
  const now = Date.now();
  const row = (await getDurableJson(key)) || { hits: [] };
  const hits = pruneRateHits(row.hits, now);
  if (hits.length >= maxHits) return false;
  hits.push(now);
  await setDurableJson(key, { hits }, { ttlSeconds: RATE_TTL_SECONDS });
  return true;
}

export async function trySendProMagicLink({ email, clientIp, stripe }) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { outcome: "invalid_email" };
  }

  const ip = String(clientIp || "unknown").slice(0, 128);
  const okEmail = await recordRateLimitHit(rateLimitEmailKey(normalized), MAX_PER_EMAIL);
  const okIp = await recordRateLimitHit(rateLimitIpKey(ip), MAX_PER_IP);
  if (!okEmail || !okIp) {
    return { outcome: "rate_limited" };
  }

  const { hasActiveProSubscription } = await import("../_stripeProSync.js");
  const active = await hasActiveProSubscription(stripe, normalized);
  if (!active) {
    return { outcome: "not_subscribed" };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hash = sha256HexUtf8(rawToken);
  const key = magicRecordKeyFromHash(hash);
  const expiresAt = Date.now() + MAGIC_TOKEN_VALID_MS;
  await setDurableJson(
    key,
    { email: normalized, expiresAt, used: false },
    { ttlSeconds: MAGIC_TOKEN_TTL_SECONDS },
  );

  const base = String(getEnv("APP_BASE_URL") || "https://under-review.app").replace(/\/$/, "");
  const verifyUrl = `${base}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;

  const resendKey = getEnv("RESEND_API_KEY");
  const from = getEnv("AUTH_EMAIL_FROM");
  if (!resendKey || !from) {
    console.warn("[magic-link] RESEND_API_KEY or AUTH_EMAIL_FROM missing — link not emailed");
    await deleteDurableJson(key).catch(() => {});
    return { outcome: "send_config_missing" };
  }

  const subject = "Your UnderReview login link";
  const text = `Here's your secure login link for UnderReview. It expires in 15 minutes and can only be used once.

Login to UnderReview:
${verifyUrl}

If you didn't request this, ignore this email. Your account is safe.

— UnderReview`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [normalized],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[magic-link] Resend failed:", res.status, body);
    await deleteDurableJson(key).catch(() => {});
    return { outcome: "send_failed" };
  }

  return { outcome: "sent" };
}

/**
 * Verify raw token, delete record first (anti-replay), re-check Stripe, issue Pro JWT.
 * @returns {Promise<{ ok: true, token: string, email: string } | { ok: false, reason: string }>}
 */
export async function verifyMagicTokenAndIssuePro(rawToken, stripe, tokenSecret) {
  const raw = String(rawToken || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(raw)) {
    return { ok: false, reason: "invalid" };
  }
  const hash = sha256HexUtf8(raw);
  const key = magicRecordKeyFromHash(hash);

  const record = await getDurableJson(key);
  await deleteDurableJson(key).catch(() => {});

  if (!record || typeof record !== "object") {
    return { ok: false, reason: "invalid" };
  }
  if (record.used === true) {
    return { ok: false, reason: "used" };
  }
  const email = String(record.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid" };
  }
  const exp = Number(record.expiresAt);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return { ok: false, reason: "expired" };
  }

  const { hasActiveProSubscription, buildProStatusResponse } = await import("../_stripeProSync.js");
  const still = await hasActiveProSubscription(stripe, email);
  if (!still) {
    return { ok: false, reason: "subscription_inactive" };
  }

  const issued = await buildProStatusResponse(email, stripe, tokenSecret);
  if (!issued.ok || !issued.body?.token) {
    return { ok: false, reason: "issue_failed" };
  }

  return { ok: true, token: issued.body.token, email };
}
