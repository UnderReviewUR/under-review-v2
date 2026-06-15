/**
 * BallDontLie MLB tier — separate from FIFA GOAT.
 *
 * Default: free tier (games/teams/players only). Paid ALL-STAR/GOAT unlocks
 * lineups, injuries, odds, and player props on BDL.
 *
 * Enable BDL odds/props/injuries: MLB_BDL_PAID=1
 * Force free (skip paid endpoints): MLB_BDL_PAID=0 (default)
 */

import { getEnv } from "../api/_env.js";

export function hasMlbBdlApiKey() {
  return Boolean(String(getEnv("BALLDONTLIE_API_KEY") || "").trim());
}

/** Lineups, injuries, odds, player props — require paid MLB BDL tier. */
export function isMlbBdlPaidTierEnabled() {
  const flag = String(getEnv("MLB_BDL_PAID") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return false;
}

/** Today's slate via BDL /mlb/v1/games when API key is set. */
export function isMlbBdlGamesEnabled() {
  return hasMlbBdlApiKey();
}
