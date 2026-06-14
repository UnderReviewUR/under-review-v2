/**
 * Contextual World Cup follow-up chips (match / team / player market).
 */

import { WC_INTENT, isWcGroupSlateQuestion } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { getVerdictFollowUpChips } from "./wcUrTakeVerdict.js";
import { assessWcBothTeamsAdvanceFixture } from "./wcBothTeamsAdvance.js";
import { wcGroupLetterForTeam } from "./wcGroupComposition.js";
import {
  isWcCrossGroupMispriceQuestion,
  parentTakeHasWcRunnerUpAnchor,
} from "./wcTakeRetentionQA.js";

const RUNNER_UP_CHIP = "Which group is the runner-up value?";

/**
 * @param {object | null | undefined} message
 * @param {string | null | undefined} [parsedGroup]
 * @returns {string | null}
 */
function extractWcPrimaryGroupLetterFromMessage(message, parsedGroup) {
  const s = message?.structured;
  if (s?.groupLetter != null && String(s.groupLetter).trim()) {
    return String(s.groupLetter).trim().toUpperCase();
  }
  if (s?.primaryMispriceGroupLetter != null && String(s.primaryMispriceGroupLetter).trim()) {
    return String(s.primaryMispriceGroupLetter).trim().toUpperCase();
  }
  if (parsedGroup) return String(parsedGroup).toUpperCase();
  const blob = [s?.call, s?.whyNow, message?.content, message?.text].filter(Boolean).join(" ");
  const m = blob.match(/\bGroup\s+([A-L])\b/i);
  return m?.[1] ? String(m[1]).toUpperCase() : null;
}

/**
 * Runner-up chip only when the parent take named a runner-up; otherwise group-winner chip.
 * @param {object | null | undefined} message
 * @param {string | null | undefined} [parsedGroup]
 */
export function resolveWcRunnerUpFollowUpChipText(message, parsedGroup) {
  if (parentTakeHasWcRunnerUpAnchor(message)) return RUNNER_UP_CHIP;
  const letter = extractWcPrimaryGroupLetterFromMessage(message, parsedGroup) || "D";
  return `Who wins Group ${letter}?`;
}

/**
 * @param {string} chip
 * @param {object | null | undefined} message
 * @param {string | null | undefined} [parsedGroup]
 */
export function gateWcFollowUpChipText(chip, message, parsedGroup) {
  const s = String(chip || "").trim();
  if (s.toLowerCase() === RUNNER_UP_CHIP.toLowerCase()) {
    return resolveWcRunnerUpFollowUpChipText(message, parsedGroup);
  }
  return s;
}

/**
 * @param {string} text
 * @returns {{ home: string, away: string } | null}
 */
