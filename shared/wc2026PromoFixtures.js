/**
 * Pre-kickoff World Cup fixture shell (Jun 1–10 ET) when ESPN/BDL KV is empty.
 */

import { WC_KICKOFF_ET } from "./wc2026Constants.js";
import { isWcHomePromoWindow } from "./wc2026Constants.js";

/** Jun 11, 2026 group-stage openers (ET kickoff placeholders). */
const GROUP_STAGE_OPENERS = [
  { id: "wc-promo-mex-rsa", homeTeam: "MEX", awayTeam: "RSA", group: "A", date: "2026-06-11", time: "15:00 ET", stadium: "Estadio Azteca", city: "Mexico City" },
  { id: "wc-promo-can-qat", homeTeam: "CAN", awayTeam: "QAT", group: "B", date: "2026-06-11", time: "18:00 ET", stadium: "BC Place", city: "Vancouver" },
  { id: "wc-promo-usa-par", homeTeam: "USA", awayTeam: "PAR", group: "D", date: "2026-06-11", time: "21:00 ET", stadium: "SoFi Stadium", city: "Los Angeles" },
  { id: "wc-promo-bra-hai", homeTeam: "BRA", awayTeam: "HAI", group: "C", date: "2026-06-12", time: "18:00 ET", stadium: "MetLife Stadium", city: "East Rutherford" },
  { id: "wc-promo-ger-cuw", homeTeam: "GER", awayTeam: "CUW", group: "E", date: "2026-06-12", time: "15:00 ET", stadium: "Lincoln Financial Field", city: "Philadelphia" },
  { id: "wc-promo-eng-gha", homeTeam: "ENG", awayTeam: "GHA", group: "L", date: "2026-06-13", time: "15:00 ET", stadium: "Gillette Stadium", city: "Foxborough" },
  { id: "wc-promo-fra-sen", homeTeam: "FRA", awayTeam: "SEN", group: "I", date: "2026-06-13", time: "18:00 ET", stadium: "MetLife Stadium", city: "East Rutherford" },
  { id: "wc-promo-arg-alg", homeTeam: "ARG", awayTeam: "ALG", group: "J", date: "2026-06-13", time: "21:00 ET", stadium: "Hard Rock Stadium", city: "Miami" },
];

/**
 * @param {number} [nowMs]
 */
export function buildStaticPromoMatchesFallback(nowMs = Date.now()) {
  if (!isWcHomePromoWindow(nowMs)) return [];

  return GROUP_STAGE_OPENERS.map((m) => ({
    ...m,
    homeScore: null,
    awayScore: null,
    status: "NS",
    round: "Group Stage",
    commenceTs: Date.parse(`${m.date}T${m.time?.includes("21") ? "01:00:00" : m.time?.includes("18") ? "22:00:00" : "19:00:00"}Z`) || Date.parse(`${m.date}T20:00:00Z`),
  }));
}

/**
 * @param {number} [nowMs]
 */
export function isWcPreKickoffPromoOnly(nowMs = Date.now()) {
  const ymd = new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return isWcHomePromoWindow(nowMs) && ymd < WC_KICKOFF_ET;
}
