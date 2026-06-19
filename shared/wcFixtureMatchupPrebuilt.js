/**
 * World Cup fixture matchup prebuilt — instant UR Take cards for known openers (no LLM).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { GROUP_STAGE_OPENERS } from "./wc2026PromoFixtures.js";
import { isWcAdvancementMarketQuestion } from "./wcAdvancementMarket.js";
import {
  isWcMatchWinnerQuestion,
  parseWcMatchupTeamsFromQuestion,
  wcMatchupTeamDisplayName,
  extractWcMatchupPlayHeadline,
} from "./wcMatchupWinnerLine.js";
import {
  devigWcMatchMoneylineProbs,
  readWcMatchMoneylineAmerican,
  resolveMatchWinProbabilityBar,
} from "./wcMatchMoneylineProbs.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { WC_INTENT, isWcMatchTotalsQuestion } from "./wcUrTakeIntent.js";
import {
  isWcFixtureScopedPlayerMarketQuestion,
  isWcPlayerMarketIntent,
} from "./wcUrTakePlayerMarket.js";
import {
  buildWcSimAttributionLabel,
  extractWcModelAttributionPrefix,
} from "./wcTakeRetentionQA.js";
import {
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "./wcGroupComposition.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import {
  isWcMatchupAltMarketFollowUp,
  isWcMatchupOtherSideFollowUp,
  isWcTotalsExplainFollowUp,
} from "./wcMatchBettingPrompt.js";
import { shouldBlockMatchupAltPrebuiltAfterPlayerPivot } from "./wcFollowUpExplain.js";
import { isWcLiveDominanceQuestion, isWcLiveBetTimingQuestion, isWcLiveBetsQuestion, isWcSecondHalfContext, parseLiveScoreFromQuestion, WC_LIVE_ANGLE_ASK_RE } from "./wcLiveMatchQuestion.js";
import { isWcMatchProbabilityQuestion } from "./wcMatchProbabilityQuestion.js";
import { detectParlayIntent } from "./detectParlayIntent.js";
import { detectWcSgpComboIntent } from "./wcUrTakePhilosophy.js";
import {
  assessWcBothTeamsAdvanceFixture,
  buildWcBothTeamsAdvanceCaveat,
} from "./wcBothTeamsAdvance.js";
import { formatWcKickoffEtOnly, formatWcLiveGameStateLine } from "./wcKickoffDisplay.js";
import {
  matchPlayerPropRowsFromEvent,
} from "./wcMatchPlayerProps.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

const WC_LIVE_ANGLE_RE = WC_LIVE_ANGLE_ASK_RE;

function isWcNonFixtureMatchupQuestion(question) {
  const q = String(question || "");
  if (!q) return false;
  if (detectParlayIntent(q)) return true;
  if (detectWcSgpComboIntent(q)) return true;
  if (isWcFixtureScopedPlayerMarketQuestion(q)) return true;
  if (
    /\b(player parlay|parlay props?|player props?|goalscorer|golden boot|anytime scorer|shots on target|assists?)\b/i.test(
      q,
    )
  ) {
    return true;
  }
  if (/\bremaining matches today\b/i.test(q) && /\b(prop|parlay|player)\b/i.test(q)) return true;
  return false;
}

function isWcLiveMatchStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} [match]
 */
export function isWcFixturePrebuiltBlockedForLivePlay(question, match) {
  const q = String(question || "");
  if (/\bwho wins\b/i.test(q) && !WC_LIVE_ANGLE_RE.test(q) && match) {
    const hs = Number(match.homeScore);
    const as = Number(match.awayScore);
    const scoreless =
      (!Number.isFinite(hs) && !Number.isFinite(as)) ||
      (Number.isFinite(hs) && Number.isFinite(as) && hs + as === 0);
    if (scoreless && isWcLiveMatchStatus(match.status)) return false;
  }
  if (isWcMatchTotalsQuestion(q) || isWcMatchupAltMarketFollowUp(q)) {
    return false;
  }
  if (WC_LIVE_ANGLE_RE.test(q) || isWcLiveDominanceQuestion(q)) return true;
  if (match && isWcLiveMatchStatus(match.status)) return true;
  const hs = Number(match?.homeScore);
  const as = Number(match?.awayScore);
  if (Number.isFinite(hs) && Number.isFinite(as) && hs + as > 0) return true;
  return false;
}

/** @type {Record<string, { home: { moneyline: string }, draw: { moneyline: string }, away: { moneyline: string }, provider?: string }>} */
const FIXTURE_ML_SEED = {
  "MEX|RSA": { home: { moneyline: "-240" }, draw: { moneyline: "+320" }, away: { moneyline: "+650" }, provider: "seed" },
  "CAN|QAT": { home: { moneyline: "-120" }, draw: { moneyline: "+260" }, away: { moneyline: "+340" }, provider: "seed" },
  "USA|PAR": { home: { moneyline: "+110" }, draw: { moneyline: "+240" }, away: { moneyline: "+285" }, provider: "seed" },
  "BRA|HAI": { home: { moneyline: "-450" }, draw: { moneyline: "+400" }, away: { moneyline: "+1200" }, provider: "seed" },
  "GER|CUW": { home: { moneyline: "-280" }, draw: { moneyline: "+340" }, away: { moneyline: "+700" }, provider: "seed" },
  "ENG|GHA": { home: { moneyline: "-165" }, draw: { moneyline: "+290" }, away: { moneyline: "+420" }, provider: "seed" },
  "FRA|SEN": { home: { moneyline: "-130" }, draw: { moneyline: "+270" }, away: { moneyline: "+350" }, provider: "seed" },
  "ARG|ALG": { home: { moneyline: "-200" }, draw: { moneyline: "+300" }, away: { moneyline: "+550" }, provider: "seed" },
};

/**
 * @param {string} home
 * @param {string} away
 */
function fixturePairKey(home, away) {
  const h = String(home || "").trim().toUpperCase();
  const a = String(away || "").trim().toUpperCase();
  return [h, a].sort().join("|");
}

/**
 * @param {string} home
 * @param {string} away
 */
export function getWcFixtureMlSeed(home, away) {
  const direct = FIXTURE_ML_SEED[`${String(home || "").toUpperCase()}|${String(away || "").toUpperCase()}`];
  if (direct) return direct;
  return FIXTURE_ML_SEED[fixturePairKey(home, away)] || null;
}

/**
 * @param {string} home
 * @param {string} away
 */
export function isWcPromoFixturePair(home, away) {
  const h = String(home || "").trim().toUpperCase();
  const a = String(away || "").trim().toUpperCase();
  return GROUP_STAGE_OPENERS.some(
    (fx) =>
      String(fx.homeTeam).toUpperCase() === h && String(fx.awayTeam).toUpperCase() === a,
  );
}

/**
 * @param {string} home
 * @param {string} away
 */
function findPromoFixture(home, away) {
  const h = String(home || "").trim().toUpperCase();
  const a = String(away || "").trim().toUpperCase();
  return (
    GROUP_STAGE_OPENERS.find(
      (fx) => String(fx.homeTeam).toUpperCase() === h && String(fx.awayTeam).toUpperCase() === a,
    ) || null
  );
}

/**
 * @param {string} homeOdds
 * @param {string} awayOdds
 * @param {string} home
 * @param {string} away
 */
