/**
 * NFL Ask turn kind — first question vs follow-up that must stay on the prior ticket.
 * Elliptical chips ("What kills this edge?", "Build a parlay around this.") are not new boards.
 */
import { detectNflTeamHints } from "../src/lib/detectSportFromQuestion.js";
import { looksLikeNflPropsRefreshAsk } from "./nflAskPropsBatch.js";
import { nflAskNamedPlayerHits } from "./nflAskScope.js";

/** @typedef {"explain_kill"|"parlay"|"refresh"|"continue_player"|"flip_side"|"hold_context"|null} NflFollowUpKind */

/**
 * @param {Record<string, unknown>|null|undefined} prior
 */
function priorTicketText(prior) {
  if (!prior) return "";
  return `${prior.lean || ""} ${prior.call || ""} ${prior.whyNow || ""} ${prior.edge || ""}`.toLowerCase();
}

/**
 * A short reaction stays on the ticket. A new team, a new player, or a new number does not.
 * @param {string} q
 * @param {Record<string, unknown>|null|undefined} prior
 */
function nflFollowUpStaysOnTicket(q, prior) {
  if (!q || q.length > 180) return false;
  if (/\b(nba|mlb|nhl|world cup|la liga|premier league|ufc|pga|masters|formula)\b/.test(q)) return false;
  if (/\b(total|spread|moneyline|who wins)\b/.test(q)) return false;
  if (/\b(best|player)\s+props?\b/.test(q) && /\b(vs\.?|versus|@)\b/.test(q)) return false;
  if (/\b(?:over|under)\s+\d/.test(q)) return false;

  const blob = priorTicketText(prior);
  const hits = nflAskNamedPlayerHits(q);
  const namedBits = [...(hits.names || []), ...(hits.tokens || [])];
  for (const bit of namedBits) {
    const parts = String(bit || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 4);
    const last = parts[parts.length - 1] || "";
    if (last && !blob.includes(last)) return false;
  }

  const priorTeams = new Set(detectNflTeamHints(blob));
  for (const abbr of detectNflTeamHints(q)) {
    if (!priorTeams.has(abbr) && !blob.includes(String(abbr).toLowerCase())) return false;
  }
  return true;
}

/**
 * @param {string} question
 * @param {unknown[]} [history]
 * @returns {NflFollowUpKind}
 */
export function classifyNflAskFollowUp(question, history) {
  const q = String(question || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return null;
  if (/\bwhat kills (?:this|the|that|it)\b/.test(q) || /\bwhat would (?:kill|flip|break) (?:this|it|the edge)\b/.test(q)) {
    return "explain_kill";
  }
  if (/\bbuild a parlay\b/.test(q) || /\bparlay (?:around|from) (?:this|these)\b/.test(q)) {
    return "parlay";
  }
  if (looksLikeNflPropsRefreshAsk(q)) return "refresh";
  const prior = latestNflStructuredTake(history);
  if (!prior) return null;
  if (/^(more|another|next)\b/.test(q) && q.length < 40) return "refresh";
  if (
    /^(?:under instead|over instead|take the under|take the over|flip it|the under|the over)\b/.test(q) &&
    q.length < 80
  ) {
    return "flip_side";
  }
  if (
    /^(?:and |what about |how about |also )\b/.test(q) &&
    q.length < 160 &&
    !/\b(total|spread|moneyline|who wins)\b/.test(q)
  ) {
    return "continue_player";
  }
  if (nflFollowUpStaysOnTicket(q, prior)) return "hold_context";
  return null;
}

/**
 * @param {unknown[]} history
 * @returns {Record<string, unknown>|null}
 */
export function latestNflStructuredTake(history) {
  const turns = Array.isArray(history) ? history : [];
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (!turn || typeof turn !== "object") continue;
    const role = String(turn.role || "").toLowerCase();
    if (role && role !== "assistant" && role !== "ai") continue;
    const structured =
      (turn.structured && typeof turn.structured === "object" && turn.structured) ||
      (turn.structuredResponse && typeof turn.structuredResponse === "object" && turn.structuredResponse) ||
      null;
    if (!structured) continue;
    const sport = String(structured.sport || turn.sport || "").toLowerCase();
    const callType = String(structured.callType || "").toLowerCase();
    if (sport && sport !== "nfl") continue;
    if (sport === "nfl" || (callType === "prop" && !sport)) return structured;
  }
  return null;
}

