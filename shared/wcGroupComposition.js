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
    /\b(best|top|cleanest|mispriced)\b.*\b(group[\s-]*stage|advancement|advance)\b/i.test(q) ||
    /\bgroup[\s-]*stage\s+value\b/i.test(q) ||
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
  const lean = `Lean: ${pick.name} ${market}${odds ? ` at ${odds}` : ""} in Group ${letter}.`;
  const whyNow = `Group ${letter} is four teams: ${fav} (Favorite), ${cont} (Contender), ${longList} (Longshots). ${pick.name} only needs a top-two finish — they advance in most realistic tables where they are not last on points behind ${fav}.`;

  return {
    sport: "worldcup",
    callType: "group_slate",
    groupLetter: letter,
    lean: lean.slice(0, 120),
    call: call.slice(0, 100),
    whyNow: whyNow.slice(0, 400),
    edge: odds
      ? `Cite ${pick.abbreviation} ${odds} from VERIFIED CONTEXT when claiming mispriced.`
      : "Structural path — recheck advancement price in VERIFIED CONTEXT.",
    confidence: "Speculative",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}
