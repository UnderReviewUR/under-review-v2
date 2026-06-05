import { isDerbyActive } from "../_derby2026.js";
import { questionReferencesDerby } from "../../shared/derbyIntent.js";
import { resolveSportHint as resolveSportHintShared } from "../../shared/urTakeSportRouting.js";
import { getSlipImageRouteMeta } from "../_slipImageIntent.js";

function normalizeText(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectIntent(question, hasImage) {
  const q = normalizeText(question);

  const hasExplicitSlipLanguage =
    q.includes("slip") ||
    q.includes("parlay") ||
    q.includes("entry") ||
    q.includes("ticket") ||
    q.includes("pick em") ||
    q.includes("pick'em") ||
    q.includes("bet slip") ||
    q.includes("my slip") ||
    q.includes("my ticket");

  if (hasImage && hasExplicitSlipLanguage) {
    return "slip_review";
  }

  if (q.includes("fade")) return "fade";
  if (q.includes("sleeper")) return "sleeper";
  if (q.includes("outright")) return "outright";
  if (getSlipImageRouteMeta(String(question ?? ""), Boolean(hasImage)).routesToSlip) {
    return "slip_review";
  }
  if (
    q.includes("best props") ||
    q.includes("what props") ||
    q.includes("prop for") ||
    q.includes("aces") ||
    q.includes("double faults") ||
    q.includes("games played") ||
    q.includes("scoreline") ||
    q.includes("predict") ||
    q.includes("projection") ||
    q.includes("what will") ||
    q.includes("how many")
  ) {
    return "prop_projection";
  }
  if (q.includes("prop")) return "prop";

  return "general";
}

export function resolveSportHint(opts) {
  return resolveSportHintShared({
    ...opts,
    chatHistory: opts?.chatHistory ?? opts?.history,
    derbyActive: isDerbyActive(),
    questionIsDerby: questionReferencesDerby(String(opts?.question || "")),
  });
}
