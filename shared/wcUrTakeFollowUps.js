/**
 * Contextual World Cup follow-up chips (match / team / player market).
 */

import { WC_INTENT, isWcGroupSlateQuestion } from "./wcUrTakeIntent.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import {
  extractWcNamedPlayerFromQuestion,
  isGenericWcPlayerPropQuestion,
  isWcFixturePlayerPropsQuestion,
  isWcGenericPlayerPropSubjectName,
  isWcPlayerMarketIntent,
} from "./wcUrTakePlayerMarket.js";
import { getVerdictFollowUpChips, getVerdictNextLine } from "./wcUrTakeVerdict.js";
import { extractWcThreadStateFromHistory } from "./wcThreadState.js";
import {
  prependWcTakeAwareFollowUpChips,
  resolveWcTakeAwareNextLine,
} from "./wcTakeAwareFollowUps.js";
import { assessWcBothTeamsAdvanceFixture } from "./wcBothTeamsAdvance.js";
import { isWcKnockoutFixtureMatch } from "./wcKnockoutFixture.js";
import {
  getWorldCupPhaseFromEtDate,
  isKnockoutPhase,
  isKnockoutRound,
  resolveWcTournamentPhase,
} from "./wcPhaseUtils.js";
import { wcGroupLetterForTeam } from "./wcGroupComposition.js";
import {
  isWcCrossGroupMispriceQuestion,
  parentTakeHasWcRunnerUpAnchor,
} from "./wcTakeRetentionQA.js";

const RUNNER_UP_CHIP = "Which group is the runner-up value?";

const GROUP_STAGE_CHIP_RE =
  /\b(both teams to advance|both advance\b|runner-up value|who wins group [a-l]|win their group|group stage bet|group-stage ties|which group is most mispriced|can .+ win their group)\b/i;

/**
 * Knockout scope for follow-up chips — phase, fixture row, or explicit question wording.
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function resolveWcFollowUpKnockoutScope(message, userQuestion = "") {
  const allMatches = Array.isArray(message?.allMatches) ? message.allMatches : [];
  const feedPhase =
    message?.wcTournamentPhase ||
    message?.tournamentPhase ||
    message?.urTakeTelemetry?.wcTournamentPhase ||
    "";

  const structured = message?.structured;
  const isGroupSlateCard =
    structured?.callType === "group_slate" ||
    (structured?.groupLetter != null &&
      String(structured.groupLetter).trim() &&
      !isKnockoutRound(structured?.round));

  const fixtureMatch =
    message?.wcMatch ||
    message?.match ||
    (message?.wcMatchTeams?.home && message?.wcMatchTeams?.away
      ? {
          homeTeam: message.wcMatchTeams.home,
          awayTeam: message.wcMatchTeams.away,
          round: structured?.round,
        }
      : null) ||
    (structured?.fixtureHome && structured?.fixtureAway
      ? {
          homeTeam: structured.fixtureHome,
          awayTeam: structured.fixtureAway,
          round: structured.round,
        }
      : null);

  const q = String(userQuestion || message?.userQuestion || message?.question || "");
  const knockoutFromQuestion =
    /\b(round of 32|round\s*32|r32|round of 16|round\s*16|r16|quarter-?finals?|semi-?finals?|knockout|elimination|single elimination)\b/i.test(
      q,
    );
  const knockoutFromStructured =
    structured?.callType === "knockout_slate" || isKnockoutRound(structured?.round);

  if (isKnockoutPhase(feedPhase)) return true;
  if (knockoutFromQuestion || knockoutFromStructured) return true;

  const feedResolved = allMatches.length ? resolveWcTournamentPhase(allMatches) : feedPhase;
  const scope = { tournamentPhase: feedResolved, allMatches };

  if (isWcKnockoutFixtureMatch(fixtureMatch, scope)) return true;

  const hasFixtureContext = Boolean(
    (fixtureMatch?.homeTeam && fixtureMatch?.awayTeam) ||
      (message?.wcMatchTeams?.home && message?.wcMatchTeams?.away),
  );
  if (
    hasFixtureContext &&
    !isGroupSlateCard &&
    isKnockoutPhase(getWorldCupPhaseFromEtDate())
  ) {
    return true;
  }

  if (allMatches.length && isKnockoutPhase(feedResolved)) return true;

  return false;
}

/**
 * @param {string} chip
 * @param {object | null | undefined} message
 */
