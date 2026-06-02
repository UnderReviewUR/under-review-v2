/**
 * Guarantee a World Cup row in Today's Slate during Jun 11–Jul 19 ET
 * when board data exists (model may otherwise assign all three rows to golf/F1/NBA).
 */

import { rankSlateSportForBundle } from "./slateModulePriority.js";
import { isWcSlateFeaturingWindow } from "./wc2026Constants.js";

const SLATE_KEYS = ["safeLean", "sharpAngle", "contrarian"];

function summarizeWorldCupEvent(wc) {
  if (!wc) return "2026 FIFA World Cup group stage";
  const upcoming = Array.isArray(wc.upcoming) ? wc.upcoming[0] : null;
  if (upcoming?.homeTeam && upcoming?.awayTeam) {
    return `${upcoming.homeTeam} vs ${upcoming.awayTeam}${upcoming.group ? ` (Group ${upcoming.group})` : ""}`;
  }
  return "2026 FIFA World Cup group stage";
}

function pickWcContrarianRow(wc) {
  const value = Array.isArray(wc?.valueOutrights) ? wc.valueOutrights : [];
  const nor = value.find((t) => t.team === "NOR") || { team: "NOR", name: "Norway", odds: "+2500" };
  const par =
    value.find((t) => t.team === "PAR") || { team: "PAR", name: "Paraguay", odds: "+8000" };
  const pick = value[0] || par;
  return {
    sport: "worldcup",
    match: `${pick.name} (${pick.team}) group-stage path`,
    angle: pick.team === "NOR" ? "Norway group value" : "Longshot advancement misprice",
    why:
      pick.team === "PAR"
        ? `Paraguay at ${pick.odds || "+8000"} to advance still looks wide vs a soft Group L path if the market is pricing them like a pure outsider.`
        : `Norway at ${nor.odds || "+2500"} group-stage value — the board may still be underpricing their ceiling in a winnable opening group.`,
  };
}

/**
 * @param {"safeLean"|"sharpAngle"|"contrarian"} slot
 * @param {Record<string, unknown>} bundle
 */
function worldCupRowForSlot(slot, bundle) {
  const wc = bundle.worldcup;
  const event = summarizeWorldCupEvent(wc);
  if (slot === "safeLean") {
    return {
      sport: "worldcup",
      game: event,
      angle: "Group favorite to control the table",
      why: "Pre-tournament group favorites with host-path leverage still look like the cleanest low-volatility entry before kickoff.",
    };
  }
  if (slot === "sharpAngle") {
    return {
      sport: "worldcup",
      event: event || "World Cup 2026 groups",
      angle: "Host-path scheduling edge",
      why: "USA/Mexico/Canada path and travel density can misprice group totals and advancement — look where the schedule compresses rest edges.",
    };
  }
  return pickWcContrarianRow(wc);
}

/**
 * @param {Record<string, unknown>} out
 * @param {Record<string, unknown>} bundle
 * @param {number} [nowMs]
 */
export function ensureWorldCupInSlateOutput(out, bundle, nowMs = Date.now()) {
  if (!out || typeof out !== "object") return out;
  if (!isWcSlateFeaturingWindow(nowMs)) return out;
  if (!bundle?.worldcup) return out;

  const hasWc = SLATE_KEYS.some(
    (k) => String(out[k]?.sport || "").toLowerCase() === "worldcup",
  );
  if (hasWc) return out;

  let replaceKey = "contrarian";
  let worstRank = -1;
  for (const key of SLATE_KEYS) {
    const rank = rankSlateSportForBundle(out[key]?.sport, bundle, nowMs);
    if (rank > worstRank) {
      worstRank = rank;
      replaceKey = key;
    }
  }

  return {
    ...out,
    [replaceKey]: worldCupRowForSlot(replaceKey, bundle),
  };
}