function pickMlFavorite(homeOdds, awayOdds, home, away) {
  const homeN = Number.parseInt(String(homeOdds || "").replace(/[^\d+-]/g, ""), 10);
  const awayN = Number.parseInt(String(awayOdds || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(homeN) || !Number.isFinite(awayN)) {
    return { abbr: home, odds: homeOdds };
  }
  const homeImp = homeN < 0 ? -homeN / (-homeN + 100) : 100 / (homeN + 100);
  const awayImp = awayN < 0 ? -awayN / (-awayN + 100) : 100 / (awayN + 100);
  return homeImp >= awayImp
    ? { abbr: home, odds: homeOdds }
    : { abbr: away, odds: awayOdds };
}

function americanOddsImplied(odds) {
  const n = Number.parseInt(String(odds || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return 0;
  if (n < 0) return -n / (-n + 100);
  return 100 / (n + 100);
}

function formatGoalsLine(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "2.5";
  return Number.isInteger(v) ? String(v) : String(v).replace(/\.0$/, "");
}

/**
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {"over" | "under"} kind
 */
export function formatPostedTotalsLine(matchOdds, kind) {
  const totalLine =
    matchOdds?.totalLine != null && String(matchOdds.totalLine).trim() !== ""
      ? String(matchOdds.totalLine).trim()
      : "";
  if (!totalLine) return "";
  const sideOdds =
    kind === "under"
      ? readWcMatchMoneylineAmerican(matchOdds?.totalUnder)
      : readWcMatchMoneylineAmerican(matchOdds?.totalOver);
  const sideLabel = kind === "under" ? "under" : "over";
  if (!sideOdds) return `Posted ${totalLine} total.`;
  const implied = americanOddsImplied(sideOdds);
  const pct =
    implied > 0 ? ` (~${(implied * 100).toFixed(1)}% implied)` : "";
  return `Posted ${totalLine} total — ${sideLabel} ${sideOdds}${pct}.`;
}

function parseTotalsKindFromLean(lean) {
  const t = String(lean || "");
  if (/\bunder\b/i.test(t)) return "under";
  if (/\bover\b/i.test(t)) return "over";
  return null;
}

/**
 * Alternate totals lean from posted lines + favorite strength (not a blanket Under 2.5).
 * @param {{ home: string, away: string, homeMl: string, awayMl: string, matchOdds?: Record<string, unknown>, question?: string, passOnMlPrefix?: boolean }}
 */
/**
 * Asian handicap / spread lean from posted match odds (BDL GOAT).
 * @param {{ home: string, away: string, matchOdds?: Record<string, unknown> }}
 */
export function pickWcFixtureSpreadLean({ home, away, matchOdds }) {
  const homeAbbr = String(home || "").toUpperCase();
  const awayAbbr = String(away || "").toUpperCase();
  const homeName = wcMatchupTeamDisplayName(homeAbbr);
  const awayName = wcMatchupTeamDisplayName(awayAbbr);
  const lineRaw = matchOdds?.spreadHomeLine;
  const odds = readWcMatchMoneylineAmerican(matchOdds?.spreadHome);
  const line =
    lineRaw != null && String(lineRaw).trim() !== "" ? String(lineRaw).trim() : null;
  if (!line || !odds) {
    return {
      lean: `Watch handicap lines on ${homeName} vs ${awayName} when posted.`,
      headline: `Lines pending — ${homeName} vs ${awayName}`,
      bookLine: "",
    };
  }
  const lineNum = Number.parseFloat(line);
  const homeFav =
    Number.isFinite(lineNum) && lineNum < 0
      ? true
      : Number.isFinite(lineNum) && lineNum > 0
        ? false
        : (() => {
            const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
            const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
            const fav = pickMlFavorite(homeMl, awayMl, homeAbbr, awayAbbr);
            return fav.abbr === homeAbbr;
          })();
  const teamName = homeFav ? homeName : awayName;
  const signedLine =
    Number.isFinite(lineNum) && lineNum > 0 ? `+${line}` : line.replace(/^\+/, "");
  const headline = `Lean ${teamName} ${signedLine} (${odds})`;
  return {
    lean: headline,
    headline,
    bookLine: `${homeName} ${line} ${odds}`,
  };
}

export function pickWcFixtureTotalsAlternateLean(row) {
  const q = String(row.question || "");
  const hs = Number(row.homeScore);
  const as = Number(row.awayScore);
  const goalsScored =
    Number.isFinite(hs) && Number.isFinite(as) ? Math.max(0, hs + as) : null;
  const livePlay =
    row.isLive === true ||
    isWcLiveMatchStatus(row.status) ||
    (goalsScored != null && goalsScored > 0);

  if (livePlay && goalsScored != null && goalsScored >= 1) {
    const postedLine = row.matchOdds?.totalLine != null ? Number(row.matchOdds.totalLine) : null;
    const liveLine = Number.isFinite(postedLine)
      ? postedLine
      : goalsScored >= 3
        ? goalsScored + 0.5
        : 2.5;
    if (goalsScored >= 3) {
      const lineStr = formatGoalsLine(liveLine);
      const headline = `Lean Over ${lineStr} goals`;
      const scoreLabel = `${Number.isFinite(hs) ? hs : 0}-${Number.isFinite(as) ? as : 0}`;
      return {
        lean:
          row.passOnMlPrefix === false
            ? `${headline} — already ${scoreLabel} (${goalsScored} goals); Under 2.5 is dead.`
            : `Pass on ML — ${headline} — already ${scoreLabel}; Under 2.5 is dead.`,
        headline,
        kind: "over",
        line: lineStr,
      };
    }
    if (goalsScored >= 2) {
      const headline = "Lean Over 2.5 goals";
      return {
        lean:
          row.passOnMlPrefix === false
            ? `${headline} — ${goalsScored} goals already; Under 2.5 is dead.`
            : `Pass on ML — ${headline} — ${goalsScored} goals already; Under 2.5 is dead.`,
        headline,
        kind: "over",
        line: "2.5",
      };
    }
  }

  const userOu =
    q.match(/\b(under|over)\s+(\d+\.?\d*)(?:\s+goals?)?\b/i) ||
    q.match(/\bthoughts?\s+(?:on\s+)?(?:the\s+)?(over|under)\s+(\d+\.?\d*)\b/i);
  if (userOu) {
    const side = userOu[1].toLowerCase();
    const lineNum = userOu[2];
    const headline = `Lean ${side === "over" ? "Over" : "Under"} ${lineNum} goals`;
    return {
      lean: row.passOnMlPrefix === false ? `${headline}.` : `Pass on ML — ${headline} — cleaner angle than the ML.`,
      headline,
      kind: userOu[1].toLowerCase() === "over" ? "over" : "under",
      line: lineNum,
    };
  }

  const fav = pickMlFavorite(row.homeMl, row.awayMl, row.home, row.away);
  const favImp = americanOddsImplied(fav.odds);
  const favAm = Number.parseInt(String(fav.odds || "").replace(/[^\d+-]/g, ""), 10);
  const postedLine = row.matchOdds?.totalLine != null ? Number(row.matchOdds.totalLine) : null;
  const line = Number.isFinite(postedLine)
    ? postedLine
    : favImp >= 0.85 || favAm <= -800
      ? 4.5
      : favImp >= 0.72 || favAm <= -250
        ? 3.5
        : 2.5;
  const lineStr = formatGoalsLine(line);

  const overOdds = readWcMatchMoneylineAmerican(row.matchOdds?.totalOver);
  const underOdds = readWcMatchMoneylineAmerican(row.matchOdds?.totalUnder);
  const overImp = overOdds ? americanOddsImplied(overOdds) : null;
  const underImp = underOdds ? americanOddsImplied(underOdds) : null;
  if (overImp != null && underImp != null && Math.abs(overImp - underImp) >= 0.03) {
    const bookPrefersOver = overImp > underImp;
    const headline = bookPrefersOver
      ? `Lean Over ${lineStr} goals`
      : `Lean Under ${lineStr} goals`;
    return {
      lean:
        row.passOnMlPrefix === false
          ? `${headline}.`
          : `Pass on ML — ${headline} — cleaner angle than the ML.`,
      headline,
      kind: bookPrefersOver ? "over" : "under",
      line: lineStr,
      favAbbr: fav.abbr,
    };
  }

  const heavyMismatch = favImp >= 0.82 || favAm <= -800;
  if (heavyMismatch) {
    const headline = `Lean Over ${lineStr} goals`;
    return {
      lean:
        row.passOnMlPrefix === false
          ? `${headline}.`
          : `Pass on ML — ${headline} — cleaner angle than the ML.`,
      headline,
      kind: "over",
      line: lineStr,
      favAbbr: fav.abbr,
    };
  }

  const headline = `Lean Under ${lineStr} goals`;
  return {
    lean:
      row.passOnMlPrefix === false
        ? `${headline}.`
        : `Pass on ML — ${headline} — cleaner angle than the ML.`,
    headline,
    kind: "under",
    line: lineStr,
    favAbbr: fav.abbr,
  };
}

/**
 * Repeat "best bet / moneyline" follow-ups in the same thread — keep prebuilt (avoid LLM flip-flop).
 * @param {string} question
 */
export function isWcMoneylineBestBetQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (/\bgroup context\b/i.test(q)) return false;
  return (
    /\b(best bet|only know the moneyline)\b/i.test(q) &&
    (/\b(vs\.?|versus)\b/i.test(q) || isWcMatchWinnerQuestion(q))
  );
}

/**
 * @param {string} question
 * @param {string} [wcIntent]
 * @param {{ isConversationFollowUp?: boolean, wcRunnerUpFollowUpQuestion?: boolean, mentionedTeams?: string[], wcEventId?: string | null, hasKvFixture?: boolean, history?: Array<unknown> }} [opts]
 */
export function shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt(question, wcIntent, opts = {}) {
  if (!opts.isConversationFollowUp || opts.wcRunnerUpFollowUpQuestion) return false;
  if (isWcNonFixtureMatchupQuestion(question)) return false;
  if (isWcPlayerMarketIntent(wcIntent)) return false;
  if (shouldUseWcCrossGroupValuePrebuilt(question, wcIntent)) return false;
  if (shouldUseWcGroupSlatePrebuilt(question, wcIntent)) return false;
  if (isWcMatchupAltMarketFollowUp(question)) return false;
  if (!isWcMoneylineBestBetQuestion(question) && !isWcMatchWinnerQuestion(question)) return false;

  const pair =
    resolveWcFixturePairFromQuestion(question, {
      mentionedTeams: opts.mentionedTeams,
      wcEventId: opts.wcEventId,
    }) || resolveWcFixturePairFromHistory(opts.history);
  if (!pair?.home || !pair?.away) return false;
  if (opts.wcEventId || opts.hasKvFixture) return true;
  const historyPair = resolveWcFixturePairFromHistory(opts.history);
  if (
    historyPair?.home === pair.home &&
    historyPair?.away === pair.away &&
    historyPair?.eventId
  ) {
    return true;
  }
  return isWcPromoFixturePair(pair.home, pair.away);
}

/**
 * @param {{
 *   question: string,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 * }} [opts]
 * @returns {{ home: string, away: string, group: string, eventId: string | null } | null}
 */
export function resolveWcFixturePairFromQuestion(question, opts = {}) {
  const mentioned = Array.isArray(opts.mentionedTeams)
    ? opts.mentionedTeams.map((t) => String(t).toUpperCase())
    : extractMentionedWcTeams(String(question || "")).map((t) => String(t).toUpperCase());

  const parsed = parseWcMatchupTeamsFromQuestion(question);
  let home = parsed.home;
  let away = parsed.away;
  let group = parsed.group;
  let eventId = opts.wcEventId ? String(opts.wcEventId).trim() : null;

  if ((!home || !away) && mentioned.length >= 2) {
    const promoHit = GROUP_STAGE_OPENERS.find(
      (fx) =>
        mentioned.includes(String(fx.homeTeam).toUpperCase()) &&
        mentioned.includes(String(fx.awayTeam).toUpperCase()),
    );
    if (promoHit) {
      home = String(promoHit.homeTeam).toUpperCase();
      away = String(promoHit.awayTeam).toUpperCase();
      group = String(promoHit.group || group || "").toUpperCase();
      eventId = eventId || String(promoHit.id || "");
    } else {
      home = mentioned[0];
      away = mentioned[1];
    }
  }

  if (!home || !away) return null;

  const promo = findPromoFixture(home, away);
  if (promo) {
    return {
      home: String(promo.homeTeam).toUpperCase(),
      away: String(promo.awayTeam).toUpperCase(),
      group: String(promo.group || group || "").toUpperCase(),
      eventId: eventId || String(promo.id || "") || null,
    };
  }

  return {
    home: String(home).toUpperCase(),
    away: String(away).toUpperCase(),
    group: String(group || "").toUpperCase(),
    eventId: eventId || null,
  };
}

/**
 * @param {Array<{ content?: string, text?: string, question?: string, userQuestion?: string, structured?: object, wcMatchTeams?: { home?: string, away?: string }, wcEventId?: string }>} [history]
 * @returns {{ home: string, away: string, group: string, eventId: string | null } | null}
 */
export function resolveWcFixturePairFromHistory(history = []) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    const text = String(
      turn?.content || turn?.text || turn?.userQuestion || turn?.question || "",
    ).trim();
    if (text) {
      const pair = resolveWcFixturePairFromQuestion(text, {});
      if (pair?.home && pair?.away) return pair;
    }
    const s = turn?.structured;
    if (s?.fixtureHome && s?.fixtureAway) {
      return {
        home: String(s.fixtureHome).toUpperCase(),
        away: String(s.fixtureAway).toUpperCase(),
        group: String(s.groupLetter || "").toUpperCase(),
        eventId:
          turn?.wcEventId != null
            ? String(turn.wcEventId)
            : s?.wcEventId != null
              ? String(s.wcEventId)
              : null,
      };
    }
    if (turn?.wcMatchTeams?.home && turn?.wcMatchTeams?.away) {
      const pair = resolveWcFixturePairFromQuestion(
        `${turn.wcMatchTeams.home} vs ${turn.wcMatchTeams.away}`,
        {},
      );
      if (pair?.home && pair?.away) return pair;
    }
  }
  return null;
}

