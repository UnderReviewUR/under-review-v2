import { isNavSportVisible } from "./siteSportVisibility.js";
import { isWcTournamentWindow } from "./wc2026Constants.js";

function envTruthy(name) {
  const v = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Whether scheduled NBA odds/props scrapes should run (cron scrape-scheduler).
 * Off when NBA is hidden from product surfaces or during WC tournament window.
 * @param {number} [nowMs]
 */
export function shouldCollectNbaScrapeTargets(nowMs = Date.now()) {
  if (envTruthy("NBA_SCRAPE_FORCE")) return true;
  if (envTruthy("NBA_SCRAPE_DISABLE")) return false;
  if (!isNavSportVisible("nba")) return false;
  if (isWcTournamentWindow(nowMs)) return false;
  return true;
}
