/**
 * World Cup UR Take — player / Golden Boot / top scorer question contract.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_INTENT,
  classifyWcPlayerMarketIntent,
} from "./wcUrTakeIntent.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";
import {
  resolveWcPlayerMarketAnswer,
  resolveWcPlayerMarketTier,
  tierMetaFor,
} from "./wcPlayerMarketResolve.js";
import {
  buildWcSgpComboPassHeadline,
  detectWcSgpComboIntent,
} from "./wcUrTakePhilosophy.js";

const SCORING_PRED_RE =
  /\b(will score|scores the most|score the most|top scorer|most goals|golden boot|leading scorer)\b/i;

const PASS_SIGNAL_RE =
  /\b(player market|player-specific|confirmed lineups|golden boot|top scorer|pre-match|team-level angle|cannot name a player|pass\b|not supported)\b/i;

const NO_VERIFIED_LINE_RE =
  /\b(no verified line|no posted line|no actionable line|not in the (?:market |current )?feed|line (?:is )?not (?:posted|listed|available)|pass until)\b/i;

/** @typedef {typeof WC_INTENT.PLAYER_PROP | typeof WC_INTENT.GOLDEN_BOOT | typeof WC_INTENT.TOP_SCORER} WcPlayerMarketIntent */

/**
 * @param {string} intent
 */
export function isWcPlayerMarketIntent(intent) {
  const i = String(intent || "");
  return (
    i === WC_INTENT.PLAYER_PROP ||
    i === WC_INTENT.GOLDEN_BOOT ||
    i === WC_INTENT.TOP_SCORER ||
    i === WC_INTENT.TOP_GOALSCORERS_LIST
  );
}

export { classifyWcPlayerMarketIntent };

/**
 * @param {string} question
 */
export function questionAsksForWcPlayerMarket(question) {
  return classifyWcPlayerMarketIntent(question) != null;
}

/**
 * @param {object | null | undefined} wcContext
 */
export function wcContextHasVerifiedScorerGrounding(wcContext) {
  if (!wcContext || typeof wcContext !== "object") return false;
  const details = Array.isArray(wcContext.matchDetails) ? wcContext.matchDetails : [];
  for (const d of details) {
    if (d?.lineupConfirmed !== true) continue;
    for (const side of ["home", "away"]) {
      const rows = d?.players?.[side];
      if (!Array.isArray(rows)) continue;
      const named = rows.filter((p) => String(p?.name || p?.displayName || "").trim().length > 2);
      if (named.length >= 2) return true;
    }
  }
  return false;
}

/**
 * @deprecated Use resolveWcPlayerMarketAnswer — only true when KV has zero player names.
 * @param {{ wcContext?: object | null }} opts
 */
export function shouldForceWcPlayerMarketPass(opts = {}) {
  const kv = opts.wcContext?.playerMarketKv;
  const resolved = resolveWcPlayerMarketAnswer(
    "",
    opts.wcContext?.wcIntent || WC_INTENT.TOP_SCORER,
    opts.wcContext,
    kv,
  );
  return resolved.forcePass;
}

/**
 * @param {string} wcIntent
 */
export function formatWcPlayerMarketPassLabel(wcIntent) {
  if (wcIntent === WC_INTENT.GOLDEN_BOOT) return "Golden Boot";
  if (wcIntent === WC_INTENT.TOP_SCORER) return "top scorer";
  if (wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST) return "top goalscorers";
  return "player-specific";
}

/**
 * @param {string} wcIntent
 */
