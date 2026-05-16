/** Standard Elo win probability with football draw adjustment (~26.5% at neutral venue). */
export function eloWinProbability(eloA, eloB) {
  const eloDiff = eloA - eloB;
  const rawWinProb = 1 / (1 + 10 ** (-eloDiff / 400));
  const drawRate = 0.265;
  const winRate = rawWinProb * (1 - drawRate);
  const lossRate = (1 - rawWinProb) * (1 - drawRate);
  return {
    win: Math.round(winRate * 100),
    draw: Math.round(drawRate * 100),
    loss: Math.round(lossRate * 100),
  };
}

/** Host nations get +50 Elo for home-advantage modeling. */
export function applyHostAdvantage(elo, isHost) {
  return isHost ? elo + 50 : elo;
}

/** Match odds from team abbreviations and static team table. */
export function formatMatchOdds(teamA, teamB, teamsData) {
  const a = teamsData.find((t) => t.abbreviation === teamA);
  const b = teamsData.find((t) => t.abbreviation === teamB);
  if (!a || !b) return null;
  const eloA = applyHostAdvantage(a.eloRating, a.isHost);
  const eloB = applyHostAdvantage(b.eloRating, b.isHost);
  const probs = eloWinProbability(eloA, eloB);
  return {
    teamA: { abbr: teamA, winPct: probs.win },
    draw: probs.draw,
    teamB: { abbr: teamB, winPct: probs.loss },
  };
}
