import { classifyUrTakeClientCatchPhase } from "./urTakeFetch.js";

export const UR_TAKE_FAIL_SOFT_RETRY_MESSAGE =
  "We couldn't complete that UR Take — connection, timeout, or a temporary setup issue. Try again in a moment.";

export const UR_TAKE_FAIL_SOFT_QUOTA_MESSAGE =
  "You've used your free UR Takes for this week. Upgrade for unlimited reads, or try again after your quota resets.";

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
