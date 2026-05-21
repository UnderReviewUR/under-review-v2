/**
 * World Cup 2026 strength tiers for UI + UR Take (Elo used internally only).
 * @param {number} rankInGroup — 0 = top Elo in group, 1 = second, etc.
 * @returns {"Favorite"|"Contender"|"Longshot"}
 */
export function wcStrengthTagForRank(rankInGroup) {
  const r = Number(rankInGroup);
  if (r <= 0) return "Favorite";
  if (r === 1) return "Contender";
  return "Longshot";
}

/**
 * Sort teams by Elo descending and attach strengthTag (no Elo in output).
 * @param {Array<{ name: string, abbreviation: string, eloRating: number, confederation?: string, isHost?: boolean, outrightOdds?: string }>} teams
 */
export function wcTeamsWithStrengthTags(teams) {
  return [...(teams || [])]
    .sort((a, b) => Number(b.eloRating) - Number(a.eloRating))
    .map((t, i) => ({
      name: t.name,
      abbreviation: t.abbreviation,
      confederation: t.confederation,
      isHost: Boolean(t.isHost),
      outrightOdds: t.outrightOdds,
      strengthTag: wcStrengthTagForRank(i),
    }));
}
