import { classifyUrTakeClientCatchPhase } from "./urTakeFetch.js";
import {
  DAILY_QUOTA_LIMIT_MESSAGE,
  EMAIL_GATE_SESSION_MESSAGE,
} from "../../shared/freeTierCopy.js";

export const UR_TAKE_FAIL_SOFT_RETRY_MESSAGE =
  "We couldn't complete that UR Take — connection, timeout, or a temporary setup issue. Try again in a moment.";

export const UR_TAKE_FAIL_SOFT_QUOTA_MESSAGE = DAILY_QUOTA_LIMIT_MESSAGE;

export const UR_TAKE_FAIL_SOFT_EMAIL_GATE_MESSAGE = EMAIL_GATE_SESSION_MESSAGE;

/**
 * @param {{ phase?: string, code?: string, status?: number }} input
 * @returns {{ message: string, retryable: boolean, showUpgrade: boolean }}
 */
export function resolveUrTakeFailSoftPresentation(input = {}) {
  const code = String(input.code || "").toLowerCase();
  const phase = String(input.phase || "").toLowerCase();

  if (
    code === "free_quota_exceeded" ||
    code === "limit_reached" ||
    input.limitReached === true
  ) {
    return {
      message: UR_TAKE_FAIL_SOFT_QUOTA_MESSAGE,
      retryable: false,
      showUpgrade: true,
    };
  }

  if (code === "email_required" || input.emailRequired === true) {
    return {
      message: UR_TAKE_FAIL_SOFT_EMAIL_GATE_MESSAGE,
      retryable: false,
      showUpgrade: true,
      showEmailGate: true,
    };
  }

  if (
    code === "server_misconfigured" ||
    code === "auth_server_misconfigured" ||
    phase === "auth_server_misconfigured"
  ) {
    return {
      message: UR_TAKE_FAIL_SOFT_RETRY_MESSAGE,
      retryable: true,
      showUpgrade: false,
    };
  }

  if (phase === "abort" || phase === "network_load_failed" || phase === "client_catch") {
    return {
      message: UR_TAKE_FAIL_SOFT_RETRY_MESSAGE,
      retryable: true,
      showUpgrade: false,
    };
  }

  return {
    message: UR_TAKE_FAIL_SOFT_RETRY_MESSAGE,
    retryable: true,
    showUpgrade: false,
  };
}

/**
 * @param {unknown} err
 */
export function resolveUrTakeFailSoftFromError(err) {
  const phase = classifyUrTakeClientCatchPhase(err);
  return resolveUrTakeFailSoftPresentation({ phase });
}

/**
 * @param {number} status
 * @param {Record<string, unknown> | null | undefined} json
 */
export function resolveUrTakeFailSoftFromResponse(status, json) {
  const code = String(json?.code || "");
  if (code === "email_required" || json?.reason === "email_required") {
    return resolveUrTakeFailSoftPresentation({ code: "email_required", emailRequired: true });
  }
  if (
    json?.limitReached === true ||
    code === "limit_reached" ||
    code === "free_quota_exceeded"
  ) {
    return resolveUrTakeFailSoftPresentation({ code, limitReached: true });
  }
  if (code === "server_misconfigured" || code === "auth_server_misconfigured") {
    return resolveUrTakeFailSoftPresentation({ code });
  }
  if (status === 503) {
    return resolveUrTakeFailSoftPresentation({ phase: "client_catch" });
  }
  return resolveUrTakeFailSoftPresentation({ phase: "client_catch" });
}
