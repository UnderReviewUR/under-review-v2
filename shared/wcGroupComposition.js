/**
 * World Cup 2026 — group composition (4 teams: 1 Favorite, 1 Contender, 2 Longshots).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { wcTeamsWithStrengthTags } from "./wc2026Strength.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { isWcGroupSlateQuestion } from "./wcUrTakeIntent.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  classifyWcAdvancementMarket,
  WC_ADVANCEMENT_MARKET,
} from "./wcAdvancementMarket.js";
import {
  isWcCrossGroupMispriceQuestion,
  isWcRunnerUpValueFollowUp,
  extractWcRunnerUpFromHistory,
  buildWcSimAttributionLabel,
  extractWcModelAttributionPrefix,
} from "./wcTakeRetentionQA.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import {
  computeGroupMispriceRankings,
  computeGroupPathComparisons,
} from "./wcGroupMispriceRanking.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";
import {
  formatWcBdlAdvancePriceAttribution,
  WC_ADVANCEMENT_TO_BDL_MARKET,
} from "./wcBdlFutures.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

const COUNT_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  1: 1,
  2: 2,
  3: 3,
};

/**
 * @param {string} letter
 */
export function getWcGroupComposition(letter) {
  const L = String(letter || "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  if (!GROUP_LETTERS.includes(L)) return null;

  const teams = wcTeamsWithStrengthTags(WC_2026_TEAMS.filter((t) => t.group === L));
  const favorite = teams.find((t) => t.strengthTag === "Favorite") || null;
  const contender = teams.find((t) => t.strengthTag === "Contender") || null;
  const longshots = teams.filter((t) => t.strengthTag === "Longshot");

  return {
    letter: L,
    teams,
    favorite,
    contender,
    longshots,
  };
}

/**
 * @param {string} abbr
 */
export function wcGroupLetterForTeam(abbr) {
  const key = String(abbr || "").toUpperCase();
  const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === key);
  return team?.group ? String(team.group).toUpperCase() : null;
}

/**
 * @param {string} text
 */
export function extractGroupLetterFromText(text) {
  const blob = String(text || "");
  const explicit = blob.match(/\bgroup\s+([a-l])\b/i);
  if (explicit) return String(explicit[1]).toUpperCase();

  const mentioned = extractMentionedWcTeams(blob);
  const letters = new Set(
    mentioned.map((abbr) => wcGroupLetterForTeam(abbr)).filter(Boolean),
  );
  if (letters.size === 1) return [...letters][0];
  return null;
}

/**
 * @param {string} question
 */
export function extractGroupLetterFromQuestion(question) {
  return extractGroupLetterFromText(question);
}

/**
 * @param {string} letter
 */
export function formatWcGroupCompositionPromptBlock(letter) {
  const comp = getWcGroupComposition(letter);
  if (!comp) return "";

  const teamLines = comp.teams.map(
    (t) => `  - ${t.name} (${t.abbreviation}): ${t.strengthTag}`,
  );
  const longNames = comp.longshots.map((t) => t.name).join(" and ");

  return `GROUP ${comp.letter} — BINDING COMPOSITION (exactly 4 teams):
${teamLines.join("\n")}
Rules for Group ${comp.letter}:
- There is exactly ONE Favorite, ONE Contender, and TWO Longshots (${longNames}).
- Never say "three longshots" or list three longshot teams for this group.
- When you describe Group ${comp.letter}, name all four teams with the tags above.
- ${comp.contender?.name || "The Contender"} is the Contender — not a Longshot.`;
}

/**
 * @param {string} text
 * @param {string | null | undefined} groupLetter
 */
