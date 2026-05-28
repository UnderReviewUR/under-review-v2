/**
 * POST https://api.anthropic.com/v1/messages with exponential backoff on
 * transient upstream failures (429 rate limit, 529 overloaded, 503 unavailable).
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** HTTP statuses where Anthropic may recover shortly — same backoff as 429. */
function isTransientAnthropicHttpStatus(status) {
  return status === 429 || status === 503 || status === 529;
}

function classifyAnthropicStatusFailure(status) {
  if (status === 429) return "upstream_rate_limit";
  if (status === 503 || status === 529) return "upstream_overloaded";
  if (status === 401 || status === 403) return "upstream_auth_failure";
  if (status === 408 || status === 504) return "timeout";
  return "upstream_http_error";
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
}) {
  let lastResponse = null;
  let lastRequestId = null;
  let lastData = {};
  let lastStatus = null;

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
      lastStatus = lastResponse.status;

      lastData = await lastResponse.json().catch(() => ({}));

      if (lastResponse.ok) {
        return {
          ok: true,
          status: lastResponse.status,
          requestId: lastRequestId,
          data: lastData,
          rateLimitedExhausted: false,
          attemptsUsed: attempt + 1,
          lastStatus,
          failureClass: null,
        };
      }

      if (!isTransientAnthropicHttpStatus(lastResponse.status)) {
        return {
          ok: false,
          status: lastResponse.status,
          requestId: lastRequestId,
          data: lastData,
          rateLimitedExhausted: false,
          attemptsUsed: attempt + 1,
          lastStatus,
          failureClass: classifyAnthropicStatusFailure(lastResponse.status),
        };
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      lastData = { error: { message: err?.message || "fetch_failed" } };
      lastStatus = 0;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        const errName = String(err?.name || "").toLowerCase();
        const errMsg = String(err?.message || "").toLowerCase();
        const timeoutLike =
          errName.includes("abort") ||
          errName.includes("timeout") ||
          errMsg.includes("abort") ||
          errMsg.includes("timeout") ||
          errMsg.includes("timed out");
        return {
          ok: false,
          status: 0,
          requestId: lastRequestId,
          data: lastData,
          rateLimitedExhausted: true,
          attemptsUsed: attempt + 1,
          lastStatus,
          failureClass: timeoutLike ? "timeout" : "network_error",
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
    attemptsUsed: maxRetries,
    lastStatus,
    failureClass: classifyAnthropicStatusFailure(lastResponse?.status ?? 429),
  };
}
