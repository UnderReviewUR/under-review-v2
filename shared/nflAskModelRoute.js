/**
 * NFL Ask model cost lane — marry deterministic GOAT tickets with optional Haiku voice.
 *
 * Lanes:
 * - married: props boards + scoped/named props → picker first, Haiku polishes voice only
 * - sonnet: ticket reviews, spreads/ML thesis, anything else → default ANTHROPIC_MODEL
 */
import { looksLikeNflPropsBoardAsk, isNflPlayerIdentityAsk } from "./nflAskNormalize.js";
import { isNflTicketReviewAsk } from "./nflAskTicketParse.js";
import {
  isNflScopedPropFastPath,
  NFL_UR_TAKE_FAST_MODEL_DEFAULT,
} from "./nflAskFastPath.js";
import { looksLikeNflPropsRefreshAsk } from "./nflAskPropsBatch.js";
import { parseNflFirstAsk } from "./nflAskParse.js";

/**
 * @param {unknown} raw
 */
function envFlagOn(raw, defaultOn = true) {
  if (raw == null || String(raw).trim() === "") return defaultOn;
  const v = String(raw).trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return defaultOn;
}

/**
 * Broad "best props / best bets tonight" boards — deterministic picker (+ optional Haiku polish).
 * Kill with NFL_ASK_PROPS_BOARD_OFFLINE=0 to force a full model call.
 * @param {string} question
 */
export function nflAskPropsBoardUsesOffline(question) {
  if (!envFlagOn(process.env.NFL_ASK_PROPS_BOARD_OFFLINE, true)) return false;
  if (isNflTicketReviewAsk(question)) return false;
  if (isNflPlayerIdentityAsk(question)) return false;
  return looksLikeNflPropsBoardAsk(question) || looksLikeNflPropsRefreshAsk(question);
}

/**
 * Named / scoped single-prop asks that should also stay on the married path.
 * @param {string} question
 * @param {{ fastPathActive?: boolean }} [opts]
 */
export function nflAskUsesMarriedPropPath(question, opts = {}) {
  const ask = parseNflFirstAsk(question);
  if (ask.lane === "game_price" || ask.lane === "identity" || ask.lane === "ticket_review") return false;
  if (isNflTicketReviewAsk(question)) return false;
  if (isNflPlayerIdentityAsk(question)) return false;
  if (ask.lane === "props_board") {
    return nflAskPropsBoardUsesOffline(question) || looksLikeNflPropsRefreshAsk(question);
  }
  if (ask.lane === "named_prop") return true;
  if (isNflScopedPropFastPath(question)) return true;
  if (opts.fastPathActive) {
    const q = String(question || "");
    return /\b(over|under|prop|line|ticket|yards?|tds?|fade|lean|play)\b/i.test(q);
  }
  return false;
}

/**
 * @param {string} question
 * @param {{ fastPathActive?: boolean }} [opts]
 * @returns {{ lane: "married"|"haiku"|"sonnet", model: string|null }}
 */
export function resolveNflAskModelLane(question, opts = {}) {
  const q = String(question || "");
  if (isNflTicketReviewAsk(q)) {
    return { lane: "sonnet", model: null };
  }
  if (nflAskUsesMarriedPropPath(q, opts)) {
    const model =
      String(process.env.NFL_UR_TAKE_FAST_MODEL || "").trim() ||
      NFL_UR_TAKE_FAST_MODEL_DEFAULT;
    return { lane: "married", model };
  }
  // Props boards with offline disabled still stay on Haiku — not Sonnet.
  if (looksLikeNflPropsBoardAsk(q)) {
    const model =
      String(process.env.NFL_UR_TAKE_FAST_MODEL || "").trim() ||
      NFL_UR_TAKE_FAST_MODEL_DEFAULT;
    return { lane: "haiku", model };
  }
  return { lane: "sonnet", model: null };
}
