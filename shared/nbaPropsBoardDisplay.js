import { NBA_PROPS_BOOK_IDS, NBA_PROPS_WIRE_MARKETS } from "./nbaPropsConstants.js";

/** @type {Record<number, string>} */
export const NBA_PROPS_BOOK_LABELS = {
  15: "DraftKings",
  30: "FanDuel",
  79: "BetMGM",
};

/**
 * @param {number | null | undefined} bookId
 */
export function nbaPropsBookLabel(bookId) {
  const id = Number(bookId);
  if (Number.isFinite(id) && NBA_PROPS_BOOK_LABELS[id]) return NBA_PROPS_BOOK_LABELS[id];
  return "Consensus";
}

/**
 * @param {Record<string, unknown> | null | undefined} block
 */
export function formatConsensusMarket(block) {
  if (!block || typeof block !== "object") return null;
  const over = block.over;
  const under = block.under;
  if (!over?.line && !under?.line) return null;
  return {
    line: over?.line ?? under?.line ?? null,
    overOdds: over?.odds ?? null,
    underOdds: under?.odds ?? null,
    bookId: over?.bookId ?? under?.bookId ?? null,
    book: nbaPropsBookLabel(over?.bookId ?? under?.bookId),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} propsOdds
 */
export function formatNbaPropsFreshnessLabel(propsOdds) {
  const fresh = propsOdds?.freshness;
  const ageMin = fresh?.ageMinutes;
  let agePart = "Updated recently";
  if (Number.isFinite(ageMin)) {
    if (ageMin <= 1) agePart = "Updated just now";
    else if (ageMin < 60) agePart = `Updated ${ageMin}m ago`;
    else agePart = `Updated ${Math.round(ageMin / 60)}h ago`;
  } else if (propsOdds?.fetchedAt) {
    const ms = Date.parse(String(propsOdds.fetchedAt));
    if (Number.isFinite(ms)) {
      const diff = Math.max(0, Math.round((Date.now() - ms) / 60000));
      agePart = diff <= 1 ? "Updated just now" : `Updated ${diff}m ago`;
    }
  }
  const book =
    propsOdds?.primaryBookLabel ||
    (propsOdds?.primaryBookId != null
      ? nbaPropsBookLabel(propsOdds.primaryBookId)
      : "DraftKings");
  return `${agePart} · ${book}`;
}

/**
 * @param {string} s
 */
function normNameKey(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * @param {Record<string, unknown>} propsPlayer
 */
export function buildConsensusPropsForWire(propsPlayer) {
  const props = propsPlayer?.props;
  if (!props || typeof props !== "object") return null;

  const out = {};
  for (const market of NBA_PROPS_WIRE_MARKETS) {
    const row = formatConsensusMarket(props[market]);
    if (row) out[market] = row;
  }
  if (!Object.keys(out).length) return null;

  const primaryBookId =
    out.points?.bookId ?? out.rebounds?.bookId ?? out.assists?.bookId ?? NBA_PROPS_BOOK_IDS[0];

  return {
    markets: out,
    primaryBookId,
    primaryBookLabel: nbaPropsBookLabel(primaryBookId),
  };
}

/**
 * @param {Array<Record<string, unknown>>} propsPlayers
 * @param {Array<{ chip: string, fullName: string, teamAbbr: string }>} [chips]
 */
export function indexNbaPropsPlayers(propsPlayers, chips = []) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byName = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const byAbbr = new Map();
  /** @type {Map<string, { chip: string, fullName: string, teamAbbr: string }>} */
  const chipByToken = new Map();
  for (const c of chips) {
    chipByToken.set(c.chip.toUpperCase(), c);
    chipByToken.set(normNameKey(c.chip), c);
  }

  for (const p of propsPlayers || []) {
    const abbr = String(p.playerAbbr || "").trim();
    if (!abbr) continue;
    byAbbr.set(abbr.toUpperCase(), p);
    byAbbr.set(normNameKey(abbr), p);
    const chip = chipByToken.get(abbr.toUpperCase()) || chipByToken.get(normNameKey(abbr));
    if (chip) byName.set(normNameKey(chip.fullName), p);
  }

  return { byName, byAbbr };
}

/**
 * @param {Record<string, unknown>} statRow
 * @param {ReturnType<typeof indexNbaPropsPlayers>} index
 * @param {Array<{ chip: string, fullName: string, teamAbbr: string }>} [chips]
 */
export function matchPropsPlayerToStatRow(statRow, index, chips = []) {
  const nameKey = normNameKey(statRow?.name);
  if (nameKey && index.byName.has(nameKey)) return index.byName.get(nameKey);

  const team = String(statRow?.team || "").toUpperCase();
  for (const row of chips) {
    if (team && String(row.teamAbbr || "").toUpperCase() !== team) continue;
    const fullKey = normNameKey(row.fullName);
    if (fullKey === nameKey) {
      const hit = index.byAbbr.get(row.chip.toUpperCase()) || index.byAbbr.get(normNameKey(row.chip));
      if (hit) return hit;
    }
    const statTokens = nameKey.split(" ").filter(Boolean);
    const chipTok = normNameKey(row.chip);
    if (statTokens.some((t) => t === chipTok || chipTok.includes(t))) {
      const hit = index.byAbbr.get(row.chip.toUpperCase()) || index.byAbbr.get(normNameKey(row.chip));
      if (hit) return hit;
    }
  }

  for (const p of index.byAbbr.values()) {
    const ab = String(p?.playerAbbr || "");
    if (!ab) continue;
    if (nameKey.includes(normNameKey(ab)) || normNameKey(ab).split(" ").every((t) => nameKey.includes(t))) {
      return p;
    }
  }

  return null;
}

/**
 * @param {Array<Record<string, unknown>>} playerStats
 * @param {Record<string, unknown> | null | undefined} propsOdds
 * @param {{ chips?: Array<{ chip: string, fullName: string, teamAbbr: string }> }} [opts]
 */
export function mergeNbaPropsIntoPlayerStats(playerStats, propsOdds, opts = {}) {
  const players = Array.isArray(propsOdds?.players) ? propsOdds.players : [];
  if (!players.length) return playerStats || [];

  const index = indexNbaPropsPlayers(players, opts.chips);

  const freshnessLabel = formatNbaPropsFreshnessLabel(propsOdds);
  const oddsStale = Boolean(propsOdds?.freshness?.isStale);
  const fetchedAt = propsOdds?.fetchedAt || propsOdds?.freshness?.fetchedAt || null;

  return (playerStats || []).map((row) => {
    const hit = matchPropsPlayerToStatRow(row, index, opts.chips);
    if (!hit) return row;
    const consensusProps = buildConsensusPropsForWire(hit);
    if (!consensusProps) return row;
    return {
      ...row,
      consensusProps: {
        ...consensusProps,
        fetchedAt,
        freshnessLabel,
        oddsStale,
        source: propsOdds?.source || "action_network",
      },
    };
  });
}

/**
 * Pick up to N featured players with posted consensus (starters proxy: highest pts on slate).
 * @param {Array<Record<string, unknown>>} playerStats
 * @param {number} [limit]
 */
export function pickKeyPlayerPropRows(playerStats, limit = 10) {
  return (playerStats || [])
    .filter((p) => p?.consensusProps?.markets && Object.keys(p.consensusProps.markets).length > 0)
    .sort((a, b) => Number(b?.pts || 0) - Number(a?.pts || 0))
    .slice(0, limit);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
/**
 * @param {{ fullName: string, chip: string, teamAbbr: string }} chipRow
 * @param {Array<Record<string, unknown>>} playerStats
 */
export function resolveStatRowForUiChip(chipRow, playerStats) {
  const team = String(chipRow?.teamAbbr || "").toUpperCase();
  const fullKey = normNameKey(chipRow?.fullName);
  const chipKey = normNameKey(chipRow?.chip);

  for (const row of playerStats || []) {
    if (team && String(row?.team || "").toUpperCase() !== team) continue;
    const nameKey = normNameKey(row?.name);
    if (fullKey && nameKey === fullKey) return row;
    if (chipKey && (nameKey.includes(chipKey) || chipKey.includes(nameKey.split(" ").pop() || ""))) {
      return row;
    }
  }
  return null;
}

export function formatKeyPropsLinesForPrompt(rows) {
  if (!rows.length) return "";
  const lines = rows.map((p) => {
    const m = p.consensusProps?.markets || {};
    const parts = [];
    for (const [market, row] of Object.entries(m)) {
      if (!row?.line) continue;
      const o = row.overOdds != null ? `o${row.overOdds}` : "";
      const u = row.underOdds != null ? `u${row.underOdds}` : "";
      parts.push(`${market} ${row.line} (${o}/${u} ${row.book || ""})`.trim());
    }
    return `- ${p.name} (${p.team}): ${parts.join("; ") || "no lines"}`;
  });
  return `\nKEY POSTED PROP LINES (consensus — cite only when ODDS FRESHNESS allows):\n${lines.join("\n")}\n`;
}