/**
 * @param {Array<{ role?: string, structured?: object }>} [history]
 */
export function getLastAssistantStructuredFromHistory(history = []) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role === "assistant" && turn?.structured && typeof turn.structured === "object") {
      return turn.structured;
    }
  }
  return null;
}

/**
 * True when the next card would repeat the prior assistant lean/call verbatim (follow-up UX bug).
 * @param {object | null | undefined} structured
 * @param {Array<{ role?: string, structured?: object }>} [history]
 */
export function isDuplicateWcStructuredCard(structured, history = []) {
  const prior = getLastAssistantStructuredFromHistory(history);
  if (!prior || !structured || typeof structured !== "object") return false;
  const normalize = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const priorKey = normalize(prior.lean || prior.call);
  const nextKey = normalize(structured.lean || structured.call);
  return priorKey.length >= 12 && priorKey === nextKey;
}

/**
 * @param {string} question
 * @param {string} [wcIntent]
 * @param {{
 *   isConversationFollowUp?: boolean,
 *   wcRunnerUpFollowUpQuestion?: boolean,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   hasKvFixture?: boolean,
 *   history?: Array<unknown>,
 * }} [opts]
 */
export function shouldUseWcFixtureMatchupAltFollowUpPrebuilt(question, wcIntent, opts = {}) {
  if (isWcNonFixtureMatchupQuestion(question)) return false;
  if (isWcMatchProbabilityQuestion(question)) return false;
  if (isWcPlayerMarketIntent(wcIntent)) return false;
  if (isWcFixturePrebuiltBlockedForLivePlay(question, opts.match)) return false;
  if (!opts.isConversationFollowUp) return false;
  if (opts.wcRunnerUpFollowUpQuestion) return false;
  if (shouldUseWcCrossGroupValuePrebuilt(question, wcIntent)) return false;
  if (shouldUseWcGroupSlatePrebuilt(question, wcIntent)) return false;
  if (!isWcMatchupAltMarketFollowUp(question)) return false;
  if (shouldBlockMatchupAltPrebuiltAfterPlayerPivot(question, opts.history)) return false;
  if (isWcTotalsExplainFollowUp(question) && !extractPriorTotalsLeanFromHistory(opts.history)) {
    return false;
  }

  const pair =
    resolveWcFixturePairFromQuestion(question, {
      mentionedTeams: opts.mentionedTeams,
      wcEventId: opts.wcEventId,
    }) || resolveWcFixturePairFromHistory(opts.history);

  if (!pair?.home || !pair?.away) return false;
  if (opts.wcEventId || opts.hasKvFixture) return true;
  const fromHistory = resolveWcFixturePairFromHistory(opts.history);
  if (fromHistory?.home === pair.home && fromHistory?.away === pair.away) return true;
  return isWcPromoFixturePair(pair.home, pair.away);
}

/**
 * @param {string} question
 * @param {{
 *   isConversationFollowUp?: boolean,
 *   history?: Array<unknown>,
 *   wcEventId?: string | null,
 * }} [opts]
 */
export function shouldUseWcLiveBetTimingPrebuilt(question, opts = {}) {
  if (!opts.isConversationFollowUp) return false;
  if (!isWcLiveBetTimingQuestion(question)) return false;
  const pair = resolveWcFixturePairFromHistory(opts.history);
  if (!pair?.home || !pair?.away) return false;
  if (!extractPriorTotalsLeanFromHistory(opts.history)) return false;
  return true;
}

/**
 * @param {{
 *   home: string,
 *   away: string,
 *   group?: string,
 *   question?: string,
 *   match?: Record<string, unknown>,
 *   history?: Array<unknown>,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 * }} opts
 */
export function buildWcLiveBetTimingPrebuiltStructured(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const question = String(opts.question || "").trim();
  const prior = extractPriorTotalsLeanFromHistory(opts.history);
  if (!home || !away || !prior?.line) return null;

  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
  const parsed = parseLiveScoreFromQuestion(question);
  const hs = parsed?.home ?? Number(opts.match?.homeScore);
  const as = parsed?.away ?? Number(opts.match?.awayScore);
  const goals =
    Number.isFinite(hs) && Number.isFinite(as) ? Math.max(0, hs + as) : null;
  const secondHalf = /\b(?:second|2nd)\s+half\b/i.test(question);
  const side = prior.kind;
  const line = prior.line;
  const lineNum = Number(line);
  const headline =
    side === "over"
      ? `Lean Over ${line} goals — lock live now`
      : `Lean Under ${line} goals — lock live now`;

  let whyNow = "";
  if (side === "over") {
    const need = Number.isFinite(lineNum) ? Math.max(0, Math.ceil(lineNum - (goals ?? 0))) : null;
    if (goals === 0 && secondHalf) {
      whyNow = `0-0 at second-half kickoff — ${homeName} already had the volume; first goal usually shortens Over ${line} before you lock this price.`;
    } else if (need != null && need <= 1) {
      whyNow = `One more goal cashes Over ${line} — live now beats waiting if ${homeName} scores next.`;
    } else if (need != null) {
      whyNow = `Need ${need} more goals — lock live while ${homeName}'s chances still match the posted Over ${line}.`;
    } else {
      whyNow = `Stay on Over ${line} — live price beats waiting if ${homeName} breaks through first.`;
    }
  } else if (goals != null && goals >= 3) {
    whyNow = `${hs}-${as} — Under ${line} is dead; re-ask for a live alt line.`;
  } else if (goals === 0 && secondHalf) {
    whyNow = `Still 0-0 into the second half — Under ${line} tightens after every goal; lock before ${homeName} breaks through.`;
  } else if (goals != null) {
    whyNow = `${hs}-${as} live — protect Under ${line} while ${awayName} keeps the scoreboard tight.`;
  } else {
    whyNow = `Lock Under ${line} live while the scoreboard still cooperates — waiting for a ${homeName} goal shortens the price.`;
  }

  return {
    sport: "worldcup",
    callType: "matchup",
    groupLetter: String(opts.group || opts.match?.group || "").trim().toUpperCase() || undefined,
    fixtureHome: home,
    fixtureAway: away,
    lean: headline.slice(0, 120),
    call: headline.slice(0, 100),
    line: "",
    deep: "",
    breakdownAvailable: false,
    whyNow: whyNow,
    edge: `Timing play on prior Over/Under ${line} lean — not a new market.`,
    modelAttribution: wcModelAttributionFooter(opts.simLastUpdated, opts.nowMs),
    confidence: "Medium",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown> | null | undefined} match */
export function isWcLiveFixtureForMatchWinner(match) {
  if (!match || typeof match !== "object") return false;
  if (isWcLiveMatchStatus(match.status)) return true;
  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  return Number.isFinite(hs) && Number.isFinite(as) && hs + as > 0;
}

/**
 * Live in-play "who wins" / vs — match ML only (never group-advance futures).
 * @param {string} question
 * @param {string} [wcIntent]
 * @param {{
 *   isConversationFollowUp?: boolean,
 *   wcRunnerUpFollowUpQuestion?: boolean,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   hasKvFixture?: boolean,
 *   match?: Record<string, unknown> | null,
 *   history?: Array<unknown>,
 * }} [opts]
 */
export function shouldUseWcLiveMatchWinnerPrebuilt(question, wcIntent, opts = {}) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (opts.wcRunnerUpFollowUpQuestion) return false;
  if (WC_LIVE_ANGLE_RE.test(q) || isWcLiveDominanceQuestion(q)) return false;
  if (isWcLiveBetTimingQuestion(q)) return false;
  if (isWcMatchupAltMarketFollowUp(q)) return false;
  if (isWcMatchProbabilityQuestion(q)) return false;
  if (detectParlayIntent(q) || detectWcSgpComboIntent(q)) return false;
  if (isWcPlayerMarketIntent(wcIntent)) return false;
  if (shouldUseWcCrossGroupValuePrebuilt(q, wcIntent)) return false;
  if (shouldUseWcGroupSlatePrebuilt(q, wcIntent)) return false;
  if (
    isWcAdvancementMarketQuestion(q) &&
    !/\b(vs\.?|versus|who wins|match winner|moneyline)\b/i.test(q)
  ) {
    return false;
  }
  if (!isWcMatchWinnerQuestion(q) && !isWcMoneylineBestBetQuestion(q)) return false;

  const pair =
    resolveWcFixturePairFromQuestion(q, {
      mentionedTeams: opts.mentionedTeams,
      wcEventId: opts.wcEventId,
    }) || (opts.isConversationFollowUp ? resolveWcFixturePairFromHistory(opts.history) : null);
  if (!pair?.home || !pair?.away) return false;
  if (opts.match && !isWcLiveFixtureForMatchWinner(opts.match)) return false;
  if (opts.wcEventId || opts.hasKvFixture) return true;
  return isWcPromoFixturePair(pair.home, pair.away);
}

