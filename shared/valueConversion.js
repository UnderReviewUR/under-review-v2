/**
 * Value-based conversion — trial offer after successful takes, not only quota anger.
 */

export const SUCCESSFUL_TAKES_SESSION_KEY = "ur_successful_takes_session";
export const VALUE_TRIAL_OFFER_SHOWN_KEY = "ur_value_trial_offer_shown";
export const TRACK_ATTEMPT_SESSION_KEY = "ur_track_play_attempt_session";

export const VALUE_TRIAL_DAYS = 7;
export const VALUE_TRIAL_SUCCESS_TAKE_THRESHOLD = 2;
export const LEDGER_RENEWAL_SETTLED_THRESHOLD = 5;

export function readSuccessfulTakeCount() {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const n = Number(sessionStorage.getItem(SUCCESSFUL_TAKES_SESSION_KEY));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementSuccessfulTakeCount() {
  const next = readSuccessfulTakeCount() + 1;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(SUCCESSFUL_TAKES_SESSION_KEY, String(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function wasValueTrialOfferShown() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(VALUE_TRIAL_OFFER_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markValueTrialOfferShown() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(VALUE_TRIAL_OFFER_SHOWN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function markTrackPlayAttemptSession() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(TRACK_ATTEMPT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hadTrackPlayAttemptSession() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(TRACK_ATTEMPT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   successfulTakes?: number,
 *   isPro?: boolean,
 *   paywallSuppressed?: boolean,
 *   trackAttempt?: boolean,
 * }} input
 */
export function shouldOfferValueTrial(input = {}) {
  if (input.isPro) return false;
  if (input.paywallSuppressed) return false;
  if (wasValueTrialOfferShown()) return false;
  if (input.trackAttempt) return true;
  const takes = Number(input.successfulTakes) || 0;
  return takes >= VALUE_TRIAL_SUCCESS_TAKE_THRESHOLD;
}

/**
 * @param {{ settled?: number }} summary
 */
export function shouldShowLedgerRenewalPitch(summary) {
  const settled = Number(summary?.settled) || 0;
  return settled >= LEDGER_RENEWAL_SETTLED_THRESHOLD;
}
