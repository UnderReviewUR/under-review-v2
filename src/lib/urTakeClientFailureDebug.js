import { getUrBuildFingerprint } from "./urBuildFingerprint.js";

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

/** Owner / local dev / staging-style hosts — not shown to normal production users. */
export function shouldShowUrTakeClientFailureDebug(accessTier) {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) return true;
  if (accessTier === "owner") return true;
  if (typeof window === "undefined") return false;
  const h = String(window.location.hostname || "").toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.includes("staging")) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}
