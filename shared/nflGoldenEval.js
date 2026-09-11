/**
 * NFL golden eval — runs question shapes through the real Ask grounding chain
 * (market detect → scope → hygiene scrub → prompt trim → guard) and grades
 * whether every named leg reached a live number.
 *
 * Offline mode is the launch gate: no network, no API key, deterministic.
 * Two tiers are graded per case:
 *   evidence — the player's live row survived scope/scrub/trim, i.e. the number
 *              was actually in front of the model (the bug class that shipped).
 *   output   — for markets UR authors deterministically (ticket review, props
 *              board), the final take names the player with a board number and
 *              never asks the user for lines or invents one.
 */

import { detectNflAskMarket } from "./nflGoatExtractionContract.js";
import { trimNflPlayerPropsForAsk } from "./nflAskPropTrim.js";
import { applyNflAskGuard, collectNflPostedNumbers } from "./nflAskGuard.js";

/** @typedef {import("./nflGoldenEval.fixtures.js").NflGoldenEvalCase} NflGoldenEvalCase */
/** @typedef {import("./nflGoldenEval.fixtures.js").NflGoldenBoard} NflGoldenBoard */

const DEFAULT_MODEL_FIXTURE = Object.freeze({
  call: "PASS",
  callType: "prop",
  confidence: "Speculative",
  lean: "Lean: Pass. Waiting on a number I trust.",
  whyNow: "Nothing on this board separates itself before kickoff.",
  edge: "No edge worth pricing right now.",
  analysis: {
    matchupAnalysis: "Neutral matchup read pending the posted number.",
    injuryContext: "Check inactives before you bet it.",
    marketContext: "Market is efficient on this one.",
    lineMovement: "No movement to cite.",
    statisticalEdge: "Season priors only.",
  },
  caveats: ["Confirm the number before you bet it."],
});

/** @param {unknown} name */
function lastNameToken(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return last.replace(/[.,]/g, "").toLowerCase();
}

/** @param {unknown} text */
function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

/**
 * Full user-visible surface of a structured take.
 * @param {Record<string, unknown> | null} structured
 */
