import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { UR_TAKE_HAIKU_MODEL } from "./_anthropicModels.js";
import { tryParseJsonObject } from "./ur-take/prompt/jsonParse.js";

const DAILY_TAKE_HAIKU_SYSTEM = `You write the home-page "daily take" teaser for Under Review — a sharp sports bettor texting friends.
Return ONLY valid JSON (no markdown, no preamble) with exactly these keys:
{
  "headline": "One punchy hook sentence, max 120 chars",
  "bodyChunk": "One supporting sentence with the angle, max 200 chars",
  "closing": "One actionable closer, max 100 chars",
  "confidence": "High | Medium | Speculative"
}
Ground every claim in the SLATE JSON only. No section headers. No bullet lists.`;

/**
 * @param {string} raw
 */
export function parseDailyTakeHaikuJson(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const parsed = tryParseJsonObject(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const headline = String(parsed.headline || "").trim();
  const bodyChunk = String(parsed.bodyChunk || "").trim();
  const closing = String(parsed.closing || "").trim();
  if (!headline) return null;
  return {
    headline,
    bodyChunk,
    closing,
    confidence: String(parsed.confidence || "Medium").trim() || "Medium",
    sport: parsed.sport != null ? String(parsed.sport) : null,
    response: [headline, bodyChunk, closing].filter(Boolean).join("\n\n"),
  };
}

/**
 * Lightweight Haiku preview — avoids full /api/ur-take Sonnet pipeline.
 * @param {{
 *   sportHint: string,
 *   question: string,
 *   matchupLabel: string,
 *   slateContext?: Record<string, unknown> | null,
 * }} target
 */
export async function generateDailyTakeHaikuPreview(target) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    console.warn("[daily-take] ANTHROPIC_API_KEY missing — haiku preview skipped");
    return null;
  }

  const slateContext = target.slateContext || {
    sport: target.sportHint,
    featured: target.matchupLabel,
  };

  const userPrompt = `Sport: ${target.sportHint}
Featured matchup: ${target.matchupLabel}
Editorial angle question: ${target.question}

SLATE JSON:
${JSON.stringify(slateContext, null, 2)}

Write the daily take teaser JSON.`;

  const result = await fetchAnthropicMessages({
    apiKey,
    model: UR_TAKE_HAIKU_MODEL,
    max_tokens: 420,
    temperature: 0.4,
    system: DAILY_TAKE_HAIKU_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    timeoutMs: 28000,
    maxRetries: 2,
    cacheSystemPrompt: true,
  });

  if (!result.ok) {
    console.warn(
      "[daily-take] haiku preview upstream fail",
      result.status,
      JSON.stringify(result.data?.error || result.data)?.slice(0, 300),
    );
    return null;
  }

  const text = Array.isArray(result.data?.content)
    ? result.data.content
        .filter((b) => b?.type === "text" && b?.text)
        .map((b) => b.text)
        .join("\n")
        .trim()
    : "";

  const parsed = parseDailyTakeHaikuJson(text);
  if (!parsed) {
    console.warn("[daily-take] haiku preview JSON parse failed", text.slice(0, 200));
    return null;
  }

  return {
    sport: parsed.sport || target.sportHint,
    confidence: parsed.confidence,
    response: parsed.response,
    headline: parsed.headline,
    bodyChunk: parsed.bodyChunk,
    closing: parsed.closing,
  };
}