export function detectWcGroupMathMismatch(text, groupLetter) {
  const letter =
    groupLetter || extractGroupLetterFromText(text);
  if (!letter) return null;

  const comp = getWcGroupComposition(letter);
  if (!comp) return null;

  const blob = String(text || "");
  const issues = [];

  const countPhrase = blob.match(
    /\b(one|two|three|1|2|3)\s+long\s*shots?\b/i,
  );
  if (countPhrase) {
    const stated = COUNT_WORDS[String(countPhrase[1]).toLowerCase()];
    if (stated != null && stated !== comp.longshots.length) {
      issues.push({
        code: "wc_group_longshot_count",
        stated,
        expected: comp.longshots.length,
        letter: comp.letter,
      });
    }
  }

  if (/\bthree\s+long\s*shots?\b/i.test(blob) && comp.longshots.length !== 3) {
    issues.push({
      code: "wc_group_longshot_count",
      stated: 3,
      expected: comp.longshots.length,
      letter: comp.letter,
    });
  }

  const parenList = blob.match(/long\s*shots?\s*\(([^)]+)\)/i);
  if (parenList) {
    const inner = parenList[1];
    const parts = inner.split(/,|&|and/).map((s) => s.trim()).filter(Boolean);
    if (parts.length !== comp.longshots.length) {
      issues.push({
        code: "wc_group_longshot_list_count",
        stated: parts.length,
        expected: comp.longshots.length,
        letter: comp.letter,
      });
    }
    for (const ls of comp.longshots) {
      if (!textMentionsWcTeam(inner, ls.abbreviation) && !textMentionsWcTeam(blob, ls.abbreviation)) {
        issues.push({
          code: "wc_group_longshot_missing",
          team: ls.abbreviation,
          letter: comp.letter,
        });
      }
    }
  }

  if (comp.contender) {
    const contName = comp.contender.name;
    const wrongTier = new RegExp(
      `\\b${contName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[^.]{0,50}\\blong\\s*shot\\b`,
      "i",
    );
    if (wrongTier.test(blob)) {
      issues.push({
        code: "wc_group_contender_as_longshot",
        team: comp.contender.abbreviation,
        letter: comp.letter,
      });
    }
  }

  return issues.length ? { letter: comp.letter, issues } : null;
}

const GROUP_ROSTER_WINDOW_CHARS = 700;
const DEFAULT_CROSS_GROUP_LETTERS = ["D", "I", "K"];
const MAX_GROUP_BINDING_BLOCKS = 4;

/**
 * Detect WC teams named in the same sentence as Group X when their canonical group differs.
 * @param {string} text
 */
export function detectWcGroupRosterMismatch(text) {
  const blob = String(text || "");
  /** @type {Array<{ code: string, team: string, statedGroup: string, actualGroup: string | null }>} */
  const issues = [];

  const sentences = blob.split(/(?<=[.!?])\s+|\n+/);
  for (const sent of sentences) {
    const groupMatch = sent.match(/\bgroup\s+([a-l])\b/i);
    if (!groupMatch) continue;

    const statedGroup = String(groupMatch[1]).toUpperCase();
    const comp = getWcGroupComposition(statedGroup);
    if (!comp) continue;

    const mentioned = extractMentionedWcTeams(sent);
    for (const abbr of mentioned) {
      const actual = wcGroupLetterForTeam(abbr);
      if (actual && actual !== statedGroup) {
        issues.push({
          code: "wc_group_roster_mismatch",
          team: abbr,
          statedGroup,
          actualGroup: actual,
        });
      }
    }
  }

  return issues.length ? { issues } : null;
}

/**
 * @param {string[]} letters
 */
export function buildWcGroupBindingPromptBlocks(letters) {
  const unique = [
    ...new Set(
      (letters || [])
        .map((l) => String(l || "").trim().toUpperCase().slice(0, 1))
        .filter((l) => GROUP_LETTERS.includes(l)),
    ),
  ].sort();

  return unique.map((letter) => formatWcGroupCompositionPromptBlock(letter)).filter(Boolean).join("\n\n");
}

/**
 * Which group letters need binding composition blocks in the model prompt.
 * @param {string} question
 * @param {{
 *   wcIntent?: string,
 *   mentionedTeams?: string[],
 *   topMispriceGroups?: string[],
 * }} [opts]
 */
