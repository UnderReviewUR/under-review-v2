function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizePlayerKey(name) {
  return String(name || "").trim().toLowerCase();
}

function collectNbaAlerts(nbaContext) {
  const liveBoxscore = nbaContext?.liveBoxscore;
  if (!liveBoxscore) return [];

  const playerStats = Array.isArray(nbaContext?.playerStats) ? nbaContext.playerStats : [];
  const groundedPlayers = new Set(
    playerStats
      .map((p) => normalizePlayerKey(p?.name || p?.player || p?.fullName))
      .filter(Boolean),
  );
  if (!groundedPlayers.size) return [];

  const gamePeriod =
    toNumber(liveBoxscore?.period) ??
    toNumber(liveBoxscore?.quarter) ??
    toNumber(liveBoxscore?.game?.period);

  const players = Array.isArray(liveBoxscore?.players)
    ? liveBoxscore.players
    : Array.isArray(liveBoxscore)
      ? liveBoxscore
      : [];

  return players
    .map((p) => {
      const playerName = String(p?.name || p?.player || p?.fullName || "").trim();
      if (!playerName) return null;
      if (!groundedPlayers.has(normalizePlayerKey(playerName))) return null;

      const pf = toNumber(p?.personalFouls ?? p?.pf);
      if (pf == null) return null;

      const period =
        toNumber(p?.period) ??
        toNumber(p?.quarter) ??
        gamePeriod;
      if (period == null) return null;

      const foulTrouble = (period === 1 && pf >= 2) || (period === 2 && pf >= 3);
      if (!foulTrouble) return null;

      return {
        sport: "nba",
        dataPoint: `${playerName} - ${pf} fouls, Q${period}`,
        angle:
          "Foul trouble changes rotation. Check replacement player rebounding/scoring props before market adjusts.",
        confidence: "high",
      };
    })
    .filter(Boolean);
}

function collectTennisAlerts(tennisLiveMatches) {
  if (!Array.isArray(tennisLiveMatches) || !tennisLiveMatches.length) return [];

  return tennisLiveMatches
    .map((m) => {
      const playerName = String(
        m?.player || m?.name || m?.raw?.player || m?.raw?.name || "",
      ).trim();
      if (!playerName) return null;

      const dfThisSet =
        toNumber(m?.doubleFaultsCurrentSet) ??
        toNumber(m?.doubleFaultsThisSet) ??
        toNumber(m?.doubleFaults);
      if (dfThisSet == null || dfThisSet < 4) return null;

      return {
        sport: "tennis",
        dataPoint: `${playerName} - ${dfThisSet} double faults this set`,
        angle:
          "Serve instability in live set. Game/set props may not have adjusted yet.",
        confidence: "medium",
      };
    })
    .filter(Boolean);
}

function collectGolfAlerts(golfContext) {
  const leaderboard = Array.isArray(golfContext?.leaderboard)
    ? golfContext.leaderboard
    : Array.isArray(golfContext?.currentEvent?.leaderboard)
      ? golfContext.currentEvent.leaderboard
      : [];
  if (!leaderboard.length) return [];

  const alerts = [];

  const windSpeedMph =
    toNumber(golfContext?.weather?.windSpeedMph) ??
    toNumber(golfContext?.weatherAlert?.windSpeedMph);
  if (windSpeedMph != null && windSpeedMph >= 20) {
    const course =
      String(
        golfContext?.course?.name ||
          golfContext?.currentEvent?.course ||
          golfContext?.weatherAlert?.courseName ||
          "course",
      ).trim() || "course";
    alerts.push({
      sport: "golf",
      dataPoint: `Wind at ${course}: ${windSpeedMph} mph`,
      angle:
        "High wind typically suppresses scoring. Under plays and make-cut props worth watching.",
      confidence: "medium",
    });
  }

  for (const p of leaderboard) {
    const currentRoundScore = toNumber(p?.currentRoundScore);
    if (currentRoundScore == null || currentRoundScore > -4) continue;
    const playerName = String(p?.player || p?.name || p?.fullName || "").trim();
    if (!playerName) continue;
    const holes = String(p?.holes || p?.thru || "").trim() || "live";
    alerts.push({
      sport: "golf",
      dataPoint: `${playerName} - ${Math.abs(currentRoundScore)} under through ${holes} holes`,
      angle:
        "Player going low early. Outright and top-5 odds may not have caught up.",
      confidence: "high",
    });
    break;
  }

  return alerts;
}

export function buildLiveEdgeAlerts({ nbaContext, tennisLiveMatches, golfContext, hourEt }) {
  void hourEt;
  const alerts = [
    ...collectNbaAlerts(nbaContext),
    ...collectTennisAlerts(tennisLiveMatches),
    ...collectGolfAlerts(golfContext),
  ];

  // NFL live alerts - add when in-season data is wired.

  const score = (a) => (a?.confidence === "high" ? 2 : 1);
  return alerts.sort((a, b) => score(b) - score(a)).slice(0, 2);
}
