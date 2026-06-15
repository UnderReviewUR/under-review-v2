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
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import {
  buildWcSimAttributionLabel,
  extractWcModelAttributionPrefix,
} from "./wcTakeRetentionQA.js";
import {
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "./wcGroupComposition.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { isWcMatchupAltMarketFollowUp, isWcMatchupOtherSideFollowUp } from "./wcMatchBettingPrompt.js";
import { isWcLiveDominanceQuestion } from "./wcLiveMatchQuestion.js";
import { isWcMatchProbabilityQuestion } from "./wcMatchProbabilityQuestion.js";
import { detectParlayIntent } from "./detectParlayIntent.js";
import { detectWcSgpComboIntent } from "./wcUrTakePhilosophy.js";
import {
  assessWcBothTeamsAdvanceFixture,
  buildWcBothTeamsAdvanceCaveat,
} from "./wcBothTeamsAdvance.js";

const WC_LIVE_ANGLE_RE =
  /\b(live angle|best live|in play|in-play|right now|currently|this minute|at the moment)\b/i;

function isWcNonFixtureMatchupQuestion(question) {
  const q = String(question || "");
  if (!q) return false;
  if (detectParlayIntent(q)) return true;
  if (detectWcSgpComboIntent(q)) return true;
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
 * Alternate totals lean from posted lines + favorite strength (not a blanket Under 2.5).
 * @param {{ home: string, away: string, homeMl: string, awayMl: string, matchOdds?: Record<string, unknown>, question?: string, passOnMlPrefix?: boolean }}
 */
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

  const userOu = q.match(/\b(under|over)\s+(\d+\.?\d*)\s*goals?\b/i);
  if (userOu) {
    const headline = `Lean ${userOu[1]} ${userOu[2]} goals`;
    return {
      lean: row.passOnMlPrefix === false ? `${headline}.` : `Pass on ML — ${headline} — cleaner angle than the ML.`,
      headline,
      kind: userOu[1].toLowerCase() === "over" ? "over" : "under",
      line: userOu[2],
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

  if (
    (isWcMatchWinnerQuestion(q) && !/\bgroup context\b/i.test(q)) ||
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
    if (priorTotals?.line) {
      const sameLean =
        fresh.kind === priorTotals.kind &&
        formatGoalsLine(fresh.line) === formatGoalsLine(priorTotals.line);
      if (/\bover or under goals\b/i.test(q) || sameLean) {
        return flipPriorTotalsLeanFromHistory(row.history) || fresh.headline;
      }
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
    ? isWcMatchupOtherSideFollowUp(routingQ)
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

  const whyNow = buildWcFixturePrebuiltWhyNow({
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
  }).slice(0, 400);

  const line = altFollowUp
    ? `${home} vs ${away} — ${mlCall}`.slice(0, 200)
    : playHeadline && /\b(under|over)\s+\d/i.test(playHeadline)
      ? ""
      : winBar?.teamA?.winPct != null
        ? `Market win chance: ${homeName} ${winBar.teamA.winPct}% · Draw ${winBar.draw}% · ${awayName} ${winBar.teamB.winPct}%.`
        : market
          ? `Market: ${homeName} ${market.homePct}% · Draw ${market.drawPct}% · ${awayName} ${market.awayPct}%.`
          : "";

  const deep = buildWcFixturePrebuiltDeep({
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
  }).slice(0, 1100);

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
    whyNow,
    edge,
    modelAttribution: wcModelAttributionFooter(opts.simLastUpdated, opts.nowMs),
    confidence: "Medium",
    caveats: [],
    teamStats: opts.teamStats || undefined,
    timestamp: new Date().toISOString(),
  };
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
 * }} row
 */
function buildWcFixturePrebuiltWhyNow(row) {
  const groupClause = row.group ? ` Group ${row.group}` : "";
  if (/over \d/i.test(row.lean || row.playHeadline || "")) {
    return `Heavy favorite script${groupClause} — ${row.homeName} should control the ball; ${row.awayName} sits deep but the posted total is high when the gap is this wide.`;
  }
  if (/under 2\.5/i.test(row.lean || row.playHeadline || "")) {
    return `Tight${groupClause} opener — ${row.awayName} sits deep and ${row.homeName} rarely blows teams out in Game 1.`;
  }
  if (/under \d/i.test(row.lean || row.playHeadline || "")) {
    return `Cautious${groupClause} script — ${row.awayName} packs in and ${row.homeName} may not need a shootout to win.`;
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
