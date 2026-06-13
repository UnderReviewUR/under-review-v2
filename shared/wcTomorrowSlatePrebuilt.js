/**
 * Tomorrow's World Cup slate — fixture-bound prebuilt (no tournament outrights).
 */

import { getTomorrowEtDateString } from "./nbaPlayoffSlateFromActionNetwork.js";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  getWcFixtureMlSeed,
} from "./wcFixtureMatchupPrebuilt.js";
import { buildStaticPromoMatchesFallback, GROUP_STAGE_OPENERS } from "./wc2026PromoFixtures.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import { parseWcKickoffEtMs, resolveWcMatchEtDate, resolveWcMatchSlateEtDate, wcMatchEtDateYmd, wcTodayEtYmd } from "./wcKickoffDisplay.js";
import { isWcTomorrowOrSlateBetQuestion } from "./wcTakeRetentionQA.js";

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return ["ns", "scheduled", "pre", "upcoming", "not started"].includes(s);
}

function hasExplicitSlateDate(match) {
  const fromDate = String(match?.date || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return true;
  return parseWcKickoffEtMs(match?.date, match?.time) != null;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} etYmd
 */
export function filterWcMatchesForEtDate(matches, etYmd) {
  const ymd = String(etYmd || "").trim();
  if (!ymd) return [];
  return (matches || []).filter((m) => {
    if (!isScheduled(m?.status)) return false;
    if (!hasExplicitSlateDate(m)) return false;
    return resolveWcMatchSlateEtDate(m) === ymd;
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
 * @param {Array<Record<string, unknown>>} [matches]
 * @param {number} [nowMs]
 */
export function resolveWcTomorrowSlateMatches(matches = [], nowMs = Date.now()) {
  const tomorrowYmd = getTomorrowEtDateString(wcTodayEtYmd(nowMs));
  let slate = filterWcMatchesForEtDate(matches, tomorrowYmd);
  if (!slate.length) {
    slate = GROUP_STAGE_OPENERS.filter((m) => m.date === tomorrowYmd).map((m) => ({
      ...m,
      status: "NS",
    }));
  }
  slate.sort((a, b) => matchSortKey(a) - matchSortKey(b));
  return { tomorrowYmd, matches: slate };
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
 * @param {string} lean
 */
function stripLeanPrefix(lean) {
  return String(lean || "")
    .replace(/^Lean:\s*/i, "")
    .replace(/^Pass on ML —\s*/i, "")
    .replace(/^Tomorrow \(\d{4}-\d{2}-\d{2} ET\):\s*/i, "")
    .trim();
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
  /** @type {Array<Record<string, unknown>>} */
  const angles = [];

  for (const fx of tomorrowSlate || []) {
    const home = String(fx.homeTeam || "").toUpperCase();
    const away = String(fx.awayTeam || "").toUpperCase();
    const group = String(fx.group || "").toUpperCase();
    const label = `${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)}`;
    const match = attachSeedOdds(fx);

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
        lean: `Watch lines on ${label} when posted.`,
        call: `${label} — lines pending`,
        line: "",
        whyNow: `${label} is on tomorrow's slate; wait for posted ML/totals before locking a play.`,
        deep: `${label}${group ? ` (Group ${group})` : ""} — no verified ML in cache yet.`,
        fixtureCard: null,
      });
    }
  }

  return angles;
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
  let matches = Array.isArray(opts.matches) ? opts.matches : [];
  if (!matches.length) {
    matches = buildStaticPromoMatchesFallback(nowMs);
  }

  const { tomorrowYmd, matches: tomorrowSlate } = resolveWcTomorrowSlateMatches(matches, nowMs);
  if (!tomorrowSlate.length) return null;

  const angles = buildWcTomorrowSlateMatchAngles(tomorrowSlate, opts);
  const featuredFx = pickWcTomorrowFeaturedFixture(tomorrowSlate);
  const featuredHome = String(featuredFx?.homeTeam || "").toUpperCase();
  const featuredAway = String(featuredFx?.awayTeam || "").toUpperCase();
  const featuredAngle =
    angles.find((a) => a.home === featuredHome && a.away === featuredAway) || angles[0];
  const featuredCard = featuredAngle?.fixtureCard || null;
  if (!featuredAngle) return null;

  const count = angles.length;
  const slateLabels = angles.map((a) => a.label).join(" · ");
  const featuredLabel = featuredAngle.label;

  const lean =
    count > 1
      ? `${count} angles on tomorrow's ET slate — lead ${featuredLabel}: ${featuredAngle.lean}`.slice(
          0,
          120,
        )
      : `Tomorrow (${tomorrowYmd} ET): ${featuredAngle.lean}`.slice(0, 120);

  const whyNow = [
    `Tomorrow's ET slate (${tomorrowYmd}, ${count} ${count === 1 ? "match" : "matches"}): ${slateLabels}.`,
    ...angles.map((a, i) => `${i + 1}) ${a.label}: ${a.lean}`),
    "Match-level only — teams not kicking off tomorrow are out of scope.",
  ]
    .join(" ")
    .slice(0, 520);

  const deep = [
    `Tomorrow's World Cup slate (ET, ${tomorrowYmd}) — ${count} ${count === 1 ? "match" : "matches"}:`,
    ...angles.map((a, i) => {
      const header = `${i + 1}. ${a.label}${a.group ? ` (Group ${a.group})` : ""}`;
      const body = a.deep || a.whyNow || a.lean;
      return `${header}\n${body}`;
    }),
  ]
    .join("\n\n")
    .slice(0, 1800);

  const base = featuredCard || {
    sport: "worldcup",
    callType: "tomorrow_slate",
    lean,
    call: featuredAngle.call,
    line: featuredAngle.line || "",
    whyNow,
    deep,
    edge: "",
    confidence: "Medium",
    caveats: [],
  };

  return {
    ...base,
    callType: "tomorrow_slate",
    lean,
    call: (count > 1
      ? `${count} angles on tomorrow's slate — lead ${featuredLabel}`
      : featuredAngle.call
    ).slice(0, 100),
    line: featuredAngle.line || base.line || "",
    whyNow,
    deep,
    breakdownAvailable: Boolean(deep.trim()),
    tomorrowEtDate: tomorrowYmd,
    tomorrowFixtureCount: count,
    tomorrowFixtures: tomorrowSlate.map((m) => ({
      home: m.homeTeam,
      away: m.awayTeam,
      group: m.group,
      time: m.time || null,
    })),
    tomorrowSlateAngles: angles.map((a) => ({
      home: a.home,
      away: a.away,
      group: a.group,
      label: a.label,
      lean: a.lean,
    })),
    fixtureHome: featuredHome,
    fixtureAway: featuredAway,
  };
}
