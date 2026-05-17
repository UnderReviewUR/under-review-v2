/**
 * @param {number | null | undefined} n
 */
export function formatAmericanOddsDisplay(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  const v = Number(n);
  if (v === 0) return "EVEN";
  return v > 0 ? `+${v}` : String(v);
}

/**
 * Top N favorites by win odds (lowest American line).
 * @param {Array<{ player?: string, odds?: number | null }>} outrights
 * @param {number} n
 */
export function pickTopPgaChampionshipOutrightLeaders(outrights, n = 5) {
  return [...(outrights || [])]
    .filter((o) => o?.player && o.odds != null && Number.isFinite(Number(o.odds)))
    .sort((a, b) => Number(a.odds) - Number(b.odds))
    .slice(0, n)
    .map((o) => ({
      player: String(o.player),
      odds: Number(o.odds),
      display: formatAmericanOddsDisplay(Number(o.odds)),
    }));
}
