/**
 * Cross-market WC SGP / thread parlay — scorer + totals from thread + explicit ask.
 */

import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";
import { detectWcSgpComboIntent } from "./wcUrTakePhilosophy.js";
import { parseWcMatchGoalsOverUnder, wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import {
  calculateParlayOdds,
  formatParlayAmericanOdds,
  parseAmericanOddsValue,
} from "../src/lib/calculateParlayOdds.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import {
  collapseMatchPlayerPropRowsForDisplay,
  matchPlayerPropRowsFromEvent,
  resolveMatchPlayerPropsPayload,
} from "./wcMatchPlayerProps.js";
import { extractWcNamedPlayerFromQuestion } from "./wcUrTakePlayerMarket.js";
import {
  WC_CARD_TYPE,
  parsePropBoardFromStructured,
  extractWcThreadStateFromHistory,
} from "./wcThreadState.js";
import { WC_PLAYER_MARKET_TIER } from "./wcPlayerMarketResolve.js";

const PARLAY_PLAYER_STOP_WORDS = new Set([
  "parlay",
  "sgp",
  "leg",
  "legs",
  "ticket",
  "build",
  "give",
  "under",
  "over",
  "goals",
  "goal",
  "same",
  "game",
  "and",
  "the",
  "for",
  "with",
  "this",
  "match",
  "player",
  "scorer",
  "anytime",
  "we",
  "talked",
  "about",
]);

/**
 * @param {string} raw
 */
function cleanParlayPlayerToken(raw) {
  const name = String(raw || "")
    .trim()
    .replace(/\s+AG\b/i, "")
    .trim();
  if (!name || name.length < 2) return null;
  const first = name.split(/\s+/)[0]?.toLowerCase();
  if (!first || PARLAY_PLAYER_STOP_WORDS.has(first)) return null;
  return name;
}

const PARLAY_PLAYER_CAPTURE = "[A-Za-zÀ-ÿ][\\wÀ-ÿ'-]+(?:\\s+[A-Za-zÀ-ÿ][\\wÀ-ÿ'-]+){0,2}";

/**
 * @param {string} suffix
 */
function parlayPlayerRe(suffix) {
  return new RegExp(`\\b(${PARLAY_PLAYER_CAPTURE})${suffix}`, "i");
}

/**
 * @param {string} question
 */
function parseExplicitPlayerScorerLeg(question) {
  const q = String(question || "");

  const withToScore = q.match(parlayPlayerRe("\\s+to\\s+score\\b"));
  if (withToScore?.[1]) {
    const n = cleanParlayPlayerToken(withToScore[1]);
    if (n) return n;
  }

  const withPrefixToScore = q.match(
    new RegExp(`\\bwith\\s+(${PARLAY_PLAYER_CAPTURE})\\s+to\\s+score\\b`, "i"),
  );
  if (withPrefixToScore?.[1]) {
    const n = cleanParlayPlayerToken(withPrefixToScore[1]);
    if (n) return n;
  }

  const ag = q.match(parlayPlayerRe("\\s+AG\\b"));
  if (ag?.[1]) {
    const n = cleanParlayPlayerToken(ag[1]);
    if (n) return n;
  }

  const withGoal = q.match(new RegExp(`\\bwith\\s+(${PARLAY_PLAYER_CAPTURE})\\s+goal\\b`, "i"));
  if (withGoal?.[1]) {
    const n = cleanParlayPlayerToken(withGoal[1]);
    if (n) return n;
  }

  const nameGoalPlusOu = q.match(
    new RegExp(
      `\\b(?:parlay:?\\s*)?(${PARLAY_PLAYER_CAPTURE})\\s+goal\\s*\\+\\s*(?:under|over)`,
      "i",
    ),
  );
  if (nameGoalPlusOu?.[1]) {
    const n = cleanParlayPlayerToken(nameGoalPlusOu[1]);
    if (n) return n;
  }

  const plusBeforeOu = q.match(
    new RegExp(
      `\\b(?:parlay:?\\s*)?([A-Za-zÀ-ÿ][\\wÀ-ÿ'-]+)(?:\\s+scorer)?\\s*\\+\\s*(?:under|over)`,
      "i",
    ),
  );
  if (plusBeforeOu?.[1]) {
    const n = cleanParlayPlayerToken(plusBeforeOu[1]);
    if (n) return n;
  }

  const scorerBeforeOu = q.match(
    parlayPlayerRe("\\s+(?:anytime\\s+)?(?:goal\\s*)?scorer\\s*(?:\\+|\\s+)\\s*(?:under|over)\\b"),
  );
  if (scorerBeforeOu?.[1]) {
    const n = cleanParlayPlayerToken(scorerBeforeOu[1]);
    if (n) return n;
  }

  const ouThenName = q.match(
    /\b(?:under|over)\s+\d+(?:\.\d+)?(?:\s+goals?)?\s*(?:\+|and|,)\s*(?:the\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]+){0,2})(?:\s+AG\b|\s+to\s+score|\s+scorer|\?|$)/i,
  );
  if (ouThenName?.[1]) {
    const n = cleanParlayPlayerToken(ouThenName[1]);
    if (n) return n;
  }

  const ouThenBare = q.match(
    /\b(?:under|over)\s+\d+(?:\.\d+)?(?:\s+goals?)?\s+and\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]+){0,2})\b/i,
  );
  if (ouThenBare?.[1]) {
    const n = cleanParlayPlayerToken(ouThenBare[1]);
    if (n) return n;
  }

  const ouPlusName = q.match(
    /\b(?:under|over)\s+\d+(?:\.\d+)?(?:\s+goals?)?\s*\+\s*([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]+){0,2})\b/i,
  );
  if (ouPlusName?.[1]) {
    const n = cleanParlayPlayerToken(ouPlusName[1]);
    if (n) return n;
  }

  const named = extractWcNamedPlayerFromQuestion(q);
  if (named && /\b(scorer|score|goal)\b/i.test(q)) return named;

  const scorerPatterns = [
    new RegExp(`\\bparlay:?\\s*(${PARLAY_PLAYER_CAPTURE})\\s+scorer\\b`, "i"),
    parlayPlayerRe("\\s+(?:anytime\\s+)?(?:goal\\s*)?scorer\\s*(?:\\+|\\s+)\\s*(?:under|over)\\b"),
    parlayPlayerRe("\\s+(?:anytime\\s+)?(?:goal\\s*)?scorer\\b"),
  ];
  for (const re of scorerPatterns) {
    const hit = q.match(re);
    if (!hit?.[1]) continue;
    const n = cleanParlayPlayerToken(String(hit[1]).replace(/\s+scorer$/i, "").trim());
    if (n) return n;
  }
  return null;
}