export function resolveWcGroupLettersForPrompt(question, opts = {}) {
  const q = String(question || "").trim();
  const explicit = extractGroupLetterFromQuestion(q);
  if (explicit) return [explicit];

  const fromTeams = (opts.mentionedTeams || [])
    .map((abbr) => wcGroupLetterForTeam(String(abbr)))
    .filter(Boolean);

  if (fromTeams.length) {
    return [...new Set(fromTeams)];
  }

  const crossGroup =
    isWcGroupSlateQuestion(q) ||
    /\b(best|top|single)\b[\s\S]{0,48}\bgroup[\s-]*stage\b/i.test(q) ||
    /\bgroup[\s-]*stage\s+value\b/i.test(q);

  if (crossGroup || opts.wcIntent === WC_INTENT.STRUCTURAL) {
    const letters = [];
    if (Array.isArray(opts.topMispriceGroups) && opts.topMispriceGroups.length) {
      letters.push(...opts.topMispriceGroups.slice(0, 3));
    } else {
      letters.push(...DEFAULT_CROSS_GROUP_LETTERS);
    }
    return [...new Set(letters.map((l) => String(l).toUpperCase().slice(0, 1)))].sort().slice(
      0,
      MAX_GROUP_BINDING_BLOCKS,
    );
  }

  return [];
}

/**
 * Broad cross-group value / misprice questions — use deterministic prebuilt when unscoped.
 * @param {string} question
 * @param {string} [wcIntent]
 */
export function shouldUseWcCrossGroupValuePrebuilt(question, wcIntent) {
  const q = String(question || "").trim();
  if (!q) return false;
  const routingQ = extractLatestUserTurnForRouting(q);
  if (isWcRunnerUpValueFollowUp(routingQ) || isWcRunnerUpValueFollowUp(q)) return false;
  if (extractGroupLetterFromQuestion(routingQ)) return false;
  if (extractMentionedWcTeams(routingQ).length > 0) return false;
  if (isWcCrossGroupMispriceQuestion(routingQ)) return true;
  return (
    (isWcGroupSlateQuestion(routingQ) || wcIntent === WC_INTENT.STRUCTURAL) &&
    (/\b(best|top|single)\b[\s\S]{0,48}\bgroup[\s-]*stage\b/i.test(routingQ) ||
      /\bgroup[\s-]*stage\s+value\b/i.test(routingQ))
  );
}

/**
 * @param {{
 *   teamStats?: Record<string, Record<string, unknown>>,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number, americanDisplay?: string }>> },
 *   question?: string,
 *   nowMs?: number,
 * }} [opts]
 */
/**
 * Second-place / escape path where sim sits near a coin flip but books disagree most.
 * @param {string} groupLetter
 * @param {Record<string, Record<string, unknown>> | undefined} teamStats
 * @param {{ byMarketType?: Record<string, Record<string, { american?: number, americanDisplay?: string }>> } | undefined} bdlFutures
 * @param {number} [nowMs]
 */
export function pickWcCoinFlipSecondPlacePath(groupLetter, teamStats, bdlFutures, nowMs) {
  const rows = computeGroupPathComparisons({
    groupLetter,
    teamStats,
    bdlFutures,
    nowMs,
  });
  const escapeRows = rows.filter(
    (r) =>
      r.path === "advance from group" &&
      Number.isFinite(r.simPct) &&
      r.simPct >= 38 &&
      r.simPct <= 62 &&
      Number.isFinite(r.delta),
  );
  escapeRows.sort((a, b) => Math.abs(Number(b.delta)) - Math.abs(Number(a.delta)));
  return escapeRows[0] || null;
}