/**
 * @param {{
 *   home: string,
 *   away: string,
 *   homeMl: string,
 *   awayMl: string,
 *   homeScore?: number | null,
 *   awayScore?: number | null,
 *   minute?: number | string | null,
 * }} row
 */
export function pickWcLiveMatchWinnerCall(row) {
  const home = String(row.home || "").trim().toUpperCase();
  const away = String(row.away || "").trim().toUpperCase();
  const homeMl = String(row.homeMl || "").trim();
  const awayMl = String(row.awayMl || "").trim();
  const hs = Number(row.homeScore);
  const as = Number(row.awayScore);

  if (Number.isFinite(hs) && Number.isFinite(as) && hs !== as) {
    const leader =
      hs > as
        ? { abbr: home, odds: homeMl, name: wcMatchupTeamDisplayName(home) }
        : { abbr: away, odds: awayMl, name: wcMatchupTeamDisplayName(away) };
    if (leader.odds) return `${leader.name} ${leader.odds} to win`;
  }

  const fav = pickMlFavorite(homeMl, awayMl, home, away);
  return `${wcMatchupTeamDisplayName(fav.abbr)} ${fav.odds} to win`;
}

/**
 * @param {{
 *   homeName: string,
 *   awayName: string,
 *   homeScore?: number | null,
 *   awayScore?: number | null,
 *   minute?: number | string | null,
 *   liveChanceQuality?: Record<string, unknown> | null,
 * }} row
 */
export function buildWcLiveMatchWinnerWhyNow(row) {
  const hs = Number(row.homeScore);
  const as = Number(row.awayScore);
  const minute =
    row.minute != null && String(row.minute).trim() !== "" ? String(row.minute).trim() : null;
  const minSuffix = minute ? ` after ${minute}${String(minute).includes("'") ? "" : "'"} minutes` : " live";
  const cq = row.liveChanceQuality;
  const homeIdx = cq?.team?.home?.chanceIndex;
  const awayIdx = cq?.team?.away?.chanceIndex;
  const chanceBit =
    homeIdx != null && awayIdx != null
      ? ` Chance index ${row.homeName} ${homeIdx} · ${row.awayName} ${awayIdx}.`
      : "";

  if (Number.isFinite(hs) && Number.isFinite(as)) {
    if (hs === as) {
      return `${row.homeName} and ${row.awayName} are level ${hs}-${as}${minSuffix} — this is a match-winner lean, not a group-advance futures play.${chanceBit}`;
    }
    const leader = hs > as ? row.homeName : row.awayName;
    const trailer = hs > as ? row.awayName : row.homeName;
    return `${leader} leads ${Math.max(hs, as)}-${Math.min(hs, as)}${minSuffix}; ${trailer} needs a goal to flip the script.${chanceBit}`;
  }
  return `Match is live — lean from the posted moneyline for this fixture, not group-stage futures.${chanceBit}`;
}

/**
 * @param {{
 *   home: string,
 *   away: string,
 *   group?: string,
 *   question?: string,
 *   match?: Record<string, unknown> | null,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 * }} opts
 */
export function buildWcLiveMatchWinnerPrebuiltStructured(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const match = opts.match && typeof opts.match === "object" ? opts.match : null;
  if (!home || !away || !match || !isWcLiveFixtureForMatchWinner(match)) return null;

  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
  const seedOdds = getWcFixtureMlSeed(home, away);
  const matchOdds =
    match.odds && typeof match.odds === "object" ? match.odds : seedOdds;
  const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
  if (!homeMl || !awayMl) return null;

  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  const call = pickWcLiveMatchWinnerCall({
    home,
    away,
    homeMl,
    awayMl,
    homeScore: hs,
    awayScore: as,
    minute: match.minute,
  });
  const whyNow = buildWcLiveMatchWinnerWhyNow({
    homeName,
    awayName,
    homeScore: hs,
    awayScore: as,
    minute: match.minute,
  });
  const scoreLine =
    Number.isFinite(hs) && Number.isFinite(as) ? `${hs}-${as}` : "live";
  const deep = `Live match winner only — score ${scoreLine}. Group-advance futures and "both teams advance" are a different market.`;

  return {
    sport: "worldcup",
    callType: "matchup",
    groupLetter: String(opts.group || match.group || "").trim().toUpperCase() || undefined,
    fixtureHome: home,
    fixtureAway: away,
    lean: call.slice(0, 120),
    call: call.slice(0, 100),
    line: "",
    deep,
    breakdownAvailable: true,
    breakdownDefaultExpanded: false,
    whyNow,
    edge: "Watch for red cards or VAR — live ML moves fast after either.",
    modelAttribution: wcModelAttributionFooter(opts.simLastUpdated, opts.nowMs),
    confidence: "Medium",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}

function matchPlayerPropOddsRank(odds) {
  const raw = String(odds || "").trim().replace(/^\+/, "");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 999999;
  if (String(odds).startsWith("-")) return n;
  return n;
}

/**
 * @param {string} teamAbbr
 * @param {string} teamName
 * @param {Record<string, unknown> | null | undefined} playerProps
 * @param {Record<string, unknown> | null | undefined} liveChanceQuality
 */
function pickWcLiveNamedScorerBet(teamAbbr, teamName, playerProps, liveChanceQuality) {
  const abbr = String(teamAbbr || "").toUpperCase();
  const propRows = matchPlayerPropRowsFromEvent(playerProps, "anytime_scorer", 40).filter(
    (r) => String(r.nationAbbr || "").toUpperCase() === abbr,
  );

  const chanceTop = (liveChanceQuality?.players || [])
    .filter((p) => String(p.nationAbbr || "").toUpperCase() === abbr)
    .sort((a, b) => Number(b.chanceIndex) - Number(a.chanceIndex))[0];

  let name = chanceTop?.name ? String(chanceTop.name).trim() : "";
  let odds = null;

  if (name && propRows.length) {
    const hit = propRows.find(
      (r) => normalizeWcPlayerName(r.name) === normalizeWcPlayerName(name),
    );
    odds = hit?.americanOdds || null;
  }

  if (!odds && propRows.length) {
    const fav = [...propRows].sort(
      (a, b) =>
        matchPlayerPropOddsRank(a.americanOdds) - matchPlayerPropOddsRank(b.americanOdds),
    )[0];
    if (fav) {
      name = String(fav.name || name || "").trim();
      odds = fav.americanOdds || null;
    }
  }

  if (name && odds) {
    return {
      headline: `${name} anytime scorer ${odds}`,
      why: `${teamName} needs goals — ${name} is the live chance-index lead with a posted anytime price.`,
    };
  }

  return {
    headline: `${teamName} anytime scorer live`,
    why: `${teamName} is the side chasing — back their best live finisher if they push numbers up.`,
  };
}

/**
 * @param {{
 *   home: string,
 *   away: string,
 *   homeMl: string,
 *   awayMl: string,
 *   homeScore: number,
 *   awayScore: number,
 *   matchOdds?: Record<string, unknown>,
 *   secondHalf?: boolean,
 *   playerProps?: Record<string, unknown> | null,
 *   liveChanceQuality?: Record<string, unknown> | null,
 * }} row
 */
function pickWcLiveSecondBet(row) {
  const home = String(row.home || "").trim().toUpperCase();
  const away = String(row.away || "").trim().toUpperCase();
  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
  const hs = Number(row.homeScore);
  const as = Number(row.awayScore);
  const total = Math.max(0, hs + as);
  const totalLineRaw = row.matchOdds?.totalLine;
  const totalLine = Number.parseFloat(String(totalLineRaw ?? "2.5")) || 2.5;
  const lineLabel = formatGoalsLine(totalLine);
  const secondHalf = Boolean(row.secondHalf);

  if (hs === as) {
    const need = Math.max(0, Math.ceil(totalLine - total));
    if (need <= 1 && secondHalf) {
      return {
        headline: `Over ${lineLabel} goals live`,
        why: `${hs}-${as}${secondHalf ? " in the second half" : ""} — one goal cashes Over ${lineLabel}; both sides can still open up.`,
      };
    }
    return {
      headline: `Over ${formatGoalsLine(Math.max(1.5, totalLine - 0.5))} goals live`,
      why: `Level ${hs}-${as} — next goal swings the match and the total market.`,
    };
  }

  const leaderAbbr = hs > as ? home : away;
  const trailerAbbr = hs > as ? away : home;
  const leaderName = hs > as ? homeName : awayName;
  const trailerName = hs > as ? awayName : homeName;

  if (total >= totalLine) {
    const nextLine = totalLine <= 2.5 ? 3.5 : Math.ceil(totalLine + 0.5);
    if (total < nextLine) {
      return {
        headline: `Over ${formatGoalsLine(nextLine)} goals live`,
        why: `${hs}-${as} — one more goal cashes Over ${formatGoalsLine(nextLine)}; ${trailerName} chasing keeps tempo up.`,
      };
    }
    return pickWcLiveNamedScorerBet(
      trailerAbbr,
      trailerName,
      row.playerProps,
      row.liveChanceQuality,
    );
  }

  const needForOver = Math.ceil(totalLine - total);
  if (needForOver === 1) {
    return {
      headline: `Over ${lineLabel} goals live`,
      why: `${hs}-${as} — one goal cashes Over ${lineLabel}; ${trailerName} has to chase if they want back in.`,
    };
  }

  return {
    headline: `Under ${lineLabel} goals live`,
    why: `${hs}-${as} — still onside for Under ${lineLabel} if ${leaderName} manages the lead.`,
  };
}

/**
 * @param {string} question
 * @param {{
 *   isConversationFollowUp?: boolean,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   hasKvFixture?: boolean,
 *   match?: Record<string, unknown> | null,
 *   history?: Array<unknown>,
 * }} [opts]
 */
export function shouldUseWcLiveInPlayBetsPrebuilt(question, opts = {}) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isWcLiveBetTimingQuestion(q)) return false;
  if (!isWcLiveBetsQuestion(q) && !WC_LIVE_ANGLE_RE.test(q)) return false;

  const pair =
    resolveWcFixturePairFromQuestion(q, {
      mentionedTeams: opts.mentionedTeams,
      wcEventId: opts.wcEventId,
    }) || (opts.isConversationFollowUp ? resolveWcFixturePairFromHistory(opts.history) : null);
  if (!pair?.home || !pair?.away) return false;

  const match = opts.match;
  const parsedScore = parseLiveScoreFromQuestion(q);
  const isLiveAngleAsk = WC_LIVE_ANGLE_RE.test(q);
  const hasNamedFixturePair = Boolean(pair?.home && pair?.away);
  const hasLiveSignal =
    (match && isWcLiveFixtureForMatchWinner(match)) ||
    parsedScore != null ||
    isWcSecondHalfContext(q) ||
    (isLiveAngleAsk && hasNamedFixturePair);
  if (!hasLiveSignal) return false;

  if (opts.wcEventId || opts.hasKvFixture) return true;
  if (match && isWcLiveFixtureForMatchWinner(match)) return true;
  if (isLiveAngleAsk && hasNamedFixturePair) return true;
  if (opts.isConversationFollowUp && resolveWcFixturePairFromHistory(opts.history)) return true;
  return isWcPromoFixturePair(pair.home, pair.away);
}

