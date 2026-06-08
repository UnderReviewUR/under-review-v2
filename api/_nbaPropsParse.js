import {
  NBA_PROPS_BOOK_IDS,
  NBA_PROPS_MARKET_TYPE_MAP,
  NBA_PROPS_WIRE_MARKETS,
} from "../shared/nbaPropsConstants.js";

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
      teamId: finiteNumber(fromMap.team_id ?? fromMap.teamId),
    };
  }
  return { playerAbbr: null, teamId: null };
}

/**
 * @param {Array<Record<string, unknown>> | undefined} bookLines
 */
function normalizeBookLines(bookLines) {
  const out = [];
  for (const row of bookLines || []) {
    if (!row || typeof row !== "object") continue;
    const side = String(row.side || "").toLowerCase();
    if (side !== "over" && side !== "under") continue;
    out.push({
      bookId: finiteNumber(row.book_id ?? row.bookId),
      side,
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
  const want = bookLines.filter((l) => l.side === side && l.value != null && l.odds != null);
  for (const bookId of NBA_PROPS_BOOK_IDS) {
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
 * @param {Record<string, unknown>} marketSides
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
 * @param {Record<string, Array<Record<string, unknown>>>} playerProps
 * @param {Record<string, unknown>} playersById
 * @param {number} gameId
 */
export function parseActionNetworkGameProps(playerProps, playersById, gameId) {
  /** @type {Map<string, { playerId: number, playerAbbr: string | null, teamId: number | null, props: Record<string, unknown> }>} */
  const byPlayer = new Map();

  for (const [marketKey, rows] of Object.entries(playerProps || {})) {
    const market = NBA_PROPS_MARKET_TYPE_MAP[marketKey];
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
    String(a.playerAbbr || a.playerId).localeCompare(String(b.playerAbbr || b.playerId)),
  );

  return {
    gameId,
    players,
    playerCount: players.length,
    hasPostedLines: players.some((p) =>
      NBA_PROPS_WIRE_MARKETS.some((m) => {
        const block = p.props?.[m];
        return block && (block.over || block.under);
      }),
    ),
    source: "action_network",
  };
}

/**
 * @param {Map<string, { playerId: number, playerAbbr: string | null, teamId: number | null, props: Record<string, unknown> }>} byPlayer
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
      teamId: finiteNumber(row.team_id ?? row.teamId) ?? meta.teamId,
      props: {},
    };
    byPlayer.set(key, entry);
  }

  if (!entry.playerAbbr && row.player_abbr) {
    entry.playerAbbr = String(row.player_abbr).trim();
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