export function buildWcCrossGroupValuePrebuiltStructured(opts = {}) {
  const question = String(opts.question || "");
  const mispriceQ = isWcCrossGroupMispriceQuestion(question);
  const market = classifyWcAdvancementMarket(question) || WC_ADVANCEMENT_MARKET.GROUP_ESCAPE;
  const bdlType = WC_ADVANCEMENT_TO_BDL_MARKET[market] || "qualify_from_group";
  const ranked = computeGroupMispriceRankings({
    teamStats: opts.teamStats,
    bdlFutures: opts.bdlFutures,
    question,
    nowMs: opts.nowMs,
    topN: mispriceQ ? 2 : 1,
  });
  if (!ranked.length) {
    return null;
  }

  const top = ranked[0];
  const priceRow = opts.bdlFutures?.byMarketType?.[bdlType]?.[top.teamAbbr];
  const advanceOdds =
    priceRow?.americanDisplay ||
    (priceRow?.american != null ? String(priceRow.american) : null);

  const base = buildWcGroupSlatePrebuiltStructured({
    groupLetter: top.group,
    pickAbbr: top.teamAbbr,
    pickMarket: market === WC_ADVANCEMENT_MARKET.GROUP_WINNER ? "to win Group" : "to advance",
    advanceOdds,
    simPct: top.simPct,
    impliedPct: top.impliedPct,
    delta: top.delta,
    bdlFutures: opts.bdlFutures,
    bdlMarketType: bdlType,
    bdlLastUpdated: opts.bdlFutures?.lastUpdated,
    nowMs: opts.nowMs,
  });
  if (!base || !mispriceQ || ranked.length < 2) return base;

  const second = ranked[1];
  const deltaTop = `${top.delta >= 0 ? "+" : ""}${top.delta.toFixed(1)}pt`;
  const deltaSecond = `${second.delta >= 0 ? "+" : ""}${second.delta.toFixed(1)}pt`;
  const modelAttribution = wcModelAttributionFooter(opts.bdlFutures?.lastUpdated, opts.nowMs);
  const coinFlip = pickWcCoinFlipSecondPlacePath(
    second.group,
    opts.teamStats,
    opts.bdlFutures,
    opts.nowMs,
  );
  const coinFlipLine =
    coinFlip && Number.isFinite(coinFlip.impliedPct) && Number.isFinite(coinFlip.simPct)
      ? `Coin-flip path: Group ${second.group} — ${coinFlip.teamAbbr} to advance is ${coinFlip.simPct.toFixed(1)}% in UR sims vs ${coinFlip.impliedPct.toFixed(1)}% market (${coinFlip.delta >= 0 ? "+" : ""}${coinFlip.delta.toFixed(1)}pt) — books still wrong on the second-place escape.`
      : `Coin-flip watch: Group ${second.group} — ${second.teamAbbr} advance path (${second.impliedPct.toFixed(1)}% market vs ${second.simPct.toFixed(1)}% sim, ${deltaSecond}).`;
  const whyNow =
    `The market prices ${top.teamAbbr} to advance at ${top.impliedPct.toFixed(1)}% implied, but UR sims put the escape path at ${top.simPct.toFixed(1)}% (${deltaTop}). Runner-up gap: Group ${second.group} — ${second.teamAbbr} is ${second.impliedPct.toFixed(1)}% market vs ${second.simPct.toFixed(1)}% sim (${deltaSecond}). ${coinFlipLine}`.slice(
      0,
      520,
    );
  const deep = buildWcGroupSlateDeepBreakdown({
    letter: top.group,
    pickAbbr: top.teamAbbr,
    whyNow,
    numericLine: base.line,
    pathLine: String(base.deep || "").includes("top-two")
      ? String(base.deep || "")
          .split("\n\n")
          .find((p) => /top-two finish/i.test(p)) || ""
      : "",
    edge: base.edge,
    bdlFutures: opts.bdlFutures,
    bdlMarketType: bdlType,
    extraBlocks: [coinFlipLine],
  });

  return {
    ...base,
    call: `Group ${top.group} most mispriced (#1); Group ${second.group} runner-up`.slice(
      0,
      100,
    ),
    lean: `Lean: ${top.teamAbbr} to advance in Group ${top.group}${advanceOdds ? ` at ${advanceOdds}` : ""}.`.slice(
      0,
      120,
    ),
    whyNow,
    deep,
    breakdownAvailable: Boolean(deep.trim()),
    modelAttribution,
    runnerUpGroupLetter: second.group,
    runnerUpTeamAbbr: second.teamAbbr,
    primaryMispriceGroupLetter: top.group,
    coinFlipGroupLetter: coinFlip ? second.group : null,
    coinFlipTeamAbbr: coinFlip?.teamAbbr || second.teamAbbr,
  };
}

