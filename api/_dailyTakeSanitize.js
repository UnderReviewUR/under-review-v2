import {
  filterIrrelevantPlayersFromPreviewText,
  polishHomePreviewField,
} from "../shared/nbaHomePreviewFilter.js";

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
  if (/biyombo/i.test(`${headline} ${bodyChunk} ${closing}`)) {
    return { ...payload, ok: false, error: "preview_blocked_irrelevant_player" };
  }
  return { ...payload, headline, bodyChunk, closing };
}
