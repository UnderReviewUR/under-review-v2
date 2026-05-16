/** First 2026 regular-season kickoff (NE @ SEA), Wed Sep 9 2026, 8:20 PM ET */
export const NFL_2026_SEASON_START_ISO = "2026-09-09T20:20:00-04:00";

/**
 * Calendar days until the 2026 NFL season opener (US Eastern date boundaries).
 * @param {Date} [now]
 * @returns {number}
 */
export function getDaysUntilNfl2026SeasonStart(now = new Date()) {
  const tz = "America/New_York";
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const toUtcMidnight = (y, m, d) => Date.UTC(y, m - 1, d);
  const parts = (date) => {
    const p = fmt.formatToParts(date);
    return {
      y: Number(p.find((x) => x.type === "year")?.value),
      m: Number(p.find((x) => x.type === "month")?.value),
      d: Number(p.find((x) => x.type === "day")?.value),
    };
  };
  const today = parts(now);
  const start = { y: 2026, m: 9, d: 9 };
  const todayMs = toUtcMidnight(today.y, today.m, today.d);
  const startMs = toUtcMidnight(start.y, start.m, start.d);
  const diff = Math.round((startMs - todayMs) / 86400000);
  return diff > 0 ? diff : 0;
}

/**
 * @param {number} days
 */
export function formatNflSeasonCountdownLine(days) {
  if (days === 0) return "The NFL season kicks off today.";
  if (days === 1) return "The NFL season is 1 day away.";
  return `The NFL season is ${days} days away.`;
}
