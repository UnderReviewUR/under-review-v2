/**
 * ESPN FIFA World Cup 2026 futures — Golden Boot / top goalscorer player markets.
 */

import { ESPN_WC_FUTURES_URL } from "./_wcEspn.js";
import { normalizeEspnAbbr } from "./_wcEspn.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { fetchWithTimeout } from "../shared/fetchWithTimeout.js";

/** @type {Set<string>} */
const TEAM_ABBRS = new Set(WC_2026_TEAMS.map((t) => String(t.abbreviation).toUpperCase()));

function formatAmericanOdds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? `+${Math.round(n)}` : String(Math.round(n));
}

function normalizePlayerName(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
}

function marketLabel(item) {
  return [
    item?.displayName,
    item?.name,
    item?.shortDisplayName,
    item?.type,
    item?.marketType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isTeamWinnerMarket(item) {
  const label = marketLabel(item);
  return (
    /\bwin\b.*\b(world cup|tournament|competition)\b/i.test(label) ||
    /\bworld cup winner\b/i.test(label) ||
    item?.marketType === "winLeague" ||
    (/\bwinner\b/i.test(label) && !/\b(golden boot|goalscorer|goal scorer|top scorer)\b/i.test(label))
  );
}

function isGoldenBootMarket(item) {
  const label = marketLabel(item);
  return (
    /\bgolden boot\b/i.test(label) ||
    /\btop goal\s*scorer\b/i.test(label) ||
    /\btop goalscorer\b/i.test(label) ||
    /\bmost goals\b/i.test(label) ||
    /\bleading goalscorer\b/i.test(label) ||
    /\bworld cup top scorer\b/i.test(label)
  );
}

function nationFromEntry(entry) {
  const abbr = normalizeEspnAbbr(
    entry?.team?.abbreviation || entry?.abbreviation || entry?.teamAbbr,
  );
  return abbr && TEAM_ABBRS.has(abbr) ? abbr : null;
}

/**
 * @param {unknown} json
 * @returns {{ rows: import("../shared/wc2026PlayerConstants.js").WcGoldenBootRow[], market: string | null }}
 */
export function normalizeEspnGoldenBootFutures(json) {
  /** @type {import("../shared/wc2026PlayerConstants.js").WcGoldenBootRow[]} */
  const rows = [];
  let market = null;

  const items = Array.isArray(json?.items) ? json.items : [];

  for (const item of items) {
    if (isTeamWinnerMarket(item) && !isGoldenBootMarket(item)) continue;
    if (!isGoldenBootMarket(item)) continue;

    const entries = item?.entries || item?.participants || item?.choices;
    if (!Array.isArray(entries)) continue;

    market = market || "golden_boot";
    let rank = 0;

    for (const entry of entries) {
      const teamAbbr = nationFromEntry(entry);
      if (teamAbbr && !entry?.athlete?.displayName && !entry?.athlete?.fullName) {
        continue;
      }

      const name = normalizePlayerName(
        entry?.athlete?.displayName ||
          entry?.athlete?.fullName ||
          entry?.displayName ||
          entry?.name,
      );
      const odds = formatAmericanOdds(
        entry?.odds?.american ??
          entry?.americanOdds ??
          entry?.price ??
          entry?.value ??
          entry?.odds,
      );
      if (!name || !odds) continue;
      if (TEAM_ABBRS.has(name.toUpperCase())) continue;

      rank += 1;
      rows.push({
        name,
        americanOdds: odds,
        nationAbbr: teamAbbr || undefined,
        espnAthleteId:
          entry?.athlete?.id != null ? String(entry.athlete.id) : undefined,
        impliedRank: rank,
      });
    }
  }

  return { rows, market };
}

/**
 * @returns {Promise<{ ok: boolean, rows: import("../shared/wc2026PlayerConstants.js").WcGoldenBootRow[], market: string | null, error?: string | null }>}
 */
export async function fetchEspnGoldenBootFutures() {
  const res = await fetchWithTimeout(`${ESPN_WC_FUTURES_URL}?limit=200`);
  if (!res.ok) {
    return { ok: false, rows: [], market: null, error: res.error || `ESPN futures ${res.status}` };
  }
  const { rows, market } = normalizeEspnGoldenBootFutures(res.data);
  if (!rows.length) {
    return { ok: false, rows: [], market: null, error: "espn_golden_boot_empty" };
  }
  return { ok: true, rows, market: market || "golden_boot", error: null };
}
