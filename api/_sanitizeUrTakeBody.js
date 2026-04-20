// api/_sanitizeUrTakeBody.js — allowlist + size caps for client POST bodies to /api/ur-take.
import { getEnv } from "./_env.js";

const ALLOWED_KEYS = new Set([
  "question",
  "userEmail",
  "sportHint",
  "teamHint",
  "players",
  "context",
  "liveMatches",
  "golfContext",
  "nbaContext",
  "mlbContext",
  "f1Context",
  "nflContext",
  "matchupContext",
  "image",
  "history",
]);

const DEFAULT_MAX_QUESTION = 12000;
const DEFAULT_MAX_JSON_CHARS = 450000;
const DEFAULT_MAX_HISTORY = 36;
const DEFAULT_MAX_LIVE_MATCHES = 16;
const DEFAULT_IMAGE_B64_CHARS = 1_800_000;

function numEnv(name, fallback) {
  const v = getEnv(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function truncateString(s, max) {
  if (typeof s !== "string") return s;
  return s.length > max ? s.slice(0, max) : s;
}

function jsonByteLengthWithoutImageBase64(out) {
  try {
    const clone = JSON.parse(JSON.stringify(out));
    if (clone.image && typeof clone.image === "object") {
      clone.image = { ...clone.image, base64: "" };
    }
    return JSON.stringify(clone).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function sanitizeValue(key, val, depth, limits) {
  if (depth > 8) return "[depth exceeded]";

  if (key === "question") {
    return typeof val === "string"
      ? truncateString(val, limits.maxQuestion)
      : String(val ?? "").slice(0, limits.maxQuestion);
  }

  if (key === "userEmail") {
    const e = String(val ?? "").trim().slice(0, 320);
    return e || null;
  }

  if (key === "sportHint") {
    return typeof val === "string" ? val.slice(0, 64) : val;
  }

  if (key === "teamHint") {
    return typeof val === "string" ? val.slice(0, 8).toUpperCase() : null;
  }

  if (key === "history") {
    if (!Array.isArray(val)) return [];
    return val.slice(0, limits.maxHistory).map((h) => {
      if (!h || typeof h !== "object") return { role: "user", content: "" };
      const role = h.role === "assistant" ? "assistant" : "user";
      const content =
        typeof h.content === "string"
          ? truncateString(h.content, 12000)
          : String(h.content ?? "").slice(0, 12000);
      return { role, content };
    });
  }

  if (key === "liveMatches") {
    if (!Array.isArray(val)) return [];
    return val.slice(0, limits.maxLiveMatches);
  }

  if (key === "image") {
    if (!val || typeof val !== "object") return null;
    const base64 =
      typeof val.base64 === "string"
        ? val.base64.slice(0, limits.maxImageB64)
        : "";
    const mediaType =
      typeof val.mediaType === "string" ? val.mediaType.slice(0, 120) : "image/jpeg";
    if (!base64) return null;
    return { base64, mediaType };
  }

  if (
    key === "players" ||
    key === "context" ||
    key === "golfContext" ||
    key === "nbaContext" ||
    key === "mlbContext" ||
    key === "f1Context" ||
    key === "nflContext" ||
    key === "matchupContext"
  ) {
    if (val === null || val === undefined) return val;
    if (typeof val === "object") {
      try {
        const s = JSON.stringify(val);
        if (s.length > limits.maxJsonChars) {
          return {
            _note:
              "Context exceeded server size cap — narrowed question or remove attachments.",
          };
        }
        return JSON.parse(s);
      } catch {
        return null;
      }
    }
    return val;
  }

  return val;
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, body: object } | { ok: false, error: string, code?: string }}
 */
export function sanitizeUrTakeBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object", code: "invalid_body" };
  }

  const limits = {
    maxQuestion: numEnv("UR_TAKE_MAX_QUESTION_CHARS", DEFAULT_MAX_QUESTION),
    maxJsonChars: numEnv("UR_TAKE_MAX_JSON_CHARS", DEFAULT_MAX_JSON_CHARS),
    maxHistory: numEnv("UR_TAKE_MAX_HISTORY", DEFAULT_MAX_HISTORY),
    maxLiveMatches: numEnv("UR_TAKE_MAX_LIVE_MATCHES", DEFAULT_MAX_LIVE_MATCHES),
    maxImageB64: numEnv("UR_TAKE_MAX_IMAGE_B64_CHARS", DEFAULT_IMAGE_B64_CHARS),
  };

  const out = {};
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    out[key] = sanitizeValue(key, body[key], 0, limits);
  }

  try {
    const imageB64Len =
      typeof out.image?.base64 === "string" ? out.image.base64.length : 0;
    if (imageB64Len > limits.maxImageB64) {
      return {
        ok: false,
        error: "Image attachment exceeds server size limit — try a smaller screenshot or crop.",
        code: "image_too_large",
      };
    }

    const nonImageLen = jsonByteLengthWithoutImageBase64(out);
    if (!Number.isFinite(nonImageLen)) {
      return { ok: false, error: "Payload could not be serialized", code: "serialize_failed" };
    }
    if (nonImageLen > limits.maxJsonChars) {
      return {
        ok: false,
        error:
          "Context payload too large — shorten the question or drop heavy context fields.",
        code: "context_too_large",
      };
    }

    const maxTotal = limits.maxJsonChars + limits.maxImageB64;
    if (nonImageLen + imageB64Len > maxTotal) {
      return {
        ok: false,
        error:
          "Combined request too large — try a smaller screenshot, fewer chat history rows, or type the player line instead of a huge image.",
        code: "payload_too_large",
      };
    }
  } catch {
    return { ok: false, error: "Payload could not be serialized", code: "serialize_failed" };
  }

  return { ok: true, body: out };
}
