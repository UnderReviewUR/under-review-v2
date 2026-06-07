/**
 * World Cup scrape scheduler priority (higher runs first under MAX_SCRAPES_PER_TICK cap).
 */

export const WC_SCRAPE_PRIORITY = {
  LIVE: 100,
  RAMP_T90: 90,
  RAMP_PRE: 70,
  STANDINGS: 50,
  PLAYERS: 45,
  INJURIES: 40,
  GOLDEN_BOOT: 35,
  OUTRIGHTS: 30,
  TOURNAMENT_SIM: 28,
  API_FOOTBALL: 26,
  FINALIZE: 20,
};

const MS_T90 = 90 * 60 * 1000;

/**
 * @param {{ gameStartMs?: number, meta?: { scrapeMode?: string } }} target
 * @param {number} [nowMs]
 */
export function priorityForWcMatchBundleTarget(target, nowMs = Date.now()) {
  const mode = String(target.meta?.scrapeMode || "");
  if (mode === "live") return WC_SCRAPE_PRIORITY.LIVE;
  if (mode === "finalize") return WC_SCRAPE_PRIORITY.FINALIZE;

  const commenceTs = Number(target.gameStartMs);
  const T = Number.isFinite(commenceTs) ? commenceTs - nowMs : NaN;
  if (Number.isFinite(T) && T > 0 && T <= MS_T90) return WC_SCRAPE_PRIORITY.RAMP_T90;
  return WC_SCRAPE_PRIORITY.RAMP_PRE;
}

/**
 * @param {Array<{ priority?: number, gameStartMs?: number }>} targets
 */
export function sortScrapeTargetsByPriority(targets) {
  return [...(targets || [])].sort((a, b) => {
    const pd = (b.priority ?? 0) - (a.priority ?? 0);
    if (pd !== 0) return pd;
    return (Number(a.gameStartMs) || 0) - (Number(b.gameStartMs) || 0);
  });
}