/**
 * Deterministic runner-up follow-up — group letter resolved from prior take history.
 * @param {{
 *   groupLetter: string,
 *   pickAbbr?: string | null,
 *   teamStats?: Record<string, Record<string, unknown>>,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number, americanDisplay?: string }>>, lastUpdated?: number },
 *   question?: string,
 *   nowMs?: number,
 * }} opts
 */
export function buildWcRunnerUpFollowUpPrebuiltStructured(opts = {}) {
  const groupLetter = String(opts.groupLetter || "")
    .trim()
    .toUpperCase()
    .slice(0, 1);
  if (!getWcGroupComposition(groupLetter)) return null;

  const ranked = computeGroupMispriceRankings({
    teamStats: opts.teamStats,
    bdlFutures: opts.bdlFutures,
    question: String(opts.question || ""),
    nowMs: opts.nowMs,
    topN: 12,
  });
  const groupRow = ranked.find((r) => r.group === groupLetter);

  let pickAbbr = opts.pickAbbr ? String(opts.pickAbbr).toUpperCase() : null;
  if (!pickAbbr && groupRow) pickAbbr = groupRow.teamAbbr;
  if (!pickAbbr) {
    const compFallback = getWcGroupComposition(groupLetter);
    pickAbbr =
      compFallback?.contender?.abbreviation ||
      compFallback?.longshots?.[0]?.abbreviation ||
      null;
  }
  if (!pickAbbr) return null;

  const bdlType = "qualify_from_group";
  const priceRow = opts.bdlFutures?.byMarketType?.[bdlType]?.[pickAbbr];
  const advanceOdds =
    priceRow?.americanDisplay ||
    (priceRow?.american != null ? String(priceRow.american) : null);

  const comp = getWcGroupComposition(groupLetter);
  const pick =
    comp?.teams.find((t) => String(t.abbreviation).toUpperCase() === pickAbbr) ||
    comp?.contender;
  const pickName = pick?.name || pickAbbr;
  const favName = comp?.favorite?.name || "the favorite";

  const base = buildWcGroupSlatePrebuiltStructured({
    groupLetter,
    pickAbbr,
    pickMarket: "to advance",
    advanceOdds,
    simPct: groupRow?.simPct,
    impliedPct: groupRow?.impliedPct,
    delta: groupRow?.delta,
    bdlFutures: opts.bdlFutures,
    bdlLastUpdated: opts.bdlFutures?.lastUpdated,
    nowMs: opts.nowMs,
  });
  if (!base) return null;

  const deltaStr =
    groupRow && Number.isFinite(groupRow.delta)
      ? `${groupRow.delta >= 0 ? "+" : ""}${groupRow.delta.toFixed(1)}pt`
      : null;

  const whyNow =
    groupRow && Number.isFinite(groupRow.simPct) && Number.isFinite(groupRow.impliedPct)
      ? `As the cross-group #2 misprice, the market implies ${pickName} is ${groupRow.impliedPct.toFixed(1)}% to advance in Group ${groupLetter}, but UR sims put the escape path at ${groupRow.simPct.toFixed(1)}% (${deltaStr}) — that gap is the runner-up value.`
      : base.whyNow;

  return {
    ...base,
    callType: "group_slate",
    runnerUpGroupLetter: groupLetter,
    runnerUpTeamAbbr: pickAbbr,
    call: `Group ${groupLetter} — runner-up value (${pickAbbr} advance misprice)`.slice(0, 100),
    lean: `Lean: ${pickName} to advance in Group ${groupLetter}${advanceOdds ? ` at ${advanceOdds}` : ""} — #2 board gap.`.slice(
      0,
      120,
    ),
    whyNow: String(whyNow).slice(0, 400),
    line:
      groupRow && Number.isFinite(groupRow.impliedPct) && Number.isFinite(groupRow.simPct)
        ? `Market ~${groupRow.impliedPct.toFixed(1)}% · UR sim ${groupRow.simPct.toFixed(1)}% · delta ${deltaStr || "n/a"}.`.slice(
            0,
            200,
          )
        : base.line,
  };
}

