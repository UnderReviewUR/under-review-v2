import { getUrBuildFingerprint } from "./urBuildFingerprint.js";

/**
 * Successful HTTP 200 from `/api/ur-take` that still returned a fallback payload (see `feedSnagResponse` etc.).
 * @param {Record<string, unknown>} data
 * @param {string | null} effectiveSportHint
 * @param {object} [ctx]
 */
export function buildUrTakeApiSuccessFallbackDebug(data, effectiveSportHint, ctx = {}) {
  const structured = data?.structured && typeof data.structured === "object" ? data.structured : {};
  const pickMsg = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };
  const serverMessage = pickMsg(data?.text) ?? pickMsg(data?.message) ?? pickMsg(data?.response) ?? null;
  const rawStr = typeof ctx.rawSlice === "string" ? ctx.rawSlice : "";
  return {
    phase: "api_success_fallback",
    fallbackReason:
      data?.fallbackReason != null && String(data.fallbackReason).trim() !== ""
        ? String(data.fallbackReason)
        : null,
    serverMessage,
    structuredKeys: Object.keys(structured),
    responseKeys: data && typeof data === "object" ? Object.keys(data) : [],
    sport: (data?.sport != null && String(data.sport).trim()) || effectiveSportHint || null,
    buildFingerprint: getUrBuildFingerprint(),
    effectiveSportHint: ctx.effectiveSportHint ?? effectiveSportHint ?? null,
    hintForEnsure: ctx.hintForEnsure ?? null,
    hasGolfContext: Boolean(ctx.hasGolfContext),
    serializedBodyLength: typeof ctx.serializedBodyLength === "number" ? ctx.serializedBodyLength : null,
    status: typeof ctx.status === "number" ? ctx.status : 200,
    contentType: ctx.contentType != null && ctx.contentType !== "" ? String(ctx.contentType) : null,
    rawSlice: rawStr.slice(0, 1000),
  };
}

/**
 * @param {object} p
 * @param {"fetch_non_ok" | "invalid_json" | "api_fallback_reason" | "abort" | "client_catch"} p.phase
 */
export function buildUrTakeClientFailureDebug({
  phase,
  res = null,
  raw = "",
  parsedErrorJson = null,
  err = null,
  effectiveSportHint,
  hintForEnsure,
  hasGolfContext,
  serializedBodyLength,
  contentType,
}) {
  const rawStr = typeof raw === "string" ? raw : "";
  let safeParsed = null;
  if (parsedErrorJson && typeof parsedErrorJson === "object") {
    try {
      safeParsed = JSON.parse(JSON.stringify(parsedErrorJson));
    } catch {
      safeParsed = { _note: "parsedErrorJson not serializable" };
    }
  }
  return {
    phase,
    status: res?.status ?? null,
    rawSlice: rawStr.slice(0, 1000),
    parsedErrorJson: safeParsed,
    errName: err?.name ?? null,
    errMessage: err?.message ?? null,
    effectiveSportHint: effectiveSportHint ?? null,
    hintForEnsure: hintForEnsure ?? null,
    hasGolfContext: Boolean(hasGolfContext),
    serializedBodyLength: typeof serializedBodyLength === "number" ? serializedBodyLength : null,
    contentType: contentType != null && contentType !== "" ? String(contentType) : null,
    buildFingerprint: getUrBuildFingerprint(),
  };
}

/**
 * When true, renders the `<pre>` under UR Take failure / API-fallback bubbles (see `ChatThread`).
 * Set `VITE_UR_TAKE_CLIENT_DEBUG=1` in Vercel or `.env` so production owner sessions on under-review.app see payloads without relying on the console alone.
 */
export function shouldShowUrTakeClientFailureDebug(accessTier) {
  if (typeof import.meta !== "undefined" && String(import.meta.env?.VITE_UR_TAKE_CLIENT_DEBUG ?? "").trim() === "1") {
    return true;
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) return true;
  if (accessTier === "owner") return true;
  if (typeof window === "undefined") return false;
  const h = String(window.location.hostname || "").toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.includes("staging")) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}
