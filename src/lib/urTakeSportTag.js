/**
 * Header sport chip for UR Take cards: sport only, or "SPORT · PARLAY" when callType is parlay.
 */

import { classifyWcQuestionIntent, WC_INTENT } from "../../shared/wcUrTakeIntent.js";
import { isNavSportVisible } from "../../shared/siteSportVisibility.js";
import { hasNflAskLexicon, hasLaligaAskLexicon } from "../../shared/urTakeSportRouting.js";

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
  const q = String(question || "");
  const explicit = String(sport || structured?.sport || message?.sport || "").trim().toLowerCase();

  // WC product surface is off — never paint WORLD CUP on live NFL/La Liga cards.
  if (!isNavSportVisible("worldcup")) {
    if (explicit === "worldcup" || !explicit || explicit === "generic") {
      if (hasNflAskLexicon(q)) return "nfl";
      if (hasLaligaAskLexicon(q)) return "laliga";
      if (explicit === "worldcup") return "nfl";
    }
  }

  if (explicit && explicit !== "generic" && explicit !== "worldcup") return explicit;
  if (explicit === "worldcup" && isNavSportVisible("worldcup")) return "worldcup";

  const telemetrySport = String(message?.urTakeTelemetry?.sport || "").trim().toLowerCase();
  if (telemetrySport && telemetrySport !== "generic" && telemetrySport !== "worldcup") {
    return telemetrySport;
  }
  if (telemetrySport === "worldcup" && isNavSportVisible("worldcup")) return "worldcup";

  if (isNavSportVisible("worldcup")) {
    const wcIntent = String(
      message?.urTakeTelemetry?.wcIntent || message?.wcIntent || "",
    ).toUpperCase();
    if (wcIntent && wcIntent !== WC_INTENT.UNCLASSIFIED && wcIntent !== WC_INTENT.CONTINUATION) {
      return "worldcup";
    }

    const classified = classifyWcQuestionIntent(q);
    if (classified && classified !== WC_INTENT.UNCLASSIFIED && classified !== WC_INTENT.CONTINUATION) {
      return "worldcup";
    }
  }

  if (hasNflAskLexicon(q)) return "nfl";
  if (hasLaligaAskLexicon(q)) return "laliga";

  return explicit && explicit !== "worldcup" ? explicit : "generic";
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