export function formatWcPlayerMarketPromptRules(wcIntent) {
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  if (wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST) {
    return `PLAYER MARKET (${label}) — binding:
  User wants a RANKED LIST (typically five players) — not a single Golden Boot lean from the prior turn.
  Name each player with American odds from GOLDEN BOOT / TOP SCORER ODDS in VERIFIED CONTEXT (numbered list).
  You may keep the prior #1 if still valid, but MUST add the rest of the board — never repeat only one name.`;
  }
  return `PLAYER MARKET (${label}) — binding:
  Answer with a named PLAYER from PLAYER MARKETS — VERIFIED CONTEXT (never only a country/national team as the pick).
  Cite the player full name in sentence one. When MATCH PLAYER PROPS exist for the pinned fixture, use the matching market block (scorer, assists O/U, shots/SOT O/U, card) and cite only listed American prices.
  When only GOLDEN BOOT / TOP SCORER ODDS exist, cite American prices from that block for scoring asks.
  If the asked market is missing from MATCH PLAYER PROPS, say Pass / no verified line — do not invent prices.
  SHOTS vs SOT: if the user asks "shots" or "2.5 shots", discuss total shots only — do not substitute shots-on-target/SOT unless they asked SOT explicitly.
  PASS CARD FACE: HEADLINE ≤18 words — e.g. "No posted Son shots line — Pass." Put feed/context detail in WHY, not the headline.
  If tier is Early Contenders or lineups are not confirmed, say so once — still list named players with available odds or form.
  NATIONAL TEAM ONLY: never cite club teams or domestic leagues (Premier League, Spurs, etc.) — use Korea/South Korea national team, tournament stats, and fixture context from VERIFIED CONTEXT.`;
}

/**
 * Market label echoed back to the user (shots vs SOT vs generic).
 * @param {string} question
 */
export function detectWcPlayerPropMarketLabel(question) {
  const q = String(question || "").trim();
  if (!q) return "player prop";
  if (/\b(score|goal)\s+or\s+assist\b/i.test(q)) return "goal or assist";
  if (/\bshots?\s+on\s+target\b|\bsot\b/i.test(q)) return "shots on target";
  if (/\d+\.?\d*\s*shots?\b/i.test(q) || /\bshots?\s*(?:o\/u|over|under)\b/i.test(q)) {
    return "shots";
  }
  if (/\bassist/i.test(q)) return "assists";
  if (/\b(?:score|scorer|goal)/i.test(q)) return "scoring";
  return "player prop";
}

/**
 * @param {string} question
 */
