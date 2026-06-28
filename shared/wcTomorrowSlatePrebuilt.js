/**
 * Tomorrow's World Cup slate — fixture-bound prebuilt (no tournament outrights).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { getTomorrowEtDateString } from "./nbaPlayoffSlateFromActionNetwork.js";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  buildWcSlateTotalsAngleCopy,
  formatPostedTotalsLine,
  getWcFixtureMlSeed,
  pickWcFixtureSpreadLean,
  pickWcFixtureTotalsAlternateLean,
} from "./wcFixtureMatchupPrebuilt.js";
import {
  devigWcMatchMoneylineProbs,
  readWcMatchMoneylineAmerican,
  resolveMatchWinProbabilityBar,
} from "./wcMatchMoneylineProbs.js";
import { buildStaticPromoMatchesFallback, GROUP_STAGE_OPENERS } from "./wc2026PromoFixtures.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import { parseWcKickoffEtMs, formatWcKickoffDisplay, hasExplicitWcSlateDate, resolveWcMatchSlateEtDate, wcMatchIsEarlyEtMorningKickoff, wcMatchOnEtBroadcastSlateDay, wcTodayEtYmd } from "./wcKickoffDisplay.js";
import {
  getWcMatchCommenceMs,
  isWcFinishedMatchStatus,
  isWcLiveMatchStatus,
  isWcScheduledMatchStatus,
} from "./wcFeaturedMatch.js";
import {
  extractWcSlateDayFromQuestion,
  isWcKnockoutSlateQuestion,
  isWcSlateOutcomePredictionQuestion,
  isWcTomorrowOrSlateBetQuestion,
  resolveWcSlateMarketBoardMode,
} from "./wcTakeRetentionQA.js";
import {
  getWcKnockoutRoundLabelForMatch,
  isWcKnockoutFixtureMatch,
} from "./wcKnockoutFixture.js";
import { isKnockoutPhase, resolveWcTournamentPhase } from "./wcPhaseUtils.js";

function isScheduled(status) {
  return isWcScheduledMatchStatus(status);
}

function isTodaySlateEligibleStatus(status) {
  if (isWcFinishedMatchStatus(status)) return false;
  return isWcScheduledMatchStatus(status) || isWcLiveMatchStatus(status);
}

function hasExplicitSlateDate(match) {
  return hasExplicitWcSlateDate(match);
}

function normalizeSlateMechanismKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\bgroup [a-l]\b/gi, "grp")
    .replace(/~\d+%|\d+\.?\d*%/g, "pct")
    .replace(/\b\d+\.?\d*\b/g, "n");
}

function slateMechanismOverlap(a, b) {
  const wa = new Set(
    normalizeSlateMechanismKey(a)
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
  const wb = new Set(
    normalizeSlateMechanismKey(b)
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
  if (!wa.size || !wb.size) return 0;
  let hit = 0;
  for (const w of wa) {
    if (wb.has(w)) hit += 1;
  }
  return hit / Math.min(wa.size, wb.size);
}

/**
 * @param {Record<string, unknown>} baseOpts
 * @param {string[]} priorMechanisms
 */
function pickDistinctSlateTotalsCopy(baseOpts, priorMechanisms) {
  for (let variant = 0; variant < 4; variant += 1) {
    const copy = buildWcSlateTotalsAngleCopy({ ...baseOpts, mechanismVariant: variant });
    const why = String(copy?.mechanismWhy || "").trim();
    if (!why) continue;
    if (!priorMechanisms.some((p) => slateMechanismOverlap(why, p) >= 0.72)) {
      return copy;
    }
  }
  return buildWcSlateTotalsAngleCopy(baseOpts);
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} etYmd
 * @param {{ slateDay?: "today" | "tomorrow" }} [opts]
 */
export function filterWcMatchesForEtDate(matches, etYmd, opts = {}) {
  const ymd = String(etYmd || "").trim();
  if (!ymd) return [];
  const slateDay = opts.slateDay === "today" ? "today" : "tomorrow";

  if (slateDay === "today") {
    return (matches || []).filter((m) => {
      if (!isTodaySlateEligibleStatus(m?.status)) return false;
      return wcMatchOnEtBroadcastSlateDay(m, ymd);
    });
  }

  return (matches || []).filter((m) => {
    if (!isScheduled(m?.status)) return false;
    if (!hasExplicitSlateDate(m)) return false;
    if (resolveWcMatchSlateEtDate(m) !== ymd) return false;
    if (wcMatchIsEarlyEtMorningKickoff(m)) return false;
    return true;
  });
}

/**
 * @param {Record<string, unknown>} match
 */