/**
 * Flagship group-slate pick when the board question is broad (no other group lock).
 * @param {string} question
 * @param {string} [wcIntent]
 */
export function shouldUseWcGroupSlatePrebuilt(question, wcIntent) {
  const q = String(question || "");
  if (!isWcGroupSlateQuestion(q) && wcIntent !== WC_INTENT.STRUCTURAL) return false;

  const market = classifyWcAdvancementMarket(q);
  if (market === WC_ADVANCEMENT_MARKET.GROUP_WINNER) return false;

  const mentioned = extractMentionedWcTeams(q);
  const explicitGroup = extractGroupLetterFromQuestion(q);

  if (explicitGroup && explicitGroup !== "D") return false;
  if (mentioned.length > 0 && !mentioned.includes("PAR")) return false;

  return (
    /\bbest value to advance from the group[\s-]*stage\b/i.test(q) ||
    /\bmispriced\s+longshot\b/i.test(q) ||
    (mentioned.length === 1 && mentioned[0] === "PAR")
  );
}

/** @param {number | null | undefined} lastUpdatedMs @param {number} [nowMs] */
function wcModelAttributionFooter(lastUpdatedMs, nowMs = Date.now()) {
  const raw = buildWcSimAttributionLabel(lastUpdatedMs, nowMs);
  return extractWcModelAttributionPrefix(raw).attribution;
}

/**
 * @param {{
 *   letter: string,
 *   pickName: string,
 *   favName: string,
 *   odds?: string,
 *   simPct?: number,
 *   impliedPct?: number,
 *   delta?: number,
 * }} row
 */
/**
 * Numeric delta for card-face LINE slot (not path prose).
 * @param {{ odds?: string, simPct?: number, impliedPct?: number, delta?: number }} row
 */
export function formatWcGroupSlateNumericLine(row = {}) {
  const { odds, simPct, impliedPct, delta } = row;
  if (Number.isFinite(simPct) && Number.isFinite(impliedPct)) {
    const sign = Number.isFinite(delta)
      ? `${delta >= 0 ? "+" : ""}${Number(delta).toFixed(1)}pt`
      : "n/a";
    return `Market ~${impliedPct.toFixed(1)}% · UR sim ${simPct.toFixed(1)}% · delta ${sign}.`;
  }
  if (odds) {
    return `Advance line ${odds} · sim gap pending fresh board.`;
  }
  return "";
}

/** @param {string} line */
export function isWcGroupAdvancementPathProse(line) {
  return /\bneeds a top-two finish\b|\bpath is not finishing\b|\bnot finishing last on points\b/i.test(
    String(line || ""),
  );
}

/**
 * Move path prose off the LINE slot; keep numeric delta on the card face.
 * @param {object | null | undefined} structured
 */
