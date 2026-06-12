import { isWcTournamentWindow } from "./wc2026Constants.js";

function envTruthy(name) {
  const v = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Whether the Vercel NBA board warmup cron should run heavy board assembly.
 * Skipped during WC tournament — user requests still hit /api/nba?view=board on demand.
 * @param {number} [nowMs]
 */
export function shouldRunNbaBoardWarmupCron(nowMs = Date.now()) {
  if (envTruthy("NBA_BOARD_WARMUP_FORCE")) return true;
  if (envTruthy("NBA_BOARD_WARMUP_DISABLE")) return false;
  if (isWcTournamentWindow(nowMs)) return false;
  return true;
}