function knockoutFollowUpChipReplacement(chip, message) {
  const s = String(chip || "").trim();
  const teams = message?.wcMatchTeams;
  const home = teams?.home ? String(teams.home).trim() : "";
  const away = teams?.away ? String(teams.away).trim() : "";
  const matchup = home && away ? `${home} vs ${away}` : "";

  if (/both teams to advance/i.test(s)) {
    return matchup ? `Who advances: ${matchup}?` : "Who advances from this matchup?";
  }
  if (/group stage bet/i.test(s)) return "Best knockout value bet?";
  if (/who wins group/i.test(s) || /win their group/i.test(s)) {
    return matchup ? `Who advances: ${matchup}?` : "Who advances from this matchup?";
  }
  if (/runner-up value/i.test(s)) return "Any upset value on this slate?";
  if (/group-stage ties/i.test(s)) return "What if it goes to extra time?";
  if (/which group is most mispriced/i.test(s)) return "Which knockout matchup is most mispriced?";
  if (/can .+ advance\?/i.test(s) && !/who advances/i.test(s)) {
    return matchup ? `Who advances: ${matchup}?` : "Who advances from this matchup?";
  }
  return null;
}

/**
 * Strip or rewrite group-stage chips during knockout threads.
 * @param {string[]} chips
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function filterWcKnockoutInvalidFollowUpChips(chips, message, userQuestion = "") {
  if (!resolveWcFollowUpKnockoutScope(message, userQuestion)) {
    return chips || [];
  }
  const out = [];
  const seen = new Set();
  for (const chip of chips || []) {
    let s = String(chip || "").trim();
    if (!s) continue;
    if (GROUP_STAGE_CHIP_RE.test(s)) {
      s = knockoutFollowUpChipReplacement(s, message) || "";
      if (!s) continue;
    }
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

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
    if (resolveWcFollowUpKnockoutScope(message)) return null;
    return resolveWcRunnerUpFollowUpChipText(message, parsedGroup);
  }
  if (resolveWcFollowUpKnockoutScope(message) && GROUP_STAGE_CHIP_RE.test(s)) {
    return knockoutFollowUpChipReplacement(s, message);
  }
  return s;
}

/**
 * @param {string} text
 * @returns {{ home: string, away: string } | null}
 */
/**
 * @param {string} side
 * @param {string[]} mentioned
 */
function resolveWcMatchupSideAbbr(side, mentioned) {
  const s = String(side || "").trim();
  if (!s) return "";
  const upper = s.toUpperCase();
  if (mentioned.includes(upper)) return upper;
  const sl = s.toLowerCase();
  for (const abbr of mentioned) {
    const name = wcMatchupTeamDisplayName(abbr).toLowerCase();
    if (sl.includes(name) || sl.includes(abbr.toLowerCase())) return abbr;
  }
  return s;
}

function isPlausibleWcMatchupChipSide(side) {
  const s = String(side || "").trim();
  if (!s) return false;
  if (s.split(/\s+/).length > 4) return false;
  if (/\b(will|best|player|props?|score|both|sneaky|top)\b/i.test(s)) return false;
  if (/^[A-Z]{2,4}$/.test(s)) return true;
  return s.length <= 24;
}

/**
 * @param {string} home
 * @param {string} away
 */
function isPlausibleWcMatchupChip(home, away) {
  return isPlausibleWcMatchupChipSide(home) && isPlausibleWcMatchupChipSide(away);
}

