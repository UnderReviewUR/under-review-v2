/**
 * Live in-play match questions — possession, dominance, score right now.
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";

const LIVE_SIGNAL_RE =
  /\b(right now|live|in play|in-play|currently|at the moment|this minute|controlling|dominating|dominance|possession|momentum|who.?s ahead|who is ahead)\b/i;

/**
 * @param {string} question
 */
export function isWcLiveDominanceQuestion(question) {
  return LIVE_SIGNAL_RE.test(String(question || ""));
}

/**
 * Pick fixture for live/dominance Qs — prefers live slate, then mentioned teams.
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} question
 * @param {string | null | undefined} [wcEventId]
 */
export function selectLiveFixtureForQuestion(matches, question, wcEventId) {
  const eventId = String(wcEventId || "").trim();
  if (eventId) {
    const pinned = (matches || []).find((m) => String(m?.id ?? "") === eventId);
    if (pinned) return pinned;
  }

  const mentioned = extractMentionedWcTeams(String(question || ""));
  const isLive = (s) => ["live", "in_progress", "1h", "2h", "ht"].includes(String(s || "").toLowerCase());

  const liveAll = (matches || []).filter((m) => isLive(m.status));
  if (mentioned.length && liveAll.length) {
    const set = new Set(mentioned.map((t) => t.toUpperCase()));
    const hit = liveAll.find(
      (m) =>
        set.has(String(m.homeTeam || "").toUpperCase()) ||
        set.has(String(m.awayTeam || "").toUpperCase()),
    );
    if (hit) return hit;
  }
  if (liveAll.length === 1) return liveAll[0];
  if (liveAll.length > 1 && mentioned.length === 0) {
    return liveAll.sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0))[0];
  }
  return null;
}

export const WC_LIVE_MATCH_PROMPT_RULES = `LIVE MATCH (mandatory when MATCH INTEL shows live status):
- Answer from MATCH INTEL team stats only — possession %, shots, SOT, corners, chance index.
- Do NOT cite Opta xG, expected goals, or xG unless explicitly printed in VERIFIED CONTEXT.
- If possession or shots are missing, say what is missing — do not invent percentages.
- Name both teams and cite the numbers you see (e.g. "France 58% possession · 7 shots").`;
