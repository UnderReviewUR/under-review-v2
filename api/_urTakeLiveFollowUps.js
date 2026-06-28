/**
 * Live-mode "Follow the Play" chips: one Haiku call after the main answer, QA in _urTakeOutputQA.
 */

import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { UR_TAKE_HAIKU_MODEL } from "./_anthropicModels.js";
import { qaLiveFollowUps } from "./_urTakeOutputQA.js";

const HAIKU_MODEL = UR_TAKE_HAIKU_MODEL;
const HAIKU_TIMEOUT_MS = 2800;

const FOLLOW_UP_SYSTEM = `You generate 3 short bettor follow-up questions. Max 7 words each. Real questions a bettor would ask mid-game. No punctuation overload. Return JSON array only: ["q1","q2","q3"]`;

function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block?.type === "text" && block?.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Parse Haiku output into string array (JSON array or fenced JSON).
 * @param {string} raw
 * @returns {string[] | null}
 */
export function parseFollowUpsJsonArray(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return null;
    return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * @param {{ outputJsonMode?: string, isEffectivelyLive?: boolean, hasLiveKeyword?: boolean, isConversationFollowUp?: boolean }} ctx
 */
export function shouldAttachLiveFollowUps(ctx) {
  const effectivelyLive =
    typeof ctx?.isEffectivelyLive === "boolean"
      ? ctx.isEffectivelyLive
      : Boolean(ctx?.hasLiveKeyword);
  return (
    ctx?.outputJsonMode === "plain" &&
    effectivelyLive &&
    !ctx?.isConversationFollowUp
  );
}

/**
 * User prompt sent to Haiku — keeps finalized assistant text (truncated for safety).
 * @param {string} responseText
 * @param {{ fixtureLabel?: string, score?: string | null, phase?: string | null, round?: string | null, minute?: string | null } | null | undefined} [fixtureContext]
 */
export function buildHaikuFollowUpUserPrompt(responseText, fixtureContext = null) {
  const ctx = fixtureContext && typeof fixtureContext === "object" ? fixtureContext : null;
  const fixtureLines = ctx?.fixtureLabel
    ? [
        "",
        "Live fixture context (ground chips in this match — no group-stage framing):",
        `  Match: ${ctx.fixtureLabel}`,
        ctx.score ? `  Score: ${ctx.score}` : null,
        ctx.phase ? `  Phase: ${ctx.phase}` : null,
        ctx.round ? `  Round: ${ctx.round}` : null,
        ctx.minute ? `  Clock: ${ctx.minute}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `Response was: ${String(responseText || "").slice(0, 12000)}${fixtureLines}

Generate 3 follow-up questions.`;
}

/**
 * Calls Haiku with a tight timeout; parses + QA; never throws.
 * @param {string} responseText
 * @param {string} [apiKey]
 * @param {{ fixtureLabel?: string, score?: string | null, phase?: string | null, round?: string | null, minute?: string | null } | null | undefined} [fixtureContext]
 * @returns {Promise<string[]>}
 */
export async function generateLiveFollowUpsWithHaiku(responseText, apiKey, fixtureContext = null) {
  const fallbackOnly = () => qaLiveFollowUps(null).followUps;

  if (!apiKey || !String(responseText || "").trim()) {
    return fallbackOnly();
  }

  const user = buildHaikuFollowUpUserPrompt(responseText, fixtureContext);

  let result;
  try {
    result = await fetchAnthropicMessages({
      apiKey,
      model: HAIKU_MODEL,
      max_tokens: 80,
      temperature: 0.35,
      system: FOLLOW_UP_SYSTEM,
      messages: [{ role: "user", content: user }],
      timeoutMs: HAIKU_TIMEOUT_MS,
      maxRetries: 1,
    });
  } catch {
    return fallbackOnly();
  }

  if (!result.ok) {
    return fallbackOnly();
  }

  const text = extractAnthropicText(result.data);
  const parsed = parseFollowUpsJsonArray(text);
  return qaLiveFollowUps(parsed).followUps;
}
