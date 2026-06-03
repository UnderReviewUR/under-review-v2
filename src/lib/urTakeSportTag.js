/**
 * Header sport chip for UR Take cards: sport only, or "SPORT · PARLAY" when callType is parlay.
 */
export function formatUrTakeSportTag(sport, callType) {
  const sp = String(sport || "generic").toUpperCase();
  const ct = String(callType || "").toLowerCase();
  if (ct === "parlay") return `${sp} · PARLAY`;
  if (ct === "rules") return `${sp} · RULES`;
  if (ct === "matchup") return `${sp} · MATCHUP`;
  return sp;
}

/** Alias for `formatUrTakeSportTag` (alternate import name). */
export const formatSportTag = formatUrTakeSportTag;
