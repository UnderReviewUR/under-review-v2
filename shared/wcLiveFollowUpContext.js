/**
 * Fixture context for live-mode Haiku follow-up chips (World Cup).
 */

import { isWcStubUrTakeContext } from "./wcTalkGrounding.js";

const LIVE_STATUSES = new Set(["live", "in_progress", "1h", "2h", "ht"]);

/**
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {Record<string, unknown> | null | undefined} [structured]
 * @returns {{ fixtureLabel: string, score: string | null, phase: string | null, round: string | null, minute: string | null } | null}
 */
export function buildWcLiveFollowUpHaikuContext(wcContext, structured = null) {
  if (!wcContext || typeof wcContext !== "object") {
    wcContext = null;
  }

  const fixtures = [
    ...(Array.isArray(wcContext?.fixtures) ? wcContext.fixtures : []),
    ...(Array.isArray(wcContext?.matchDetails) ? wcContext.matchDetails : []),
  ];

  let liveFx =
    fixtures.find((fx) => LIVE_STATUSES.has(String(fx?.status || "").toLowerCase())) ||
    fixtures[0] ||
    null;

  let home = String(liveFx?.homeTeam || liveFx?.home || "").trim();
  let away = String(liveFx?.awayTeam || liveFx?.away || "").trim();

  if ((!home || !away) && structured && typeof structured === "object") {
    home = String(structured.fixtureHome || "").trim();
    away = String(structured.fixtureAway || "").trim();
    liveFx = liveFx || structured;
  }

  if (!home || !away) return null;

  const homeScore = liveFx?.homeScore ?? liveFx?.score?.home;
  const awayScore = liveFx?.awayScore ?? liveFx?.score?.away;
  const structuredScore = String(
    structured?.liveScore || structured?.gameStateLine || "",
  ).trim();
  const score =
    homeScore != null && awayScore != null
      ? `${homeScore}-${awayScore}`
      : structuredScore || null;

  return {
    fixtureLabel: `${away} vs ${home}`,
    score,
    phase:
      isWcStubUrTakeContext(wcContext) && structured?.phase
        ? String(structured.phase)
        : wcContext?.phase
          ? String(wcContext.phase)
          : structured?.phase
            ? String(structured.phase)
            : null,
    round: liveFx?.round ? String(liveFx.round) : null,
    minute: liveFx?.minute ?? liveFx?.clock ?? null,
  };
}
