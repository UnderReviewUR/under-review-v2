/**
 * Skip The Odds API when quota is exhausted (401 / x-requests-remaining: 0).
 * Set ODDS_API_DISABLED=1 to force bypass without probing.
 */

const DEFAULT_OPEN_MS = 6 * 60 * 60 * 1000;

let disabledUntilMs = 0;
let disabledReason = null;

function envDisabled() {
  const v = String(process.env.ODDS_API_DISABLED || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * @returns {boolean}
 */
export function isOddsApiDisabled() {
  if (envDisabled()) return true;
  return Date.now() < disabledUntilMs;
}

/**
 * @returns {{ disabled: boolean, reason: string | null, disabledUntil: string | null }}
 */
export function getOddsApiCircuitState() {
  if (envDisabled()) {
    return { disabled: true, reason: "env_ODDS_API_DISABLED", disabledUntil: null };
  }
  if (Date.now() < disabledUntilMs) {
    return {
      disabled: true,
      reason: disabledReason,
      disabledUntil: new Date(disabledUntilMs).toISOString(),
    };
  }
  return { disabled: false, reason: null, disabledUntil: null };
}

/**
 * @param {Response | null | undefined} response
 * @param {{ ttlMs?: number }} [opts]
 */
export function recordOddsApiResponse(response, opts = {}) {
  if (!response || envDisabled()) return;

  const remainingRaw = response.headers?.get?.("x-requests-remaining");
  const remaining =
    remainingRaw != null && remainingRaw !== "" ? Number(remainingRaw) : null;
  const status = Number(response.status);
  const quotaExhausted =
    status === 401 || (Number.isFinite(remaining) && remaining <= 0);

  if (!quotaExhausted) return;

  const ttlMs = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : DEFAULT_OPEN_MS;
  disabledUntilMs = Date.now() + ttlMs;
  disabledReason =
    status === 401 ? "quota_exhausted_401" : "quota_exhausted_zero_remaining";

  console.log(
    JSON.stringify({
      event: "odds_api_circuit_open",
      reason: disabledReason,
      httpStatus: status,
      xRequestsRemaining: remainingRaw,
      disabledUntil: new Date(disabledUntilMs).toISOString(),
      ttlMs,
    }),
  );
}

/** Test-only reset. */
export function resetOddsApiCircuitForTests() {
  disabledUntilMs = 0;
  disabledReason = null;
}
