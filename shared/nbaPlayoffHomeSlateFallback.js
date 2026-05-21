/**
 * Known playoff home-slate rows when BDL/Odds/ESPN miss tonight's ET board.
 * Shared by API slate merge and client home card force-render.
 */

export const NBA_PLAYOFF_HOME_SLATE_FALLBACK = [
  {
    gameId: 291185,
    homeAbbr: "OKC",
    awayAbbr: "SAS",
    dateYmd: "20260520",
    tipoffMs: Date.parse("2026-05-21T00:30:00.000Z"),
  },
];

function etDateTokens(todayET, tomorrowET) {
  return new Set(
    [todayET, tomorrowET]
      .filter(Boolean)
      .map((d) => String(d).replace(/-/g, "").trim()),
  );
}

export function mapPlayoffFallbackRowToSlateGame(row) {
  return {
    id: row.gameId,
    status: "Scheduled",
    state: "pre",
    statusCode: 1,
    period: null,
    clock: null,
    awayTeam: {
      name: row.awayAbbr,
      abbr: row.awayAbbr,
      score: null,
    },
    homeTeam: {
      name: row.homeAbbr,
      abbr: row.homeAbbr,
      score: null,
    },
    startTimeUtc: new Date(row.tipoffMs).toISOString(),
    startTimeSource: "hardcoded_playoff",
    postseason: true,
    actionNetworkGameId: row.gameId,
  };
}

/**
 * @param {string} todayET YYYY-MM-DD America/New_York
 * @param {string} [tomorrowET]
 */
export function getPlayoffHomeSlateFallbackGames(todayET, tomorrowET) {
  const tokens = etDateTokens(todayET, tomorrowET);
  return NBA_PLAYOFF_HOME_SLATE_FALLBACK.filter((row) => tokens.has(row.dateYmd)).map(
    mapPlayoffFallbackRowToSlateGame,
  );
}

/** Client home card: force playoff card when ET calendar matches a known fallback date. */
export function getPlayoffHomeSlateFallbackGamesForNow(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayET = fmt.format(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowET = fmt.format(tomorrow);
  return getPlayoffHomeSlateFallbackGames(todayET, tomorrowET);
}
