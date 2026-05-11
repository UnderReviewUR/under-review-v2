/**
 * Header sport chip for UR Take cards: sport only, or "SPORT · PARLAY" when callType is parlay.
 */
export function formatUrTakeSportTag(sport, callType) {
  const sp = String(sport || "generic").toUpperCase();
  if (String(callType || "").toLowerCase() === "parlay") return `${sp} · PARLAY`;
  return sp;
}