/**
 * Two actionable live leans — ML + total or scorer (no LLM Pass).
 * @param {{
 *   home: string,
 *   away: string,
 *   group?: string,
 *   question?: string,
 *   match?: Record<string, unknown> | null,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 *   liveChanceQuality?: Record<string, unknown> | null,
 *   playerProps?: Record<string, unknown> | null,
 *   eventId?: string | null,
 * }} opts
 */
export function buildWcLiveInPlayBetsPrebuiltStructured(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const question = String(opts.question || "").trim();
  const match = opts.match && typeof opts.match === "object" ? opts.match : null;
  if (!home || !away || !match) return null;

  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
  const seedOdds = getWcFixtureMlSeed(home, away);
  const matchOdds =
    match.odds && typeof match.odds === "object" ? match.odds : seedOdds;
  const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
  if (!homeMl || !awayMl) return null;

  const parsed = parseLiveScoreFromQuestion(question);
  let hs = Number(match.homeScore);
  let as = Number(match.awayScore);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) {
    if (parsed) {
      hs = parsed.home;
      as = parsed.away;
    }
  }
  if (!Number.isFinite(hs) || !Number.isFinite(as)) {
    hs = 0;
    as = 0;
  }

  const secondHalf = isWcSecondHalfContext(question) || /2h|second/i.test(String(match.status || ""));
  const mlCall = pickWcLiveMatchWinnerCall({
    home,
    away,
    homeMl,
    awayMl,
    homeScore: hs,
    awayScore: as,
    minute: match.minute,
  });
  const second = pickWcLiveSecondBet({
    home,
    away,
    homeMl,
    awayMl,
    homeScore: hs,
    awayScore: as,
    matchOdds,
    secondHalf,
    playerProps: opts.playerProps,
    liveChanceQuality: opts.liveChanceQuality,
  });

  const scoreLine = `${hs}-${as}`;
  const call = `${mlCall} · ${second.headline}`.slice(0, 100);
  const lean = `2 live leans at ${scoreLine}: ${mlCall.split(" to win")[0]} + ${second.headline.replace(/\s+live$/i, "")}`.slice(
    0,
    120,
  );
  const whyNow = buildWcLiveMatchWinnerWhyNow({
    homeName,
    awayName,
    homeScore: hs,
    awayScore: as,
    minute: match.minute,
    liveChanceQuality: opts.liveChanceQuality,
  });
  const deep = [
    `Bet 1: ${mlCall}`,
    buildWcLiveMatchWinnerWhyNow({
      homeName,
      awayName,
      homeScore: hs,
      awayScore: as,
      minute: match.minute,
      liveChanceQuality: opts.liveChanceQuality,
    }),
    "",
    `Bet 2: ${second.headline}`,
    second.why,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 3600);

  const gameStateLine = formatWcLiveGameStateLine(match, home, away);
  const eventId =
    opts.eventId != null
      ? String(opts.eventId)
      : match.id != null
        ? String(match.id)
        : null;

  return {
    sport: "worldcup",
    callType: "matchup",
    groupLetter: String(opts.group || match.group || "").trim().toUpperCase() || undefined,
    fixtureHome: home,
    fixtureAway: away,
    lean,
    call,
    line: formatPostedTotalsLine(matchOdds, /over/i.test(second.headline) ? "over" : "under") || "",
    deep,
    breakdownAvailable: true,
    breakdownDefaultExpanded: true,
    whyNow,
    edge: "Live lines move on every goal — lock before the next VAR check or red card.",
    modelAttribution: wcModelAttributionFooter(opts.simLastUpdated, opts.nowMs),
    confidence: "Medium",
    caveats: [],
    timestamp: new Date().toISOString(),
    ...(gameStateLine ? { gameStateLine, liveScore: gameStateLine } : {}),
    ...(eventId ? { wcEventId: eventId } : {}),
  };
}

/**
 * @param {string} question
 * @param {string} [wcIntent]
 * @param {{
 *   isConversationFollowUp?: boolean,
 *   wcRunnerUpFollowUpQuestion?: boolean,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   hasKvFixture?: boolean,
 * }} [opts]
 */
export function shouldUseWcFixtureMatchupPrebuilt(question, wcIntent, opts = {}) {
  if (isWcNonFixtureMatchupQuestion(question)) return false;
  if (isWcMatchProbabilityQuestion(question)) return false;
  if (isWcFixturePrebuiltBlockedForLivePlay(question, opts.match)) return false;
  if (opts.isConversationFollowUp || opts.wcRunnerUpFollowUpQuestion) return false;
  if (isWcPlayerMarketIntent(wcIntent)) return false;
  if (shouldUseWcCrossGroupValuePrebuilt(question, wcIntent)) return false;
  if (shouldUseWcGroupSlatePrebuilt(question, wcIntent)) return false;

  const matchupIntent =
    wcIntent === WC_INTENT.MATCHUP ||
    wcIntent === WC_INTENT.SCORE_PREDICTION ||
    (isWcMatchWinnerQuestion(question) &&
      (!wcIntent || wcIntent === WC_INTENT.UNCLASSIFIED || wcIntent === WC_INTENT.GENERAL));
  if (!matchupIntent) return false;

  if (
    isWcAdvancementMarketQuestion(question) &&
    !/\b(vs\.?|versus|who wins|match winner|moneyline)\b/i.test(question)
  ) {
    return false;
  }

  const pair = resolveWcFixturePairFromQuestion(question, {
    mentionedTeams: opts.mentionedTeams,
    wcEventId: opts.wcEventId,
  });
  if (!pair?.home || !pair?.away) return false;

  if (opts.wcEventId || opts.hasKvFixture) return true;
  return isWcPromoFixturePair(pair.home, pair.away);
}

/**
 * @param {{
 *   question: string,
 *   home: string,
 *   away: string,
 *   group?: string,
 *   homeStats?: { advancePct?: number },
 *   awayStats?: { advancePct?: number },
 * }} row
 */
function wcBothAdvanceLean(groupClause, teamStats, home, away, group) {
  const assessment = assessWcBothTeamsAdvanceFixture({
    home,
    away,
    group,
    teamStats,
  });
  if (!assessment.ok) return "";
  return `Pass on ML — lean both teams to advance${groupClause}.`;
}

function pickWcFixturePrebuiltLean(row) {
  const { question, home, away, group, homeStats, awayStats, teamStats: fullTeamStats, matchOdds } = row;
  const q = String(question || "");
  const groupClause = group ? ` in Group ${group}` : "";
  const teamStats = fullTeamStats || {
    [home]: homeStats,
    [away]: awayStats,
  };

  const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
  const seedOdds = getWcFixtureMlSeed(home, away);
  const resolvedHomeMl = homeMl || readWcMatchMoneylineAmerican(seedOdds?.home);
  const resolvedAwayMl = awayMl || readWcMatchMoneylineAmerican(seedOdds?.away);

  const totalsRow = {
    home,
    away,
    homeMl: resolvedHomeMl,
    awayMl: resolvedAwayMl,
    matchOdds,
    question: q,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    status: row.status,
    isLive: row.isLive,
  };

  if (isWcMoneylineBestBetQuestion(q)) {
    if (resolvedHomeMl && resolvedAwayMl) {
      return pickWcFixtureTotalsAlternateLean(totalsRow).lean;
    }
  }

  if (
    /\b(best bet|group context|moneyline.*group|both teams to advance|both advance)\b/i.test(q) &&
    !/\b(vs\.?|versus)\b/i.test(q)
  ) {
    const bothLean = wcBothAdvanceLean(groupClause, teamStats, home, away, group);
    if (bothLean) return bothLean;
    if (resolvedHomeMl && resolvedAwayMl) {
      return pickWcFixtureTotalsAlternateLean(totalsRow).lean;
    }
  }

  if (/\bwho wins\b/i.test(q) && !/\bgroup context\b/i.test(q)) {
    if (resolvedHomeMl && resolvedAwayMl) {
      const fav = pickMlFavorite(resolvedHomeMl, resolvedAwayMl, home, away);
      return `${wcMatchupTeamDisplayName(fav.abbr)} ${fav.odds} to win`;
    }
  }

  if (
    (isWcMatchWinnerQuestion(q) && !/\bwho wins\b/i.test(q) && !/\bgroup context\b/i.test(q)) ||
    (/\b(best bet|only know the moneyline)\b/i.test(q) && !/\bgroup context\b/i.test(q))
  ) {
    if (resolvedHomeMl && resolvedAwayMl) {
      return pickWcFixtureTotalsAlternateLean(totalsRow).lean;
    }
  }

  const homeAdv = Number(homeStats?.advancePct);
  const awayAdv = Number(awayStats?.advancePct);
  if (Number.isFinite(homeAdv) && Number.isFinite(awayAdv) && homeAdv > 45 && awayAdv > 45) {
    const bothLean = wcBothAdvanceLean(groupClause, teamStats, home, away, group);
    if (bothLean) return bothLean;
  }

  if (resolvedHomeMl && resolvedAwayMl) {
    return pickWcFixtureTotalsAlternateLean(totalsRow).lean;
  }

  return "Pass on ML — lean both teams to advance — cleaner angle than the ML.";
}

