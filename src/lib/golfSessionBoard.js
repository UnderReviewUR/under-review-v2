/** Live board slice for in-thread structural edge chip (leaderboard + outrights). */
export function buildGolfSessionBoardFromData(golfData) {
  if (!golfData || typeof golfData !== "object") return null;
  const leaderboard =
    golfData?.currentEvent?.leaderboard ??
    golfData?.tournament?.leaderboard ??
    [];
  const outrights = golfData?.odds?.outrights ?? [];
  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    if (!Array.isArray(outrights) || outrights.length === 0) return null;
  }
  return {
    leaderboard: Array.isArray(leaderboard) ? leaderboard.slice(0, 48) : [],
    outrights: Array.isArray(outrights) ? outrights.slice(0, 64) : [],
  };
}