/**
 * @param {string} question
 * @param {object[]} history
 */
function resolveTotalsLeg(question, history) {
  const fromQ = parseWcMatchGoalsOverUnder(String(question || ""));
  if (fromQ?.side && fromQ.line != null) {
    return {
      side: fromQ.side,
      line: fromQ.line,
      odds: extractTotalsOddsFromHistory(history, fromQ) || "-110",
    };
  }

  const thread = extractWcThreadStateFromHistory(history);
  if (thread.lastTotalsLean?.side && thread.lastTotalsLean.line != null) {
    return {
      side: thread.lastTotalsLean.side,
      line: thread.lastTotalsLean.line,
      odds: thread.lastTotalsLean.odds || "-110",
    };
  }
  return null;
}

/**
 * @param {object[]} history
 * @param {{ side: string, line: string }} ou
 */
function extractTotalsOddsFromHistory(history, ou) {
  for (const turn of [...(history || [])].reverse()) {
    if (turn?.role !== "assistant") continue;
    const blob = [turn.structured?.lean, turn.structured?.call, turn.structured?.line, turn.structured?.whyNow]
      .filter(Boolean)
      .join("\n");
    const side = String(ou.side || "").toLowerCase();
    const line = String(ou.line || "").replace(".", "\\.");
    const re = new RegExp(`${side}\\s+${line}[^\\d]{0,12}([+-]\\d{2,})`, "i");
    const m = blob.match(re);
    if (m?.[1]) return m[1];
    const posted = blob.match(
      new RegExp(`Posted\\s+${side}\\s+${line}[^\\d]{0,8}([+-]\\d{2,})`, "i"),
    );
    if (posted?.[1]) return posted[1];
  }
  return null;
}

/**
 * @param {string} playerName
 * @param {object[]} history
 * @param {object | null | undefined} kvBlocks
 * @param {string[]} teams
 */
function resolveScorerLeg(playerName, history, kvBlocks, teams) {
  const target = normalizeWcPlayerName(
    String(playerName || "").replace(/\s+scorer$/i, ""),
  ).toLowerCase();
  if (!target) return null;

  for (const turn of [...(history || [])].reverse()) {
    if (turn?.role !== "assistant") continue;
    for (const row of parsePropBoardFromStructured(turn.structured)) {
      const name = normalizeWcPlayerName(row.player).toLowerCase();
      if (name.includes(target) || target.includes(name.split(/\s+/).pop() || "")) {
        return {
          player: row.player,
          odds: row.odds || "-110",
          market: row.market || "anytime_scorer",
        };
      }
    }
    const lean = String(turn.structured?.lean || "");
    const m = lean.match(
      new RegExp(`(${playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n]*anytime scorer\\s+([+-]\\d{2,}))`, "i"),
    );
    if (m) {
      return {
        player: playerName,
        odds: m[2],
        market: "anytime_scorer",
      };
    }
  }

  const kvRoot = kvBlocks?.matchPlayerProps;
  if (kvRoot && teams.length >= 2) {
    const resolved = resolveMatchPlayerPropsPayload(kvRoot, {
      eventId: String(kvBlocks?.wcEventId || "").trim(),
      teams,
    });
    if (resolved?.payload) {
      const rawRows = matchPlayerPropRowsFromEvent(resolved.payload, "anytime_scorer", 24);
      const rows = collapseMatchPlayerPropRowsForDisplay(rawRows, "anytime_scorer");
      for (const r of rows) {
        const name = normalizeWcPlayerName(String(r.name || "")).toLowerCase();
        if (name.includes(target) || target.includes(name.split(/\s+/).pop() || "")) {
          return {
            player: r.name,
            odds: r.americanOdds,
            market: "anytime_scorer",
          };
        }
      }
    }
  }

  return null;
}