function matchSortKey(match) {
  const ts = Number(match?.commenceTs);
  if (Number.isFinite(ts) && ts > 0) return ts;
  const parsed = parseWcKickoffEtMs(match?.date, match?.time);
  return parsed != null ? parsed : Number.MAX_SAFE_INTEGER;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} etYmd
 * @param {number} [nowMs]
 */
export function filterWcKnockoutMatchesForEtDate(matches, etYmd, nowMs = Date.now()) {
  const scope = { allMatches: matches, tournamentPhase: resolveWcTournamentPhase(matches, nowMs) };
  return filterWcMatchesForEtDate(matches, etYmd, { slateDay: "today" }).filter((m) =>
    isWcKnockoutFixtureMatch(m, scope),
  );
}

/**
 * @param {Array<Record<string, unknown>>} [matches]
 * @param {string} etYmd
 * @param {number} [nowMs]
 */
export function resolveWcSlateMatchesForEtDate(matches = [], etYmd, nowMs = Date.now(), slateDay = "tomorrow") {
  const ymd = String(etYmd || "").trim();
  const tournamentPhase = resolveWcTournamentPhase(matches, nowMs);
  const knockoutPhase = isKnockoutPhase(tournamentPhase);
  let slate = filterWcMatchesForEtDate(matches, ymd, { slateDay });
  if (knockoutPhase) {
    slate = slate.filter((m) => isWcKnockoutFixtureMatch(m, { allMatches: matches, tournamentPhase }));
  }
  if (!slate.length && !knockoutPhase) {
    slate = GROUP_STAGE_OPENERS.filter((m) => m.date === ymd).map((m) => ({
      ...m,
      status: "NS",
    }));
  }
  slate.sort((a, b) => matchSortKey(a) - matchSortKey(b));
  return { slateYmd: ymd, matches: slate, tournamentPhase };
}

/**
 * @param {Array<Record<string, unknown>>} [matches]
 * @param {number} [nowMs]
 * @param {"today" | "tomorrow"} [slateDay]
 */
export function resolveWcSlateMatches(matches = [], nowMs = Date.now(), slateDay = "tomorrow") {
  const todayYmd = wcTodayEtYmd(nowMs);
  const targetYmd =
    slateDay === "today"
      ? todayYmd
      : getTomorrowEtDateString(todayYmd);
  return resolveWcSlateMatchesForEtDate(matches, targetYmd, nowMs, slateDay);
}

/**
 * @param {Array<Record<string, unknown>>} [matches]
 * @param {number} [nowMs]
 */
export function resolveWcTomorrowSlateMatches(matches = [], nowMs = Date.now()) {
  const { slateYmd, matches: slate } = resolveWcSlateMatches(matches, nowMs, "tomorrow");
  return { tomorrowYmd: slateYmd, slateYmd, matches: slate };
}

/**
 * @param {"today" | "tomorrow"} slateDay
 */
function slateDayCopy(slateDay) {
  return slateDay === "today" ? "today's" : "tomorrow's";
}

/**
 * @param {string} lean
 */
function shortenWcSlateLean(lean) {
  return String(lean || "")
    .replace(/^lean:\s*/i, "")
    .replace(/^pass on ml\s*[—-]\s*/i, "")
    .trim()
    .slice(0, 36);
}

/**
 * Compact per-match leans for the card face.
 * @param {Array<Record<string, unknown>>} angles
 * @param {number} [max]
 */
export function buildWcSlateFacePreview(angles, max = 3) {
  const rows = (angles || []).slice(0, max).map((a) => {
    const label = String(a?.label || "").trim();
    const lean = shortenWcSlateLean(a?.lean);
    if (!label) return "";
    return lean ? `${label}: ${lean}` : label;
  });
  const preview = rows.filter(Boolean).join(" · ");
  const extra = (angles || []).length - max;
  if (extra > 0 && preview) return `${preview} · +${extra} more`;
  return preview;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} slateYmd
 * @param {number} nowMs
 */
