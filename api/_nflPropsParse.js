import {
  NFL_PROPS_BOOK_IDS,
  NFL_PROPS_WIRE_MARKETS,
  resolveNflPropsWireMarket,
} from "../shared/nflPropsConstants.js";

/**
 * @param {unknown} n
 */
function finiteNumber(n) {
  if (n == null) return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

/**
 * @param {Record<string, unknown>} playersById
 * @param {number | string} playerId
 */
function resolvePlayerMeta(playersById, playerId) {
  const id = String(playerId);
  const fromMap = playersById?.[id];
  if (fromMap && typeof fromMap === "object") {
    return {
      playerAbbr: String(fromMap.abbr || fromMap.player_abbr || "").trim() || null,
      fullName: String(fromMap.full_name || fromMap.fullName || "").trim() || null,
      teamId: finiteNumber(fromMap.team_id ?? fromMap.teamId),
    };
  }
  return { playerAbbr: null, fullName: null, teamId: null };
}

/**
 * @param {Array<Record<string, unknown>> | undefined} bookLines
 */
function normalizeBookLines(bookLines) {
  const out = [];
  for (const row of bookLines || []) {
    if (!row || typeof row !== "object") continue;
    const side = String(row.side || "").toLowerCase();
    // anytime TD uses "yes"/"no" on some books; treat yes≈over
    const normSide =
      side === "over" || side === "yes" ? "over" : side === "under" || side === "no" ? "under" : "";
    if (!normSide) continue;
    out.push({
      bookId: finiteNumber(row.book_id ?? row.bookId),
      side: normSide,
      value: finiteNumber(row.value),
      odds: finiteNumber(row.odds),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    });
  }
  return out;
}

/**
 * @param {Array<{ bookId: number | null, side: string, value: number | null, odds: number | null, updatedAt: string | null }>} bookLines
 */
function pickConsensusSide(bookLines, side) {
  const want = bookLines.filter((l) => l.side === side && l.odds != null);
  for (const bookId of NFL_PROPS_BOOK_IDS) {
    const hit = want.find((l) => l.bookId === bookId);
    if (hit) {
      return {
        line: hit.value,
        odds: hit.odds,
        bookId: hit.bookId,
        updatedAt: hit.updatedAt,
      };
    }
  }
  const any = want[0];
  if (!any) return null;
  return {
    line: any.value,
    odds: any.odds,
    bookId: any.bookId,
    updatedAt: any.updatedAt,
  };
}

/**
 * @param {{ books: Array<Record<string, unknown>> }} marketSides
 */
function buildMarketBlock(marketSides) {
  const books = marketSides.books || [];
  const over = pickConsensusSide(books, "over");
  const under = pickConsensusSide(books, "under");
  const block = { books };
  if (over) block.over = over;
  if (under) block.under = under;
  return block;
}

/**
 * @param {Map<string, Record<string, unknown>>} byPlayer
 * @param {Record<string, unknown>} playersById
 * @param {number} playerId
 * @param {Record<string, unknown>} row
 * @param {string} market
 * @param {number} gameId
 */
function mergeRow(byPlayer, playersById, playerId, row, market, gameId) {
  const key = String(playerId);
  let entry = byPlayer.get(key);
  if (!entry) {
    const meta = resolvePlayerMeta(playersById, playerId);
    entry = {
      playerId,
      playerAbbr:
        String(row.player_abbr || row.playerAbbr || meta.playerAbbr || "").trim() || null,
      fullName: String(row.full_name || row.fullName || meta.fullName || "").trim() || null,
      teamId: finiteNumber(row.team_id ?? row.teamId) ?? meta.teamId,
      props: {},
    };
    byPlayer.set(key, entry);
  }

  if (!entry.playerAbbr && row.player_abbr) {
    entry.playerAbbr = String(row.player_abbr).trim();
  }
  if (!entry.fullName) {
    const fromRow = String(row.full_name || row.fullName || "").trim();
    const fromMeta = resolvePlayerMeta(playersById, playerId).fullName;
    entry.fullName = fromRow || fromMeta || null;
  }
  if (entry.teamId == null && row.team_id != null) {
    entry.teamId = finiteNumber(row.team_id);
  }

  const linesObj = row.lines && typeof row.lines === "object" ? row.lines : {};
  const bookLines = [];
  for (const [bookKey, arr] of Object.entries(linesObj)) {
    const bookId = finiteNumber(bookKey);
    for (const line of normalizeBookLines(arr)) {
      bookLines.push({
        ...line,
        bookId: line.bookId ?? bookId,
      });
    }
  }

  if (!bookLines.length) return;

  const existing = entry.props[market] || { books: [] };
  const mergedBooks = [...(existing.books || []), ...bookLines];
  entry.props[market] = buildMarketBlock({ books: mergedBooks });

  void gameId;
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} playerProps
 * @param {Record<string, unknown>} playersById
 * @param {number} gameId
 */
export function parseActionNetworkNflGameProps(playerProps, playersById, gameId) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byPlayer = new Map();

  for (const [marketKey, rows] of Object.entries(playerProps || {})) {
    const market = resolveNflPropsWireMarket(marketKey);
    if (!market) continue;
    if (!Array.isArray(rows)) continue;

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const playerId = finiteNumber(row.player_id ?? row.playerId);
      if (playerId == null) {
        const linesObj = row.lines && typeof row.lines === "object" ? row.lines : {};
        for (const bookLines of Object.values(linesObj)) {
          const first = Array.isArray(bookLines) ? bookLines[0] : null;
          if (first?.player_id != null) {
            mergeRow(byPlayer, playersById, finiteNumber(first.player_id), row, market, gameId);
          }
        }
        continue;
      }
      mergeRow(byPlayer, playersById, playerId, row, market, gameId);
    }
  }

  const players = [...byPlayer.values()].sort((a, b) =>
    String(a.fullName || a.playerAbbr || a.playerId).localeCompare(
      String(b.fullName || b.playerAbbr || b.playerId),
    ),
  );

  return {
    gameId,
    players,
    playerCount: players.length,
    hasPostedLines: players.some((p) => {
      const props = p.props || {};
      return Object.keys(props).some((m) => {
        const block = props[m];
        return block && (block.over || block.under);
      });
    }),
    /** Headline markets still listed for UI defaults; extended markets may also be present. */
    headlineMarkets: NFL_PROPS_WIRE_MARKETS,
    source: "action_network",
  };
}
