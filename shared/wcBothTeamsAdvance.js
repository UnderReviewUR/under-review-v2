/**
 * World Cup — when "both teams to advance" on a fixture is structurally coherent.
 * Top two qualify; if the fixture excludes the group Favorite, both sides advancing
 * requires that Favorite to miss.
 */

import { getWcGroupComposition } from "./wcGroupComposition.js";
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
  const home = String(row.home || "").trim().toUpperCase();
  const away = String(row.away || "").trim().toUpperCase();
  const group = String(row.group || "").trim().toUpperCase();
  const teamStats = row.teamStats || {};

  const homeAdv = Number(teamStats[home]?.advancePct);
  const awayAdv = Number(teamStats[away]?.advancePct);

  const exclusion = wcFixtureTeamsExcludingGroupFavorite(group, home, away);
  if (!exclusion) {
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
  if (!assessment?.requiresFavoriteOut || !assessment.favoriteName) return "";
  const groupClause = group ? ` in Group ${group}` : "";
  const favPct =
    assessment.favoriteAdvancePct != null
      ? ` (UR sim ${Number(assessment.favoriteAdvancePct).toFixed(1)}%)`
      : "";
  return `Structural bet${groupClause}: ${homeName} and ${awayName} both need ${assessment.favoriteName} to miss${favPct}.`;
}