function formatTotalsLeanHeadline(kind, line) {
  const side = String(kind || "").toLowerCase() === "over" ? "Over" : "Under";
  return `Lean ${side} ${formatGoalsLine(line)} goals`;
}

/**
 * @param {Array<{ role?: string, content?: string, text?: string, structured?: { call?: string, lean?: string } }>} [history]
 * @returns {{ kind: "over" | "under", line: string } | null}
 */
export function extractPriorTotalsLeanFromHistory(history = []) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn?.role !== "assistant" && turn?.role !== "ai") continue;
    const blob = [turn?.structured?.call, turn?.structured?.lean, turn?.content, turn?.text]
      .filter(Boolean)
      .join(" ");
    const hit = blob.match(/\b(Over|Under)\s+(\d+\.?\d*)\s*goals?\b/i);
    if (hit) {
      return {
        kind: hit[1].toLowerCase() === "over" ? "over" : "under",
        line: hit[2],
      };
    }
  }
  return null;
}

/**
 * @param {Array<unknown>} [history]
 */
export function extractPriorBothAdvanceFromHistory(history = []) {
  if (!Array.isArray(history)) return false;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn?.role !== "assistant" && turn?.role !== "ai") continue;
    const blob = [turn?.structured?.call, turn?.structured?.lean, turn?.content, turn?.text]
      .filter(Boolean)
      .join(" ");
    if (/\bboth teams to advance\b/i.test(blob)) return true;
  }
  return false;
}

/**
 * @param {Array<unknown>} [history]
 * @returns {string | null}
 */
function flipPriorTotalsLeanFromHistory(history) {
  const priorTotals = extractPriorTotalsLeanFromHistory(history);
  if (!priorTotals?.line) return null;
  const flipped = priorTotals.kind === "over" ? "under" : "over";
  return formatTotalsLeanHeadline(flipped, priorTotals.line);
}

/**
 * @param {{
 *   question: string,
 *   group?: string,
 *   home?: string,
 *   away?: string,
 *   homeMl?: string,
 *   awayMl?: string,
 *   matchOdds?: Record<string, unknown>,
 *   teamStats?: Record<string, { advancePct?: number }>,
 *   history?: Array<unknown>,
 * }} row
 */
function pickWcFixtureAltFollowUpLean(row) {
  const q = String(row.question || "");
  const groupClause = row.group ? ` in Group ${row.group}` : "";
  const priorTotals = extractPriorTotalsLeanFromHistory(row.history);

  if (isWcTotalsExplainFollowUp(q) && priorTotals?.line) {
    return formatTotalsLeanHeadline(priorTotals.kind, priorTotals.line);
  }

  if (isWcMatchupOtherSideFollowUp(q)) {
    const flipped = flipPriorTotalsLeanFromHistory(row.history);
    if (flipped) return flipped;
    if (extractPriorBothAdvanceFromHistory(row.history) && row.homeMl && row.awayMl) {
      return pickWcFixtureTotalsAlternateLean({
        home: row.home,
        away: row.away,
        homeMl: row.homeMl,
        awayMl: row.awayMl,
        matchOdds: row.matchOdds,
        question: q,
        passOnMlPrefix: false,
      }).headline;
    }
    if (row.homeMl && row.awayMl) {
      const fav = pickMlFavorite(row.homeMl, row.awayMl, row.home, row.away);
      const dogAbbr = fav.abbr === row.home ? row.away : row.home;
      const dogMl = fav.abbr === row.home ? row.awayMl : row.homeMl;
      return `${wcMatchupTeamDisplayName(dogAbbr)} ${dogMl} to win`;
    }
  }

  if (/\bboth teams to advance\b/i.test(q)) {
    const assessment = assessWcBothTeamsAdvanceFixture({
      home: row.home,
      away: row.away,
      group: row.group,
      teamStats: row.teamStats,
    });
    if (!assessment.ok) {
      return pickWcFixtureTotalsAlternateLean({
        home: row.home,
        away: row.away,
        homeMl: row.homeMl,
        awayMl: row.awayMl,
        matchOdds: row.matchOdds,
        question: q,
        passOnMlPrefix: false,
      }).headline;
    }
    return `Both teams to advance${groupClause}.`;
  }

  if (row.homeMl && row.awayMl) {
    const fresh = pickWcFixtureTotalsAlternateLean({
      home: row.home,
      away: row.away,
      homeMl: row.homeMl,
      awayMl: row.awayMl,
      matchOdds: row.matchOdds,
      question: q,
      passOnMlPrefix: false,
    });
    if (priorTotals?.line && /\bover or under goals\b/i.test(q)) {
      return flipPriorTotalsLeanFromHistory(row.history) || fresh.headline;
    }
    return fresh.headline;
  }

  return "Lean Under 2.5 goals.";
}

/**
 * @param {number | null | undefined} lastUpdatedMs
 * @param {number} [nowMs]
 */
function wcModelAttributionFooter(lastUpdatedMs, nowMs = Date.now()) {
  const raw = buildWcSimAttributionLabel(lastUpdatedMs, nowMs);
  return extractWcModelAttributionPrefix(raw).attribution;
}

/**
 * @param {{
 *   home: string,
 *   away: string,
 *   group?: string,
 *   question?: string,
 *   match?: Record<string, unknown> | null,
 *   teamStats?: Record<string, { advancePct?: number, groupWinPct?: number, name?: string }>,
 *   simLastUpdated?: number,
 *   nowMs?: number,
 *   history?: Array<unknown>,
 * }} [opts]
 */
export function buildWcFixtureMatchupPrebuiltStructured(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const group = String(opts.group || opts.match?.group || "").trim().toUpperCase();
  const question = String(opts.question || "").trim();
  const routingQ = extractLatestUserTurnForRouting(question);
  const altFollowUp = isWcMatchupAltMarketFollowUp(routingQ);
  if (isWcFixturePrebuiltBlockedForLivePlay(question, opts.match)) return null;
  if (!home || !away) return null;

  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
  const homeStats = opts.teamStats?.[home];
  const awayStats = opts.teamStats?.[away];

  const seedOdds = getWcFixtureMlSeed(home, away);
  const matchOdds =
    opts.match?.odds && typeof opts.match.odds === "object" ? opts.match.odds : seedOdds;
  const oddsStale = Boolean(opts.match?.oddsStale);

  const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
  const drawMl = readWcMatchMoneylineAmerican(matchOdds?.draw);

  if (!homeMl || !awayMl) return null;

  const fav = pickMlFavorite(homeMl, awayMl, home, away);
  const favName = wcMatchupTeamDisplayName(fav.abbr);
  const mlCall = `${favName} ${fav.odds} to win`;

  const altLeanText = pickWcFixtureAltFollowUpLean({
    question: routingQ,
    group,
    home,
    away,
    homeMl,
    awayMl,
    matchOdds,
    teamStats: opts.teamStats,
    history: opts.history,
  }).replace(/^lean:\s*/i, "");
  const lean = altFollowUp
    ? isWcMatchupOtherSideFollowUp(routingQ) || isWcTotalsExplainFollowUp(routingQ)
      ? altLeanText
      : `Pass on ML — ${altLeanText}`
    : pickWcFixturePrebuiltLean({
        question: routingQ,
        home,
        away,
        group,
        homeStats,
        awayStats,
        teamStats: opts.teamStats,
        matchOdds,
        homeScore: opts.match?.homeScore,
        awayScore: opts.match?.awayScore,
        status: opts.match?.status,
        isLive: isWcLiveMatchStatus(opts.match?.status),
      });
  const playHeadline = extractWcMatchupPlayHeadline(lean) || "";
  const call = altFollowUp
    ? (playHeadline || lean.replace(/^lean:\s*/i, "").trim() || "Lean Under 2.5 goals").slice(0, 100)
    : (playHeadline || mlCall).slice(0, 100);

  const market = devigWcMatchMoneylineProbs({
    home: matchOdds?.home,
    draw: matchOdds?.draw,
    away: matchOdds?.away,
    provider: matchOdds?.provider,
  });

  const winBar = resolveMatchWinProbabilityBar({
    homeAbbr: home,
    awayAbbr: away,
    teams: WC_2026_TEAMS,
    matchOdds,
    oddsStale,
  });

  const bothAdvanceAssessment = assessWcBothTeamsAdvanceFixture({
    home,
    away,
    group,
    teamStats: opts.teamStats,
  });

  const priorTotalsExplain =
    isWcTotalsExplainFollowUp(routingQ) && extractPriorTotalsLeanFromHistory(opts.history);
  const totalsKind = parseTotalsKindFromLean(lean) || priorTotalsExplain?.kind || "under";

  const whyNowRow = {
    homeName,
    awayName,
    group,
    lean,
    playHeadline,
    homeMl,
    awayMl,
    drawMl,
    winBar,
    market,
    bothAdvanceAssessment,
    homeScore: opts.match?.homeScore,
    awayScore: opts.match?.awayScore,
    status: opts.match?.status,
    matchOdds,
    favName,
    homeStats,
    awayStats,
  };

  const whyNow = (
    priorTotalsExplain
      ? buildWcTotalsExplainWhyNow({ ...whyNowRow, totalsKind: priorTotalsExplain.kind })
      : buildWcFixturePrebuiltWhyNow(whyNowRow)
  ).trim();

  const totalsPlay =
    playHeadline && /\b(?:over|under)\s+\d/i.test(playHeadline) ? playHeadline : null;
  const postedTotalLine =
    matchOdds?.totalLine != null && String(matchOdds.totalLine).trim() !== ""
      ? String(matchOdds.totalLine).trim()
      : null;

  const line = altFollowUp
    ? totalsPlay && postedTotalLine
      ? formatPostedTotalsLine(matchOdds, totalsKind) ||
        `${home} vs ${away} — ${mlCall}`.slice(0, 200)
      : `${home} vs ${away} — ${mlCall}`.slice(0, 200)
    : playHeadline && /\b(under|over)\s+\d/i.test(playHeadline)
      ? ""
      : winBar?.teamA?.winPct != null
        ? `Market win chance: ${homeName} ${winBar.teamA.winPct}% · Draw ${winBar.draw}% · ${awayName} ${winBar.teamB.winPct}%.`
        : market
          ? `Market: ${homeName} ${market.homePct}% · Draw ${market.drawPct}% · ${awayName} ${market.awayPct}%.`
          : "";

  let deep = buildWcFixturePrebuiltDeep({
    homeName,
    awayName,
    favName,
    group,
    lean,
    homeMl,
    awayMl,
    drawMl,
    winBar,
    homeStats,
    awayStats,
  }).trim();

  if (priorTotalsExplain) {
    const posted = formatPostedTotalsLine(matchOdds, priorTotalsExplain.kind);
    if (posted && !/posted\s+\d/i.test(deep)) {
      deep = `${posted}\n\n${deep}`;
    }
  }

  const edge = buildWcFixturePrebuiltEdge({
    homeName,
    awayName,
    lean,
  }).slice(0, 200);

  return {
    sport: "worldcup",
    callType: "matchup",
    groupLetter: group || undefined,
    fixtureHome: home,
    fixtureAway: away,
    lean: lean.slice(0, 120),
    call: call.slice(0, 100),
    line: line.slice(0, 200),
    deep,
    breakdownAvailable: Boolean(deep.trim()),
    breakdownDefaultExpanded: Boolean(priorTotalsExplain),
    whyNow,
    edge,
    modelAttribution: wcModelAttributionFooter(opts.simLastUpdated, opts.nowMs),
    confidence: "Medium",
    caveats: [],
    teamStats: opts.teamStats || undefined,
    timestamp: new Date().toISOString(),
  };
}

