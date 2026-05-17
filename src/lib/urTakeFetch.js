/**
 * Client `/api/ur-take` fetch helpers: preflight logging, Safari network failure detection, one-shot retry.
 */

const UR_TAKE_PATH = "/api/ur-take";

/** @param {unknown} err */
export function isSafariNetworkLoadFailed(err) {
  if (!err || typeof err !== "object") return false;
  const name = String(/** @type {{ name?: string }} */ (err).name || "");
  const msg = String(/** @type {{ message?: string }} */ (err).message || "").toLowerCase();
  return name === "TypeError" && (msg === "load failed" || msg.includes("failed to fetch"));
}

/**
 * @param {unknown} err
 * @returns {"abort" | "network_load_failed" | "client_catch"}
 */
export function classifyUrTakeClientCatchPhase(err) {
  if (err && typeof err === "object" && /** @type {{ name?: string }} */ (err).name === "AbortError") {
    return "abort";
  }
  if (isSafariNetworkLoadFailed(err)) return "network_load_failed";
  return "client_catch";
}

/**
 * @param {string} phase
 * @param {{ golfContextMismatch?: boolean }} [opts]
 */
export function userMessageForUrTakeClientFailure(phase, opts = {}) {
  if (phase === "abort") return "Request timed out — try again.";
  if (phase === "network_load_failed") {
    return "Connection dropped before UR Take could respond. Try again.";
  }
  if (opts.golfContextMismatch) {
    return "That looks like a different week than what's on screen — name the tournament or course and I'll line it up.";
  }
  return "Couldn't complete that read. Try again.";
}

/**
 * @param {object} p
 */
export function buildUrTakePreFetchLog({
  requestUrl,
  method,
  serializedBodyLength,
  sportHint,
  golfContextMeta,
  activePageTournamentLabel,
  abortController,
}) {
  let sameOrigin = null;
  try {
    if (typeof window !== "undefined" && requestUrl) {
      const u = new URL(requestUrl, window.location.href);
      sameOrigin = u.origin === window.location.origin;
    }
  } catch {
    sameOrigin = null;
  }
  return {
    event: "ur_take_prefetch",
    requestUrl: requestUrl || UR_TAKE_PATH,
    method: method || "POST",
    sameOrigin,
    serializedBodyLength:
      typeof serializedBodyLength === "number" ? serializedBodyLength : null,
    sportHint: sportHint ?? null,
    golfContext: golfContextMeta ?? null,
    activePageTournamentLabel: activePageTournamentLabel ?? null,
    abortSignalAborted: Boolean(abortController?.signal?.aborted),
  };
}

function randomRetryDelayMs() {
  return 500 + Math.floor(Math.random() * 301);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * POST `/api/ur-take` with one retry on Safari-style network failures only.
 * @param {object} p
 * @param {string} p.serialized
 * @param {Record<string, string>} p.headers
 * @param {AbortSignal} p.signal
 * @param {(meta: { attempt: number, err?: unknown, elapsedMs: number }) => void} [p.onAttemptFailed]
 */
export async function fetchUrTakeWithNetworkRetry({ serialized, headers, signal, onAttemptFailed }) {
  const requestUrl =
    typeof window !== "undefined"
      ? new URL(UR_TAKE_PATH, window.location.href).href
      : UR_TAKE_PATH;

  const doFetch = async () => {
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const res = await fetch(UR_TAKE_PATH, {
        method: "POST",
        headers,
        body: serialized,
        signal,
      });
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      return { res, elapsedMs: Math.round(end - start) };
    } catch (err) {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsedMs = Math.round(end - start);
      throw Object.assign(err instanceof Error ? err : new Error(String(err)), { elapsedMs });
    }
  };

  try {
    return await doFetch();
  } catch (firstErr) {
    onAttemptFailed?.({ attempt: 1, err: firstErr, elapsedMs: Number(firstErr?.elapsedMs) || 0 });
    if (signal?.aborted || !isSafariNetworkLoadFailed(firstErr)) throw firstErr;
    await sleep(randomRetryDelayMs());
    if (signal?.aborted) throw firstErr;
    try {
      return await doFetch();
    } catch (retryErr) {
      onAttemptFailed?.({
        attempt: 2,
        err: retryErr,
        elapsedMs: Number(retryErr?.elapsedMs) || 0,
      });
      throw retryErr;
    }
  }
}

export { UR_TAKE_PATH };
