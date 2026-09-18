/**
 * Elite-but-thin upgrades on the NFL props board picker:
 * - primary = strongest evidence stack (not just high print)
 * - flag correlated legs that fight the same script
 * - batch-2 floor so refresh boards aren't weak padding
 */
import {
  buildNflPropEdgeForRow,
  voteNflPropEdgeSide,
} from "./nflAskPropEdge.js";

/**
 * @param {string} name
 */
function lastName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "Player";
  const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
  let i = parts.length - 1;
  while (i > 0 && suffixes.has(parts[i].toLowerCase().replace(/\./g, ""))) i -= 1;
  return parts[i];
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
function teamOf(row) {
  return String(row?.team || row?.teamAbbr || "")
    .toUpperCase()
    .trim();
}

/**
 * Strength of the ticket as THE PLAY — injury / line shop / pace / fantasy.
 * Higher = better primary. Soft opener defaults score low.
 *
 * @param {Record<string, unknown>} row
 * @param {Array<Record<string, unknown>>} allRows
 * @param {(row: Record<string, unknown>, allRows?: Array<Record<string, unknown>>, opts?: object) => { side: string, why: string }} inferSide
 * @param {(row: Record<string, unknown>) => string} marketKey
 * @param {{
 *   openerWeek?: boolean,
 *   briefcase?: Record<string, unknown>|null,
 *   peerLines?: (row: Record<string, unknown>, allRows: Array<Record<string, unknown>>) => number[],
 * }} [opts]
 */
export function scoreNflPropPrimaryEdge(row, allRows, inferSide, marketKey, opts = {}) {
  if (!row?.player || row.line == null) return 0;
  const briefcase = opts.briefcase || null;
  const openerWeek = Boolean(opts.openerWeek);
  const market = marketKey(row);
  const edge = briefcase ? buildNflPropEdgeForRow(row, market, briefcase) : null;
  const ticket = inferSide(row, allRows, { openerWeek, briefcase, edge });

  let score = 8;
  if (edge?.injuryHard) score += 100;

  const peers =
    typeof opts.peerLines === "function" ? opts.peerLines(row, allRows) : [];
  if (peers.length >= 2) {
    const hi = Math.max(...peers);
    const lo = Math.min(...peers);
    const line = Number(row.line);
    if (hi - lo >= 1) {
      if (ticket.side === "Under" && line >= hi - 0.05) score += 42;
      else if (ticket.side === "Over" && line <= lo + 0.05) score += 42;
      else if (hi - lo >= 1) score += 12;
    }
  }

  const vote = voteNflPropEdgeSide(row, market, edge, { openerWeek });
  if (vote) {
    const weight = /pace|projection/i.test(String(vote.why || "")) ? 38 : 22;
    score += weight;
    if (vote.side === ticket.side) score += 12;
    else score -= 25; // line-shop side fights pace — don't make this THE PLAY
  } else if (/early season|no smash over|close number|no clear smash/i.test(String(ticket.why || ""))) {
    score -= 40;
  }

  if (edge?.pace != null || edge?.fantasyPace != null) score += 10;

  // Real proj/pace why beats a blank default for THE PLAY.
  if (edge?.fantasyPace != null && Number.isFinite(Number(row.line))) {
    const gap = Math.abs(Number(row.line) - Number(edge.fantasyPace));
    if (gap >= 2) score += 28;
  }

  // Flat boards (no injury/pace/shop): still prefer fading the juiciest print —
  // especially QB pass yards — so THE PLAY isn't a random first family seat.
  if (ticket.side === "Under" && Number.isFinite(Number(row.line))) {
    const line = Number(row.line);
    const m = String(market || "");
    if (m === "pass_yds" || m.endsWith("pass_yds")) {
      score += 16 + Math.min(24, Math.floor(line / 12));
    } else if (m === "rec_yds" || m === "rush_yds") {
      score += Math.min(14, Math.floor(line / 8));
    }
  }

  return score;
}

/**
 * Re-order a picked board so THE PLAY is the strongest evidence ticket.
 * High-print swap only when that print is still an Under fade.
 *
 * @param {Array<Record<string, unknown>>} picked
 * @param {Array<Record<string, unknown>>} allRows
 * @param {{
 *   openerWeek?: boolean,
 *   briefcase?: Record<string, unknown>|null,
 *   inferSide: Function,
 *   marketKey: Function,
 *   sameTicket: Function,
 *   peerLines: Function,
 *   pickConsensus: Function,
 * }} deps
 */
