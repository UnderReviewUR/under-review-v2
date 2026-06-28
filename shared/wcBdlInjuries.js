/**
 * BallDontLie FIFA /player_injuries → WC injuries board rows.
 */

import { normalizeEspnAbbr } from "../api/_wcEspn.js";
import {
  classifyInjuryImpact,
  createEmptyInjuriesBoard,
  mergeInjuryIntoBoard,
} from "./wcInjuriesBoard.js";

/**
 * @param {Record<string, unknown>} row — BDL FIFAPlayerInjury
 */
export function normalizeBdlPlayerInjuryRow(row) {
  if (!row || typeof row !== "object") return null;

  const player = row.player && typeof row.player === "object" ? row.player : {};
  const team = row.team && typeof row.team === "object" ? row.team : {};

  const name = String(player.name || player.short_name || "").trim();
  if (!name) return null;

  const teamAbbr = normalizeEspnAbbr(
    team.abbreviation || team.country_code || team.code || player.country_code || "",
  );
  const status = String(row.status || "").trim() || null;
  const injuryType = String(row.injury_type || row.injuryType || "").trim() || null;

  return {
    bdlPlayerId: player.id != null ? String(player.id) : null,
    name,
    teamAbbr: teamAbbr || null,
    status,
    detail: injuryType,
    sourcePath: "balldontlie_player_injuries",
    impact: classifyInjuryImpact(status, name),
    lastSeenAt: row.updated_at ? Date.parse(String(row.updated_at)) || Date.now() : Date.now(),
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {number} [nowMs]
 */
export function buildInjuriesBoardFromBdlRows(rows, nowMs = Date.now()) {
  const board = createEmptyInjuriesBoard(nowMs);
  board.source = "balldontlie";

  for (const raw of rows || []) {
    const normalized = normalizeBdlPlayerInjuryRow(raw);
    if (!normalized) continue;
    mergeInjuryIntoBoard(board, normalized);
  }

  board.lastUpdated = nowMs;
  return board;
}

/**
 * Question-scoped injury rows — cited nations + high-impact stars.
 * @param {Record<string, unknown> | null | undefined} board
 * @param {string[]} [mentionedTeams]
 */
export function filterInjuriesBoardForPrompt(board, mentionedTeams = []) {
  if (!board?.rows?.length) return board;

  const teams = new Set(
    (mentionedTeams || []).map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
  );
  if (!teams.size) return board;

  const rows = (board.rows || []).filter(
    (r) =>
      r.impact === "high" ||
      (r.teamAbbr && teams.has(String(r.teamAbbr).trim().toUpperCase())),
  );

  const starsOut = rows
    .filter((r) => r.impact === "high" && /\b(out|doubtful|questionable)\b/i.test(String(r.status || "")))
    .map((r) => String(r.name))
    .filter(Boolean);

  return {
    ...board,
    rows,
    starsOut: starsOut.length ? starsOut : board.starsOut,
    scopedTeams: [...teams],
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} injuries
 */
export function formatInjuriesBoardForPrompt(injuries) {
  if (!injuries?.rows?.length) {
    return ["INJURIES (tournament):", "  No aggregated injury rows in KV — do not invent availability."];
  }

  const sourceLabel = String(injuries.source || "espn").includes("balldontlie")
    ? "BallDontLie GOAT"
    : String(injuries.source || "espn");

  const lines = [
    "INJURIES (tournament — binding):",
    `  Source: ${sourceLabel}`,
  ];

  if (Array.isArray(injuries.scopedTeams) && injuries.scopedTeams.length) {
    lines.push(`  Scoped to cited teams: ${injuries.scopedTeams.join(", ")} (plus high-impact flags)`);
  }

  const high = (injuries.rows || []).filter((r) => r.impact === "high").slice(0, 10);
  const rest = (injuries.rows || []).filter((r) => r.impact !== "high").slice(0, 8);

  for (const r of [...high, ...rest]) {
    const status = r.status ? ` — ${r.status}` : "";
    const detail = r.detail ? ` (${r.detail})` : "";
    lines.push(`  ${r.name}${r.teamAbbr ? ` (${r.teamAbbr})` : ""}${status}${detail}`);
  }

  if (injuries.starsOut?.length) {
    lines.push(`  Stars flagged OUT/doubtful: ${injuries.starsOut.join(", ")}`);
  }

  return lines;
}
