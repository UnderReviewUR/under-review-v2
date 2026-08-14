/**
 * Pregame vs live vs final — from the board status, not the model's guess.
 */

const LIVE_STATUS = new Set(["inprogress", "in", "live", "halftime", "ht", "q1", "q2", "q3", "q4", "ot"]);
const FINAL_STATUS = new Set(["final", "closed", "complete", "completed", "final/ot"]);

/**
 * @param {Record<string, unknown>} game
 * @param {number} [nowMs]
 * @returns {"pregame"|"live"|"final"}
 */
export function classifyNflGamePhase(game, nowMs = Date.now()) {
  const status = String(game?.status || "").toLowerCase().trim();
  if (FINAL_STATUS.has(status) || status.includes("final")) return "final";
  if (LIVE_STATUS.has(status) || status.includes("progress")) return "live";
  void nowMs;
  return "pregame";
}

/**
 * Short kickoff for pregame rows.
 * @param {number | null | undefined} tipoffMs
 */
export function formatNflKickoffShort(tipoffMs) {
  if (tipoffMs == null || !Number.isFinite(Number(tipoffMs))) return "";
  try {
    return new Date(Number(tipoffMs)).toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * One clause for prompts and cards: "pregame · Sun 1:00 PM" | "LIVE" | "final".
 * @param {Record<string, unknown>} game
 * @param {number} [nowMs]
 */
export function formatNflGameStateLine(game, nowMs = Date.now()) {
  const phase = classifyNflGamePhase(game, nowMs);
  if (phase === "live") return "LIVE";
  if (phase === "final") return "final";
  const kick = formatNflKickoffShort(game?.tipoffMs);
  return kick ? `pregame · ${kick} ET` : "pregame";
}