export function extractWcPlayerPropNameHint(question) {
  const q = String(question || "").trim();
  if (!q) return "Player";
  const m = q.match(
    /^([A-Za-zÀ-ÿ][\wÀ-ÿ' -]*?)(?:\s+(?:\d|o\/u|over|under|to\s+)|\s*\d+\.?\d*|\?|$)/i,
  );
  const raw = String(m?.[1] || "").trim();
  if (!raw || raw.length < 2) return "Player";
  return raw.split(/\s+/).slice(0, 3).join(" ");
}

/**
 * @param {string} question
 */
export function buildWcPlayerPropPassHeadline(question) {
  const player = extractWcPlayerPropNameHint(question);
  const market = detectWcPlayerPropMarketLabel(question);
  return `No posted ${player} ${market} line — Pass.`;
}

/**
 * @param {object | null | undefined} structured
 * @param {string} question
 */
export function isWcPlayerPropPassStructured(structured, question = "") {
  if (!structured || typeof structured !== "object") return false;
  const blob = `${structured.call || ""} ${structured.lean || ""} ${structured.line || ""} ${structured.whyNow || ""}`;
  if (/\bpass\b/i.test(blob) && NO_VERIFIED_LINE_RE.test(blob)) return true;
  if (NO_VERIFIED_LINE_RE.test(blob) && /\bpass\b/i.test(blob)) return true;
  const q = String(question || "").trim();
  if (q && NO_VERIFIED_LINE_RE.test(blob)) {
    return /\bpass\b/i.test(blob) || /\bno verified\b/i.test(blob);
  }
  return false;
}

/**
 * Shorten pass headlines and align market wording with the user ask.
 * @param {object} structured
 * @param {string} question
 */
export function repairWcPlayerPropPassCard(structured, question = "") {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcPlayerPropPassStructured(structured, question)) return structured;

  const out = { ...structured };
  const market = detectWcPlayerPropMarketLabel(question);
  const player = extractWcPlayerPropNameHint(question);
  const sgpCombo = detectWcSgpComboIntent(question);
  const headline = sgpCombo
    ? buildWcSgpComboPassHeadline(question)
    : buildWcPlayerPropPassHeadline(question);

  out.call = headline;
  if (sgpCombo) {
    out.lean = "Pass the SGP — legs share one script; wait for verified match prices.";
  } else if (!String(out.lean || "").trim() || wcCardPlayRestatesCall(out.lean, out.call)) {
    out.lean = `Pass — no verified ${market} line in the feed yet.`;
  }
  if (sgpCombo && !/\b(correlat|script|same.?game|share)\b/i.test(`${out.whyNow} ${out.edge}`)) {
    out.whyNow =
      String(out.whyNow || "").trim() ||
      "Player volume and team first-goal legs need the same early-lead script — not independent prices.";
  }
  let whyNow = String(out.whyNow || "").trim();
  if (whyNow && market === "shots") {
    if (/\bshots?-on-target\b/i.test(whyNow)) {
      whyNow = whyNow.replace(/\bshots?-on-target\b/gi, "shots");
    }
    if (/\bSOT\b/.test(whyNow)) {
      whyNow = whyNow.replace(/\bSOT\b/g, "shots");
    }
    out.whyNow = whyNow;
  }
  if (!String(out.edge || "").trim()) {
    out.edge = `Watch for ${player} in confirmed lineups once books post match ${market}.`;
  }
  return out;
}

function wcCardPlayRestatesCall(lean, call) {
  const l = String(lean || "")
    .replace(/^lean:\s*/i, "")
    .replace(/^pass\s*[—-]\s*/i, "")
    .trim()
    .toLowerCase();
  const c = String(call || "").trim().toLowerCase();
  if (!l || !c) return false;
  return l === c || l.includes(c) || c.includes(l);
}

/**
 * @param {string} question
 * @param {string} wcIntent
 * @param {object | null | undefined} wcContext
 */
export function resolveWcPlayerMarketResponse(question, wcIntent, wcContext) {
  const kvBlocks = wcContext?.playerMarketKv || null;
  const tier = resolveWcPlayerMarketTier({
    goldenBoot: kvBlocks?.goldenBoot,
    players: kvBlocks?.players,
    injuries: kvBlocks?.injuries,
    matchPlayerProps: kvBlocks?.matchPlayerProps,
    wcEventId: wcContext?.wcEventId || kvBlocks?.wcEventId,
    wcContext,
    wcIntent,
  });
  const meta = tierMetaFor(tier);

  const resolved = resolveWcPlayerMarketAnswer(question, wcIntent, wcContext, kvBlocks);

  if (resolved.forcePass) {
    return {
      forcePass: true,
      tier: resolved.tier,
      playerMarketTier: resolved.playerMarketTier,
      tierLabel: resolved.tierLabel,
      callType: resolved.callType,
      structured: resolved.structured,
      responseText: resolved.responseText,
      responseDeep: null,
      promptAppendix: null,
    };
  }

  const promptAppendix =
    wcContext?.playerMarketPromptBlock || formatWcPlayerMarketPromptRules(wcIntent);

  return {
    forcePass: false,
    tier,
    playerMarketTier: tier,
    tierLabel: meta.label,
    tierDisclaimer: meta.disclaimer,
    callType: meta.callType,
    structured: null,
    responseText: null,
    responseDeep: null,
    promptAppendix,
  };
}

/**
 * @param {string} headline
 * @param {string} body
 * @param {string} question
 */
export function detectTeamAnswerToPlayerQuestion(headline, body, question) {
  if (!questionAsksForWcPlayerMarket(question)) return false;
  const blob = `${headline} ${body}`;
  if (PASS_SIGNAL_RE.test(blob)) return false;

  if (!SCORING_PRED_RE.test(blob)) return false;

  for (const t of WC_2026_TEAMS) {
    const abbr = String(t.abbreviation || "").toUpperCase();
    if (!textMentionsWcTeam(headline, abbr)) continue;
    if (SCORING_PRED_RE.test(headline) || /\bwill score\b/i.test(headline)) {
      return true;
    }
  }
  return false;
}
