/**
 * Talk delivery — short conversational prose (no structured Take card).
 */

import { extractAnthropicText } from "./prompt/anthropicText.js";
import { fetchAnthropicMessages } from "../_anthropicRetry.js";
import { UR_TAKE_HAIKU_MODEL } from "../_anthropicModels.js";
import { sendUrTakeJson } from "./responseDelivery.js";
import { extractLastAssistantStructured } from "../../shared/wcCardContractFollowUpScorer.js";

const TALK_SYSTEM = `You are Under Review — a sharp sports-betting friend in a group chat.
The user is in a follow-up or rules thread. Reply in 2–4 short sentences, plain language, bro tone.
No section headers. No "THE PLAY" block. No markdown lists unless listing 2–3 quick facts.
If they are asking why on a prior lean, explain the mechanism (tempo, script, line value) without inventing new bets.
If they ask whether a tactic or game state "flips" the lean, explain why it does or doesn't — never reverse a prior Over/Under unless the live score clearly changed the math.
If they ask rules, be factual and concise.
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
 * @param {Record<string, unknown> | null | undefined} wcContext
 */
export function buildWcTalkContextSnippet(wcContext) {
  const fixtures = [
    ...(Array.isArray(wcContext?.fixtures) ? wcContext.fixtures : []),
    ...(Array.isArray(wcContext?.matchDetails) ? wcContext.matchDetails : []),
  ];
  const fx = fixtures[0];
  if (!fx) return "";
  const home = String(fx.homeTeam || "").trim();
  const away = String(fx.awayTeam || "").trim();
  if (!home || !away) return "";
  const odds = fx.odds && typeof fx.odds === "object" ? fx.odds : null;
  const homeMl = odds?.home?.moneyline || odds?.home;
  const awayMl = odds?.away?.moneyline || odds?.away;
  const drawMl = odds?.draw?.moneyline || odds?.draw;
  const round = String(fx.round || "").trim();
  const lines = [`Fixture: ${home} vs ${away}`];
  if (round) lines.push(`Round: ${round}`);
  if (homeMl || awayMl) {
    lines.push(
      `ML: ${home} ${homeMl || "n/a"} · Draw ${drawMl || "n/a"} · ${away} ${awayMl || "n/a"}`,
    );
  }
  if (wcContext?.phase) lines.push(`Tournament phase: ${wcContext.phase}`);
  return lines.join("\n");
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

  const priorTake = summarizePriorTakeForTalk(history);
  const wcSnippet =
    sportHint === "worldcup" ? buildWcTalkContextSnippet(wcContext) : "";
  const contextBlock = [
    priorTake ? `PRIOR TAKE (do not repeat verbatim — explain or clarify):\n${priorTake}` : "",
    wcSnippet ? `VERIFIED FIXTURE (cite only these prices):\n${wcSnippet}` : "",
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
