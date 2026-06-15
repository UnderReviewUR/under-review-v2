/**
 * Live in-play match questions — possession, dominance, score right now.
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";

const LIVE_SIGNAL_RE =
  /\b(right now|live|in play|in-play|currently|at the moment|this minute|controlling|dominating|dominance|possession|momentum|who.?s ahead|who is ahead|\d+\s*[-–]\s*\d+|\d+(?:st|nd|rd|th)?\s+minute|\d+\s+mins?\s+left|minutes?\s+left|mins?\s+to\s+go|time\s+left)\b/i;

/**
 * @param {string} question
 */
export function isWcLiveDominanceQuestion(question) {
  return LIVE_SIGNAL_RE.test(String(question || ""));
}

const LIVE_BET_TIMING_RE =
  /\b(?:when(?:'s| is)?\s+(?:the\s+)?best\s+time\s+to\s+(?:place|bet|lock)|best\s+time\s+to\s+place|should\s+i\s+(?:bet|lock|wait)|wait\s+until|place\s+(?:the\s+)?bet\s+now|lock\s+(?:it\s+)?in\s+now|bet\s+now\s+or\s+wait|before\s+(?:they|spain|france|[a-z]{3})\s+score)\b/i;

/**
 * Follow-up on when to lock a live totals lean from the same thread.
 * @param {string} question
 */
export function isWcLiveBetTimingQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (LIVE_BET_TIMING_RE.test(q)) return true;
  if (
    /\b(?:second|2nd)\s+half\b/i.test(q) &&
    /\b(?:place|bet|lock|wait|timing|now)\b/i.test(q)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} question
 */
export function parseLiveScoreFromQuestion(question) {
  const m = String(question || "").match(/\b(\d+)\s*[-–]\s*(\d+)\b/);
  if (!m) return null;
  const home = Number(m[1]);
  const away = Number(m[2]);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away, total: Math.max(0, home + away) };
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
