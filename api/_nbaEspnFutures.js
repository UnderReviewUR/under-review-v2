/**
 * ESPN NBA season futures — championship (series) + Finals MVP markets.
 */

import { normalizeTeamAbbr } from "../shared/nbaTeamAbbrev.js";
import { ESPN_NBA_FUTURES_URL } from "../shared/nba2026Constants.js";
import { fetchWithTimeout } from "../shared/fetchWithTimeout.js";

const ESPN_ABBR_OVERRIDES = {
  NY: "NYK",
  SA: "SAS",
  GS: "GSW",
  NO: "NOP",
  UT: "UTA",
  WSH: "WAS",
  PHO: "PHX",
};

function formatAmericanOdds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? `+${Math.round(n)}` : String(Math.round(n));
}

function normalizeEspnTeamAbbr(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\./g, "")
    .toUpperCase();
  if (!cleaned) return "";
  const mapped = ESPN_ABBR_OVERRIDES[cleaned] || cleaned;
  return String(normalizeTeamAbbr(mapped) || mapped)
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
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

function isChampionshipMarket(item) {
  const label = marketLabel(item);
  if (/\bmvp\b/i.test(label)) return false;
  return (
    /\bchampionship\b/i.test(label) ||
    /\bwin\s*league\b/i.test(label) ||
    item?.marketType === "winLeague" ||
    item?.type === "winLeague"
  );
}

function isFinalsMvpMarket(item) {
  const label = marketLabel(item);
  return /\bfinals\b.*\bmvp\b/i.test(label) || /\bnba finals mvp\b/i.test(label) || /\bfinals mvp\b/i.test(label);
}

/**
 * @param {unknown} json
 * @returns {{ series: Record<string, string>, mvpCandidates: Array<{ name: string, odds: string, team?: string }> }}
 */
export function normalizeEspnNbaFutures(json) {
  /** @type {Record<string, string>} */
  const series = {};
  /** @type {Array<{ name: string, odds: string, team?: string }>} */
  const mvpCandidates = [];

  const items = Array.isArray(json?.items) ? json.items : [];

  for (const item of items) {
    const entries = item?.entries || item?.participants || item?.choices;
    if (!Array.isArray(entries)) continue;

    if (isChampionshipMarket(item)) {
      for (const entry of entries) {
        const abbr = normalizeEspnTeamAbbr(
          entry?.team?.abbreviation || entry?.abbreviation || entry?.teamAbbr,
        );
        const odds = formatAmericanOdds(
          entry?.odds?.american ??
            entry?.americanOdds ??
            entry?.price ??
            entry?.value ??
            entry?.odds,
        );
        if (abbr && odds) series[abbr] = odds;
      }
      continue;
    }

    if (isFinalsMvpMarket(item)) {
      for (const entry of entries) {
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
        const team = normalizeEspnTeamAbbr(
          entry?.team?.abbreviation || entry?.athlete?.team?.abbreviation,
        );
        if (name && odds) {
          mvpCandidates.push({
            name,
            odds,
            ...(team ? { team } : {}),
          });
        }
      }
    }
  }

  return { series, mvpCandidates };
}

/**
 * @returns {Promise<{ ok: boolean, series: Record<string, string>, mvpCandidates: Array<{ name: string, odds: string, team?: string }>, error?: string | null }>}
 */
export async function fetchEspnNbaFutures() {
  const res = await fetchWithTimeout(`${ESPN_NBA_FUTURES_URL}?limit=200`, { timeoutMs: 12000 });
  if (!res.ok) {
    return { ok: false, series: {}, mvpCandidates: [], error: res.error || `ESPN NBA futures ${res.status}` };
  }
  const { series, mvpCandidates } = normalizeEspnNbaFutures(res.data);
  if (!Object.keys(series).length && !mvpCandidates.length) {
    return { ok: false, series: {}, mvpCandidates: [], error: "ESPN NBA futures empty" };
  }
  return { ok: true, series, mvpCandidates, error: null };
}