export function repairWcGroupSlateStructuredLine(structured) {
  if (!structured || typeof structured !== "object") return structured;
  const ct = String(structured.callType || "").toLowerCase();
  if (ct !== "group_slate" && ct !== "advancement") return structured;

  const line = String(structured.line || "").trim();
  if (!line || !isWcGroupAdvancementPathProse(line)) return structured;

  const why = String(structured.whyNow || "").trim();
  const impliedMatch = why.match(/(?:market|implies)[^.]*?(\d+\.?\d*)\s*%/i);
  const simMatch = why.match(/(?:UR sims?|sims? put)[^.]*?(\d+\.?\d*)\s*%/i);
  const deltaMatch = why.match(/\(([+-]?\d+\.?\d*)pt\)/i);

  let numericLine = "";
  if (impliedMatch && simMatch) {
    numericLine = formatWcGroupSlateNumericLine({
      impliedPct: parseFloat(impliedMatch[1]),
      simPct: parseFloat(simMatch[1]),
      delta: deltaMatch ? parseFloat(deltaMatch[1]) : undefined,
    });
  }

  const deepParts = [
    line,
    String(structured.deep || "").trim(),
    String(structured.edge || "").trim(),
  ].filter(Boolean);
  const deep = deepParts.join("\n\n").slice(0, 500);

  return {
    ...structured,
    line: numericLine || "",
    deep,
    breakdownAvailable: Boolean(deep.trim()),
  };
}

/**
 * Force deterministic runner-up follow-up card even after LLM delivery.
 * @param {string} question
 * @param {object[]} history
 * @param {object} [opts]
 */
export function resolveWcRunnerUpFollowUpDelivery(question, history, opts = {}) {
  if (!isWcRunnerUpValueFollowUp(String(question || ""))) return null;
  const { group, teamAbbr } = extractWcRunnerUpFromHistory(Array.isArray(history) ? history : []);
  if (!group) return null;
  return buildWcRunnerUpFollowUpPrebuiltStructured({
    groupLetter: group,
    pickAbbr: teamAbbr,
    teamStats: opts.teamStats,
    bdlFutures: opts.bdlFutures,
    question: String(question || ""),
    nowMs: opts.nowMs,
  });
}

function buildWcGroupSlateWhyNow(row) {
  const { letter, pickName, favName, odds, simPct, impliedPct, delta } = row;
  if (Number.isFinite(simPct) && Number.isFinite(impliedPct) && Number.isFinite(delta)) {
    const sign = delta >= 0 ? "+" : "";
    return `The market implies ${pickName} is ${impliedPct.toFixed(1)}% to advance, but UR sims put it at ${simPct.toFixed(1)}% (${sign}${delta.toFixed(1)}pt) — the favorite (${favName}) path looks priced too aggressively in Group ${letter}.`;
  }
  if (odds) {
    return `Market has ${pickName} to advance at ${odds}; sim-vs-market gap needs fresh lines — structural value still runs through top-two, not finishing last behind ${favName}.`;
  }
  return `Live advance odds for ${pickName} are not in context — cannot quantify the misprice; path is top-two in Group ${letter} without finishing last on points behind ${favName}.`;
}

/**
 * @param {string} letter
 */
function formatWcGroupCompositionLine(letter) {
  const comp = getWcGroupComposition(letter);
  if (!comp) return "";
  const fav = comp.favorite?.name || "favorite";
  const con = comp.contender?.name || "contender";
  const longs = comp.longshots.map((t) => t.name).join(" and ");
  return `Group ${letter} is four teams: ${fav} (Favorite), ${con} (Contender), ${longs} (Longshots).`;
}

/**
 * Premium card breakdown — sim vs market, BDL GOAT line, roster context, path, watch-for.
 * @param {{
 *   letter: string,
 *   pickAbbr: string,
 *   whyNow?: string,
 *   numericLine?: string,
 *   pathLine?: string,
 *   edge?: string,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number, americanDisplay?: string, vendor?: string }>>, lastUpdated?: number, source?: string },
 *   bdlMarketType?: string,
 *   extraBlocks?: string[],
 * }} opts
 */
