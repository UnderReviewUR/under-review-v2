import {
  filterIrrelevantPlayersFromPreviewText,
  polishHomePreviewField,
} from "../shared/nbaHomePreviewFilter.js";

const DAILY_TAKE_REFUSAL_PATTERNS = [
  /\bi appreciate the detailed setup\b/i,
  /\bnba context issue\b/i,
  /\bsport mismatch\b/i,
  /\btodaysgames is empty\b/i,
  /\bcontext payload\b/i,
  /\bno active game between\b/i,
  /\bthose are mlb terms\b/i,
  /\bthose are baseball terms\b/i,
  /\bnot nba terminology\b/i,
];

/**
 * @param {string} text
 */
export function isDailyTakePreviewRefusalText(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  return DAILY_TAKE_REFUSAL_PATTERNS.some((re) => re.test(s));
}

/**
 * Sanitize stored/generated daily preview before KV write or public GET.
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function sanitizeDailyTakePreviewPayload(payload) {
  if (!payload || payload.ok !== true) return payload;
  const headline = polishHomePreviewField(
    filterIrrelevantPlayersFromPreviewText(String(payload.headline || "")),
    280,
  );
  const bodyChunk = polishHomePreviewField(
    filterIrrelevantPlayersFromPreviewText(String(payload.bodyChunk || "")),
    520,
  );
  const closing = polishHomePreviewField(
    filterIrrelevantPlayersFromPreviewText(String(payload.closing || "")),
    240,
  );
  const combined = `${headline} ${bodyChunk} ${closing}`.trim();
  if (/biyombo|david\s+jones/i.test(combined)) {
    return { ...payload, ok: false, error: "preview_blocked_irrelevant_player" };
  }
  if (isDailyTakePreviewRefusalText(combined)) {
    return { ...payload, ok: false, error: "preview_blocked_meta_refusal" };
  }
  return { ...payload, headline, bodyChunk, closing };
}
