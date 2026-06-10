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
  buildWcSimAttributionLabel,
} from "./wcTakeRetentionQA.js";
import { computeGroupMispriceRankings } from "./wcGroupMispriceRanking.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";

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
  if (!q || extractGroupLetterFromQuestion(q)) return false;
  if (extractMentionedWcTeams(q).length > 0) return false;
  if (isWcCrossGroupMispriceQuestion(q)) return true;
  return (
    (isWcGroupSlateQuestion(q) || wcIntent === WC_INTENT.STRUCTURAL) &&
    (/\b(best|top|single)\b[\s\S]{0,48}\bgroup[\s-]*stage\b/i.test(q) ||
      /\bgroup[\s-]*stage\s+value\b/i.test(q))
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
export function buildWcCrossGroupValuePrebuiltStructured(opts = {}) {
  const question = String(opts.question || "");
  const mispriceQ = isWcCrossGroupMispriceQuestion(question);
  const ranked = computeGroupMispriceRankings({
    teamStats: opts.teamStats,
    bdlFutures: opts.bdlFutures,
    question,
    nowMs: opts.nowMs,
    topN: mispriceQ ? 2 : 1,
  });
  if (!ranked.length) {
    return buildWcGroupSlatePrebuiltStructured({
      groupLetter: "K",
      pickAbbr: "COL",
      pickMarket: "to advance",
    });
  }

  const top = ranked[0];
  const bdlType = "qualify_from_group";
  const priceRow = opts.bdlFutures?.byMarketType?.[bdlType]?.[top.teamAbbr];
  const advanceOdds =
    priceRow?.americanDisplay ||
    (priceRow?.american != null ? String(priceRow.american) : null);

  const base = buildWcGroupSlatePrebuiltStructured({
    groupLetter: top.group,
    pickAbbr: top.teamAbbr,
    pickMarket: "to advance",
    advanceOdds,
  });
  if (!base || !mispriceQ || ranked.length < 2) return base;

  const second = ranked[1];
  const simLabel = buildWcSimAttributionLabel(opts.bdlFutures?.lastUpdated, opts.nowMs);
  const deltaTop = `${top.delta >= 0 ? "+" : ""}${top.delta.toFixed(1)}pt`;
  const deltaSecond = `${second.delta >= 0 ? "+" : ""}${second.delta.toFixed(1)}pt`;
  const comp = getWcGroupComposition(top.group);
  const longList = comp?.longshots?.map((t) => t.name).join(" and ") || "the longshots";
  const fav = comp?.favorite?.name || "the favorite";
  const cont = comp?.contender?.name || top.teamAbbr;

  return {
    ...base,
    call: `Group ${top.group} most mispriced (#1); Group ${second.group} runner-up`.slice(0, 100),
    lean: `Lean: Group ${top.group} — ${top.teamAbbr} advancement misprice (${deltaTop} sim vs market).`.slice(
      0,
      120,
    ),
    whyNow: `${simLabel} #1 Group ${top.group} (${top.teamAbbr} sim ${top.simPct.toFixed(1)}% vs market ${top.impliedPct.toFixed(1)}%, ${deltaTop}). Runner-up Group ${second.group} (${second.teamAbbr}, ${deltaSecond}). Group ${top.group}: ${fav} (Favorite), ${cont} (Contender), ${longList} (Longshots).`.slice(
      0,
      400,
    ),
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

/**
 * @param {{
 *   groupLetter?: string,
 *   pickAbbr?: string,
 *   pickMarket?: string,
 *   advanceOdds?: string | null,
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
  const longList = comp.longshots.map((t) => t.name).join(" and ");
  const fav = comp.favorite?.name || "the favorite";
  const cont = comp.contender?.name || pick.name;

  const call = `${pick.name} in Group ${letter} — best group-stage value (${market})`;
  const pathLine = `${pick.name} needs a top-two finish in Group ${letter} — the path is not finishing last on points behind ${fav}.`;
  const lean = `Lean: ${pick.name} ${market}${odds ? ` at ${odds}` : ""} in Group ${letter}.`;
  const whyNow = `Group ${letter} is four teams: ${fav} (Favorite), ${cont} (Contender), ${longList} (Longshots).`;
  const edge = odds
    ? `If ${pick.name} advance odds drift wider than ${odds}, pass — lock only while the price still prices a second-place path.`
    : `Watch the ${fav} vs ${pick.name} opener — a point or better for ${pick.name} should tighten advance prices.`;

  return {
    sport: "worldcup",
    callType: "group_slate",
    groupLetter: letter,
    lean: lean.slice(0, 120),
    call: call.slice(0, 100),
    line: pathLine.slice(0, 200),
    whyNow: whyNow.slice(0, 400),
    edge: edge.slice(0, 200),
    confidence: odds ? "Medium" : "Speculative",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}
