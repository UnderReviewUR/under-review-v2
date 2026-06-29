/**
 * Talk delivery — short conversational prose (no structured Take card).
 */

import { extractAnthropicText } from "./prompt/anthropicText.js";
import { fetchAnthropicMessages } from "../_anthropicRetry.js";
import { UR_TAKE_HAIKU_MODEL } from "../_anthropicModels.js";
import { sendUrTakeJson } from "./responseDelivery.js";
import { extractLastAssistantStructured } from "../../shared/wcCardContractFollowUpScorer.js";
import {
  buildWcTalkContextSnippet,
  buildWcTalkVerifiedContextBlock,
  hasWcTalkGrounding,
} from "../../shared/wcTalkGrounding.js";

export { buildWcTalkContextSnippet };

const TALK_SYSTEM = `You are Under Review — a sharp sports-betting friend in a group chat.
The user is in a follow-up or rules thread. Reply in 2–4 short sentences, plain language, bro tone.
No section headers. No "THE PLAY" block. No markdown lists unless listing 2–3 quick facts.
If they are asking why on a prior lean, explain the mechanism (tempo, script, line value) without inventing new bets.
If they ask whether a tactic or game state "flips" the lean, explain why it does or doesn't — never reverse a prior Over/Under unless the live score clearly changed the math.
If they ask how odds or lines move (scoreless early, up/down, shorten to -575), explain direction using their cited price — never "no actionable line yet."
If they ask rules, be factual and concise.
If they doubt a starter or ask for lineup pivots, name ONLY players from CALLED-UP SQUAD or POSTED PROP LINES in context — never cite players who missed the World Cup squad.
Never fabricate odds or player names not in the context below.`;

/**
 * @param {unknown[]} history
 * @param {number} [maxTurns]
 */
function buildTalkMessages(history, maxTurns = 6) {
  const turns = Array.isArray(history) ? history.slice(-maxTurns) : [];
  /** @type {Array<{ role: "user"|"assistant", content: string }>} */
  const out = [];
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") continue;
    const role = turn.role === "assistant" ? "assistant" : turn.role === "user" ? "user" : null;
    if (!role) continue;
    const content = String(turn.content || turn.text || "").trim();
    if (!content) continue;
    out.push({ role, content: content.slice(0, 1200) });
  }
  return out;
}

/**
 * @param {unknown[]} history
 */
function summarizePriorTakeForTalk(history) {
  const prior = extractLastAssistantStructured(history);
  if (!prior) return "";
  const parts = [
    prior.lean ? `Prior lean: ${prior.lean}` : "",
    prior.call ? `Prior play: ${prior.call}` : "",
    prior.whyNow ? `Prior why: ${prior.whyNow}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

/**
 * @param {object} opts
 * @returns {Promise<{ handled: boolean }>}
 */
export async function tryDeliverUrTakeTalk(opts) {
  const {
    res,
    requestId,
    question,
    history = [],
    sportHint,
    wcIntent,
    wcContext,
    anthropicApiKey,
    anthropicModel,
    gateQuotaEmail,
    gateQuotaSessionId,
    setGateQuotaDelivered,
  } = opts;

  const q = String(question || "").trim();
  if (!q || !anthropicApiKey) return { handled: false };

  if (
    sportHint === "worldcup" &&
    !hasWcTalkGrounding(wcContext, history, wcIntent)
  ) {
    return { handled: false };
  }

  const priorTake = summarizePriorTakeForTalk(history);
  const verifiedContext =
    sportHint === "worldcup"
      ? buildWcTalkVerifiedContextBlock(wcContext, history, wcIntent)
      : "";
  const contextBlock = [
    priorTake ? `PRIOR TAKE (do not repeat verbatim — explain or clarify):\n${priorTake}` : "",
    verifiedContext ? `VERIFIED CONTEXT (cite only facts below — never invent odds or players):\n${verifiedContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const systemSuffix = contextBlock ? `\n\n${contextBlock}` : "";

  const messages = buildTalkMessages(history);
  messages.push({ role: "user", content: q });

  const result = await fetchAnthropicMessages({
    apiKey: anthropicApiKey,
    model: UR_TAKE_HAIKU_MODEL,
    max_tokens: 320,
    temperature: 0.55,
    system: TALK_SYSTEM + systemSuffix,
    messages,
    timeoutMs: 28000,
    maxRetries: 2,
    cacheSystemPrompt: true,
  });

  if (!result.ok) {
    console.warn(
      JSON.stringify({
        event: "ur_take_talk_upstream_fail",
        requestId,
        status: result.status,
      }),
    );
    return { handled: false };
  }

  const text = extractAnthropicText(result.data).trim();
  if (!text) return { handled: false };

  if (typeof setGateQuotaDelivered === "function") setGateQuotaDelivered(true);

  const body = {
    requestId,
    deliveryMode: "talk",
    response: text,
    responseFormat: "talk",
    sport: sportHint || "worldcup",
    intent: "talk",
    wcIntent: wcIntent || null,
    confidence: "none",
    take: null,
  };

  await sendUrTakeJson(res, body, { gateQuotaEmail, gateQuotaSessionId });
  return { handled: true };
}
