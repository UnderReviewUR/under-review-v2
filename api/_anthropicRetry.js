/**
 * POST https://api.anthropic.com/v1/messages with 429 exponential backoff (1s, 2s, 4s).
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function fetchAnthropicMessages({
  apiKey,
  model,
  max_tokens,
  temperature,
  system,
  messages,
  timeoutMs = 52000,
  maxRetries = 3,
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
        body: JSON.stringify({
          model,
          max_tokens,
          temperature,
          system,
          messages,
        }),
      });

      lastRequestId =
        lastResponse.headers.get("request-id") ||
        lastResponse.headers.get("anthropic-request-id") ||
        null;

      lastData = await lastResponse.json().catch(() => ({}));

      if (lastResponse.status !== 429) {
        return {
          ok: lastResponse.ok,
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
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    status: 429,
    requestId: lastRequestId,
    data: lastData,
    rateLimitedExhausted: true,
  };
}
