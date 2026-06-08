/**
 * Scraper fallbacks for game spreads (NBA). Failures are silent — caller handles waterfall.
 */

import { normalizeTeamAbbr } from "../shared/nbaTeamAbbrev.js";
import { canonicalizeTeamAbbr, normalizeSpreadFromOutcomes } from "../shared/gameLineSpread.js";

function pickEspnSpreadOutcomes(pickcenter) {
  const details = pickcenter?.details;
  if (typeof details === "string" && details.trim()) {
    const m = details.match(/([+-]?\d+\.?\d*)/);
    if (m) {
      const spreadVal = Number(m[1]);
      if (Number.isFinite(spreadVal)) {
        const favored = String(pickcenter?.awayTeamOdds?.favorite || pickcenter?.homeTeamOdds?.favorite || "");
        return { spreadText: details, spreadVal, favored };
      }
    }
  }
  return null;
}

/**
 * ESPN summary pickcenter — spread relative to favorite team in details string.
 */
/**
 * ESPN summary pickcenter — game total (over/under).
 */
export async function scrapeEspnNbaTotal({ espnEventId }) {
  const id = String(espnEventId || "").trim();
  if (!id) return null;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pick = data?.pickcenter?.[0] || data?.pickcenter;
    const total = Number(pick?.overUnder);
    if (!Number.isFinite(total) || total <= 0) return null;
    return { total, source: "espn_summary", pace: "NEUTRAL" };
  } catch {
    return null;
  }
}

export async function scrapeEspnNbaSpread({ espnEventId, homeAbbr, awayAbbr, homeName, awayName }) {
  const id = String(espnEventId || "").trim();
  if (!id) return null;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pick = data?.pickcenter?.[0] || data?.pickcenter;
    if (!pick) return null;

    const ha = canonicalizeTeamAbbr(homeAbbr);
    const aa = canonicalizeTeamAbbr(awayAbbr);
    const spreadAbs = Number(pick.spread);
    if (!Number.isFinite(spreadAbs)) {
      const parsed = pickEspnSpreadOutcomes(pick);
      if (!parsed) return null;
    }

    const spreadMagnitude = Number.isFinite(Number(pick.spread))
      ? Math.abs(Number(pick.spread))
      : null;
    if (spreadMagnitude == null) return null;

    const homeFav = Boolean(pick.homeTeamOdds?.favorite);
    const awayFav = Boolean(pick.awayTeamOdds?.favorite);
    let outcomes;
    if (homeFav && !awayFav) {
      outcomes = [
        { name: homeName || ha, point: -spreadMagnitude },
        { name: awayName || aa, point: spreadMagnitude },
      ];
    } else if (awayFav && !homeFav) {
      outcomes = [
        { name: awayName || aa, point: -spreadMagnitude },
        { name: homeName || ha, point: spreadMagnitude },
      ];
    } else {
      return null;
    }

    const normalized = normalizeSpreadFromOutcomes({
      homeAbbr: ha,
      awayAbbr: aa,
      homeName,
      awayName,
      outcomes,
    });
    if (!normalized) return null;
    return { ...normalized, source: "espn_summary" };
  } catch {
    return null;
  }
}

function extractSpreadFromHtml(html, homeAbbr, awayAbbr) {
  const ha = canonicalizeTeamAbbr(homeAbbr);
  const aa = canonicalizeTeamAbbr(awayAbbr);
  if (!ha || !aa || !html) return null;

  const patterns = [
    new RegExp(`${ha}\\s*([+-]\\d+\\.?\\d*)`, "i"),
    new RegExp(`${aa}\\s*([+-]\\d+\\.?\\d*)`, "i"),
    new RegExp(`(${ha}|${aa})\\s*([+-]\\d+\\.?\\d*)`, "gi"),
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    const teamToken = (m[1] || m[0] || "").toUpperCase();
    const pointStr = m[2] || m[1];
    const point = Number(pointStr);
    if (!Number.isFinite(point)) continue;
    const teamAbbr = teamToken.includes(ha) ? ha : teamToken.includes(aa) ? aa : null;
    if (!teamAbbr) continue;
    const favoriteAbbr = point < 0 ? teamAbbr : teamAbbr === ha ? aa : ha;
    const favoritePoint = point < 0 ? point : -Math.abs(point);
    const dogAbbr = favoriteAbbr === ha ? aa : ha;
    return normalizeSpreadFromOutcomes({
      homeAbbr: ha,
      awayAbbr: aa,
      outcomes: [
        { name: favoriteAbbr, point: favoritePoint },
        { name: dogAbbr, point: Math.abs(favoritePoint) },
      ],
    });
  }
  return null;
}

