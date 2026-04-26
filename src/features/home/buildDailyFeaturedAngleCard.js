function normalizeStatusClass(value) {
  const s = String(value || "").toLowerCase();
  if (!s) return "";
  if (s.includes("questionable")) return "questionable";
  if (s.includes("doubtful")) return "doubtful";
  if (s.includes("out")) return "out";
  if (s.includes("inactive")) return "out";
  if (s.includes("gtd")) return "questionable";
  return "";
}

function seriesGameNumberFor(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home) return 0;
  const row = (playoffSeries || []).find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played = (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played + 1;
}

function injuryImpactCountForGame(game, bdlAvailability) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !bdlAvailability || typeof bdlAvailability !== "object") return 0;
  let count = 0;
  for (const meta of Object.values(bdlAvailability)) {
    const team = String(meta?.team || "").toUpperCase();
    if (team !== away && team !== home) continue;
    const statusClass = normalizeStatusClass(meta?.statusClass || meta?.status || meta?.availability);
    if (statusClass) count += 1;
  }
  return count;
}

function chooseFeaturedGame(games, bdlAvailability, playoffSeries) {
  if (!Array.isArray(games) || games.length === 0) return null;
  const preGames = games.filter((g) => {
    const s = String(g?.state || "").toLowerCase();
    return s === "pre" || s === "scheduled";
  });
  const candidates = preGames.length > 0 ? preGames : games;
  const scored = candidates.map((g, idx) => ({
    game: g,
    idx,
    injuryImpactCount: injuryImpactCountForGame(g, bdlAvailability),
    seriesGameNumber: seriesGameNumberFor(g, playoffSeries),
  }));
  const maxInjury = Math.max(0, ...scored.map((s) => s.injuryImpactCount));
  if (maxInjury > 0) {
    return scored
      .filter((s) => s.injuryImpactCount === maxInjury)
      .sort((a, b) => b.seriesGameNumber - a.seriesGameNumber || a.idx - b.idx)[0];
  }
  const maxSeriesGame = Math.max(0, ...scored.map((s) => s.seriesGameNumber));
  if (maxSeriesGame > 0) {
    return scored
      .filter((s) => s.seriesGameNumber === maxSeriesGame)
      .sort((a, b) => a.idx - b.idx)[0];
  }
  return scored[0];
}

export function buildDailyFeaturedAngleCard({ nbaGames, nbaData }) {
  const selected = chooseFeaturedGame(
    Array.isArray(nbaGames) ? nbaGames : [],
    nbaData?.bdlAvailability || {},
    Array.isArray(nbaData?.playoffSeries) ? nbaData.playoffSeries : [],
  );
  if (!selected?.game) return null;
  const game = selected.game;
  const away = String(game?.awayTeam?.abbr || game?.awayTeam?.name || "Away");
  const home = String(game?.homeTeam?.abbr || game?.homeTeam?.name || "Home");
  const matchup = `${away} vs ${home}`;
  const updatedRaw = nbaData?.fetchedAt || nbaData?.generatedAt || new Date().toISOString();
  const updatedLabel = new Date(updatedRaw).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  let lean = `Lean ${home} to control late possessions if halfcourt pace slows by Q3.`;
  let reason = "Bench-depth swing tends to decide late-game spread value in tighter playoff rotations.";
  if (selected.injuryImpactCount > 0) {
    lean = `Lean first-half under in ${matchup} if current availability tags hold into tip.`;
    reason = `${selected.injuryImpactCount} injury-status flags on this matchup create role volatility before books fully reprice possessions.`;
  } else if (selected.seriesGameNumber > 0) {
    lean = `Lean ${home} first-half spread in ${matchup} if rebounding margin starts positive.`;
    reason = `Series leverage is elevated (Game ${selected.seriesGameNumber}), and closeout-pressure rotations usually tighten early-quarter shot quality.`;
  }

  return {
    id: "daily-featured-angle",
    sportHint: "nba",
    accentColor: "#FF6B00",
    sportBadge: "NBA",
    matchup,
    lean,
    reason,
    timestamp: `Today's read · updated ${updatedLabel}`,
    prompt: `Tonight the sharpest pre-tip angle is ${matchup}. Give me one best lean, one specific reason, and one live trigger to track at tip.`,
  };
}
