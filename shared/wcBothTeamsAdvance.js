/**
 * World Cup — when "both teams to advance" on a fixture is structurally coherent.
 * Top two qualify; if the fixture excludes the group Favorite, both sides advancing
 * requires that Favorite to miss.
 */

import { getWcGroupComposition } from "./wcGroupComposition.js";
import { isWcKnockoutFixtureMatch } from "./wcKnockoutFixture.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";

/**
 * @param {string} group
 * @param {string} home
 * @param {string} away
 */
export function wcFixtureTeamsExcludingGroupFavorite(group, home, away) {
  const comp = getWcGroupComposition(group);
  if (!comp?.favorite?.abbreviation) return null;

  const favAbbr = String(comp.favorite.abbreviation).toUpperCase();
  const homeU = String(home || "").trim().toUpperCase();
  const awayU = String(away || "").trim().toUpperCase();
  if (!homeU || !awayU) return null;
  if (homeU === favAbbr || awayU === favAbbr) return null;

  const others = comp.teams
    .map((t) => String(t.abbreviation).toUpperCase())
    .filter((abbr) => abbr !== homeU && abbr !== awayU);

  return {
    favoriteAbbr: favAbbr,
    favoriteName: comp.favorite.name || wcMatchupTeamDisplayName(favAbbr),
    otherAbbr: others[0] || "",
    otherName: others[0] ? wcMatchupTeamDisplayName(others[0]) : "",
  };
}

/**
 * @param {{
 *   home: string,
 *   away: string,
 *   group?: string,
 *   teamStats?: Record<string, { advancePct?: number }>,
 * }} row
 */