function matchPairVariantSlot(homeName, awayName, poolSize, offset = 0) {
  const seed =
    String(homeName || "").charCodeAt(0) +
    String(awayName || "").charCodeAt(0) +
    String(homeName || "").length +
    String(awayName || "").length +
    Number(offset) * 7;
  return Math.abs(seed) % Math.max(1, poolSize);
}

/**
 * @param {{
 *   homeName?: string,
 *   awayName?: string,
 *   favName?: string,
 *   winBar?: { teamA?: { winPct?: number }, teamB?: { winPct?: number } } | null,
 *   group?: string,
 *   lean?: string,
 *   playHeadline?: string,
 * }} row
 */
function resolveWcFixtureMatchRoles(row) {
  const homeName = String(row.homeName || "").trim();
  const awayName = String(row.awayName || "").trim();
  const favName = String(row.favName || homeName).trim();
  const dogName = favName === homeName ? awayName : homeName;
  const winBar = row.winBar;
  let favWinPct = null;
  if (winBar?.teamA?.winPct != null && favName === homeName) {
    favWinPct = winBar.teamA.winPct;
  } else if (winBar?.teamB?.winPct != null && favName === awayName) {
    favWinPct = winBar.teamB.winPct;
  }
  if (!Number.isFinite(favWinPct) && row.homeMl && row.awayMl) {
    const favOdds =
      favName === homeName ? row.homeMl : row.awayMl;
    const imp = americanOddsImplied(favOdds);
    if (imp > 0) favWinPct = Math.round(imp * 100);
  }
  const lineMatch = String(row.lean || row.playHeadline || "").match(
    /\b(under|over)\s+(\d+\.?\d*)/i,
  );
  const totalLine = lineMatch?.[2] ? Number.parseFloat(lineMatch[2]) : 2.5;
  return { homeName, awayName, favName, dogName, favWinPct, totalLine };
}

/**
 * @param {Record<string, unknown>} row
 * @param {ReturnType<typeof resolveWcFixtureMatchRoles>} roles
 * @param {number} [variantOffset]
 */
function buildWcFixtureUnderTotalsMechanismWhy(row, roles, variantOffset = 0) {
  const { favName, dogName, favWinPct, totalLine } = roles;
  const group = String(row.group || "").trim().toUpperCase();
  const groupBit = group ? `Group ${group}` : "the group";
  const hs = Number(row.homeScore);
  const as = Number(row.awayScore);
  const goalsLive =
    Number.isFinite(hs) && Number.isFinite(as) ? Math.max(0, hs + as) : null;
  const livePlay =
    isWcLiveMatchStatus(row.status) || (goalsLive != null && goalsLive > 0);

  if (livePlay && goalsLive != null) {
    if (totalLine <= 2.5) {
      if (goalsLive >= 3) {
        return `${hs}-${as} live — Under 2.5 is dead; only a late flurry saves it.`;
      }
      const liveVariants = [
        `${hs}-${as} live — ${dogName} sitting in; ${favName} still hunting a breakthrough.`,
        `${hs}-${as} — tempo is low and ${dogName} is packing the middle; Under 2.5 still breathes.`,
        `Tight ${hs}-${as} — ${favName} has territory but not a three-goal pace yet.`,
      ];
      return liveVariants[
        matchPairVariantSlot(
          roles.homeName,
          roles.awayName,
          liveVariants.length,
          variantOffset,
        )
      ];
    }
    const lineLabel = formatGoalsLine(totalLine);
    return goalsLive >= totalLine
      ? `${hs}-${as} live — Under ${lineLabel} is already busted.`
      : `${hs}-${as} live — pace still fits Under ${lineLabel} if neither side opens up.`;
  }

  const heavyFav = Number.isFinite(favWinPct) && favWinPct >= 65;
  const clearFav = Number.isFinite(favWinPct) && favWinPct >= 55;
  const pctBit = Number.isFinite(favWinPct) ? `~${favWinPct}%` : "the favorite";

  if (totalLine <= 2.5) {
    const variants = heavyFav
      ? [
          `${favName} is ${pctBit} to win but the 2.5 assumes a slow opener — ${dogName} can sit in and keep it 0-0 or 1-0.`,
          `First ${groupBit} meeting: ${dogName} will block space; ${favName} may boss the ball without chasing a rout.`,
          `Posted 2.5 fits a cagey Game 1 — ${favName} should control, yet ${dogName} rarely gifts multiple goals early.`,
        ]
      : clearFav
        ? [
            `${groupBit} opener leans pragmatic — neither side has to swing for a shootout; Under 2.5 rides 0-0/1-1 scripts.`,
            `${favName} is a narrow ML edge; ${dogName} can kill tempo and keep the chance count under three.`,
            `Books split on goals, but first meetings in ${groupBit} often stay in the 0-0 to 1-1 band.`,
          ]
        : [
            `Toss-up ${groupBit} price — both teams can play for a point first; Under 2.5 lives on a tight script.`,
            `No clear blowout side — expect cautious shapes, not a four-goal track meet.`,
            `Market is flat on the winner; low-event soccer keeps Under 2.5 in play.`,
          ];
    return variants[
      matchPairVariantSlot(roles.homeName, roles.awayName, variants.length, variantOffset)
    ];
  }

  const lineLabel = formatGoalsLine(totalLine);
  const variants = heavyFav
    ? [
        `Books hung ${lineLabel} with ${favName} at ${pctBit} — a 2-0 or 2-1 win cashes without a shootout.`,
        `${favName} can manage tempo; ${dogName} likely protects the scoreboard instead of chasing goals.`,
        `Clear ML edge for ${favName} — they can win comfortably while staying under ${lineLabel}.`,
      ]
    : clearFav
      ? [
          `${lineLabel} gives cushion for a 2-1 night, but ${groupBit} openers still skew conservative.`,
          `${favName} should edge it; ${dogName} sitting deep caps the ceiling even at ${lineLabel}.`,
          `Posted ${lineLabel} — not a low bar, but both sides can still treat this as a structured Game 1.`,
        ]
      : [
          `Higher number (${lineLabel}) fits a competitive ${groupBit} script — 2-1 either way stays under.`,
          `Neither side is priced for a rout; Under ${lineLabel} rides tempo as much as talent.`,
          `Market expects some goals but not chaos — ${lineLabel} cashes on a professional, not reckless, night.`,
        ];
  return variants[
    matchPairVariantSlot(roles.homeName, roles.awayName, variants.length, variantOffset)
  ];
}

function buildWcTotalsExplainWhyNow(row) {
  const kind = row.totalsKind === "under" ? "under" : "over";
  const lineMatch = String(row.lean || row.playHeadline || "").match(
    /\b(under|over)\s+(\d+\.?\d*)/i,
  );
  const line = lineMatch?.[2] || "2.5";
  const side = kind === "under" ? "Under" : "Over";
  const groupTail = row.group ? ` in Group ${row.group}` : "";
  const roles = resolveWcFixtureMatchRoles(row);

  if (kind === "under") {
    const favLabel = String(roles.favName || row.homeName || "").trim();
    const favMl =
      roles.favName === row.homeName ? row.homeMl : row.awayMl;
    const mlNote = favMl
      ? `${favLabel} ${favMl} can still win 1-0 or 1-1 — you're betting low tempo, not against them.`
      : `${favLabel} can win without a shootout — low tempo is the bet, not a fade.`;
    return `${side} ${line} cashes when ${roles.dogName} packs in and the chance count stays down${groupTail}; ${mlNote}`;
  }

  return `${side} ${line} needs real tempo — ${roles.favName} has to turn control into multiple goals${groupTail}, not just a single flurry.`;
}

