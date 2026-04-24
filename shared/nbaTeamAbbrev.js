/**
 * Shared NBA team name → abbr (same table as api/nba board shaping).
 * Used for cross-source dedupe tokens and slate row ↔ bundle matching.
 */

export function normalizeTeamAbbr(name) {
  const map = {
    "Atlanta Hawks": "ATL",
    "Boston Celtics": "BOS",
    "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA",
    "Chicago Bulls": "CHI",
    "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL",
    "Denver Nuggets": "DEN",
    "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW",
    "Houston Rockets": "HOU",
    "Indiana Pacers": "IND",
    "LA Clippers": "LAC",
    "Los Angeles Clippers": "LAC",
    "Los Angeles Lakers": "LAL",
    "Memphis Grizzlies": "MEM",
    "Miami Heat": "MIA",
    "Milwaukee Bucks": "MIL",
    "Minnesota Timberwolves": "MIN",
    "New Orleans Pelicans": "NOP",
    "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC",
    "Orlando Magic": "ORL",
    "Philadelphia 76ers": "PHI",
    "Phoenix Suns": "PHX",
    "Portland Trail Blazers": "POR",
    "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS",
    "Toronto Raptors": "TOR",
    "Utah Jazz": "UTA",
    "Washington Wizards": "WAS",
  };
  if (!name) return "UNK";
  return map[name] || name.split(" ").pop().slice(0, 3).toUpperCase();
}

/**
 * Stable 2–4 letter token for one side (board row, props, slate labels).
 * @param {{ abbr?: string, name?: string }|null|undefined} team
 * @returns {string}
 */
export function normalizeNbaSideToken(team) {
  if (!team || typeof team !== "object") return "";
  const abbr = String(team.abbr || "").trim().replace(/\./g, "").toUpperCase();
  if (abbr && /^[A-Z0-9]{2,4}$/.test(abbr) && abbr !== "UNK" && abbr !== "?") {
    return abbr;
  }
  const name = String(team.name || "").trim();
  if (name) {
    const fromName = String(normalizeTeamAbbr(name) || "")
      .trim()
      .toUpperCase()
      .replace(/\./g, "");
    if (fromName && fromName !== "UNK") return fromName;
  }
  return "";
}