export function buildWcGroupSlateDeepBreakdown(opts = {}) {
  const letter = String(opts.letter || "").toUpperCase();
  const pickAbbr = String(opts.pickAbbr || "").toUpperCase();
  const bdlLine = formatWcBdlAdvancePriceAttribution(
    pickAbbr,
    opts.bdlFutures,
    opts.bdlMarketType || "qualify_from_group",
  );
  const parts = [
    String(opts.whyNow || "").trim(),
    String(opts.numericLine || "").trim(),
    bdlLine,
    formatWcGroupCompositionLine(letter),
    String(opts.pathLine || "").trim(),
    ...(Array.isArray(opts.extraBlocks) ? opts.extraBlocks.map((b) => String(b || "").trim()) : []),
    String(opts.edge || "").trim(),
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 1100);
}

/**
 * @param {{
 *   groupLetter?: string,
 *   pickAbbr?: string,
 *   pickMarket?: string,
 *   advanceOdds?: string | null,
 *   simPct?: number,
 *   impliedPct?: number,
 *   delta?: number,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number, americanDisplay?: string, vendor?: string }>>, lastUpdated?: number, source?: string },
 *   bdlMarketType?: string,
 *   bdlLastUpdated?: number,
 *   nowMs?: number,
 * }} [opts]
 */
export function buildWcGroupSlatePrebuiltStructured(opts = {}) {
  const letter = String(opts.groupLetter || "D").toUpperCase();
  const pickAbbr = String(opts.pickAbbr || "PAR").toUpperCase();
  const comp = getWcGroupComposition(letter);
  if (!comp) return null;

  const pick =
    comp.teams.find((t) => String(t.abbreviation).toUpperCase() === pickAbbr) ||
    comp.contender;
  if (!pick) return null;

  const market = String(opts.pickMarket || "to advance").trim();
  const odds = opts.advanceOdds ? String(opts.advanceOdds).trim() : "";
  const fav = comp.favorite?.name || "the favorite";

  const call = `${pick.name} in Group ${letter} — best group-stage value (${market})`;
  const pathLine = `${pick.name} needs a top-two finish in Group ${letter} — the path is not finishing last on points behind ${fav}.`;
  const numericLine = formatWcGroupSlateNumericLine({
    odds,
    simPct: opts.simPct,
    impliedPct: opts.impliedPct,
    delta: opts.delta,
  });
  const lean = `Lean: ${pick.name} ${market}${odds ? ` at ${odds}` : ""} in Group ${letter}.`;
  const whyNow = buildWcGroupSlateWhyNow({
    letter,
    pickName: pick.name,
    favName: fav,
    odds,
    simPct: opts.simPct,
    impliedPct: opts.impliedPct,
    delta: opts.delta,
  }).slice(0, 400);
  const modelAttribution = wcModelAttributionFooter(opts.bdlLastUpdated, opts.nowMs);
  const edge = odds
    ? `If ${pick.name} advance odds drift wider than ${odds}, pass — lock only while the price still prices a second-place path.`
    : `Watch the ${fav} vs ${pick.name} opener — a point or better for ${pick.name} should tighten advance prices.`;
  const deep = buildWcGroupSlateDeepBreakdown({
    letter,
    pickAbbr,
    whyNow,
    numericLine,
    pathLine,
    edge,
    bdlFutures: opts.bdlFutures,
    bdlMarketType: opts.bdlMarketType || "qualify_from_group",
  });

  return {
    sport: "worldcup",
    callType: "group_slate",
    groupLetter: letter,
    lean: lean.slice(0, 120),
    call: call.slice(0, 100),
    line: (numericLine || pathLine).slice(0, 200),
    deep,
    breakdownAvailable: Boolean(deep.trim()),
    whyNow,
    edge: edge.slice(0, 200),
    modelAttribution,
    confidence: Number.isFinite(opts.delta) ? (Math.abs(Number(opts.delta)) >= 15 ? "Medium" : "Speculative") : odds ? "Medium" : "Speculative",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}
