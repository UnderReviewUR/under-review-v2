/**
 * Bridge Action Network propsOdds → Odds-API-shaped propLines for invalidation + prompts.
 */
import { nbaPropsBookLabel } from "./nbaPropsBoardDisplay.js";
import { NBA_PROPS_WIRE_MARKETS } from "./nbaPropsConstants.js";

const MARKET_LABELS = {
  points: "points",
  rebounds: "rebounds",
  assists: "assists",
  pra: "points rebounds assists",
  threes: "threes",
};

/**
 * Action Network player_abbr values like "J.Brunson" or "V.Wembanyama".
 * @param {string} abbr
 */
export function stripNbaPropsInitialAbbr(abbr) {
  const raw = String(abbr || "").trim();
  const dotted = raw.match(/^[A-Z]\.(.+)$/i);
  if (dotted) return String(dotted[1] || "").trim();
  return raw;
}

/**
 * @param {string} abbr
 * @param {Array<{ chip: string, fullName: string, teamAbbr: string }>} [chips]
 */
export function resolveNbaPlayerFullNameFromAbbr(abbr, chips = []) {
  const raw = String(abbr || "").trim();
  if (!raw) return "";
  const stripped = stripNbaPropsInitialAbbr(raw);
  const candidates = [raw, stripped].map((s) => s.toLowerCase());
  for (const c of chips) {
    const chipLower = String(c.chip || "").toLowerCase();
    const fullLower = String(c.fullName || "").toLowerCase();
    const surname = fullLower.split(/\s+/).pop() || "";
    for (const lower of candidates) {
      if (chipLower === lower) return c.fullName;
      if (surname && (lower === surname || lower.endsWith(surname))) return c.fullName;
      if (fullLower.includes(lower)) return c.fullName;
    }
  }
  return stripped || raw;
}

/**
 * @param {string} fullName
 * @param {Array<{ chip: string, fullName: string, teamAbbr: string }>} [chips]
 */
export function resolveNbaTeamAbbrFromPlayerName(fullName, chips = []) {
  const key = String(fullName || "").trim().toLowerCase();
  if (!key) return "";
  for (const c of chips) {
    if (String(c.fullName || "").trim().toLowerCase() === key) {
      return String(c.teamAbbr || "").toUpperCase();
    }
  }
  return "";
}

/**
 * @param {Array<Record<string, unknown>>} [slateGames]
 */
function resolveMatchupLabel(slateGames) {
  const g = (slateGames || [])[0];
  if (!g) return "NBA Finals";
  const away = String(g?.awayTeam?.abbr || g?.awayTeam?.name || "").trim();
  const home = String(g?.homeTeam?.abbr || g?.homeTeam?.name || "").trim();
  if (away && home) return `${away} @ ${home}`;
  return "NBA Finals";
}

/**
 * @param {Record<string, unknown> | null | undefined} propsOdds
 * @param {{ slateGames?: Array<Record<string, unknown>>, chips?: Array<{ chip: string, fullName: string, teamAbbr: string }> }} [opts]
 * @returns {Array<Record<string, unknown>>}
 */
export function propsOddsToPropLines(propsOdds, opts = {}) {
  const players = Array.isArray(propsOdds?.players) ? propsOdds.players : [];
  if (!players.length) return [];

  const chips = opts.chips || [];
  const gameLabel = resolveMatchupLabel(opts.slateGames);
  const awayAbbr = String(opts.slateGames?.[0]?.awayTeam?.abbr || "").toUpperCase();
  const homeAbbr = String(opts.slateGames?.[0]?.homeTeam?.abbr || "").toUpperCase();
  /** @type {Array<Record<string, unknown>>} */
  const lines = [];

  for (const p of players) {
    const fullName = resolveNbaPlayerFullNameFromAbbr(p?.playerAbbr, chips);
    if (!fullName) continue;
    const teamAbbr = resolveNbaTeamAbbrFromPlayerName(fullName, chips);

    for (const market of NBA_PROPS_WIRE_MARKETS) {
      const label = MARKET_LABELS[market] || market;
      const block = p?.props?.[market];
      if (!block || typeof block !== "object") continue;
      for (const side of ["over", "under"]) {
        const row = block[side];
        if (row?.line == null || !Number.isFinite(Number(row.line))) continue;
        const bookId = row.bookId ?? null;
        lines.push({
          game: gameLabel,
          awayAbbr: awayAbbr || undefined,
          homeAbbr: homeAbbr || undefined,
          player: fullName,
          prop: label,
          line: Number(row.line),
          side: side === "over" ? "Over" : "Under",
          odds: row.odds ?? null,
          book: bookId != null ? nbaPropsBookLabel(bookId).toLowerCase() : "consensus",
          source: "action_network",
        });
      }
    }
  }

  return lines;
}

/**
 * Seed thin playerStats rows from Action Network props when BDL bundle is empty.
 * @param {Array<Record<string, unknown>>} playerStats
 * @param {Record<string, unknown> | null | undefined} propsOdds
 * @param {Array<{ chip: string, fullName: string, teamAbbr: string }>} [chips]
 */
export function seedPlayerStatsFromPropsOdds(playerStats, propsOdds, chips = []) {
  if (Array.isArray(playerStats) && playerStats.length > 0) return playerStats || [];

  const players = Array.isArray(propsOdds?.players) ? propsOdds.players : [];
  if (!players.length) return [];

  const seen = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const out = [];

  for (const p of players) {
    const fullName = resolveNbaPlayerFullNameFromAbbr(p?.playerAbbr, chips);
    if (!fullName) continue;
    const key = fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const team = resolveNbaTeamAbbrFromPlayerName(fullName, chips);
    out.push({
      name: fullName,
      team,
      pts: null,
      reb: null,
      ast: null,
      source: "action_network_props",
      statsNote: "Posted prop lines only — season averages unavailable",
      playerId: p?.playerId ?? null,
    });
  }

  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