export function parseWcMatchupFromQuestion(text) {
  let q = String(text || "").trim();
  if (!q) return null;
  if (/\b(player props?|player parlays?|parlay props?|golden boot)\b/i.test(q)) return null;

  q = q.replace(/^(who wins|who will win|what'?s your take on|ur take on)\s+/i, "");
  const mentioned = extractMentionedWcTeams(q);
  const m = q.match(/([A-Za-zÀ-ÿ'.\s-]{2,40}?)\s+vs\.?\s+([A-Za-zÀ-ÿ'.\s-]{2,40}?)(?:\s*[—–-]|\?|$)/i);
  if (m && mentioned.length >= 2) {
    const homeSide = m[1].trim();
    if (/\b(player props?|props?|parlay|best bet)\b/i.test(homeSide)) return null;
    return {
      home: resolveWcMatchupSideAbbr(homeSide, mentioned),
      away: resolveWcMatchupSideAbbr(m[2].trim(), mentioned),
    };
  }
  if (!m) return null;
  const home = m[1].trim();
  const away = m[2].trim();
  if (/\b(player props?|props?|parlay|best bet)\b/i.test(home)) return null;
  return { home, away };
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
  const isFixturePlayerPropsQuestion = isWcFixturePlayerPropsQuestion(q);
  const showAltMatchupChips =
    isMatchupTake && (alreadyAskedWhoWins || priorTotalsInCall || isMoneylineBestBetQuestion);

  if (home && away) {
    if (showAltMatchupChips && !isFixturePlayerPropsQuestion) {
      if (!isMoneylineBestBetQuestion) {
        chips.push("What's the best bet besides the moneyline?");
      }
      const groupLetter =
        extractWcPrimaryGroupLetterFromMessage(message) ||
        wcGroupLetterForTeam(home) ||
        wcGroupLetterForTeam(away) ||
        "";
      const knockoutScope = {
        tournamentPhase:
          message?.wcTournamentPhase ||
          message?.tournamentPhase ||
          message?.urTakeTelemetry?.wcTournamentPhase,
      };
      const fixtureMatch = message?.wcMatch || message?.match;
      const bothAdvanceOk = assessWcBothTeamsAdvanceFixture({
        home,
        away,
        group: groupLetter,
        teamStats: message?.teamStats || message?.structured?.teamStats,
        match: fixtureMatch,
        tournamentPhase: knockoutScope.tournamentPhase,
      }).ok;
      if (bothAdvanceOk && !isWcKnockoutFixtureMatch(fixtureMatch, knockoutScope)) {
        chips.push("Both teams to advance?");
      } else if (
        groupLetter &&
        !isMoneylineBestBetQuestion &&
        !isKnockoutPhase(knockoutScope.tournamentPhase) &&
        !isWcKnockoutFixtureMatch(fixtureMatch, knockoutScope) &&
        !resolveWcFollowUpKnockoutScope(message, q)
      ) {
        chips.push(`Who wins Group ${groupLetter}?`);
      }
      if (priorTotalsInCall) {
        chips.push("What's the other side?");
      } else {
        chips.push("Over or under goals?");
      }
    } else if (!alreadyAskedWhoWins && !isFixturePlayerPropsQuestion) {
      chips.push(`Who wins ${home} vs ${away}?`);
    }
    if (!isFixturePlayerPropsQuestion && !chips.some((c) => /mispriced/i.test(c))) {
      chips.push(`What's mispriced on ${home} vs ${away}?`);
    }
    if (
      message?.wcEventId &&
      !isFixturePlayerPropsQuestion &&
      !chips.some((c) => /player prop/i.test(c))
    ) {
      chips.push(`Best player prop for ${home} vs ${away}?`);
    }
  } else {
    const parsed = parseWcMatchupFromQuestion(q);
    const namedPlayer = extractWcNamedPlayerFromQuestion(q);
    const mentionedTeams = extractMentionedWcTeams(q);
    if (
      namedPlayer &&
      mentionedTeams.length >= 2 &&
      !isFixturePlayerPropsQuestion &&
      !chips.some((c) => /who wins/i.test(c))
    ) {
      chips.push(`Who wins ${mentionedTeams[0]} vs ${mentionedTeams[1]}?`);
    } else if (
      parsed?.home &&
      parsed?.away &&
      !isFixturePlayerPropsQuestion &&
      isPlausibleWcMatchupChip(parsed.home, parsed.away)
    ) {
      chips.push(`Who wins ${parsed.home} vs ${parsed.away}?`);
      chips.push(`What's the other side?`);
    }
  }

  if (isWcPlayerMarketIntent(wcIntent)) {
    const name = extractWcNamedPlayerFromQuestion(q);
    if (name && !isWcGenericPlayerPropSubjectName(name) && !chips.some((c) => c.includes(name))) {
      chips.push(`Who is mispriced instead of ${name}?`);
    } else if (isFixturePlayerPropsQuestion) {
      const teams = extractMentionedWcTeams(q);
      if (teams.length >= 2 && !chips.some((c) => /parlay/i.test(c))) {
        chips.push(`4 player parlay for ${teams[0]} vs ${teams[1]}?`);
      }
      if (!chips.some((c) => /who wins/i.test(c)) && teams.length >= 2) {
        chips.push(`Who wins ${teams[0]} vs ${teams[1]}?`);
      }
    } else if (isGenericWcPlayerPropQuestion(q)) {
      if (/\bremaining matches?\b/i.test(q)) {
        chips.push("Best player parlays for remaining matches?");
      } else {
        chips.push("Best anytime scorer value today?");
      }
    }
    const knockoutThread = resolveWcFollowUpKnockoutScope(message, q);
    chips.push(knockoutThread ? "Best knockout value bet?" : "Best group stage bet?");
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
    const knockoutThread = resolveWcFollowUpKnockoutScope(message, q);
    if (team && !knockoutThread) {
      chips.push(`Can ${team} win their group?`);
      chips.push(`${team} — advance or bust?`);
    } else if (team) {
      chips.push(`Can ${team} still win the tournament?`);
      chips.push(`Who advances: ${team}'s next matchup?`);
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const t of chips.map((x) => String(x).trim())) {
    if (!t || t.length > 80) continue;
    if (followUpChipDuplicatesQuestion(t, q)) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(t);
  }

  return filterWcKnockoutInvalidFollowUpChips(deduped, message, q).slice(0, 3);
}

/**
 * @param {import("./wcUrTakeVerdict.js").WcUrTakeVerdict} verdict
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function resolveWcFollowUpNextLine(verdict, message, userQuestion = "") {
  const base = getVerdictNextLine(verdict);
  return resolveWcTakeAwareNextLine(base, message, userQuestion) || base;
}

function filterStaleGenericFollowUpChips(chips, message, history = []) {
  const thread = extractWcThreadStateFromHistory(history);
  const hasProps = (thread.lastPropBoard?.length || 0) >= 2;
  const hasTotals = Boolean(thread.lastTotalsLean?.side);
  const cardType = String(message?.structured?.cardType || "");

  return (chips || []).filter((chip) => {
    const s = String(chip || "").trim();
    if (!s) return false;
    if (hasProps && hasTotals && /^build a parlay around/i.test(s)) return false;
    if (hasProps && /\bclearest angle on this matchup\b/i.test(s)) return false;
    if (
      (hasProps || cardType === "prop_board") &&
      /^what'?s the best bet besides the moneyline\?/i.test(s)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * @param {import("./wcUrTakeVerdict.js").WcUrTakeVerdict} verdict
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @param {object[]} [history]
 */
export function mergeWcFollowUpChips(verdict, message, userQuestion = "", history = []) {
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
    const knockout = resolveWcFollowUpKnockoutScope(message, q);
    const context = getWcContextFollowUpChips(message, q);
    const slate = getVerdictFollowUpChips("GROUP_SLATE", { knockout });
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
    return filterWcKnockoutInvalidFollowUpChips(
      prependWcTakeAwareFollowUpChips(
        filterStaleGenericFollowUpChips(out, message, history),
        message,
        q,
        history,
      ),
      message,
      q,
    );
  }

  const knockout = resolveWcFollowUpKnockoutScope(message, userQuestion);
  const context = getWcContextFollowUpChips(message, userQuestion);
  const generic = getVerdictFollowUpChips(verdict, { knockout });
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
  return filterWcKnockoutInvalidFollowUpChips(
    prependWcTakeAwareFollowUpChips(
      filterStaleGenericFollowUpChips(out, message, history),
      message,
      q,
      history,
    ),
    message,
    q,
  );
}
