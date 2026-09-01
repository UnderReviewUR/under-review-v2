/**
 * BallDontLie La Liga GOAT — separate trial/tier from NFL/NCAAF.
 * Enable paid GOAT endpoints: LALIGA_BDL_PRIMARY=1
 */
import { getEnv } from "../api/_env.js";

export function hasLaligaBdlApiKey() {
  return Boolean(String(getEnv("BALLDONTLIE_API_KEY") || "").trim());
}

export function isLaligaBdlPrimaryEnabled() {
  const flag = String(getEnv("LALIGA_BDL_PRIMARY") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return false;
}
