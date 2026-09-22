/**
 * One parsed NFL first ask. Market, matchup, players, and side.
 * Game price and player props cannot share a lane.
 */
import { detectNflTeamHints } from "../src/lib/detectSportFromQuestion.js";
import { detectNflAskMarket } from "./nflGoatExtractionContract.js";
import { isNflPlayerIdentityAsk } from "./nflAskNormalize.js";
import { collectNflAskScopeFromQuestion, nflAskNamedPlayerHits } from "./nflAskScope.js";

const GAME_PRICE = new Set(["total", "spread", "moneyline", "opinion"]);

const NAMED_PROP = new Set([
  "targets",
  "drops",
  "sacks",
  "tackles",
  "forced_fumbles",
  "fumbles",
  "pass_ints",
  "def_ints",
  "anytime_td",
  "pass_tds",
  "rush_tds",
  "rec_tds",
  "pass_yds",
  "rush_yds",
  "rec_yds",
  "receptions",
]);

/**
 * @param {string} question
 * @returns {"over"|"under"|null}
 */
function readSide(question) {
  const q = String(question || "").toLowerCase();
  const over = /\bover\b/.test(q);
  const under = /\bunder\b/.test(q);
  if (over && !under) return "over";
  if (under && !over) return "under";
  return null;
}

/**
 * @param {string} question
 * @returns {string[]}
 */
function matchupAbbrs(question) {
  /** @type {string[]} */
  const out = [];
  const re = /\b([A-Za-z]{2,3})\s*@\s*([A-Za-z]{2,3})\b/g;
  let match;
  while ((match = re.exec(String(question || "")))) {
    out.push(match[1].toUpperCase(), match[2].toUpperCase());
  }
  return out;
}

/**
 * @param {string} question
 * @returns {number|null}
 */
function readLine(question) {
  const match = String(question || "").match(/\b(\d{1,3}(?:\.\d+)?)\b/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} question
 * @returns {{
 *   marketId: string,
 *   lane: "game_price"|"props_board"|"named_prop"|"ticket_review"|"identity"|"sgp"|"other",
 *   teams: string[],
 *   players: string[],
 *   side: "over"|"under"|null,
 *   line: number|null,
 * }}
 */
export function parseNflFirstAsk(question) {
  const raw = String(question || "");
  const marketId = String(detectNflAskMarket(raw)?.marketId || "general");
  const scope = collectNflAskScopeFromQuestion(raw);
  const named = nflAskNamedPlayerHits(raw);
  /** @type {"game_price"|"props_board"|"named_prop"|"ticket_review"|"identity"|"sgp"|"other"} */
  let lane = "other";
  if (isNflPlayerIdentityAsk(raw)) lane = "identity";
  else if (marketId === "ticket_review") lane = "ticket_review";
  else if (GAME_PRICE.has(marketId)) lane = "game_price";
  else if (marketId === "props_board") lane = "props_board";
  else if (marketId === "sgp") lane = "sgp";
  else if (NAMED_PROP.has(marketId)) lane = "named_prop";

  const fromHints = [...detectNflTeamHints(raw), ...matchupAbbrs(raw)].map((team) =>
    String(team || "").toUpperCase(),
  );
  const scoped = [...scope.teams].map((team) => String(team || "").toUpperCase()).filter(Boolean);
  /** @type {string[]} */
  const teams = [];
  const teamSource = lane === "game_price" ? fromHints : [...scoped, ...fromHints];
  for (const team of teamSource) {
    if (team && !teams.includes(team)) teams.push(team);
  }

  return {
    marketId,
    lane,
    teams,
    players: lane === "game_price" ? [] : [...(named.names || [])],
    side: readSide(raw),
    line: readLine(raw),
  };
}