async function scrapeHtmlSpread(url, homeAbbr, awayAbbr) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const normalized = extractSpreadFromHtml(html, homeAbbr, awayAbbr);
    if (!normalized) return null;
    return normalized;
  } catch {
    return null;
  }
}

/** TheScore NBA scoreboard page (HTML regex). */
export async function scrapeTheScoreNbaSpread({ homeAbbr, awayAbbr }) {
  const result = await scrapeHtmlSpread(
    "https://www.thescore.com/nba/events",
    homeAbbr,
    awayAbbr,
  );
  if (!result) return null;
  return { ...result, source: "thescore_scrape" };
}

/** ESPN BET-branded lines often appear on ESPN scoreboard pages. */
export async function scrapeEspnBetNbaSpread({ homeAbbr, awayAbbr, espnEventId }) {
  if (espnEventId) {
    const fromSummary = await scrapeEspnNbaSpread({
      espnEventId,
      homeAbbr,
      awayAbbr,
    });
    if (fromSummary) return { ...fromSummary, source: "espn_bet" };
  }
  const token = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
  const result = await scrapeHtmlSpread(
    `https://www.espn.com/nba/scoreboard/_/date/${token}`,
    homeAbbr,
    awayAbbr,
  );
  if (!result) return null;
  return { ...result, source: "espn_bet_scrape" };
}

/** Action Network NBA odds index. */
export async function scrapeActionNetworkNbaSpread({ homeAbbr, awayAbbr }) {
  const result = await scrapeHtmlSpread(
    "https://www.actionnetwork.com/nba/odds",
    homeAbbr,
    awayAbbr,
  );
  if (!result) return null;
  return { ...result, source: "action_network_scrape" };
}

/**
 * Web fallback: ESPN scoreboard JSON (structured) then strict HTML regex.
 */
export async function scrapeWebFallbackNbaSpread(game) {
  const ha = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
  const aa = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
  if (!ha || !aa) return null;

  const espnId = game?.id || game?.espnId;
  if (espnId) {
    const espn = await scrapeEspnNbaSpread({
      espnEventId: espnId,
      homeAbbr: ha,
      awayAbbr: aa,
      homeName: game?.homeTeam?.name,
      awayName: game?.awayTeam?.name,
    });
    if (espn) return { ...espn, source: "web_espn" };
  }

  const token = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${token}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const event of data?.events || []) {
      const comp = event?.competitions?.[0];
      const home = comp?.competitors?.find((c) => c.homeAway === "home");
      const away = comp?.competitors?.find((c) => c.homeAway === "away");
      const homeAbbr = canonicalizeTeamAbbr(
        home?.team?.abbreviation || normalizeTeamAbbr(home?.team?.displayName),
      );
      const awayAbbr = canonicalizeTeamAbbr(
        away?.team?.abbreviation || normalizeTeamAbbr(away?.team?.displayName),
      );
      if (homeAbbr !== ha || awayAbbr !== aa) continue;
      const odds = comp?.odds?.[0];
      if (!odds) continue;
      const spread = Number(odds.spread);
      if (!Number.isFinite(spread)) continue;
      const homeFav = Boolean(odds.homeTeamOdds?.favorite ?? odds.favoriteAtHome);
      const magnitude = Math.abs(spread);
      const outcomes = homeFav
        ? [
            { name: home?.team?.displayName, point: -magnitude },
            { name: away?.team?.displayName, point: magnitude },
          ]
        : [
            { name: away?.team?.displayName, point: -magnitude },
            { name: home?.team?.displayName, point: magnitude },
          ];
      const normalized = normalizeSpreadFromOutcomes({
        homeAbbr: ha,
        awayAbbr: aa,
        homeName: home?.team?.displayName,
        awayName: away?.team?.displayName,
        outcomes,
      });
      if (normalized) return { ...normalized, source: "web_espn_scoreboard" };
    }
  } catch {
    return null;
  }
  return null;
}