/**
 * @param {string} question
 * @param {object[]} history
 * @param {string} wcIntent
 * @param {object | null | undefined} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function shouldBuildWcThreadParlay(question, history, wcIntent) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (!(detectParlayIntent(q) || detectWcSgpComboIntent(q))) return false;

  const thread = extractWcThreadStateFromHistory(history);
  const totalsInQ = parseWcMatchGoalsOverUnder(q);
  const hasTotals = totalsInQ || thread.lastTotalsLean;
  if (!hasTotals) return false;

  // N-leg player-only tickets — not cross-market SGP from thread totals.
  if (/\b\d+\s*[- ]?player\s*parlay\b/i.test(q) && !totalsInQ) return false;
  const legCount = extractParlayLegCount(q);
  if (legCount != null && legCount >= 3 && !totalsInQ && !/\b(under|over)\s+\d/i.test(q)) {
    return false;
  }
  // Thread SGP builder is strictly 2-leg scorer + totals.
  if (legCount != null && legCount > 2) return false;
  // All "player parlay" asks use the fixture player-parlay path.
  if (/\bplayer\s*parlay\b/i.test(q)) return false;

  const player = parseExplicitPlayerScorerLeg(q);
  if (!player && !thread.lastPropBoard?.length) return false;

  void wcIntent;
  return true;
}

/**
 * @param {string} question
 * @param {object[]} history
 * @param {import("./wcPlayerMarketResolve.js").WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function buildWcThreadParlayStructured(question, history, tier, kvBlocks, wcContext) {
  const q = String(question || "").trim();
  const teams =
    wcContext?.requiredEntities?.length >= 2
      ? wcContext.requiredEntities.slice(0, 2)
      : [
          extractWcThreadStateFromHistory(history).fixtureHome,
          extractWcThreadStateFromHistory(history).fixtureAway,
        ].filter(Boolean);

  if (teams.length < 2) return null;

  const homeAbbr = String(teams[0] || "").toUpperCase();
  const awayAbbr = String(teams[1] || "").toUpperCase();
  const homeLabel = wcMatchupTeamDisplayName(homeAbbr);
  const awayLabel = wcMatchupTeamDisplayName(awayAbbr);

  const playerAsk = parseExplicitPlayerScorerLeg(q);
  const scorerLeg = resolveScorerLeg(playerAsk || "", history, kvBlocks, teams);
  const totalsLeg = resolveTotalsLeg(q, history);

  if (!scorerLeg || !totalsLeg) return null;

  const scorerPlay = `${scorerLeg.player} anytime scorer`;
  const totalsPlay = `${totalsLeg.side} ${totalsLeg.line} goals`;
  const scorerOdds = parseAmericanOddsValue(scorerLeg.odds);
  const totalsOdds = parseAmericanOddsValue(totalsLeg.odds);
  if (scorerOdds == null || totalsOdds == null) return null;

  const combined = calculateParlayOdds([scorerOdds, totalsOdds]);
  const combinedDisplay = combined != null ? formatParlayAmericanOdds(combined) : null;

  /** @type {Array<{ play: string, odds: string, rationale?: string }>} */
  const parlayLegs = [
    { play: scorerPlay, odds: scorerLeg.odds, rationale: "Needs a goal from the named scorer." },
    {
      play: totalsPlay,
      odds: totalsLeg.odds,
      rationale: `${totalsLeg.side} ${totalsLeg.line} — match tempo script.`,
    },
  ];

  const ticketLabel = combinedDisplay
    ? `Lean 2-leg SGP · ${combinedDisplay}`
    : "Lean 2-leg SGP";

  return {
    sport: "worldcup",
    cardType: WC_CARD_TYPE.PARLAY_TICKET,
    callType: "parlay",
    playerMarketTier: tier || WC_PLAYER_MARKET_TIER.VERIFIED,
    wcEventId: kvBlocks?.wcEventId || wcContext?.wcEventId || undefined,
    fixtureHome: homeAbbr,
    fixtureAway: awayAbbr,
    call: `${homeLabel} vs ${awayLabel} — 2-leg SGP${combinedDisplay ? ` (${combinedDisplay})` : ""}`,
    lean: `${ticketLabel} — ${scorerLeg.player} scorer + ${totalsLeg.side} ${totalsLeg.line}`,
    parlayLegs,
    parlayCombinedOdds: combinedDisplay,
    whyNow: `${homeLabel} control without a shootout fits both legs — ${scorerLeg.player} volume plus a ${String(totalsLeg.side).toLowerCase()}-${totalsLeg.line} game script.`,
    edge: `Correlation: both legs need ${awayLabel} to sit deep; trim if they chase early.`,
    confidence: "Medium",
    breakdownAvailable: true,
    analysis: q,
  };
}
