/**
 * POST https://api.anthropic.com/v1/messages with exponential backoff on
 * transient upstream failures (429 rate limit, 529 overloaded, 503 unavailable).
 */
import { isClaudeSonnet5Model } from "./_anthropicModels.js";

/**
 * Build a Messages body that Sonnet 5 will accept.
 * Adaptive thinking is on by default and would eat UR Take max_tokens; disable it.
 * Sampling params (temperature/top_p/top_k) 400 on Sonnet 5.
 * @param {{
 *   model: string,
 *   max_tokens: number,
 *   temperature?: number,
 *   system: unknown,
 *   messages: unknown,
 * }} opts
 */
export function buildAnthropicMessagesBody(opts) {
  const body = {
    model: opts.model,
    max_tokens: opts.max_tokens,
    system: opts.system,
    messages: opts.messages,
  };
  if (isClaudeSonnet5Model(opts.model)) {
    body.thinking = { type: "disabled" };
    return body;
  }
  if (opts.temperature != null) body.temperature = opts.temperature;
  return body;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** HTTP statuses where Anthropic may recover shortly — same backoff as 429. */
function isTransientAnthropicHttpStatus(status) {
  return status === 429 || status === 503 || status === 529;
}

function isPromptCacheEnabled() {
  const v = String(process.env.UR_TAKE_PROMPT_CACHE ?? "1")
    .trim()
    .toLowerCase();
  return v !== "0" && v !== "false" && v !== "off" && v !== "no";
}

/**
 * @param {string} system
 * @param {boolean} cacheSystemPrompt
 */
export function formatAnthropicSystemParam(system, cacheSystemPrompt = false) {
  const text = String(system || "");
  if (
    !cacheSystemPrompt ||
    !isPromptCacheEnabled() ||
    text.length < 4096
  ) {
    return text;
  }
  return [
    {
      type: "text",
      text,
      cache_control: { type: "ephemeral" },
    },
  ];
}

export async function fetchAnthropicMessages({
  apiKey,
  model,
  max_tokens,
  temperature,
  system,
  messages,
  timeoutMs = 52000,
  maxRetries = 4,
  cacheSystemPrompt = false,
}) {
  let lastResponse = null;
  let lastRequestId = null;
  let lastData = {};

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      lastResponse = await fetch(ANTHROPIC_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(
          buildAnthropicMessagesBody({
            model,
            max_tokens,
            temperature,
            system: formatAnthropicSystemParam(system, cacheSystemPrompt),
            messages,
          }),
        ),
      });

      lastRequestId =
        lastResponse.headers.get("request-id") ||
        lastResponse.headers.get("anthropic-request-id") ||
        null;

      lastData = await lastResponse.json().catch(() => ({}));

      if (lastResponse.ok) {
        return {
          ok: true,
          status: lastResponse.status,
          requestId: lastRequestId,
          data: lastData,
          rateLimitedExhausted: false,
        };
      }

      if (!isTransientAnthropicHttpStatus(lastResponse.status)) {
        return {
          ok: false,
          status: lastResponse.status,
          requestId: lastRequestId,
          data: lastData,
          rateLimitedExhausted: false,
        };
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      lastData = { error: { message: err?.message || "fetch_failed" } };
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        return {
          ok: false,
          status: 0,
          requestId: lastRequestId,
          data: lastData,
          rateLimitedExhausted: true,
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    status: lastResponse?.status ?? 429,
    requestId: lastRequestId,
    data: lastData,
    rateLimitedExhausted: true,
  };
}