export function assessWcBothTeamsAdvanceFixture(row) {
  const knockoutScope = {
    tournamentPhase: row.tournamentPhase,
    allMatches: row.allMatches,
  };
  if (row.isKnockout || isWcKnockoutFixtureMatch(row.match, knockoutScope)) {
    return {
      ok: false,
      reason: "knockout_fixture",
      requiresFavoriteOut: false,
    };
  }
  const home = String(row.home || "").trim().toUpperCase();
  const away = String(row.away || "").trim().toUpperCase();
  const group = String(row.group || "").trim().toUpperCase();
  const teamStats = row.teamStats || {};

  const homeAdv = Number(teamStats[home]?.advancePct);
  const awayAdv = Number(teamStats[away]?.advancePct);

  const exclusion = wcFixtureTeamsExcludingGroupFavorite(group, home, away);
  if (!exclusion) {
    const comp = getWcGroupComposition(group);
    const favAbbr = comp?.favorite?.abbreviation
      ? String(comp.favorite.abbreviation).toUpperCase()
      : "";
    const favInFixture = favAbbr && (home === favAbbr || away === favAbbr);
    const contAbbr = comp?.contender?.abbreviation
      ? String(comp.contender.abbreviation).toUpperCase()
      : "";
    const contAdv = contAbbr ? Number(teamStats[contAbbr]?.advancePct) : NaN;
    const bothFixtureTeamsLive =
      Number.isFinite(homeAdv) &&
      Number.isFinite(awayAdv) &&
      homeAdv >= 45 &&
      awayAdv >= 45;

    if (favInFixture && contAbbr && contAbbr !== home && contAbbr !== away) {
      if (!bothFixtureTeamsLive) {
        return {
          ok: false,
          requiresFavoriteOut: false,
          requiresContenderOut: true,
          reason: "needs_fixture_advance_sims",
          favoriteAbbr: favAbbr,
          favoriteName: comp?.favorite?.name || wcMatchupTeamDisplayName(favAbbr),
          favoriteAdvancePct: Number(teamStats[favAbbr]?.advancePct) || null,
          contenderAbbr: contAbbr,
          contenderName: comp?.contender?.name || wcMatchupTeamDisplayName(contAbbr),
          contenderAdvancePct: Number.isFinite(contAdv) ? contAdv : null,
        };
      }
      if (!Number.isFinite(contAdv)) {
        return {
          ok: false,
          requiresFavoriteOut: false,
          requiresContenderOut: true,
          reason: "needs_contender_out_unverified",
          favoriteAbbr: favAbbr,
          favoriteName: comp?.favorite?.name || wcMatchupTeamDisplayName(favAbbr),
          favoriteAdvancePct: Number(teamStats[favAbbr]?.advancePct) || null,
          contenderAbbr: contAbbr,
          contenderName: comp?.contender?.name || wcMatchupTeamDisplayName(contAbbr),
          contenderAdvancePct: null,
        };
      }
      if (contAdv >= 58) {
        return {
          ok: false,
          requiresFavoriteOut: false,
          requiresContenderOut: true,
          reason: "contender_likely_advances",
          favoriteAbbr: favAbbr,
          favoriteName: comp?.favorite?.name || wcMatchupTeamDisplayName(favAbbr),
          favoriteAdvancePct: Number(teamStats[favAbbr]?.advancePct) || null,
          contenderAbbr: contAbbr,
          contenderName: comp?.contender?.name || wcMatchupTeamDisplayName(contAbbr),
          contenderAdvancePct: contAdv,
        };
      }
      if (Number.isFinite(contAdv) && contAdv >= 45) {
        return {
          ok: true,
          requiresFavoriteOut: false,
          requiresContenderOut: true,
          favoriteAbbr: favAbbr,
          favoriteName: comp?.favorite?.name || wcMatchupTeamDisplayName(favAbbr),
          favoriteAdvancePct: Number(teamStats[favAbbr]?.advancePct) || null,
          contenderAbbr: contAbbr,
          contenderName: comp?.contender?.name || wcMatchupTeamDisplayName(contAbbr),
          contenderAdvancePct: contAdv,
        };
      }
    }

    return {
      ok: true,
      requiresFavoriteOut: false,
      favoriteAbbr: "",
      favoriteName: "",
      favoriteAdvancePct: null,
    };
  }

  const favAdv = Number(teamStats[exclusion.favoriteAbbr]?.advancePct);
  const requiresFavoriteOut = true;

  if (!Number.isFinite(favAdv)) {
    return {
      ok: false,
      requiresFavoriteOut,
      reason: "needs_favorite_out_unverified",
      favoriteAbbr: exclusion.favoriteAbbr,
      favoriteName: exclusion.favoriteName,
      favoriteAdvancePct: null,
    };
  }

  if (Number.isFinite(homeAdv) && Number.isFinite(awayAdv) && (homeAdv <= 45 || awayAdv <= 45)) {
    return {
      ok: false,
      requiresFavoriteOut,
      reason: "low_fixture_advance",
      favoriteAbbr: exclusion.favoriteAbbr,
      favoriteName: exclusion.favoriteName,
      favoriteAdvancePct: Number.isFinite(favAdv) ? favAdv : null,
    };
  }

  // Group Favorite must miss for both fixture teams to qualify — gate when sims still like the Favorite.
  if (Number.isFinite(favAdv) && favAdv >= 58) {
    return {
      ok: false,
      requiresFavoriteOut,
      reason: "favorite_likely_advances",
      favoriteAbbr: exclusion.favoriteAbbr,
      favoriteName: exclusion.favoriteName,
      favoriteAdvancePct: favAdv,
    };
  }

  return {
    ok: true,
    requiresFavoriteOut,
    favoriteAbbr: exclusion.favoriteAbbr,
    favoriteName: exclusion.favoriteName,
    favoriteAdvancePct: Number.isFinite(favAdv) ? favAdv : null,
  };
}

/**
 * @param {ReturnType<typeof assessWcBothTeamsAdvanceFixture>} assessment
 * @param {string} homeName
 * @param {string} awayName
 * @param {string} [group]
 */
export function buildWcBothTeamsAdvanceCaveat(assessment, homeName, awayName, group = "") {
  const groupClause = group ? ` in Group ${group}` : "";
  if (assessment?.requiresContenderOut && assessment.contenderName) {
    const contPct =
      assessment.contenderAdvancePct != null
        ? ` (UR sim ${Number(assessment.contenderAdvancePct).toFixed(1)}%)`
        : "";
    return `Structural bet${groupClause}: ${homeName} and ${awayName} both advancing means ${assessment.contenderName} likely misses${contPct}.`;
  }
  if (!assessment?.requiresFavoriteOut || !assessment.favoriteName) return "";
  const favPct =
    assessment.favoriteAdvancePct != null
      ? ` (UR sim ${Number(assessment.favoriteAdvancePct).toFixed(1)}%)`
      : "";
  return `Structural bet${groupClause}: ${homeName} and ${awayName} both need ${assessment.favoriteName} to miss${favPct}.`;
}
