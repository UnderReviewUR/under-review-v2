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

const CO_HOST_NATIONS = new Set(["USA", "MEX", "CAN", "US", "MX"]);

/**
 * WC co-host boost only — no general home-field advantage on the ticket home side.
 * Applies +50 Elo only when a co-host nation plays in that nation's host venues.
 * @param {number} elo
 * @param {boolean} isHost
 * @param {string | null | undefined} [venueNation] — USA | MEX | CAN when known
 */
export function applyHostAdvantage(elo, isHost, venueNation = null) {
  if (!isHost || venueNation == null || venueNation === "") return elo;
  const nation = String(venueNation).trim().toUpperCase();
  if (!CO_HOST_NATIONS.has(nation)) return elo;
  if (nation === "US") return elo + 50;
  if (nation === "MX") return elo + 50;
  if (nation === "USA" || nation === "MEX" || nation === "CAN") return elo + 50;
  return elo;
}

/**
 * @param {string | null | undefined} city
 * @param {string | null | undefined} stadium
 */
export function inferWcVenueNation(city, stadium) {
  const blob = `${String(city || "")} ${String(stadium || "")}`.toLowerCase();
  if (!blob.trim()) return null;
  if (
    /\b(mexico|mexico city|guadalajara|monterrey|cdmx|estadio azteca|bbva)\b/.test(blob)
  ) {
    return "MEX";
  }
  if (/\b(canada|toronto|vancouver|montreal|bc place)\b/.test(blob)) {
    return "CAN";
  }
  if (
    /\b(united states|usa|u\.s\.|atlanta|boston|dallas|houston|kansas city|los angeles|miami|new york|philadelphia|san francisco|seattle|metlife|sofi|arrowhead|mercedes|lumen|gillette|hard rock|nrg|levi)\b/.test(
      blob,
    )
  ) {
    return "USA";
  }
  return null;
}

/** Match odds from team abbreviations and static team table. */
export function formatMatchOdds(teamA, teamB, teamsData, venueNation = null) {
  const a = teamsData.find((t) => t.abbreviation === teamA);
  const b = teamsData.find((t) => t.abbreviation === teamB);
  if (!a || !b) return null;
  const eloA = applyHostAdvantage(a.eloRating, a.isHost, venueNation);
  const eloB = applyHostAdvantage(b.eloRating, b.isHost, venueNation);
  const probs = eloWinProbability(eloA, eloB);
  return {
    teamA: { abbr: teamA, winPct: probs.win },
    draw: probs.draw,
    teamB: { abbr: teamB, winPct: probs.loss },
  };
}
