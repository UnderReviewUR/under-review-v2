/**
 * Guarantee a World Cup row in Today's Slate during Jun 11–Jul 19 ET
 * when board data exists (model may otherwise assign all three rows to golf/F1/NBA).
 */

import { rankSlateSportForBundle } from "./slateModulePriority.js";
import { isWcSlateFeaturingWindow } from "./wc2026Constants.js";
import { isWcKnockoutFixtureMatch } from "./wcKnockoutFixture.js";
import { resolveWcTournamentPhase, isKnockoutPhase, getKnockoutRoundLabel } from "./wcPhaseUtils.js";

const SLATE_KEYS = ["safeLean", "sharpAngle", "contrarian"];

function summarizeWorldCupEvent(wc, knockout = false) {
  if (!wc) return knockout ? "2026 FIFA World Cup knockout stage" : "2026 FIFA World Cup group stage";
  const upcoming = Array.isArray(wc.upcoming) ? wc.upcoming[0] : null;
  if (upcoming?.homeTeam && upcoming?.awayTeam) {
    const ko = isWcKnockoutFixtureMatch(upcoming, {
      tournamentPhase: resolveWcTournamentPhase(wc.matches || wc.allMatches),
      allMatches: wc.matches || wc.allMatches,
    });
    const stage =
      ko && upcoming.round
        ? String(upcoming.round)
        : ko
          ? "Knockout"
          : upcoming.group
            ? `Group ${upcoming.group}`
            : "";
    return `${upcoming.homeTeam} vs ${upcoming.awayTeam}${stage ? ` (${stage})` : ""}`;
  }
  return knockout ? "2026 FIFA World Cup knockout stage" : "2026 FIFA World Cup group stage";
}

function pickWcContrarianFallback(wc, knockout = false) {
  if (knockout) {
    const upcoming = Array.isArray(wc?.upcoming) ? wc.upcoming[0] : null;
    if (upcoming?.homeTeam && upcoming?.awayTeam) {
      return {
        sport: "worldcup",
        match: `${upcoming.homeTeam} vs ${upcoming.awayTeam}`,
        angle: "Knockout upset value",
        why: "Round-of-32 variance is highest — look where the moneyline overprices the favorite and ET/pens are live if level after 90.",
      };
    }
    return {
      sport: "worldcup",
      match: "Knockout slate",
      angle: "Fade heavy chalk in R32",
      why: "Single-elimination variance peaks early — underdog ML or +spread often prices cleaner than group-stage advancement angles.",
    };
  }
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
  const phase = resolveWcTournamentPhase(wc?.matches || wc?.allMatches);
  const knockout = isKnockoutPhase(phase);
  const event = summarizeWorldCupEvent(wc, knockout);
  if (slot === "safeLean") {
    if (knockout) {
      const upcoming = Array.isArray(wc?.upcoming) ? wc.upcoming[0] : null;
      return {
        sport: "worldcup",
        game: event,
        angle: upcoming ? "Favorite to advance in 90 or ET" : "Knockout favorite lean",
        why: upcoming
          ? `${upcoming.homeTeam} vs ${upcoming.awayTeam} — regulation ML is not a draw push; factor extra time and pens if level.`
          : "Knockout favorites with reliable 90-minute control are the cleanest low-volatility entry on the slate.",
      };
    }
    return {
      sport: "worldcup",
      game: event,
      angle: "Group favorite to control the table",
      why: "Pre-tournament group favorites with host-path leverage still look like the cleanest low-volatility entry before kickoff.",
    };
  }
  if (slot === "sharpAngle") {
    if (knockout) {
      return {
        sport: "worldcup",
        event: event || `World Cup 2026 ${getKnockoutRoundLabel(phase)}`,
        angle: "Regulation vs advancement pricing gap",
        why: "Knockout 90-minute lines can misprice to-advance — draws go to extra time, so draw-heavy matchups need ET/pens framing.",
      };
    }
    return {
      sport: "worldcup",
      event: event || "World Cup 2026 groups",
      angle: "Host-path scheduling edge",
      why: "USA/Mexico/Canada path and travel density can misprice group totals and advancement — look where the schedule compresses rest edges.",
    };
  }
  return pickWcContrarianFallback(wc, knockout);
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