export function nflGoldenEvalTakeText(structured) {
  if (!structured || typeof structured !== "object") return "";
  const analysis =
    structured.analysis && typeof structured.analysis === "object" ? structured.analysis : {};
  const caveats = Array.isArray(structured.caveats) ? structured.caveats.join(" ") : "";
  return normalizeText(
    [
      structured.call,
      structured.lean,
      structured.whyNow,
      structured.edge,
      analysis.matchupAnalysis,
      analysis.injuryContext,
      analysis.marketContext,
      analysis.lineMovement,
      analysis.statisticalEdge,
      caveats,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

/**
 * Numbers a take commits to: anything in the call, plus over/under N in the body.
 * Deliberately narrow — takes legitimately carry ranks, odds and per-game rates.
 * @param {Record<string, unknown> | null} structured
 */
export function nflGoldenEvalCitedNumbers(structured) {
  /** @type {number[]} */
  const out = [];
  const push = (raw) => {
    const n = Math.abs(Number(raw));
    if (!Number.isFinite(n) || n <= 0 || n >= 1000) return;
    if (n === 2024 || n === 2025 || n === 2026) return;
    if (n === 110 || n === 105 || n === 115 || n === 120) return; // vig
    out.push(n);
  };

  const call = String(structured?.call || "");
  for (const m of call.matchAll(/([+-]?\d+(?:\.\d+)?)/g)) push(m[1]);

  const body = nflGoldenEvalTakeText(structured).replace(call, " ");
  for (const m of body.matchAll(/\b(?:over|under)\s+([+-]?\d+(?:\.\d+)?)\b/gi)) push(m[1]);

  return [...new Set(out)];
}

/** @param {string} question */
function numbersStatedInQuestion(question) {
  /** @type {number[]} */
  const out = [];
  for (const m of String(question || "").matchAll(/\b(\d+(?:\.\d+)?)\b/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 1000) out.push(n);
  }
  return out;
}

/** @param {number} n @param {number[]} pool */
function nearAny(n, pool) {
  return pool.some((p) => Math.abs(p - n) <= 0.15);
}

/**
 * Rows for a player (matched on last name) that survived to the prompt board.
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} name
 */
function rowsForPlayer(rows, name) {
  const token = lastNameToken(name);
  if (!token) return [];
  return rows.filter((r) => {
    const player = String(r?.player || "").toLowerCase();
    return player.includes(token);
  });
}

/**
 * Event ids that belong to games matching the resolved scope.
 * @param {NflGoldenBoard} board
 * @param {Set<string>} scope
 */
function scopedEventIds(board, scope) {
  const ids = new Set();
  for (const g of board.games || []) {
    const home = String(g?.homeAbbr || "").toUpperCase();
    const away = String(g?.awayAbbr || "").toUpperCase();
    if (scope.size && !scope.has(home) && !scope.has(away)) continue;
    if (g?.eventId != null) ids.add(String(g.eventId));
    if (g?.providerGameId != null) ids.add(String(g.providerGameId));
  }
  return ids;
}

/**
 * Run one case through the real grounding chain.
 * @param {NflGoldenEvalCase} row
 * @param {NflGoldenBoard} board
 * @param {{ resolveScope: (q: string, ctx?: unknown) => Set<string>, scrub: (props: unknown[], opts: Record<string, unknown>) => unknown[] }} deps
 */
export function runNflGoldenEvalCase(row, board, deps) {
  const question = String(row.question || "");
  /** @type {string[]} */
  const issueCodes = [];

  const detected = detectNflAskMarket(question);
  const marketId = String(detected?.marketId || "");
  if (row.detected && marketId !== row.detected) {
    issueCodes.push(`market_mismatch:${row.detected}!=${marketId || "none"}`);
  }

  const scope = deps.resolveScope(question, { games: board.games });
  const scopeList = [...scope].map((s) => String(s).toUpperCase()).sort();
  if (Array.isArray(row.scope)) {
    const want = [...row.scope].map((s) => s.toUpperCase()).sort();
    if (want.join(",") !== scopeList.join(",")) {
      issueCodes.push(`scope_mismatch:[${want.join(",")}]!=[${scopeList.join(",")}]`);
    }
  }
  // An ambiguous surname may resolve to nothing, but it must never resolve to
  // the wrong club — that is the roster-truth invariant.
  for (const ab of row.forbidScope || []) {
    if (scopeList.includes(String(ab).toUpperCase())) issueCodes.push(`scope_forbidden:${ab}`);
  }

  const league = board.briefcase?.league || {};
  const playerTeamByName = league.playerTeamByName || {};
  const rosterNames = Object.values(league.rostersByTeam || {})
    .flat()
    .map((p) => String(p?.name || ""))
    .filter(Boolean);

  const scrubbed = deps.scrub(board.propLines || [], {
    scope: scopeList,
    rosterNames,
    playerTeamByName,
  });
  const trimmed = trimNflPlayerPropsForAsk(scrubbed, {
    question,
    scope: scopeList,
    rosterNames,
    playerTeamByName,
    maxRows: 56,
  });

  // Cross-game contamination: a row from another matchup reaching the prompt
  // lets the model quote a number that was never posted for this game.
  const allowedIds = scopedEventIds(board, scope);
  if (allowedIds.size) {
    for (const r of trimmed) {
      const id = r?.eventId != null ? String(r.eventId) : "";
      if (!id || allowedIds.has(id)) continue;
      issueCodes.push(`cross_game_row:${lastNameToken(r?.player)}@${r?.game || "?"}`);
    }
  }

  for (const name of row.evidence || []) {
    if (!rowsForPlayer(trimmed, name).length) issueCodes.push(`evidence_missing:${name}`);
  }

  const structured = JSON.parse(JSON.stringify(row.modelFixture || DEFAULT_MODEL_FIXTURE));
  const guarded = applyNflAskGuard({
    question,
    structured,
    games: board.games || [],
    propLines: trimmed,
    briefcase: board.briefcase,
    detected,
  });
  const out = guarded?.structured || structured;
  const codes = Array.isArray(guarded?.codes) ? guarded.codes : [];
  const text = nflGoldenEvalTakeText(out);

  for (const code of row.expectCodes || []) {
    if (!codes.includes(code)) issueCodes.push(`guard_code_missing:${code}`);
  }
  for (const code of row.forbidCodes || []) {
    if (codes.includes(code)) issueCodes.push(`guard_code_forbidden:${code}`);
  }

  for (const rule of row.forbidText || []) {
    if (new RegExp(rule.re, "i").test(text)) issueCodes.push(`forbidden_text:${rule.label}`);
  }

  // Invented numbers: anything the take commits to must be posted on the board
  // or restated from the user's own slip.
  const posted = collectNflPostedNumbers(board.games || [], trimmed);
  const stated = numbersStatedInQuestion(question);
  for (const n of nflGoldenEvalCitedNumbers(out)) {
    if (nearAny(n, posted) || nearAny(n, stated)) continue;
    issueCodes.push(`invented_number:${n}`);
  }

  // Grounded output: the player must be named alongside one of their live rows.
  for (const name of row.grounded || []) {
    const token = lastNameToken(name);
    if (!token || !new RegExp(`\\b${token}`, "i").test(text)) {
      issueCodes.push(`ungrounded_player:${name}`);
      continue;
    }
    const lines = rowsForPlayer(trimmed, name)
      .map((r) => Number(r?.line))
      .filter((n) => Number.isFinite(n));
    if (!lines.length) {
      issueCodes.push(`ungrounded_player:${name}`);
      continue;
    }
    const quoted = lines.some((n) => new RegExp(`\\b${String(n).replace(".", "\\.")}\\b`).test(text));
    if (!quoted) issueCodes.push(`ungrounded_number:${name}`);
  }

  const unique = [...new Set(issueCodes)];
  return {
    id: row.id,
    passed: unique.length === 0,
    knownGap: Boolean(row.knownGap),
    issueCodes: unique,
    marketId,
    scope: scopeList,
    boardRows: trimmed.length,
    call: String(out?.call || ""),
    text,
    guardCodes: codes,
  };
}

/** @param {Array<{ passed?: boolean, knownGap?: boolean }>} results */
export function summarizeNflGoldenEvalResults(results) {
  const rows = Array.isArray(results) ? results : [];
  const pass = rows.filter((r) => r?.passed).length;
  const knownGaps = rows.filter((r) => !r?.passed && r?.knownGap).length;
  /** @type {Record<string, number>} */
  const byCode = {};
  for (const r of rows) {
    if (r?.passed) continue;
    for (const code of r?.issueCodes || []) {
      const family = String(code).split(":")[0];
      byCode[family] = (byCode[family] || 0) + 1;
    }
  }
  return {
    pass,
    total: rows.length,
    knownGaps,
    fail: rows.length - pass - knownGaps,
    byCode,
  };
}
