/**
 * Point-spread normalization: favorite is always the team with a negative spread point.
 * Never assign the home team's line to the away team (or vice versa).
 */

import { normalizeTeamAbbr } from "./nbaTeamAbbrev.js";

const TEAM_ABBR_NORMALIZATION_MAP = {
  SA: "SAS",
  NY: "NYK",
  GS: "GSW",
  NO: "NOP",
  UT: "UTA",
  WSH: "WAS",
  NJ: "BKN",
  BRK: "BKN",
  NOH: "NOP",
  NOK: "NOP",
  CHH: "CHA",
  CHO: "CHA",
  PHO: "PHX",
  SAN: "SAS",
};

export function canonicalizeTeamAbbr(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\./g, "")
    .toUpperCase();
  if (!cleaned) return "";
  return TEAM_ABBR_NORMALIZATION_MAP[cleaned] || cleaned;
}

function normalizeToken(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Map an Odds API / scraper team label to canonical home or away abbr.
 */
export function resolveOutcomeTeamAbbr(outcomeName, homeAbbr, awayAbbr, homeName, awayName) {
  const ha = canonicalizeTeamAbbr(homeAbbr);
  const aa = canonicalizeTeamAbbr(awayAbbr);
  if (!ha || !aa) return null;

  const raw = String(outcomeName || "").trim();
  if (!raw) return null;

  const fromMap = canonicalizeTeamAbbr(normalizeTeamAbbr(raw));
  if (fromMap === ha) return ha;
  if (fromMap === aa) return aa;

  const token = normalizeToken(raw);
  const ht = normalizeToken(homeName);
  const at = normalizeToken(awayName);

  if (token === ha.toLowerCase() || token === aa.toLowerCase()) {
    return token === ha.toLowerCase() ? ha : aa;
  }
  if (ht && (token === ht || token.includes(ht) || ht.includes(token))) return ha;
  if (at && (token === at || token.includes(at) || at.includes(token))) return aa;

  return null;
}

/**
 * @param {number} point
 */
export function formatSpreadPoint(point) {
  const p = Number(point);
  if (!Number.isFinite(p)) return null;
  if (p === 0) return "PK";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}`;
}

/**
 * Standard display: favorite with negative spread (e.g. "DET -4.5").
 */
export function formatSpreadDisplay(teamAbbr, point) {
  const ab = canonicalizeTeamAbbr(teamAbbr);
  const formatted = formatSpreadPoint(point);
  if (!ab || !formatted) return null;
  return `${ab} ${formatted}`;
}

/**
 * @param {object} p
 * @param {string} p.homeAbbr
 * @param {string} p.awayAbbr
 * @param {string} [p.homeName]
 * @param {string} [p.awayName]
 * @param {Array<{ name?: string, point?: number }>} p.outcomes
 */
export function normalizeSpreadFromOutcomes({ homeAbbr, awayAbbr, homeName, awayName, outcomes }) {
  const ha = canonicalizeTeamAbbr(homeAbbr);
  const aa = canonicalizeTeamAbbr(awayAbbr);
  if (!ha || !aa) return null;

  const rows = (Array.isArray(outcomes) ? outcomes : [])
    .map((o) => ({
      abbr: resolveOutcomeTeamAbbr(o?.name, ha, aa, homeName, awayName),
      point: Number(o?.point),
    }))
    .filter((r) => r.abbr && Number.isFinite(r.point));

  if (!rows.length) return null;

  const negatives = rows.filter((r) => r.point < 0);
  let favoriteRow = null;
  if (negatives.length === 1) {
    favoriteRow = negatives[0];
  } else if (negatives.length > 1) {
    favoriteRow = negatives.reduce((best, r) => (r.point < best.point ? r : best));
  } else {
    const sorted = [...rows].sort((a, b) => a.point - b.point);
    if (sorted.length >= 2 && sorted[0].point < sorted[1].point) {
      favoriteRow = sorted[0];
    }
  }

  if (!favoriteRow || favoriteRow.point >= 0) return null;

  const favoriteAbbr = favoriteRow.abbr;
  const underdogAbbr = favoriteAbbr === ha ? aa : ha;
  const spreadPoint = favoriteRow.point;

  return {
    favoriteAbbr,
    underdogAbbr,
    spreadPoint,
    favoriteIsHome: favoriteAbbr === ha,
    displayLine: formatSpreadDisplay(favoriteAbbr, spreadPoint),
    underdogDisplayLine: formatSpreadDisplay(underdogAbbr, Math.abs(spreadPoint)),
    homeAbbr: ha,
    awayAbbr: aa,
  };
}

export function buildGameSpreadKey(awayAbbr, homeAbbr) {
  const aa = canonicalizeTeamAbbr(awayAbbr);
  const ha = canonicalizeTeamAbbr(homeAbbr);
  if (!aa || !ha) return "";
  return `${aa} @ ${ha}`;
}

/**
 * @param {Array<{ offsetHours?: number, displayLine?: string, capturedAt?: string }>} snapshots oldest-first
 * @param {{ displayLine?: string } | null} current
 */
export function buildLineMovementContext(snapshots, current) {
  const ordered = (Array.isArray(snapshots) ? snapshots : [])
    .filter((s) => s?.displayLine)
    .sort((a, b) => {
      const ta = Date.parse(a.capturedAt || "") || 0;
      const tb = Date.parse(b.capturedAt || "") || 0;
      return ta - tb;
    });

  const opening = ordered[0]?.displayLine || null;
  const latest = current?.displayLine || ordered[ordered.length - 1]?.displayLine || null;

  if (!latest) return { opening: null, current: null, narrative: null, hasMovement: false };

  if (!opening || opening === latest) {
    return {
      opening,
      current: latest,
      narrative: "Line stable; no verified movement between scheduled snapshots.",
      hasMovement: false,
    };
  }

  return {
    opening,
    current: latest,
    narrative: `line opened ${opening}, now ${latest} — sharp money moved this`,
    hasMovement: true,
  };
}

/**
 * Strip internal-only fields before model / user-facing payloads.
 */
export function spreadRecordForModel(record) {
  if (!record || typeof record !== "object") return record;
  const out = { ...record };
  delete out._staleness;
  delete out._sourceChain;
  delete out._fetchFailed;
  return out;
}
