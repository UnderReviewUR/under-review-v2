/**
 * NFL Ask model cost lane — keep Sonnet for hard reads; burn Haiku (or $0) on simple props.
 *
 * Lanes:
 * - props_board_offline: "best player props for DEN vs KC" → deterministic GOAT board ($0)
 * - haiku: scoped / named player props (fast path) → Claude Haiku
 * - sonnet: ticket reviews, spreads/ML thesis, anything else → default ANTHROPIC_MODEL
 */
import { looksLikeNflPropsBoardAsk } from "./nflAskNormalize.js";
import { isNflTicketReviewAsk } from "./nflAskTicketParse.js";
import {
  isNflScopedPropFastPath,
  NFL_UR_TAKE_FAST_MODEL_DEFAULT,
} from "./nflAskFastPath.js";

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
 * Broad "best props / best bets tonight" boards — ship the deterministic picker, no Anthropic.
 * Kill with NFL_ASK_PROPS_BOARD_OFFLINE=0 to force a model call.
 * @param {string} question
 */
export function nflAskPropsBoardUsesOffline(question) {
  if (!envFlagOn(process.env.NFL_ASK_PROPS_BOARD_OFFLINE, true)) return false;
  if (isNflTicketReviewAsk(question)) return false;
  return looksLikeNflPropsBoardAsk(question);
}

/**
 * @param {string} question
 * @param {{ fastPathActive?: boolean }} [opts]
 * @returns {{ lane: "props_board_offline"|"haiku"|"sonnet", model: string|null }}
 */
export function resolveNflAskModelLane(question, opts = {}) {
  const q = String(question || "");
  if (nflAskPropsBoardUsesOffline(q)) {
    return { lane: "props_board_offline", model: null };
  }
  if (isNflTicketReviewAsk(q)) {
    return { lane: "sonnet", model: null };
  }
  const fast = Boolean(opts.fastPathActive) || isNflScopedPropFastPath(q);
  // Props boards with offline disabled still stay on Haiku — not Sonnet.
  if (fast || looksLikeNflPropsBoardAsk(q)) {
    const model =
      String(process.env.NFL_UR_TAKE_FAST_MODEL || "").trim() ||
      NFL_UR_TAKE_FAST_MODEL_DEFAULT;
    return { lane: "haiku", model };
  }
  return { lane: "sonnet", model: null };
}
