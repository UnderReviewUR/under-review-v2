/**
 * Header sport chip for UR Take cards: sport only, or "SPORT · PARLAY" when callType is parlay.
 */

import { classifyWcQuestionIntent, WC_INTENT } from "../../shared/wcUrTakeIntent.js";

/**
 * Prefer worldcup (or explicit sport) over API default "generic" when WC intent/structured is known.
 * @param {{
 *   sport?: string | null,
 *   structured?: { sport?: string } | null,
 *   message?: { urTakeTelemetry?: { wcIntent?: string, sport?: string }, wcIntent?: string, sport?: string } | null,
 *   question?: string,
 * }} [opts]
 */
export function resolveUrTakeDisplaySport(opts = {}) {
  const { sport, structured, message, question } = opts;
  const explicit = String(sport || structured?.sport || message?.sport || "").trim().toLowerCase();
  if (explicit && explicit !== "generic") return explicit;

  const telemetrySport = String(message?.urTakeTelemetry?.sport || "").trim().toLowerCase();
  if (telemetrySport && telemetrySport !== "generic") return telemetrySport;

  const wcIntent = String(
    message?.urTakeTelemetry?.wcIntent || message?.wcIntent || "",
  ).toUpperCase();
  if (wcIntent && wcIntent !== WC_INTENT.UNCLASSIFIED && wcIntent !== WC_INTENT.CONTINUATION) {
    return "worldcup";
  }

  const classified = classifyWcQuestionIntent(String(question || ""));
  if (classified && classified !== WC_INTENT.UNCLASSIFIED && classified !== WC_INTENT.CONTINUATION) {
    return "worldcup";
  }

  return explicit || "generic";
}

export function formatUrTakeSportTag(sport, callType) {
  const sp = String(sport || "generic").toUpperCase();
  if (sp === "GENERIC") return "";
  const ct = String(callType || "").toLowerCase();
  if (ct === "parlay") return `${sp} · PARLAY`;
  if (ct === "rules") return `${sp} · RULES`;
  if (ct === "matchup") return `${sp} · MATCHUP`;
  return sp;
}

/** Alias for `formatUrTakeSportTag` (alternate import name). */
export const formatSportTag = formatUrTakeSportTag;