/**
 * @param {{
 *   homeName: string,
 *   awayName: string,
 *   group?: string,
 *   lean: string,
 *   playHeadline?: string,
 *   homeMl?: string,
 *   awayMl?: string,
 *   drawMl?: string | null,
 *   winBar?: { teamA?: { winPct?: number }, teamB?: { winPct?: number }, draw?: number } | null,
 *   market?: { homePct?: number, drawPct?: number, awayPct?: number } | null,
 *   bothAdvanceAssessment?: ReturnType<typeof assessWcBothTeamsAdvanceFixture>,
 *   homeScore?: number | null,
 *   awayScore?: number | null,
 *   status?: string | null,
 *   matchOdds?: Record<string, unknown>,
 * }} row
 */
function buildWcFixturePrebuiltWhyNow(row) {
  const groupClause = row.group ? ` Group ${row.group}` : "";
  const hs = Number(row.homeScore);
  const as = Number(row.awayScore);
  const goalsLive =
    Number.isFinite(hs) && Number.isFinite(as) ? Math.max(0, hs + as) : null;
  const livePlay =
    isWcLiveMatchStatus(row.status) || (goalsLive != null && goalsLive > 0);

  const roles = resolveWcFixtureMatchRoles(row);
  const variantOffset = Number(row.mechanismVariant) || 0;

  if (/over \d/i.test(row.lean || row.playHeadline || "")) {
    if (livePlay && goalsLive != null) {
      const lineAsk = String(row.playHeadline || row.lean || "").match(/over\s+(\d+\.?\d*)/i)?.[1];
      const need = lineAsk ? Math.max(0, Math.ceil(Number(lineAsk) - goalsLive)) : null;
      const clockNote =
        need != null && need > 0
          ? `need ${need} more goal${need === 1 ? "" : "s"} from here`
          : "already through the number";
      return `${hs}-${as} live — ${roles.favName} is creating chances but ${clockNote}; tempo vs clock is the cap.`;
    }
    return `Heavy favorite script${groupClause} — ${roles.favName} should control the ball; ${roles.dogName} sits deep but the posted total is high when the gap is this wide.`;
  }
  if (/under \d/i.test(row.lean || row.playHeadline || "")) {
    return buildWcFixtureUnderTotalsMechanismWhy(row, roles, variantOffset);
  }
  if (/both teams to advance/i.test(row.lean || "")) {
    const caveat = buildWcBothTeamsAdvanceCaveat(
      row.bothAdvanceAssessment,
      row.homeName,
      row.awayName,
      row.group,
    );
    if (caveat) return caveat.slice(0, 400);
    return `Group-stage math beats a 90-minute sweat — both ${row.homeName} and ${row.awayName} have live advance paths${groupClause ? ` from Group ${row.group}` : ""}.`;
  }
  if (row.homeMl && row.awayMl) {
    return `${row.homeName} ${row.homeMl} vs ${row.awayName} ${row.awayMl}${row.drawMl ? ` (Draw ${row.drawMl})` : ""} — market leans ${row.homeName} but the price is tight.`;
  }
  return `Tight${groupClause} opener — expect a cautious script, not a blowout.`;
}

/**
 * @param {{
 *   homeName: string,
 *   awayName: string,
 *   favName: string,
 *   group?: string,
 *   lean: string,
 *   homeMl?: string,
 *   awayMl?: string,
 *   drawMl?: string | null,
 *   winBar?: { teamA?: { winPct?: number }, teamB?: { winPct?: number }, draw?: number } | null,
 *   homeStats?: { advancePct?: number },
 *   awayStats?: { advancePct?: number },
 * }} row
 */
function buildWcFixturePrebuiltDeep(row) {
  const parts = [];
  if (row.homeMl && row.awayMl) {
    parts.push(
      `MATCH ODDS: ${row.homeName} ${row.homeMl} · Draw ${row.drawMl || "n/a"} · ${row.awayName} ${row.awayMl}`,
    );
  }
  if (row.winBar?.teamA?.winPct != null) {
    parts.push(
      `UR model win bar: ${row.homeName} ${row.winBar.teamA.winPct}% · Draw ${row.winBar.draw}% · ${row.awayName} ${row.winBar.teamB.winPct}%.`,
    );
  }
  if (
    Number.isFinite(row.homeStats?.advancePct) &&
    Number.isFinite(row.awayStats?.advancePct)
  ) {
    parts.push(
      `Group paths: ${row.homeName} advances ${Number(row.homeStats.advancePct).toFixed(1)}% · ${row.awayName} ${Number(row.awayStats.advancePct).toFixed(1)}% in UR sims.`,
    );
  }
  if (/over \d/i.test(row.lean)) {
    parts.push(
      `WINS IF: ${row.homeName} scores early and keeps the foot on the gas — ${row.awayName} chases or the bench leaks late.`,
    );
    parts.push(
      `DIES IF: ${row.homeName} settles for 1-0 and shuts off, or a red card / weather swing kills tempo.`,
    );
  } else if (/under 2\.5/i.test(row.lean)) {
    parts.push(
      `WINS IF: ${row.awayName} packs the box and ${row.homeName} controls without a multi-goal burst — 0-0, 1-0, or 1-1 keeps you alive.`,
    );
    parts.push(
      `DIES IF: An early ${row.homeName} goal forces ${row.awayName} to chase, or the match turns into an open, end-to-end slugfest.`,
    );
  } else if (/both teams to advance/i.test(row.lean)) {
    parts.push(
      `WINS IF: A draw or narrow ${row.favName} win still leaves both sides with live group paths behind the favorite.`,
    );
    parts.push(
      `DIES IF: A blowout or red-card chaos collapses one team's path before the group settles.`,
    );
  } else {
    parts.push(
      `WINS IF: The favorite controls territory and the live price matches the script you priced pre-kickoff.`,
    );
    parts.push(
      `DIES IF: An early underdog goal or red-card swing flips the match state before the market adjusts.`,
    );
  }
  return parts.filter(Boolean).join("\n\n");
}

/**
 * @param {{ homeName: string, awayName: string, lean: string }} row
 */
function buildWcFixturePrebuiltEdge(row) {
  if (/over \d/i.test(row.lean)) {
    return `Watch the first 25 minutes — if ${row.homeName} leads and keeps attacking, live Over holds up better.`;
  }
  if (/under 2\.5/i.test(row.lean)) {
    return `Watch tempo — if ${row.homeName} scores inside 20 minutes, live Under gets harder.`;
  }
  if (/both teams to advance/i.test(row.lean)) {
    return `Watch the scoreboard after 60 minutes — group math can flip the right side.`;
  }
  return `Watch the first goal — it usually decides whether the pre-match price still holds.`;
}

/**
 * Slate goal-total row — mechanism why from BDL lines + UR sim (no LLM).
 * @param {{
 *   home: string,
 *   away: string,
 *   group?: string,
 *   match?: Record<string, unknown>,
 *   totals?: { headline?: string, lean?: string, kind?: string, line?: string },
 *   teamStats?: Record<string, { advancePct?: number, groupWinPct?: number, name?: string }>,
 * }} opts
 */
export function buildWcSlateTotalsAngleCopy(opts = {}) {
  const home = String(opts.home || "").toUpperCase();
  const away = String(opts.away || "").toUpperCase();
  const group = String(opts.group || "").toUpperCase();
  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
  const match = opts.match && typeof opts.match === "object" ? opts.match : {};
  const matchOdds =
    match.odds && typeof match.odds === "object" ? match.odds : {};
  const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
  const drawMl = readWcMatchMoneylineAmerican(matchOdds?.draw);
  const fav = pickMlFavorite(homeMl, awayMl, home, away);
  const favName = wcMatchupTeamDisplayName(fav.abbr);

  const winBar = resolveMatchWinProbabilityBar({
    homeAbbr: home,
    awayAbbr: away,
    teams: WC_2026_TEAMS,
    matchOdds,
    oddsStale: Boolean(match.oddsStale),
  });

  const teamStats = opts.teamStats;
  const homeStats = teamStats?.[home];
  const awayStats = teamStats?.[away];

  const totals = opts.totals || {};
  const lean = String(totals.headline || totals.lean || "").trim();
  const playHeadline = extractWcMatchupPlayHeadline(lean) || lean.replace(/^lean:\s*/i, "").trim();
  const totalsKind =
    totals.kind === "over" || totals.kind === "under"
      ? totals.kind
      : /\bover\b/i.test(lean)
        ? "over"
        : "under";
  const totalLine =
    matchOdds?.totalLine != null && String(matchOdds.totalLine).trim() !== ""
      ? String(matchOdds.totalLine).trim()
      : String(totals.line || "2.5").trim();

  const postedLine = formatPostedTotalsLine(matchOdds, totalsKind);
  const mechanismWhy = buildWcFixturePrebuiltWhyNow({
    homeName,
    awayName,
    group,
    lean,
    playHeadline,
    homeMl,
    awayMl,
    drawMl,
    winBar,
    favName,
    homeStats,
    awayStats,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    matchOdds,
    mechanismVariant: opts.mechanismVariant,
  }).trim();
  const briefWhy =
    mechanismWhy.split(/(?<=[.!?])\s+/).find((s) => s.trim().length > 12)?.trim() ||
    mechanismWhy;

  let simLine = "";
  if (winBar?.teamA?.winPct != null && winBar?.teamB?.winPct != null) {
    simLine = `${homeName} ${winBar.teamA.winPct}% · Draw ${winBar.draw}% · ${awayName} ${winBar.teamB.winPct}%`;
  }

  const leanShort = playHeadline
    .replace(/^lean:\s*/i, "")
    .replace(/\s+goals\.?$/i, "")
    .trim();

  return {
    mechanismWhy: briefWhy,
    postedLine,
    simLine,
    leanDisplay: leanShort,
    totalLine,
    kickoffEt: formatWcKickoffEtOnly(match),
    slateTotalsCompact: true,
  };
}
