/**
 * NBA Finals outright fallbacks — Odds API championship winner (series proxy).
 */

import { getEnv } from "./_env.js";
import { logOddsApiUsage } from "./_oddsApiUsageLog.js";
import { normalizeTeamAbbr } from "../shared/nbaTeamAbbrev.js";

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const NBA_CHAMPIONSHIP_SPORT = "basketball_nba_championship_winner";
const PREFERRED_BOOKS = ["draftkings", "fanduel", "betmgm", "williamhill_us"];

const TEAM_NAME_TO_ABBR = new Map(
  [
    ["New York Knicks", "NYK"],
    ["San Antonio Spurs", "SAS"],
    ["Oklahoma City Thunder", "OKC"],
    ["Boston Celtics", "BOS"],
    ["Los Angeles Lakers", "LAL"],
    ["Denver Nuggets", "DEN"],
    ["Minnesota Timberwolves", "MIN"],
    ["Indiana Pacers", "IND"],
    ["Miami Heat", "MIA"],
    ["Milwaukee Bucks", "MIL"],
    ["Cleveland Cavaliers", "CLE"],
    ["Orlando Magic", "ORL"],
    ["Dallas Mavericks", "DAL"],
    ["Houston Rockets", "HOU"],
    ["Golden State Warriors", "GSW"],
    ["LA Clippers", "LAC"],
    ["Los Angeles Clippers", "LAC"],
    ["Memphis Grizzlies", "MEM"],
    ["Phoenix Suns", "PHX"],
    ["Sacramento Kings", "SAC"],
    ["Atlanta Hawks", "ATL"],
    ["Chicago Bulls", "CHI"],
    ["Brooklyn Nets", "BKN"],
    ["Philadelphia 76ers", "PHI"],
    ["Toronto Raptors", "TOR"],
    ["Utah Jazz", "UTA"],
    ["Washington Wizards", "WAS"],
    ["Charlotte Hornets", "CHA"],
    ["Detroit Pistons", "DET"],
    ["New Orleans Pelicans", "NOP"],
    ["Portland Trail Blazers", "POR"],
  ].map(([name, abbr]) => [name.toLowerCase(), abbr]),
);

function formatAmericanOdds(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? `+${Math.round(n)}` : String(Math.round(n));
}

function pickBookmaker(bookmakers) {
  if (!Array.isArray(bookmakers) || !bookmakers.length) return null;
  for (const key of PREFERRED_BOOKS) {
    const hit = bookmakers.find((b) => b?.key === key);
    if (hit?.markets?.length) return hit;
  }
  return bookmakers.find((b) => Array.isArray(b?.markets) && b.markets.length) || null;
}

function abbrForOutcomeName(name) {
  const key = String(name || "").trim().toLowerCase();
  if (TEAM_NAME_TO_ABBR.has(key)) return TEAM_NAME_TO_ABBR.get(key);
  for (const [n, abbr] of TEAM_NAME_TO_ABBR) {
    if (key.includes(n) || n.includes(key)) return abbr;
  }
  const last = key.split(/\s+/).pop();
  if (last && last.length >= 3) {
    return String(normalizeTeamAbbr(last) || last.slice(0, 3))
      .trim()
      .toUpperCase();
  }
  return null;
}

/**
 * @returns {Promise<{ ok: boolean, series: Record<string, string>, error?: string | null }>}
 */
export async function fetchOddsApiNbaChampionshipOutrights() {
  const apiKey = getEnv("ODDS_API_KEY") || "";
  if (!apiKey) return { ok: false, series: {}, error: "missing_odds_api_key" };

  const url =
    `${ODDS_BASE}/sports/${encodeURIComponent(NBA_CHAMPIONSHIP_SPORT)}/odds/` +
    `?apiKey=${encodeURIComponent(apiKey)}&regions=us&markets=outrights&oddsFormat=american`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    logOddsApiUsage({ label: "nba.outrights.championship", url, response: res });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.message || body?.error_code || `odds_api_${res.status}`;
      return { ok: false, series: {}, error: String(msg) };
    }

    const events = await res.json();
    const event = Array.isArray(events) ? events[0] : null;
    const book = pickBookmaker(event?.bookmakers);
    const market = book?.markets?.find((m) => m?.key === "outrights");
    if (!market?.outcomes?.length) {
      return { ok: false, series: {}, error: "odds_api_no_outrights" };
    }

    /** @type {Record<string, string>} */
    const series = {};
    for (const o of market.outcomes) {
      const abbr = abbrForOutcomeName(o?.name);
      const odds = formatAmericanOdds(o?.price);
      if (abbr && odds) series[abbr] = odds;
    }

    if (!Object.keys(series).length) {
      return { ok: false, series: {}, error: "odds_api_no_mapped_teams" };
    }

    return { ok: true, series, error: null };
  } catch (err) {
    return { ok: false, series: {}, error: err?.message || "odds_api_fetch_failed" };
  }
}
