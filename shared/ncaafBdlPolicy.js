/**
 * BallDontLie NCAAF GOAT — separate trial/tier from NFL/La Liga.
 * Enable paid GOAT endpoints: NCAAF_BDL_PRIMARY=1
 */
import { getEnv } from "../api/_env.js";

export function hasNcaafBdlApiKey() {
  return Boolean(String(getEnv("BALLDONTLIE_API_KEY") || "").trim());
}

export function isNcaafBdlPrimaryEnabled() {
  const flag = String(getEnv("NCAAF_BDL_PRIMARY") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return false;
}