export function countWcVerifiedFinishedOnSlate(matches, slateYmd, nowMs = Date.now()) {
  const ymd = String(slateYmd || "").trim();
  if (!ymd) return 0;
  const seen = new Set();
  return (matches || []).filter((m) => {
    if (!isWcFinishedMatchStatus(m?.status)) return false;
    if (!wcMatchOnEtBroadcastSlateDay(m, ymd)) return false;
    if (getWcMatchCommenceMs(m) > nowMs) return false;
    const key = `${String(m?.homeTeam || "").toUpperCase()}|${String(m?.awayTeam || "").toUpperCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).length;
}

/**
 * @param {Array<Record<string, unknown>>} angles
 * @param {{ slateDay?: "today" | "tomorrow", slateYmd?: string, predictionMode?: boolean, count?: number, remainingCount?: number, dayCopy?: string }} opts
 */
function buildWcSlateWhyNowIntro(angles, opts = {}) {
  const count = Number(opts.count) || (Array.isArray(angles) ? angles.length : 0);
  const remainingCount = Number(opts.remainingCount) || count;
  const finishedCount = Number(opts.finishedCount) || 0;
  const slateYmd = String(opts.slateYmd || "").trim();
  const dayCopy = String(opts.dayCopy || slateDayCopy(opts.slateDay === "today" ? "today" : "tomorrow"));
  const predictionMode = Boolean(opts.predictionMode);

  if (count <= 1) {
    const a = angles?.[0];
    const timeBit = a?.kickoff ? `${a.kickoff} — ` : "";
    if (!a) return "";
    return predictionMode
      ? `${timeBit}${a.label}: ${a.predictionPick || a.lean}`.slice(0, 220)
      : `${timeBit}${a.label}: ${a.lean}`.slice(0, 220);
  }

  const finishedBit =
    finishedCount > 0
      ? `${finishedCount} final · ${remainingCount} remaining`
      : `${remainingCount} ${remainingCount === 1 ? "match" : "matches"}`;
  const intro = `${dayCopy.charAt(0).toUpperCase()}${dayCopy.slice(1)} slate (${slateYmd}) — ${finishedBit}.`;
  const preview = buildWcSlateFacePreview(angles);
  return predictionMode
    ? `${intro} Kickoffs show ET and Central.`.slice(0, 220)
    : preview
      ? `${intro} ${preview}`.slice(0, 220)
      : `${intro} Full board in the breakdown.`.slice(0, 220);
}

/**
 * @param {Record<string, unknown>} angle
 * @param {{ tournamentPhase?: string, allMatches?: Array<Record<string, unknown>> }} [scope]
 */
export function formatWcSlateMatchDeepBlock(angle, scope = {}) {
  const label = String(angle?.label || "").trim();
  const group = String(angle?.group || "").trim().toUpperCase();
  const lean = String(angle?.lean || "").trim();
  const kickoff = String(angle?.kickoff || "").trim();
  const body = String(angle?.deep || angle?.whyNow || "").trim();
  const roundLabel = angle?.knockoutRound
    ? String(angle.knockoutRound)
    : angle?.home && angle?.away
      ? getWcKnockoutRoundLabelForMatch(
          { homeTeam: angle.home, awayTeam: angle.away, round: angle.round },
          scope,
        )
      : "";
  const header =
    roundLabel && roundLabel !== "Knockout"
      ? `${label} (${roundLabel})`
      : group
        ? `${label} (Group ${group})`
        : label;

  if (angle?.slateTotalsCompact) {
    const kickoffEt = String(angle.kickoffEt || "").trim();
    const totalLine = String(angle.totalLine || "").trim();
    const leanDisplay = String(angle.leanDisplay || lean).replace(/^lean:\s*/i, "").trim();
    const mechanismWhy = String(angle.mechanismWhy || "").trim();
    const postedLine = String(angle.postedLine || "").trim();
    const simLine = String(angle.simLine || "").trim();
    /** @type {string[]} */
    const blocks = [`Match: ${header}`];
    const kickMeta = [kickoffEt, totalLine ? `Total ${totalLine}` : ""].filter(Boolean).join(" · ");
    if (kickMeta) blocks.push(`Kickoff: ${kickMeta}`);
    if (leanDisplay) blocks.push(`Lean: ${leanDisplay}`);
    if (mechanismWhy) blocks.push(`Context: ${mechanismWhy}`);
    if (postedLine) blocks.push(`Book: ${postedLine}`);
    if (simLine) blocks.push(`UR model win bar: ${simLine}`);
    return blocks.join("\n\n");
  }

  /** @type {string[]} */
  const blocks = [`Match: ${header}`];
  if (kickoff) blocks.push(`Kickoff: ${kickoff}`);
  if (angle?.bookLine) blocks.push(`Book: ${angle.bookLine}`);
  if (angle?.simLine) blocks.push(`UR sim: ${angle.simLine}`);
  if (angle?.predictionPick) blocks.push(`Pick: ${angle.predictionPick}`);
  if (lean && !angle?.predictionPick) blocks.push(`Lean: ${lean}`);
  if (body && !angle?.simLine) blocks.push(body);
  else if (body && angle?.simLine && !body.includes(angle.simLine)) blocks.push(body);
  return blocks.join("\n\n");
}

/**
 * @param {Array<Record<string, unknown>>} angles
 * @param {{ slateDay?: "today" | "tomorrow", slateYmd?: string }} opts
 */
export function buildWcSlateDeepBreakdown(angles, opts = {}) {
  const slateDay = opts.slateDay === "today" ? "today" : "tomorrow";
  const slateYmd = String(opts.slateYmd || "").trim();
  const count = Array.isArray(angles) ? angles.length : 0;
  const dayLabel = slateDayCopy(slateDay);
  const knockoutIntro = opts.knockoutPhase ? "Knockout " : "";
  const intro = slateYmd
    ? `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)} ${knockoutIntro}World Cup slate (${slateYmd}) — ${count} ${count === 1 ? "match" : "matches"}`
    : `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)} ${knockoutIntro}World Cup slate — ${count} ${count === 1 ? "match" : "matches"}`;
  const scope = {
    tournamentPhase: opts.tournamentPhase,
    allMatches: opts.allMatches,
  };
  return [intro, ...(angles || []).map((a) => formatWcSlateMatchDeepBlock(a, scope))]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 3600);
}

/**
 * @param {Record<string, unknown>} match
 */
function attachSeedOdds(match) {
  const home = String(match?.homeTeam || "").toUpperCase();
  const away = String(match?.awayTeam || "").toUpperCase();
  if (match?.odds && typeof match.odds === "object") return match;
  const seed = getWcFixtureMlSeed(home, away);
  return seed ? { ...match, odds: seed } : match;
}

/**
 * Prefer the most bettable tomorrow fixture — skip heavy chalk when another match exists.
 * @param {Array<Record<string, unknown>>} slate
 */
export function pickWcTomorrowFeaturedFixture(slate) {
  const rows = Array.isArray(slate) ? slate : [];
  if (!rows.length) return null;
  const withOdds = rows
    .map((m) => {
      const home = String(m.homeTeam || "").toUpperCase();
      const away = String(m.awayTeam || "").toUpperCase();
      const seed = getWcFixtureMlSeed(home, away);
      const homeMl = seed?.home?.moneyline ? Number(String(seed.home.moneyline).replace(/[^-\d]/g, "")) : null;
      return { match: m, homeMl };
    })
    .filter((r) => r.match?.homeTeam && r.match?.awayTeam);
  if (!withOdds.length) return rows[0];
  const nonChalk = withOdds.filter((r) => !Number.isFinite(r.homeMl) || r.homeMl > -200);
  return (nonChalk[0] || withOdds[0]).match;
}

/**
 * @param {Record<string, unknown>} angle
 */
function scoreWcSlateAngleMisprice(angle) {
  const blob = [angle?.line, angle?.whyNow, angle?.lean, angle?.deep, angle?.fixtureCard?.line]
    .filter(Boolean)
    .join(" ");
  const deltaPt = blob.match(/\(([+-]?\d+\.?\d*)pt\)/i);
  if (deltaPt) return Math.abs(parseFloat(deltaPt[1]));
  const simMarket = blob.match(/(\d+\.?\d*)\s*%[^%]{0,80}?(\d+\.?\d*)\s*%/);
  if (simMarket) return Math.abs(parseFloat(simMarket[1]) - parseFloat(simMarket[2]));
  return 0;
}

/**
 * @param {Array<Record<string, unknown>>} angles
 * @param {Array<Record<string, unknown>>} [slate]
 */
export function pickWcKnockoutFeaturedMispriceFixture(angles, slate = []) {
  const rows = Array.isArray(angles) ? angles : [];
  if (!rows.length) return pickWcTomorrowFeaturedFixture(slate);
  const ranked = [...rows].sort((a, b) => scoreWcSlateAngleMisprice(b) - scoreWcSlateAngleMisprice(a));
  const top = ranked[0];
  if (!top?.home || !top?.away) return pickWcTomorrowFeaturedFixture(slate);
  return (
    (slate || []).find(
      (m) =>
        String(m.homeTeam || "").toUpperCase() === top.home &&
        String(m.awayTeam || "").toUpperCase() === top.away,
    ) || { homeTeam: top.home, awayTeam: top.away, round: top.round }
  );
}

/**
 * @param {Record<string, unknown>} fx
 * @param {string} question
 */
function buildWcKnockoutEtAdvancementLine(fx, question) {
  if (!/\b(extra time|et\b|penalties|penalty shootout|aet\b)\b/i.test(String(question || ""))) {
    return "";
  }
  const home = String(fx?.homeTeam || "").toUpperCase();
  const away = String(fx?.awayTeam || "").toUpperCase();
  const match = attachSeedOdds(fx);
  const homeMl = readWcMatchMoneylineAmerican(match?.odds?.home);
  const awayMl = readWcMatchMoneylineAmerican(match?.odds?.away);
  const winBar = resolveMatchWinProbabilityBar({
    homeAbbr: home,
    awayAbbr: away,
    teams: WC_2026_TEAMS,
    matchOdds: match?.odds,
    oddsStale: Boolean(match?.oddsStale),
  });
  const homeSim = winBar?.teamA?.winPct;
  const awaySim = winBar?.teamB?.winPct;
  if (!Number.isFinite(homeSim) || !Number.isFinite(awaySim)) return "";
  const pickAbbr = awaySim > homeSim ? away : home;
  const pickName = wcMatchupTeamDisplayName(pickAbbr);
  const pickSim = pickAbbr === home ? homeSim : awaySim;
  const bookFav = pickMlFavoriteSide(homeMl, awayMl, home, away);
  const bookNote =
    bookFav.abbr !== pickAbbr
      ? `book regulation lean is ${wcMatchupTeamDisplayName(bookFav.abbr)}`
      : "sim aligns with the book favorite";
  return `If level after 90, lean ${pickName} to advance through ET/pens — UR sim ${pickSim}% match win; ${bookNote}.`;
}

/**
 * @param {string} lean
 */
function stripLeanPrefix(lean) {
  return String(lean || "")
    .replace(/^Lean:\s*/i, "")
    .replace(/^Pass on ML —\s*/i, "")
    .replace(/^Tomorrow \(\d{4}-\d{2}-\d{2}\):\s*/i, "")
    .trim();
}

/**
 * @param {string} homeMl
 * @param {string} awayMl
 * @param {string} home
 * @param {string} away
 */
function pickMlFavoriteSide(homeMl, awayMl, home, away) {
  const homeN = Number.parseInt(String(homeMl || "").replace(/[^\d+-]/g, ""), 10);
  const awayN = Number.parseInt(String(awayMl || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(homeN) || !Number.isFinite(awayN)) {
    return { abbr: home, odds: homeMl };
  }
  const homeImp = homeN < 0 ? -homeN / (-homeN + 100) : 100 / (homeN + 100);
  const awayImp = awayN < 0 ? -awayN / (-awayN + 100) : 100 / (awayN + 100);
  return homeImp >= awayImp
    ? { abbr: home, odds: homeMl }
    : { abbr: away, odds: awayMl };
}

/**
 * Outcome pick for slate prediction questions — book ML + UR sim win bar.
 * @param {Record<string, unknown>} fx
 * @param {{ question?: string, teamStats?: Record<string, unknown>, simLastUpdated?: number, nowMs?: number }} opts
 */
export function buildWcSlateMatchOutcomeAngle(fx, opts = {}) {
  const home = String(fx?.homeTeam || "").toUpperCase();
  const away = String(fx?.awayTeam || "").toUpperCase();
  const group = String(fx?.group || "").toUpperCase();
  const label = `${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)}`;
  const kickoff = formatWcKickoffDisplay(fx, { alwaysShowCentral: true });
  const match = attachSeedOdds(fx);

  const seedOdds = getWcFixtureMlSeed(home, away);
  const matchOdds =
    match?.odds && typeof match.odds === "object" ? match.odds : seedOdds;
  const homeMl = readWcMatchMoneylineAmerican(matchOdds?.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds?.away);
  const drawMl = readWcMatchMoneylineAmerican(matchOdds?.draw);

  if (!homeMl || !awayMl) {
    return {
      home,
      away,
      group,
      label,
      kickoff,
      lean: `Lines pending on ${label}.`,
      call: `${label} — lines pending`,
      line: "",
      whyNow: `${label} is on today's slate — wait for posted ML before locking a pick.`,
      deep: `${label}${group ? ` (Group ${group})` : ""} — no verified ML in cache yet.`,
      fixtureCard: null,
      predictionMode: true,
    };
  }

  const homeName = wcMatchupTeamDisplayName(home);
  const awayName = wcMatchupTeamDisplayName(away);
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
    oddsStale: Boolean(match?.oddsStale),
  });

  const homeSim = winBar?.teamA?.winPct ?? market?.homePct;
  const awaySim = winBar?.teamB?.winPct ?? market?.awayPct;
  const drawSim = winBar?.draw ?? market?.drawPct;

  let pickAbbr = home;
  let pickSim = homeSim;
  if (
    Number.isFinite(awaySim) &&
    Number.isFinite(homeSim) &&
    awaySim > homeSim &&
    awaySim >= (drawSim ?? 0)
  ) {
    pickAbbr = away;
    pickSim = awaySim;
  } else if (
    Number.isFinite(drawSim) &&
    Number.isFinite(homeSim) &&
    Number.isFinite(awaySim) &&
    drawSim > homeSim &&
    drawSim > awaySim
  ) {
    pickAbbr = "DRAW";
    pickSim = drawSim;
  }

  const bookFav = pickMlFavoriteSide(homeMl, awayMl, home, away);
  const pickName =
    pickAbbr === "DRAW" ? "Draw" : wcMatchupTeamDisplayName(pickAbbr);
  const pickOdds =
    pickAbbr === "DRAW"
      ? drawMl || "n/a"
      : pickAbbr === home
        ? homeMl
        : awayMl;

  const bookLine = drawMl
    ? `${homeName} ${homeMl} · Draw ${drawMl} · ${awayName} ${awayMl}`
    : `${homeName} ${homeMl} · ${awayName} ${awayMl}`;
  const simLine =
    homeSim != null && awaySim != null
      ? `${homeName} ${homeSim}% · Draw ${drawSim ?? "n/a"}% · ${awayName} ${awaySim}%`
      : market
        ? `${homeName} ${market.homePct}% · Draw ${market.drawPct}% · ${awayName} ${market.awayPct}%`
        : "";

  const predictionPick =
    pickAbbr === "DRAW"
      ? `Draw (${pickOdds} ML · UR sim ${pickSim}% 90-min)`
      : `${pickName} to win (${pickOdds} ML · UR sim ${pickSim}% win)`;

  const lean = predictionPick;
  const whyNow = `${bookLine}${simLine ? ` — UR sim win bar: ${simLine}.` : ""}`.slice(0, 400);
  const deep = [
    `Book: ${bookLine}`,
    simLine ? `UR sim: ${simLine}` : "",
    bookFav.abbr !== pickAbbr && pickAbbr !== "DRAW"
      ? `Note: book leans ${wcMatchupTeamDisplayName(bookFav.abbr)} ${bookFav.odds}; sim win bar favors ${pickName}.`
      : "",
    `Pick: ${predictionPick}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    home,
    away,
    group,
    label,
    kickoff,
    lean,
    call: `${pickName} to win`.slice(0, 100),
    line: `${pickOdds} ML · UR sim ${pickSim ?? "n/a"}%`.slice(0, 200),
    whyNow,
    deep,
    fixtureCard: null,
    predictionMode: true,
    predictionPick,
    bookLine,
    simLine,
  };
}

/**
 * @param {Array<Record<string, unknown>>} tomorrowSlate
 * @param {{
 *   question?: string,
 *   teamStats?: Record<string, unknown>,
 *   simLastUpdated?: number,
 *   nowMs?: number,
 * }} opts
 */
export function buildWcTomorrowSlateMatchAngles(tomorrowSlate, opts = {}) {
  const question = String(opts.question || "");
  const nowMs = Number(opts.nowMs) || Date.now();
  const predictionMode =
    Boolean(opts.predictionMode) || isWcSlateOutcomePredictionQuestion(question);
  const marketBoardMode = resolveWcSlateMarketBoardMode(question);
  /** @type {Array<Record<string, unknown>>} */
  const angles = [];
  /** @type {string[]} */
  const priorMechanisms = [];

  for (const fx of tomorrowSlate || []) {
    if (predictionMode) {
      angles.push(buildWcSlateMatchOutcomeAngle(fx, opts));
      continue;
    }

    const home = String(fx.homeTeam || "").toUpperCase();
    const away = String(fx.awayTeam || "").toUpperCase();
    const group = String(fx.group || "").toUpperCase();
    const label = `${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)}`;
    const kickoff = formatWcKickoffDisplay(fx, { alwaysShowCentral: true });
    const match = attachSeedOdds(fx);

    if (marketBoardMode) {
      const homeMl = readWcMatchMoneylineAmerican(match?.odds?.home);
      const awayMl = readWcMatchMoneylineAmerican(match?.odds?.away);
      const spread =
        marketBoardMode === "spreads" || marketBoardMode === "both"
          ? pickWcFixtureSpreadLean({ home, away, matchOdds: match?.odds })
          : null;
      const totals =
        marketBoardMode === "totals" || marketBoardMode === "both"
          ? pickWcFixtureTotalsAlternateLean({
              home,
              away,
              homeMl,
              awayMl,
              matchOdds: match?.odds,
              question,
              passOnMlPrefix: false,
            })
          : null;

      let lean = "";
      let call = "";
      let line = "";
      let whyNow = "";
      const totalsCopy = totals
        ? pickDistinctSlateTotalsCopy(
            {
              home,
              away,
              group,
              match,
              totals,
              teamStats: opts.teamStats,
            },
            priorMechanisms,
          )
        : null;
      if (totalsCopy?.mechanismWhy) {
        priorMechanisms.push(String(totalsCopy.mechanismWhy));
      }

      if (spread && totals) {
        lean = `${spread.headline} · ${totals.headline || totals.lean}`.slice(0, 140);
        call = lean.slice(0, 100);
        line = [spread.bookLine, totalsCopy?.postedLine]
          .filter(Boolean)
          .join(" · ");
        whyNow =
          totalsCopy?.mechanismWhy ||
          totalsCopy?.postedLine ||
          spread.bookLine ||
          `${label} — posted lines from book board.`;
      } else if (spread) {
        lean = spread.headline || spread.lean;
        call = lean.slice(0, 100);
        line = spread.bookLine || "";
        whyNow = spread.bookLine
          ? `Posted handicap: ${spread.bookLine}.`
          : `${label} — handicap not in feed yet.`;
      } else if (totals) {
        lean = totals.headline || totals.lean;
        call = lean.slice(0, 100);
        line = totalsCopy?.postedLine || "";
        whyNow =
          totalsCopy?.mechanismWhy ||
          line ||
          `${label} — UR sim lean until goal total posts.`;
      }

      angles.push({
        home,
        away,
        group,
        label,
        kickoff,
        lean: stripLeanPrefix(lean),
        call,
        line,
        whyNow,
        deep: totalsCopy?.mechanismWhy || whyNow,
        fixtureCard: null,
        marketBoardMode,
        ...(totalsCopy || {}),
      });
      continue;
    }

    const card = buildWcFixtureMatchupPrebuiltStructured({
      home,
      away,
      group,
      question,
      match,
      teamStats: opts.teamStats,
      simLastUpdated: opts.simLastUpdated,
      nowMs,
    });

    if (card) {
      angles.push({
        home,
        away,
        group,
        label,
        kickoff,
        lean: stripLeanPrefix(card.lean),
        call: card.call,
        line: card.line,
        whyNow: card.whyNow,
        deep: card.deep,
        fixtureCard: card,
      });
    } else {
      angles.push({
        home,
        away,
        group,
        label,
        kickoff,
        lean: `Watch lines on ${label} when posted.`,
        call: `${label} — lines pending`,
        line: "",
        whyNow: `${label} is on this slate; wait for posted ML/totals before locking a play.`,
        deep: `${label}${group ? ` (Group ${group})` : ""} — no verified ML in cache yet.`,
        fixtureCard: null,
      });
    }
  }

  const allMatches = Array.isArray(opts.matches) ? opts.matches : tomorrowSlate;
  const tournamentPhase = resolveWcTournamentPhase(allMatches, nowMs);
  const scope = { allMatches, tournamentPhase };
  return angles.map((a) => {
    const fx = (tomorrowSlate || []).find(
      (m) =>
        String(m.homeTeam || "").toUpperCase() === a.home &&
        String(m.awayTeam || "").toUpperCase() === a.away,
    );
    if (!fx || !isWcKnockoutFixtureMatch(fx, scope)) return a;
    return {
      ...a,
      round: fx.round,
      knockoutRound: getWcKnockoutRoundLabelForMatch(fx, scope),
    };
  });
}

/**
 * @param {string} question
 * @param {string} [wcIntent]
 */
export function shouldUseWcTomorrowSlatePrebuilt(question, wcIntent) {
  void wcIntent;
  return isWcTomorrowOrSlateBetQuestion(question);
}

/**
 * @param {{
 *   question?: string,
 *   matches?: Array<Record<string, unknown>>,
 *   teamStats?: Record<string, unknown>,
 *   simLastUpdated?: number,
 *   nowMs?: number,
 * }} [opts]
 */
export function buildWcTomorrowSlatePrebuiltStructured(opts = {}) {
  const nowMs = Number(opts.nowMs) || Date.now();
  const question = String(opts.question || "");
  const slateDay = extractWcSlateDayFromQuestion(question);
  const dayCopy = slateDayCopy(slateDay);
  const predictionMode = isWcSlateOutcomePredictionQuestion(question);
  const marketBoardMode = resolveWcSlateMarketBoardMode(question);
  const knockoutQuestion = isWcKnockoutSlateQuestion(question);
  let matches = Array.isArray(opts.matches) ? opts.matches : [];
  if (!matches.length && !knockoutQuestion) {
    matches = buildStaticPromoMatchesFallback(nowMs);
  }

  const tournamentPhase = resolveWcTournamentPhase(matches, nowMs);
  const knockoutPhase = isKnockoutPhase(tournamentPhase) || knockoutQuestion;

  const { slateYmd, matches: slateMatches } = resolveWcSlateMatches(matches, nowMs, slateDay);
  if (!slateMatches.length) return null;

  const finishedTodayCount = countWcVerifiedFinishedOnSlate(matches, slateYmd, nowMs);

  const angles = buildWcTomorrowSlateMatchAngles(slateMatches, { ...opts, matches, question, nowMs });
  const featuredFx = knockoutPhase
    ? pickWcKnockoutFeaturedMispriceFixture(angles, slateMatches)
    : pickWcTomorrowFeaturedFixture(slateMatches);
  const featuredHome = String(featuredFx?.homeTeam || "").toUpperCase();
  const featuredAway = String(featuredFx?.awayTeam || "").toUpperCase();
  const featuredAngle =
    angles.find((a) => a.home === featuredHome && a.away === featuredAway) || angles[0];
  const featuredCard = featuredAngle?.fixtureCard || null;
  if (!featuredAngle) return null;

  const etAdvanceLine = knockoutPhase
    ? buildWcKnockoutEtAdvancementLine(featuredFx, question)
    : "";

  const count = angles.length;
  const featuredLabel = featuredAngle.label;

  const lean = predictionMode
    ? (count > 1
        ? `${count} match predictions on ${dayCopy} slate (${slateYmd}) — book + sim per game.`.slice(
            0,
            120,
          )
        : `${featuredLabel}: ${featuredAngle.predictionPick || featuredAngle.lean}`.slice(0, 120))
    : knockoutQuestion && count >= 1
      ? `${featuredLabel}: ${featuredAngle.lean}`.slice(0, 120)
    : marketBoardMode === "spreads"
      ? `${count} spread leans on ${dayCopy} slate — lead ${featuredLabel}: ${featuredAngle.lean}`.slice(
          0,
          120,
        )
      : marketBoardMode === "totals"
        ? `${count} goal-total leans on ${dayCopy} slate — lead ${featuredLabel}: ${featuredAngle.lean}`.slice(
            0,
            120,
          )
        : marketBoardMode === "both"
          ? `${count} spread + total leans on ${dayCopy} slate — lead ${featuredLabel}: ${featuredAngle.lean}`.slice(
              0,
              120,
            )
    : count > 1
      ? `${count} angles on ${dayCopy} slate — lead ${featuredLabel}: ${featuredAngle.lean}`.slice(
          0,
          120,
        )
      : `${slateDay === "today" ? "Today" : "Tomorrow"} (${slateYmd}): ${featuredAngle.lean}`.slice(
          0,
          120,
        );

  const whyNow = [
    buildWcSlateWhyNowIntro(angles, {
      slateDay,
      slateYmd,
      predictionMode,
      count,
      remainingCount: count,
      finishedCount: finishedTodayCount,
      dayCopy,
    }),
    etAdvanceLine,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 400);

  const deep = buildWcSlateDeepBreakdown(angles, {
    slateDay,
    slateYmd,
    knockoutPhase,
    tournamentPhase,
    allMatches: matches,
  });

  const base = featuredCard || {
    sport: "worldcup",
    callType: knockoutPhase ? "knockout_slate" : "tomorrow_slate",
    lean,
    call: featuredAngle.call,
    line: featuredAngle.line || "",
    whyNow,
    deep,
    edge: etAdvanceLine ? etAdvanceLine.slice(0, 200) : "",
    confidence: "Medium",
    caveats: [],
  };

  return {
    ...base,
    callType: knockoutPhase ? "knockout_slate" : "tomorrow_slate",
    lean,
    call: (predictionMode
      ? count > 1
        ? `${count} match predictions on ${dayCopy} slate`
        : featuredAngle.call
      : marketBoardMode === "totals"
        ? count > 1
          ? `${count} goal-total leans — lead ${featuredLabel}`
          : featuredAngle.call
        : marketBoardMode === "spreads"
          ? count > 1
            ? `${count} spread leans — lead ${featuredLabel}`
            : featuredAngle.call
          : marketBoardMode === "both"
            ? count > 1
              ? `${count} spread + total leans — lead ${featuredLabel}`
              : featuredAngle.call
            : count > 1
              ? `${count} angles on ${dayCopy} slate — lead ${featuredLabel}`
              : featuredAngle.call
    ).slice(0, 100),
    line: featuredAngle.line || base.line || "",
    whyNow,
    deep,
    breakdownAvailable: Boolean(deep.trim()),
    slateDay,
    slateEtDate: slateYmd,
    tomorrowEtDate: slateYmd,
    tomorrowFixtureCount: count,
    tomorrowFixtures: slateMatches.map((m) => ({
      home: m.homeTeam,
      away: m.awayTeam,
      group: m.group,
      time: formatWcKickoffDisplay(m) || m.time || null,
    })),
    tomorrowSlateAngles: angles.map((a) => ({
      home: a.home,
      away: a.away,
      group: a.group,
      label: a.label,
      lean: a.lean,
      predictionPick: a.predictionPick || null,
    })),
    slatePredictionMode: predictionMode,
    fixtureHome: featuredHome,
    fixtureAway: featuredAway,
  };
}
