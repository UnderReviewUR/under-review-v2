/** Shared rules for dynamic home prompts — hide “live / pre-match” nudges once the underlying event is done. */

export function isTennisMatchFinished(m) {
  const s = String(m?.raw?.event_status || m?.raw?.status || "").trim().toLowerCase();
  if (!s) return false;
  return (
    s.includes("finished") ||
    s.includes("final") ||
    s.includes("ended") ||
    s.includes("retired") ||
    s.includes("walkover") ||
    s.includes("walk over") ||
    s.includes("defaulted") ||
    s.includes("cancelled") ||
    s.includes("canceled") ||
    s.includes("postponed")
  );
}

/** F1 “next” race row, or null once that GP is complete (no race-day prompt). */
export function getF1NextRaceForHomePrompts(f1Data) {
  const nextRace = f1Data?.schedule?.races?.find((r) => r?.is_next);
  if (!nextRace || nextRace.completed) return null;
  return nextRace;
}