/**
 * Deterministic follow-up card. Null when there is no prior NFL ticket to hold.
 * @param {string} question
 * @param {unknown[]} [history]
 * @returns {Record<string, unknown>|null}
 */
export function buildNflFollowUpHoldTake(question, history) {
  const kind = classifyNflAskFollowUp(question, history);
  if (kind !== "explain_kill" && kind !== "parlay" && kind !== "flip_side" && kind !== "hold_context") return null;
  const prior = latestNflStructuredTake(history);
  if (!prior) return null;

  const lean = String(prior.lean || "").trim();
  const call = String(prior.call || "").trim();
  const why = String(prior.whyNow || "").trim();
  const caveats = Array.isArray(prior.caveats)
    ? prior.caveats.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const kill =
    caveats.find((c) => !/^early season/i.test(c) && !/^check inactives/i.test(c)) ||
    caveats[0] ||
    String(prior.edge || "").trim() ||
    "If the posted number moves through your read, pass.";

  if (kind === "explain_kill" || kind === "hold_context") {
    const same = kind === "hold_context" ? "Same ticket. This follow-up does not open a new board.\n\n" : "Same ticket.\n\n";
    return {
      sport: "NFL",
      call: call || "SAME TICKET",
      callType: prior.callType || "prop",
      confidence: prior.confidence || "Speculative",
      lean: lean || "Lean: same ticket.",
      whyNow: `${same}Kills it: ${kill}`,
      edge: kill,
      analysis: {
        matchupAnalysis: "",
        injuryContext: String(prior.analysis?.injuryContext || ""),
        marketContext: "",
        lineMovement: "",
        statisticalEdge: "",
      },
      caveats: [kill],
      timestamp: new Date().toISOString(),
      parlayLegs: null,
      parlayTotalOdds: null,
    };
  }

  if (kind === "flip_side") {
    const q = String(question || "").toLowerCase();
    const wantUnder = /\bunder\b/.test(q) && !/\bover\b/.test(q);
    const wantOver = /\bover\b/.test(q) && !/\bunder\b/.test(q);
    const wasUnder = /\bunder\b/i.test(call) || /\bunder\b/i.test(lean);
    const next = wantUnder ? "under" : wantOver ? "over" : wasUnder ? "over" : "under";
    const prev = next === "under" ? "over" : "under";
    const flipWord = (text) => String(text || "").replace(new RegExp(`\\b${prev}\\b`, "i"), next);
    const same = (wasUnder && next === "under") || (!wasUnder && next === "over");
    return {
      sport: "NFL",
      call: (same ? call : flipWord(call)).toUpperCase() || next.toUpperCase(),
      callType: prior.callType || "prop",
      confidence: "Speculative",
      lean: same ? lean : flipWord(lean) || `Lean: ${next}.`,
      whyNow: same
        ? `Already on the ${next}. Same ticket.\n\nKills it: ${kill}`
        : `Same number, other side. This is a flip of the prior ticket, not a new grade.\n\nKills it: ${kill}`,
      edge: "Flipping the side does not create a new edge. Shop the number.",
      analysis: {
        matchupAnalysis: "",
        injuryContext: "",
        marketContext: "",
        lineMovement: "",
        statisticalEdge: "",
      },
      caveats: ["Same number, requested side — not a fresh read."],
      timestamp: new Date().toISOString(),
      parlayLegs: null,
      parlayTotalOdds: null,
    };
  }

  const board = why.includes("Board:") ? why : lean;
  return {
    sport: "NFL",
    call: "DON'T STACK IT",
    callType: "prop",
    confidence: "Speculative",
    lean: "Lean: pass on the parlay. Use the board as a menu.",
    whyNow: `Same-game legs move together. One script can cash or kill every leg.\n\n${board}`.slice(0, 900),
    edge: "Correlation is the kill — not a second opinion on the side.",
    analysis: {
      matchupAnalysis: "",
      injuryContext: "",
      marketContext: "",
      lineMovement: "",
      statisticalEdge: "",
    },
    caveats: ["Don't parlay the same game's skill props just because each one leans."],
    timestamp: new Date().toISOString(),
    parlayLegs: null,
    parlayTotalOdds: null,
  };
}
