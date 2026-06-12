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
import { isWcMatchupAltMarketFollowUp } from "./wcMatchBettingPrompt.js";

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
        eventId: turn?.wcEventId ? String(turn.wcEventId) : null,
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
  if (!opts.isConversationFollowUp) return false;
  if (opts.wcRunnerUpFollowUpQuestion) return false;
  if (isWcPlayerMarketIntent(wcIntent)) return false;
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
function pickWcFixturePrebuiltLean(row) {
  const { question, home, away, group, homeStats, awayStats } = row;
  const q = String(question || "");
  const groupClause = group ? ` in Group ${group}` : "";

  if (
    /\b(best bet|group context|moneyline.*group|both teams to advance|both advance)\b/i.test(q)
  ) {
    return `Pass on ML — lean both teams to advance${groupClause}.`;
  }

  const ou = q.match(/\b(under|over)\s+(\d+\.?\d*)\s*goals?\b/i);
  if (ou) {
    return `Lean ${ou[1]} ${ou[2]} goals — cleaner angle than the ML.`;
  }

  if (isWcMatchWinnerQuestion(q)) {
    return "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.";
  }

  const homeAdv = Number(homeStats?.advancePct);
  const awayAdv = Number(awayStats?.advancePct);
  if (Number.isFinite(homeAdv) && Number.isFinite(awayAdv) && homeAdv > 45 && awayAdv > 45) {
    return `Pass on ML — lean both teams to advance${groupClause}.`;
  }

  return "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.";
}

/**
 * @param {{
 *   question: string,
 *   group?: string,
 * }} row
 */
function pickWcFixtureAltFollowUpLean(row) {
  const q = String(row.question || "");
  const groupClause = row.group ? ` in Group ${row.group}` : "";

  if (/\bboth teams to advance\b/i.test(q)) {
    return `Both teams to advance${groupClause}.`;
  }

  const ou = q.match(/\b(under|over)\s+(\d+\.?\d*)\s*goals?\b/i);
  if (ou) {
    return `Lean ${ou[1]} ${ou[2]} goals.`;
  }

  if (/\bover or under\b/i.test(q)) {
    return "Lean Under 2.5 goals.";
  }

  return "Lean Under 2.5 goals — cleaner angle than the ML.";
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
 * }} [opts]
 */
export function buildWcFixtureMatchupPrebuiltStructured(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const group = String(opts.group || opts.match?.group || "").trim().toUpperCase();
  const question = String(opts.question || "").trim();
  const routingQ = extractLatestUserTurnForRouting(question);
  const altFollowUp = isWcMatchupAltMarketFollowUp(routingQ);
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

  const lean = altFollowUp
    ? `Pass on ML — ${pickWcFixtureAltFollowUpLean({ question: routingQ, group }).replace(/^lean:\s*/i, "")}`
    : pickWcFixturePrebuiltLean({
        question: routingQ,
        home,
        away,
        group,
        homeStats,
        awayStats,
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
  }).slice(0, 400);

  const line = altFollowUp
    ? `${home} vs ${away} — ${mlCall}`.slice(0, 200)
    : playHeadline && /under 2\.5/i.test(playHeadline)
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
  if (/under 2\.5/i.test(row.lean || row.playHeadline || "")) {
    return `Tight${groupClause} opener — ${row.awayName} sits deep and ${row.homeName} rarely blows teams out in Game 1.`;
  }
  if (/both teams to advance/i.test(row.lean || "")) {
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
  if (/under 2\.5/i.test(row.lean)) {
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
  if (/under 2\.5/i.test(row.lean)) {
    return `Watch tempo — if ${row.homeName} scores inside 20 minutes, live Under gets harder.`;
  }
  if (/both teams to advance/i.test(row.lean)) {
    return `Watch the scoreboard after 60 minutes — group math can flip the right side.`;
  }
  return `Watch the first goal — it usually decides whether the pre-match price still holds.`;
}