export function parseWcMatchupFromQuestion(text) {
  let q = String(text || "").trim();
  q = q.replace(/^(who wins|who will win|what'?s your take on|ur take on)\s+/i, "");
  const m = q.match(/([A-Za-zÀ-ÿ'.\s-]{2,40}?)\s+vs\.?\s+([A-Za-zÀ-ÿ'.\s-]{2,40}?)(?:\s*[—–-]|\?|$)/i);
  if (!m) return null;
  return { home: m[1].trim(), away: m[2].trim() };
}

/**
 * @param {string} text
 * @param {string} home
 * @param {string} away
 */
function isWhoWinsMatchupQuestion(text, home, away) {
  const t = String(text || "").trim();
  if (!/\bwho wins\b/i.test(t)) return false;
  const homeRe = new RegExp(`\\b${String(home || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const awayRe = new RegExp(`\\b${String(away || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return homeRe.test(t) && awayRe.test(t);
}

/**
 * @param {string} chip
 * @param {string} question
 */
function followUpChipDuplicatesQuestion(chip, question) {
  const c = String(chip || "").trim().toLowerCase();
  const q = String(question || "").trim().toLowerCase();
  if (!c || !q) return false;
  if (c === q) return true;
  if (/\bwho wins\b/i.test(c) && /\bwho wins\b/i.test(q)) {
    const pc = parseWcMatchupFromQuestion(chip);
    const pq = parseWcMatchupFromQuestion(question);
    if (
      pc?.home &&
      pq?.home &&
      pc.home.toLowerCase() === pq.home.toLowerCase() &&
      pc.away.toLowerCase() === pq.away.toLowerCase()
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @returns {string[]}
 */
export function getWcContextFollowUpChips(message, userQuestion = "") {
  const chips = [];
  const q = String(userQuestion || message?.userQuestion || message?.question || "").trim();
  const teams = message?.wcMatchTeams;
  const home = teams?.home ? String(teams.home).trim() : "";
  const away = teams?.away ? String(teams.away).trim() : "";
  const wcIntent = String(message?.wcIntent || message?.urTakeTelemetry?.wcIntent || "");
  const callType = String(message?.structured?.callType || "").toLowerCase();
  const isMatchupTake = callType === "matchup" || wcIntent === WC_INTENT.MATCHUP;
  const alreadyAskedWhoWins = home && away ? isWhoWinsMatchupQuestion(q, home, away) : false;
  const priorTotalsInCall = [message?.structured?.call, message?.structured?.lean]
    .filter(Boolean)
    .join(" ")
    .match(/\b(Over|Under)\s+\d+\.?\d*\s*goals?\b/i);
  const isMoneylineBestBetQuestion =
    /\b(best bet|only know the moneyline)\b/i.test(q) && /\b(vs\.?|versus)\b/i.test(q);
  const showAltMatchupChips =
    isMatchupTake && (alreadyAskedWhoWins || priorTotalsInCall || isMoneylineBestBetQuestion);

  if (home && away) {
    if (showAltMatchupChips) {
      if (!isMoneylineBestBetQuestion) {
        chips.push("What's the best bet besides the moneyline?");
      }
      const groupLetter =
        extractWcPrimaryGroupLetterFromMessage(message) ||
        wcGroupLetterForTeam(home) ||
        wcGroupLetterForTeam(away) ||
        "";
      const bothAdvanceOk = assessWcBothTeamsAdvanceFixture({
        home,
        away,
        group: groupLetter,
        teamStats: message?.teamStats || message?.structured?.teamStats,
      }).ok;
      if (bothAdvanceOk) {
        chips.push("Both teams to advance?");
      } else if (groupLetter && !isMoneylineBestBetQuestion) {
        chips.push(`Who wins Group ${groupLetter}?`);
      }
      if (priorTotalsInCall) {
        chips.push("What's the other side?");
      } else {
        chips.push("Over or under goals?");
      }
    } else if (!alreadyAskedWhoWins) {
      chips.push(`Who wins ${home} vs ${away}?`);
    }
    if (!chips.some((c) => /mispriced/i.test(c))) {
      chips.push(`What's mispriced on ${home} vs ${away}?`);
    }
    if (message?.wcEventId && !chips.some((c) => /player prop/i.test(c))) {
      chips.push(`Best player prop for ${home} vs ${away}?`);
    }
  } else {
    const parsed = parseWcMatchupFromQuestion(q);
    if (parsed?.home && parsed?.away) {
      chips.push(`Who wins ${parsed.home} vs ${parsed.away}?`);
      chips.push(`What's the other side?`);
    }
  }

  if (isWcPlayerMarketIntent(wcIntent)) {
    const name = (q.match(/\b([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)\b/) || [])[1];
    if (name && !chips.some((c) => c.includes(name))) {
      chips.push(`Who is mispriced instead of ${name}?`);
    }
    chips.push("Best group stage bet?");
  } else if (wcIntent === WC_INTENT.STRUCTURAL || isWcGroupSlateQuestion(q)) {
    const blob = [
      message?.structured?.call,
      message?.structured?.whyNow,
      message?.content,
      message?.text,
    ]
      .filter(Boolean)
      .join(" ");
    const team = (blob.match(/\b(Paraguay|Norway|USA|Mexico|France|Brazil|Argentina|England|Germany|Spain|Portugal|Netherlands|Italy|Canada|Croatia|Morocco|Japan|Korea|Colombia|Uruguay|Ecuador|Senegal|Ghana|Cameroon|Tunisia|Algeria|Australia|Saudi Arabia|Qatar|Iran|Wales|Scotland|Serbia|Switzerland|Belgium|Denmark|Poland|Austria|Czechia|Ukraine|Turkiye|Turkey)\b/i) || [])[1];
    const group = (blob.match(/\bGroup\s+([A-L])\b/i) || [])[1];
    const crossGroup = isWcCrossGroupMispriceQuestion(q);
    if (team && group) {
      chips.push(`What price is ${team} to advance?`);
      chips.push(resolveWcRunnerUpFollowUpChipText(message, group));
    } else if (team) {
      chips.push(`Can ${team} advance?`);
      chips.push("Who is mispriced instead?");
    } else if (group) {
      chips.push(`Who wins Group ${group}?`);
    } else if (crossGroup) {
      chips.push("Which group is most mispriced?");
    }
    if (!crossGroup) {
      chips.push("Who is mispriced instead?");
    }
  } else if (wcIntent === WC_INTENT.ENTITY_PRICING) {
    const team = (q.match(/\b(France|Brazil|Argentina|England|Germany|Spain|Portugal|Netherlands|Italy|USA|Mexico|Canada|Norway)\b/i) || [])[1];
    if (team) {
      chips.push(`Can ${team} win their group?`);
      chips.push(`${team} — advance or bust?`);
    }
  }

  const seen = new Set();
  return chips
    .map((t) => String(t).trim())
    .filter((t) => {
      if (!t || t.length > 80) return false;
      if (followUpChipDuplicatesQuestion(t, q)) return false;
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3);
}

/**
 * @param {import("./wcUrTakeVerdict.js").WcUrTakeVerdict} verdict
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function mergeWcFollowUpChips(verdict, message, userQuestion = "") {
  const q = String(userQuestion || message?.userQuestion || "").trim();
  const wcIntent = String(message?.wcIntent || message?.urTakeTelemetry?.wcIntent || "");
  const blob = [
    message?.structured?.call,
    message?.structured?.whyNow,
    message?.content,
    message?.text,
  ]
    .filter(Boolean)
    .join(" ");
  const parsedGroup = (blob.match(/\bGroup\s+([A-L])\b/i) || [])[1] || null;

  if (verdict === "GROUP_SLATE" || wcIntent === WC_INTENT.STRUCTURAL || isWcGroupSlateQuestion(q)) {
    const context = getWcContextFollowUpChips(message, q);
    const slate = getVerdictFollowUpChips("GROUP_SLATE");
    const out = [];
    const seen = new Set();
    for (const t of [...context, ...slate]) {
      let s = gateWcFollowUpChipText(String(t || "").trim(), message, parsedGroup);
      if (!s || /parlay/i.test(s)) continue;
      if (followUpChipDuplicatesQuestion(s, q)) continue;
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
      if (out.length >= 3) break;
    }
    return out;
  }

  const context = getWcContextFollowUpChips(message, userQuestion);
  const generic = getVerdictFollowUpChips(verdict);
  const out = [];
  const seen = new Set();
  for (const t of [...context, ...generic]) {
    let s = gateWcFollowUpChipText(String(t || "").trim(), message, parsedGroup);
    if (!s) continue;
    if (followUpChipDuplicatesQuestion(s, q)) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= 3) break;
  }
  return out;
}
