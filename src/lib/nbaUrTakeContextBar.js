import { resolveNbaVerdictFromQuestion } from "../../shared/nbaUrTakeVerdict.js";
import { inferEdgeTypePill, inferMarketPill } from "./urTakeSharpBriefUi.js";

/**
 * Sport-bar context line for NBA structured UR Take cards.
 * @param {object} opts
 * @param {string} [opts.sport]
 * @param {string} [opts.call]
 * @param {string} [opts.callType]
 * @param {boolean} [opts.showLiveRibbon]
 * @param {string} [opts.gameStateLine]
 * @param {string} [opts.liveScore]
 * @param {object | null} [opts.nbaRelevance]
 * @param {string} [opts.userQuestion]
 * @param {object | null} [opts.message]
 */
export function buildNbaUrTakeContextBar({
  sport = "nba",
  call = "",
  callType = "",
  showLiveRibbon = false,
  gameStateLine = "",
  liveScore = "",
  nbaRelevance = null,
  userQuestion = "",
  message = null,
} = {}) {
  if (String(sport || "").toLowerCase() !== "nba") return null;

  const edgeTypePill = inferEdgeTypePill(callType);
  const marketPill = inferMarketPill(call, callType);
  const marketDistinct =
    marketPill.toLowerCase() !== edgeTypePill.toLowerCase() ? marketPill : null;

  const livePart = showLiveRibbon ? "Live" : "Tonight";
  const base = [marketDistinct ?? edgeTypePill, `Prop · ${livePart}`].join(" · ");

  const ribbon = String(liveScore || gameStateLine || "").trim();
  const finalsSummary = String(
    nbaRelevance?.finalsSeriesSummary || message?.nbaRelevance?.finalsSeriesSummary || "",
  ).trim();

  const parts = [base];
  if (ribbon) parts.push(ribbon);
  if (finalsSummary && !ribbon.toLowerCase().includes(finalsSummary.toLowerCase().slice(0, 12))) {
    parts.push(finalsSummary);
  }

  const verdict = resolveNbaVerdictFromQuestion(userQuestion, message);
  if (verdict === "SERIES" || verdict === "FINALS_MVP") {
    return [`Series · ${livePart}`, finalsSummary || ribbon].filter(Boolean).join(" · ");
  }

  return parts.filter(Boolean).join(" · ");
}
