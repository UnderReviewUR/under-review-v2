/**
 * Normalize pgachampionship.com EventOdds GraphQL into UR Take golf odds shape.
 */

import {
  formatAmericanOddsDisplay,
  pickTopPgaChampionshipOutrightLeaders,
} from "../shared/pgaChampionshipOddsLeaders.js";

export { formatAmericanOddsDisplay, pickTopPgaChampionshipOutrightLeaders };

/**
 * @param {{ numericValue?: number | null, value?: string | null } | null | undefined} cell
 */
export function oddsCellToAmerican(cell) {
  if (!cell) return null;
  if (cell.numericValue != null && Number.isFinite(Number(cell.numericValue))) {
    return Number(cell.numericValue);
  }
  const raw = String(cell.value || "").trim().replace(/,/g, "");
  if (!raw) return null;
  const m = raw.match(/^([+-]?\d+)/);
  if (!m) return null;
  return Number(m[1]);
}

/**
 * @param {Map<string, { firstName?: string, lastName?: string }>} golferNameById
 * @param {Array<Record<string, unknown>>} rows
 */
export function parsePgaChampionshipEventOddsRows(golferNameById, rows) {
  const outrights = [];
  const topFinish = { top_5: [], top_10: [], top_20: [] };
  const makeCut = {};

  for (const row of rows || []) {
    const gid = String(row?.golferId || "").trim();
    const meta = golferNameById.get(gid);
    const player = meta
      ? `${meta.firstName || ""} ${meta.lastName || ""}`.trim()
      : gid;
    if (!player) continue;

    const win = oddsCellToAmerican(row.tournamentWinner);
    const t5 = oddsCellToAmerican(row.top5);
    const t10 = oddsCellToAmerican(row.top10);
    const t20 = oddsCellToAmerican(row.top20);

    outrights.push({
      player,
      odds: win,
      source: "pga_championship_site",
      golferId: gid,
    });

    if (t5 != null) topFinish.top_5.push({ player, odds: t5, source: "pga_championship_site" });
    if (t10 != null) topFinish.top_10.push({ player, odds: t10, source: "pga_championship_site" });
    if (t20 != null) topFinish.top_20.push({ player, odds: t20, source: "pga_championship_site" });
  }

  outrights.sort((a, b) => {
    const ao = a.odds != null && Number.isFinite(a.odds) ? Number(a.odds) : 999999;
    const bo = b.odds != null && Number.isFinite(b.odds) ? Number(b.odds) : 999999;
    return ao - bo;
  });

  const hasPostedLines = outrights.some((o) => o.odds != null && Number.isFinite(o.odds));

  return {
    outrights,
    topFinish,
    makeCut,
    eventName: "PGA Championship",
    marketStatus: hasPostedLines ? "posted" : "field",
    linesUnavailable: !hasPostedLines,
    source: "pga_championship_site",
    hasPostedLines,
  };
}

/**
 * @param {Array<Record<string, unknown>>} golfers
 */
export function buildGolferNameMapFromStaticAssets(golfers) {
  const map = new Map();
  for (const g of golfers || []) {
    const id = String(g?.id || "").replace(/-golfer$/i, "").trim();
    if (!id) continue;
    map.set(id, {
      firstName: String(g?.firstName || "").trim(),
      lastName: String(g?.lastName || "").trim(),
    });
  }
  return map;
}

