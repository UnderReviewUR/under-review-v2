/**
 * WC outright fallbacks — Odds API only (no sportsbook scraping).
 */

import { getEnv } from "./_env.js";
import { logOddsApiUsage } from "./_oddsApiUsageLog.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const WC_WINNER_SPORT = "soccer_fifa_world_cup_winner";
const PREFERRED_BOOKS = ["draftkings", "fanduel", "betmgm", "williamhill_us"];

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/** @type {Map<string, string>} */
const NAME_TO_ABBR = new Map(
  WC_2026_TEAMS.flatMap((t) => [
    [normalizeName(t.name), t.abbreviation],
    [normalizeName(t.shortName), t.abbreviation],
  ]),
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
  const key = normalizeName(name);
  if (NAME_TO_ABBR.has(key)) return NAME_TO_ABBR.get(key);
  for (const [n, abbr] of NAME_TO_ABBR) {
    if (key.includes(n) || n.includes(key)) return abbr;
  }
  return null;
}

/**
 * Free quota probe — x-requests-last: 0 for /sports/.
 * @returns {Promise<{ ok: boolean, remaining: number, error?: string }>}
 */
export async function probeOddsApiCredits() {
  const apiKey = getEnv("ODDS_API_KEY") || "";
  if (!apiKey) return { ok: false, remaining: 0, error: "missing_odds_api_key" };

  const url = `${ODDS_BASE}/sports/?apiKey=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    logOddsApiUsage({ label: "wc.outrights.quota_probe", url, response: res });
    const remaining = Number(res.headers.get("x-requests-remaining"));
    if (!res.ok) {
      return { ok: false, remaining: 0, error: `sports_probe_${res.status}` };
    }
    return {
      ok: Number.isFinite(remaining) && remaining > 0,
      remaining: Number.isFinite(remaining) ? remaining : 0,
    };
  } catch (err) {
    return { ok: false, remaining: 0, error: err?.message || "sports_probe_failed" };
  }
}

/**
 * @returns {Promise<{ ok: boolean, outrights: Record<string, string>, error?: string | null }>}
 */
export async function fetchOddsApiWcOutrights() {
  const apiKey = getEnv("ODDS_API_KEY") || "";
  if (!apiKey) return { ok: false, outrights: {}, error: "missing_odds_api_key" };

  const quota = await probeOddsApiCredits();
  if (!quota.ok || quota.remaining <= 0) {
    return {
      ok: false,
      outrights: {},
      error: quota.error || `odds_api_quota_${quota.remaining}`,
    };
  }

  const url =
    `${ODDS_BASE}/sports/${encodeURIComponent(WC_WINNER_SPORT)}/odds/` +
    `?apiKey=${encodeURIComponent(apiKey)}&regions=us&markets=outrights&oddsFormat=american`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    logOddsApiUsage({ label: "wc.outrights.odds_api", url, response: res });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.message || body?.error_code || `odds_api_${res.status}`;
      return { ok: false, outrights: {}, error: String(msg) };
    }

    const events = await res.json();
    const event = Array.isArray(events) ? events[0] : null;
    const book = pickBookmaker(event?.bookmakers);
    const market = book?.markets?.find((m) => m?.key === "outrights");
    if (!market?.outcomes?.length) {
      return { ok: false, outrights: {}, error: "odds_api_no_outrights" };
    }

    /** @type {Record<string, string>} */
    const outrights = {};
    for (const o of market.outcomes) {
      const abbr = abbrForOutcomeName(o?.name);
      const odds = formatAmericanOdds(o?.price);
      if (abbr && odds) outrights[abbr] = odds;
    }

    if (!Object.keys(outrights).length) {
      return { ok: false, outrights: {}, error: "odds_api_unmap_failed" };
    }

    return { ok: true, outrights, error: null };
  } catch (err) {
    return { ok: false, outrights: {}, error: err?.message || "odds_api_fetch_failed" };
  }
}
