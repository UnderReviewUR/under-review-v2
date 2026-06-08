/**
 * Unified lookup for posted NBA prop markets (Odds API propLines + Action Network propsOdds).
 */
import { resolveNbaPlayerFullNameFromAbbr } from "./nbaPropsToPropLines.js";

function normalizeNbaMarketPlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function propLineMatchesPlayer(pl, playerName) {
  const k = normalizeNbaMarketPlayerKey(pl?.player);
  const t = normalizeNbaMarketPlayerKey(playerName);
  return Boolean(k && t && k === t);
}

function playerHasPostedMarket(propsPlayer, market) {
  if (!propsPlayer?.props || typeof propsPlayer.props !== "object") return false;
  if (!market) {
    return Object.values(propsPlayer.props).some(
      (block) => block?.over?.line != null || block?.under?.line != null,
    );
  }
  const block = propsPlayer.props[market];
  return Boolean(block?.over?.line != null || block?.under?.line != null);
}

function findPropsOddsPlayer(board, playerName, chips = []) {
  const target = normalizeNbaMarketPlayerKey(playerName);
  if (!target) return null;
  const players = Array.isArray(board?.propsOdds?.players) ? board.propsOdds.players : [];
  for (const p of players) {
    const full = resolveNbaPlayerFullNameFromAbbr(p?.playerAbbr, chips);
    if (normalizeNbaMarketPlayerKey(full) === target) return p;
    if (normalizeNbaMarketPlayerKey(p?.playerAbbr) === target) return p;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} board
 * @param {string} playerName
 * @param {{ market?: string, line?: number, chips?: Array<{ chip: string, fullName: string, teamAbbr: string }> }} [opts]
 */
export function nbaPlayerHasPostedPropMarket(board, playerName, opts = {}) {
  const { market = null, line = null, chips = [] } = opts;
  const fromLines = (board?.propLines || []).filter((pl) => propLineMatchesPlayer(pl, playerName));
  if (fromLines.length) {
    if (!market) return true;
    const byMarket = fromLines.filter((pl) =>
      String(pl?.prop || "").toLowerCase().includes(String(market).toLowerCase()),
    );
    if (!byMarket.length) return false;
    if (!Number.isFinite(line)) return true;
    return byMarket.some((pl) => Number(pl?.line) === Number(line));
  }

  const propsPlayer = findPropsOddsPlayer(board, playerName, chips);
  if (!propsPlayer) return false;
  if (!playerHasPostedMarket(propsPlayer, market)) return false;
  if (!Number.isFinite(line)) return true;

  const block = market ? propsPlayer.props?.[market] : null;
  if (!block) return false;
  const overLine = block?.over?.line;
  const underLine = block?.under?.line;
  return Number(overLine) === Number(line) || Number(underLine) === Number(line);
}
