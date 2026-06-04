/**
 * World Cup 2026 — aggregated injury board + star impact flags.
 */

import { normalizeEspnAbbr } from "../api/_wcEspn.js";
import { normalizeWcPlayerName, playerRegistryKey } from "./wcPlayerRegistry.js";

/** High-impact players — downgrade in Golden Boot ranking when doubtful/out. */
export const WC_STAR_PLAYER_NAMES = [
  "Kylian Mbappé",
  "Harry Kane",
  "Erling Haaland",
  "Lamine Yamal",
  "Vinícius Júnior",
  "Lionel Messi",
  "Robert Lewandowski",
  "Mohamed Salah",
  "Cristiano Ronaldo",
  "Kevin De Bruyne",
  "Jamal Musiala",
  "Lautaro Martínez",
];

const OUT_STATUSES = /\b(out|doubtful|questionable|injured|suspended|will not play|ruled out)\b/i;

/**
 * @param {string | null | undefined} status
 */
export function classifyInjuryImpact(status, playerName) {
  const stars = WC_STAR_PLAYER_NAMES.map((n) => normalizeWcPlayerName(n).toLowerCase());
  const nameKey = normalizeWcPlayerName(playerName).toLowerCase();
  const isStar = stars.some((s) => nameKey.includes(s.split(" ")[0]) || s === nameKey);

  const statusText = String(status || "").trim();
  if (!statusText) return isStar ? "med" : "low";
  if (OUT_STATUSES.test(statusText)) return isStar ? "high" : "med";
  return isStar ? "med" : "low";
}

/**
 * @param {number} [nowMs]
 */
export function createEmptyInjuriesBoard(nowMs = Date.now()) {
  return {
    lastUpdated: nowMs,
    source: "espn",
    rows: /** @type {Array<Record<string, unknown>>} */ ([]),
    starsOut: /** @type {string[]} */ ([]),
  };
}

/**
 * @param {Record<string, unknown>} board
 * @param {Record<string, unknown>} injuryRow
 */
export function mergeInjuryIntoBoard(board, injuryRow) {
  const name = normalizeWcPlayerName(injuryRow.name);
  const teamAbbr = normalizeEspnAbbr(injuryRow.teamAbbr);
  if (!name) return board;

  const key = playerRegistryKey(name, teamAbbr || "UNK");
  const impact = classifyInjuryImpact(injuryRow.status, name);
  const row = {
    espnAthleteId: injuryRow.espnAthleteId || null,
    name,
    teamAbbr: teamAbbr || null,
    status: injuryRow.status ? String(injuryRow.status) : null,
    detail: injuryRow.detail ? String(injuryRow.detail) : null,
    impact,
    sourcePath: injuryRow.sourcePath || null,
    lastSeenAt: Date.now(),
  };

  const idx = board.rows.findIndex(
    (r) => playerRegistryKey(String(r.name), String(r.teamAbbr || "")) === key,
  );
  if (idx >= 0) {
    board.rows[idx] = { ...board.rows[idx], ...row };
  } else {
    board.rows.push(row);
  }

  board.starsOut = board.rows
    .filter((r) => r.impact === "high" && OUT_STATUSES.test(String(r.status || "")))
    .map((r) => String(r.name))
    .filter(Boolean);

  return board;
}

/**
 * @param {Record<string, unknown>} board
 * @param {Record<string, unknown> | null | undefined} matchDetail
 */
export function mergeInjuriesFromMatchDetail(board, matchDetail) {
  if (!matchDetail) return board;
  const injuries = Array.isArray(matchDetail.injuries) ? matchDetail.injuries : [];
  for (const inj of injuries) {
    mergeInjuryIntoBoard(board, inj);
  }
  return board;
}

/**
 * @param {Record<string, unknown>} board
 * @param {Array<Record<string, unknown>>} matchDetails
 * @param {number} [nowMs]
 */
export function buildInjuriesBoardFromMatchDetails(matchDetails, nowMs = Date.now()) {
  const board = createEmptyInjuriesBoard(nowMs);
  for (const detail of matchDetails || []) {
    mergeInjuriesFromMatchDetail(board, detail);
  }
  board.lastUpdated = nowMs;
  board.source = matchDetails?.length ? "espn_match_details" : "empty";
  return board;
}