export function orderNflPropsBoardByPrimaryEdge(picked, allRows, deps) {
  if (!Array.isArray(picked) || picked.length <= 1) return picked || [];

  const resolveUnderClimb = (row) => {
    const same = (allRows || []).filter(
      (p) => deps.sameTicket(p, row) && Number.isFinite(Number(p.line)),
    );
    if (same.length < 2) return row;
    const consensus = deps.pickConsensus(same);
    if (!consensus || Number(consensus.line) === Number(row.line)) return row;
    const ticket = deps.inferSide(consensus, allRows, {
      openerWeek: deps.openerWeek,
      briefcase: deps.briefcase,
    });
    // Only climb to a higher print when we're still fading it.
    if (ticket.side === "Under" && Number(consensus.line) >= Number(row.line)) {
      return consensus;
    }
    return row;
  };

  const scored = picked
    .map((row) => {
      const candidate = resolveUnderClimb(row);
      return {
        row,
        candidate,
        edge: scoreNflPropPrimaryEdge(candidate, allRows, deps.inferSide, deps.marketKey, {
          openerWeek: deps.openerWeek,
          briefcase: deps.briefcase,
          peerLines: deps.peerLines,
        }),
      };
    })
    .sort((a, b) => b.edge - a.edge);

  const primary = scored[0].candidate;
  const rest = picked.filter(
    (row) => row !== primary && !(typeof deps.sameTicket === "function" && deps.sameTicket(row, primary)),
  );
  return [primary, ...rest];
}

/**
 * Same-script fights on a multi-leg board (QB under vs teammate WR over, etc.).
 *
 * @param {Array<{ row: Record<string, unknown>, side: "Over"|"Under" }>} sided
 * @returns {string[]}
 */
export function detectNflBoardScriptConflicts(sided) {
  const legs = Array.isArray(sided) ? sided.filter((x) => x?.row && x.side) : [];
  /** @type {string[]} */
  const notes = [];
  for (let i = 0; i < legs.length; i += 1) {
    for (let j = i + 1; j < legs.length; j += 1) {
      const a = legs[i];
      const b = legs[j];
      const teamA = teamOf(a.row);
      const teamB = teamOf(b.row);
      if (!teamA || teamA !== teamB) continue;

      const mA = String(a.market || "").toLowerCase();
      const mB = String(b.market || "").toLowerCase();
      const aPass = mA === "pass_yds" || mA === "pass_tds";
      const bPass = mB === "pass_yds" || mB === "pass_tds";
      const aRec = mA === "rec_yds" || mA === "receptions" || mA === "rec_tds";
      const bRec = mB === "rec_yds" || mB === "receptions" || mB === "rec_tds";
      const aRush = mA === "rush_yds" || mA === "rush_tds";
      const bRush = mB === "rush_yds" || mB === "rush_tds";

      if (aPass && bRec && a.side !== b.side) {
        notes.push(
          `${lastName(a.row.player)} ${a.side.toLowerCase()} fights ${lastName(b.row.player)} ${b.side.toLowerCase()} — same pass script.`,
        );
      } else if (bPass && aRec && b.side !== a.side) {
        notes.push(
          `${lastName(b.row.player)} ${b.side.toLowerCase()} fights ${lastName(a.row.player)} ${a.side.toLowerCase()} — same pass script.`,
        );
      } else if (aRush && bRush && a.side !== b.side) {
        notes.push(
          `${lastName(a.row.player)} and ${lastName(b.row.player)} rush sides fight — pick one backfield lean.`,
        );
      }
    }
  }
  return [...new Set(notes)].slice(0, 2);
}

/**
 * Batch-2 / refresh: keep tickets with real juice, not leftover depth padding.
 *
 * @param {Record<string, unknown>} row
 * @param {{
 *   valueBoost: number,
 *   volume: number,
 *   edgeScore: number,
 *   strict?: boolean,
 * }} opts
 */
export function nflPropBatch2PassesFloor(row, opts) {
  if (!row?.player) return false;
  const boost = Number(opts.valueBoost) || 0;
  const vol = Number(opts.volume) || 0;
  const edge = Number(opts.edgeScore) || 0;
  if (opts.strict !== false) {
    return boost >= 28 || vol >= 25 || edge >= 35;
  }
  return boost >= 18 || vol >= 12 || edge >= 20;
}
