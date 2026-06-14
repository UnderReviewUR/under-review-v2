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
import { splitWcSentences, capWcDeepWords } from "./wcSentenceBoundaries.js";
import { ensureWcCardFaceNumericWhy } from "./wcTakeRetentionQA.js";

const SCORING_PRED_RE =
  /\b(will score|scores the most|score the most|top scorer|most goals|golden boot|leading scorer)\b/i;

const PASS_SIGNAL_RE =
  /\b(player market|player-specific|confirmed lineups|golden boot|top scorer|pre-match|team-level angle|cannot name a player|pass\b|not supported)\b/i;

const NO_VERIFIED_LINE_RE =
  /\b(no verified line|no posted line|no actionable line|not in the (?:market |current )?feed|line (?:is )?not (?:posted|listed|available)|pass until)\b/i;

/** Body cites real American prices — do not force a pass headline repair. */
const CITED_BOOK_ODDS_RE =
  /\b(?:at|@)\s*[+-]\d{2,}\b|over\s+\d+(?:\.\d+)?\s+at\s+[+-]\d+|\bmarket\s+\+\d{3,}\b/i;

const GOLDEN_BOOT_PLAYER_RE =
  /\b(Mbappé|Mbappe|Haaland|Kane|Vinícius|Vinicius|Salah|Messi|Rodrygo|Lewandowski|Griezmann|Osimhen|Saka|Musiala|Pedri|Endrick|Ronaldo|Martínez|Martinez|Yamal|Jiménez|Jimenez|Son|Fernandes)\b/i;

const GENERIC_PASS_LEAN_RE =
  /^pass\s*[—-]\s*no actionable line yet/i;

const LADDER_LEG_RE = /over\s+(\d+(?:\.\d+)?)\s+(?:at\s+|[·\-–—]\s*)([+-]\d+)/gi;

/**
 * @param {RegExpMatchArray[]} legs
 */
function dedupeWcPlayerPropLegs(legs) {
  const seen = new Set();
  const out = [];
  for (const m of legs) {
    const key = `${m[1]}|${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  out.sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
  return out;
}

/**
 * @param {string} blob
 */
function extractWcPlayerPropLegs(blob) {
  return dedupeWcPlayerPropLegs([...String(blob || "").matchAll(LADDER_LEG_RE)]);
}

/**
 * One-line verdict for a posted milestone price.
 * @param {string} odds
 */
function wcPlayerPropLegVerdict(odds) {
  const n = parseInt(String(odds || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return "Posted";
  if (n <= -400) return "Juice — not worth paying";
  if (n <= -200) return "Near-lock juice";
  if (n <= -130) return "Worth paying at listed price";
  return "Playable — check size";
}

function wcPlayerPropLegIsPlayable(verdict) {
  return /worth paying|playable/i.test(String(verdict || ""));
}

function wcAmericanImpliedPct(american) {
  const n = parseInt(String(american || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return null;
  if (n > 0) return Math.round((100 / (n + 100)) * 1000) / 10;
  return Math.round((Math.abs(n) / (Math.abs(n) + 100)) * 1000) / 10;
}

/**
 * Pick the milestone leg that answers the user's threshold ask.
 * @param {RegExpMatchArray[]} legs
 * @param {string} [question]
 */
function pickWcPlayerPropTargetLeg(legs, question = "") {
  if (!legs.length) return null;
  const asked = String(question || "").match(/(\d+\.?\d*)\s*shots?/i)?.[1];
  if (!asked) return legs[legs.length - 1];

  const askedNum = parseFloat(asked);
  const scored = legs.map((m) => ({
    m,
    th: parseFloat(m[1]),
    diff: Math.abs(parseFloat(m[1]) - askedNum),
    verdict: wcPlayerPropLegVerdict(m[2]),
  }));
  const playable = scored.filter((s) => wcPlayerPropLegIsPlayable(s.verdict));
  const pool = playable.length ? playable : scored;
  return pool.reduce((best, s) => {
    if (s.diff < best.diff) return s;
    if (s.diff === best.diff && s.th > best.th) return s;
    return best;
  }, pool[0]).m;
}

const LADDER_ORPHAN_LINE_RE =
  /^(?:is\s+)?(?:juice|still heavy|where the value lives|speculative)\b/i;

/**
 * @param {string} line
 */
function isWcLadderOrphanLine(line) {
  const l = String(line || "").trim();
  if (!l) return true;
  if (LADDER_ORPHAN_LINE_RE.test(l)) return true;
  if (/^is\s+[a-z]/i.test(l) && !/^over\s/i.test(l)) return true;
  return false;
}

/**
 * @param {string} text
 */
function wcPlayerPropLadderAlreadyFormatted(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ladderLines = lines.filter((l) => /^over\s+\d/i.test(l));
  if (ladderLines.length < 2) return false;
  return ladderLines.every((l) => /\bat\s+[+-]\d+/i.test(l));
}

/**
 * Reformat milestone ladder copy as one line per posted leg.
 * @param {string} text
 * @param {string} [question]
 */
export function formatWcPlayerPropLadderWhy(text, question = "") {
  const t = String(text || "").trim();
  if (!t) return t;
  if (wcPlayerPropLadderAlreadyFormatted(t)) return t;

  const uniqueLegs = extractWcPlayerPropLegs(t);
  if (uniqueLegs.length < 2) return t;

  const target = pickWcPlayerPropTargetLeg(uniqueLegs, question);
  const targetTh = target?.[1];
  const ladderLines = uniqueLegs.map((m) => {
    const threshold = m[1];
    const odds = m[2];
    const verdict = wcPlayerPropLegVerdict(odds);
    const tag = targetTh && threshold === targetTh ? " (nearest playable to your ask)" : "";
    return `Over ${threshold} at ${odds} — ${verdict}${tag}.`;
  });

  const contextParts = [];
  for (const chunk of t.split(/\n+/)) {
    const trimmed = chunk.trim();
    if (!trimmed || isWcLadderOrphanLine(trimmed)) continue;
    if (LADDER_LEG_RE.test(trimmed)) continue;
    const sents = splitWcSentences(trimmed).filter((s) => !LADDER_LEG_RE.test(s));
    if (sents.length) contextParts.push(sents.join(" "));
  }
  const context = contextParts.join(" ").replace(/\s{2,}/g, " ").trim();

  return [context, ...ladderLines].filter(Boolean).join("\n");
}

/**
 * THE PLAY when books post milestone legs but model omitted an explicit lean.
 * @param {string} summary
 * @param {string} deep
 * @param {string} question
 */
/**
 * @param {string} question
 */
export function isWcGoldenBootPickQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return (
    /\b(golden boot|top scorer|scores most|leading scorer|score the most)\b/i.test(q) &&
    /\b(pick|who|best|value|most|why)\b/i.test(q)
  );
}

/**
 * @param {string} blob
 */
export function extractGoldenBootPlayerFromBlob(blob) {
  const text = String(blob || "");
  const leads = text.match(
    /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,28})\s+leads(?:\s+the)?(?:\s+adjusted)?/i,
  );
  if (leads?.[1] && !/ur model|market|france|brazil/i.test(leads[1])) {
    return leads[1].trim();
  }
  const primary = text.match(/\bprimary scorer[^.]{0,40}?\b([A-Za-zÀ-ÿ][\wÀ-ÿ' -]{2,24})\b/i);
  if (primary?.[1]) return primary[1].trim();
  const named = text.match(GOLDEN_BOOT_PLAYER_RE);
  return named?.[1] || "";
}

/**
 * @param {string} blob
 */
export function extractGoldenBootOddsFromBlob(blob) {
  const text = String(blob || "");
  return (
    text.match(/\bMarket\s+(\+\d{3,})/i)?.[1] ||
    text.match(/\bPass at\s+(\+\d{3,})/i)?.[1] ||
    text.match(/\bLean[^.]+\s+(\+\d{3,})/i)?.[1] ||
    text.match(/\bUR\s*(?:path|~)\s*(\+\d{3,})/i)?.[1] ||
    text.match(/\b(\+\d{3,})\b/)?.[1] ||
    ""
  );
}

/**
 * Golden Boot / top scorer — never fall back to generic "no actionable line" when model names a player.
 * @param {string} summary
 * @param {string} deep
 * @param {string} [question]
 */
export function synthesizeGoldenBootPlayFromBlob(summary, deep, question = "") {
  const blob = `${summary}\n${deep}`.trim();
  const player = extractGoldenBootPlayerFromBlob(blob);
  const odds = extractGoldenBootOddsFromBlob(blob);
  const isPickAsk = isWcGoldenBootPickQuestion(question);
  const fairPass = /\b(pass at|fair favorite|fair price|fairly priced|no edge|no mispric)\b/i.test(
    blob,
  );
  const hasEdge = /\b(mispriced|adjusted model|underprice|UR path|structural edge|wide margin|leads the adjusted|leads the)\b/i.test(
    blob,
  );

  if (!player && !odds) return "";

  const boot = "Golden Boot";
  if (isPickAsk && player) {
    const oddsBit = odds ? ` ${odds}` : "";
    if (hasEdge || !fairPass) {
      return `Lean: ${player} ${boot}${oddsBit} — top UR scorer path.`;
    }
    if (odds) {
      return `Lean: ${player} ${boot} ${odds} — model pick; price is fair, not a misprice.`;
    }
    return `Lean: ${player} — ${boot} pick on UR games-played and role.`;
  }
  if (fairPass && odds && player) {
    return `Pass at ${odds} on ${player} ${boot} — fair favorite price.`;
  }
  if (player && odds) {
    if (hasEdge) {
      return `Lean: ${player} ${boot} ${odds} — adjusted tournament path edge.`;
    }
    return `Pass at ${odds} on ${player} ${boot} — price matches the path.`;
  }
  if (player) {
    return `Lean: ${player} — ${boot} thesis from UR model.`;
  }
  return "";
}

/**
 * @param {string[]} summarySents
 * @param {string} blob
 */
export function synthesizeGoldenBootCallFromBlob(summarySents, blob) {
  const first = (summarySents[0] || "").replace(/^lean:\s*/i, "").trim();
  if (first && !GENERIC_PASS_LEAN_RE.test(first) && first.length >= 12) {
    return first;
  }
  const player = extractGoldenBootPlayerFromBlob(blob);
  if (player) {
    return `${player} — Golden Boot pick on UR path and scoring volume.`;
  }
  return "Golden Boot — top scorer path from UR model.";
}

/**
 * @param {string[]} summarySents
 * @param {string} deep
 */
export function synthesizeGoldenBootLineFromBlob(summarySents, deep) {
  const fromSummary = summarySents[1]?.trim();
  if (fromSummary && /\b(\+\d{3,}|market|UR|sim)\b/i.test(fromSummary)) {
    return fromSummary;
  }
  const blob = `${summarySents.join("\n")}\n${deep}`;
  const market = extractGoldenBootOddsFromBlob(blob);
  const ur = blob.match(/\bUR\s*(?:path|~)\s*(\+\d{3,})/i)?.[1];
  if (market && ur && market !== ur) {
    return `Market ${market} · UR ~${ur} on the Boot leg.`;
  }
  if (market) return `Market ${market} on the Golden Boot board.`;
  const pct = blob.match(/(\d+\.?\d*)%\s+semifinal/i)?.[1];
  if (pct) return `France path: ${pct}% semifinal rate in UR sims.`;
  return synthesizeWcLineFromBlob(summarySents, deep);
}

function synthesizeWcLineFromBlob(summarySents, deep) {
  const fromSummary = summarySents[1]?.trim();
  if (fromSummary) return fromSummary;
  const simSent = splitWcSentences(deep).find((s) => /\bsims?\b/i.test(s));
  return simSent || "";
}

export function synthesizePlayerPropPlayFromCitedOdds(summary, deep, question = "") {
  const blob = `${summary}\n${deep}`.trim();
  if (!CITED_BOOK_ODDS_RE.test(blob)) return "";

  const legs = extractWcPlayerPropLegs(blob);
  if (!legs.length) return "";

  const target = pickWcPlayerPropTargetLeg(legs, question);
  if (!target) return "";

  const threshold = target[1];
  const odds = target[2];
  const verdict = wcPlayerPropLegVerdict(odds);
  const hasEdge = /\b(edge|worth paying|playable|breakeven|near-certainty|giving away|comfortably)\b/i.test(
    blob,
  );
  const hardPass = /\b(no actionable line|not worth paying|pass until)\b/i.test(blob);

  if (hardPass && !hasEdge) {
    return `Pass at ${odds} on over ${threshold} — juice, not worth paying.`;
  }
  if (!wcPlayerPropLegIsPlayable(verdict) && !hasEdge) {
    return `Pass at ${odds} on over ${threshold} — ${verdict.toLowerCase()}.`;
  }
  if (hasEdge || wcPlayerPropLegIsPlayable(verdict)) {
    return `Lean: over ${threshold} at ${odds} — worth paying at the nearest posted line.`;
  }
  return `Lean: over ${threshold} at ${odds}.`;
}

const MISROUTED_SHOTS_CALL_RE =
  /\b(structural longshot|longshot thesis|outright|tournament winner|golden boot|wins the tournament|win the tournament)\b/i;

/**
 * @param {string} question
 */
export function isWcShotsPropQuestion(question) {
  return detectWcPlayerPropMarketLabel(question) === "shots";
}

/**
 * Outright / bare +price headline on a shots ask — wrong market routing.
 * @param {string} text
 * @param {string} [question]
 */
export function isWcMisroutedShotsHeadline(text, question = "") {
  if (!isWcShotsPropQuestion(question)) return false;
  const t = String(text || "").trim();
  if (!t) return false;
  if (MISROUTED_SHOTS_CALL_RE.test(t)) return true;
  if (/\+\d{2,}/.test(t) && !/\bover\s+\d/i.test(t) && !/\bat\s+[+-]\d/i.test(t)) return true;
  return false;
}

/**
 * @param {string} odds
 */
function wcPlayerPropLegShortVerdict(odds) {
  const v = wcPlayerPropLegVerdict(odds);
  if (/not worth paying/i.test(v)) return "juice, skip";
  if (/Near-lock/i.test(v)) return "heavy juice";
  if (/worth paying/i.test(v)) return "worth paying";
  return "playable";
}

/**
 * @param {string} blob
 */
function extractWcShotsPropContextLine(blob) {
  const ladderInSent = /\bover\s+\d+(?:\.\d+)?\s+at\s+[+-]\d+/i;
  for (const sent of splitWcSentences(String(blob || ""))) {
    if (ladderInSent.test(sent)) continue;
    if (/^watch for/i.test(sent)) continue;
    if (isWcMisroutedShotsHeadline(sent)) continue;
    if (/\b(lean:|pass at|the play:)\b/i.test(sent)) continue;
    if (sent.length > 24) return capWcDeepWords(sent, 28);
  }
  return "";
}

/**
 * Scannable breakdown — one line per posted milestone leg.
 * @param {string} text
 * @param {string} [question]
 */
export function formatWcPlayerPropLadderBreakdown(text, question = "") {
  const blob = String(text || "").trim();
  const uniqueLegs = extractWcPlayerPropLegs(blob);
  if (!uniqueLegs.length) return blob;

  const target = pickWcPlayerPropTargetLeg(uniqueLegs, question);
  const targetTh = target?.[1];
  const asked = String(question || "").match(/(\d+\.?\d*)\s*shots?/i)?.[1];

  const parts = [];
  if (asked) {
    const exact = uniqueLegs.find((m) => parseFloat(m[1]) === parseFloat(asked));
    if (!exact && target) {
      parts.push(
        `Over ${asked} isn't posted — nearest line is Over ${target[1]} at ${target[2]}.`,
      );
    }
  }

  for (const m of uniqueLegs) {
    const th = m[1];
    const odds = m[2];
    const tag = targetTh && th === targetTh ? " ✓" : "";
    parts.push(`Over ${th} · ${odds} · ${wcPlayerPropLegShortVerdict(odds)}${tag}`);
  }

  const ctx = extractWcShotsPropContextLine(blob);
  if (ctx) parts.push("", ctx);
  return parts.join("\n");
}

/**
 * Force shots ladder headline + line breakdown; block outright/+190 misroutes.
 * @param {object} structured
 * @param {string} question
 */
export function repairWcShotsPropStructured(structured, question = "") {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcShotsPropQuestion(question)) return structured;

  const blob = `${structured.call || ""}\n${structured.lean || ""}\n${structured.whyNow || ""}\n${structured.edge || ""}\n${structured.deep || ""}`;
  const uniqueLegs = extractWcPlayerPropLegs(blob);
  const misrouted =
    isWcMisroutedShotsHeadline(structured.call, question) ||
    isWcMisroutedShotsHeadline(structured.lean, question);

  if (!uniqueLegs.length && !misrouted) return structured;

  const out = { ...structured, callType: structured.callType || "player_prop" };
  const play = uniqueLegs.length
    ? synthesizePlayerPropPlayFromCitedOdds(blob, blob, question)
    : "";

  if (play && (misrouted || uniqueLegs.length)) {
    out.lean = play;
    out.call = play.replace(/^lean:\s*/i, "").trim();
    const target = pickWcPlayerPropTargetLeg(uniqueLegs, question);
    if (target) {
      const asked = String(question || "").match(/(\d+\.?\d*)\s*shots?/i)?.[1];
      out.line =
        asked && parseFloat(target[1]) !== parseFloat(asked)
          ? `Over ${target[1]} at ${target[2]} · nearest to ${asked} ask`
          : `Over ${target[1]} at ${target[2]}`;
    }
  } else if (misrouted) {
    const player = extractWcPlayerPropNameHint(question);
    out.call = `Pass — no verified ${player} shots ladder posted yet.`;
    out.lean = out.call;
  }

  if (uniqueLegs.length) {
    out.deep = formatWcPlayerPropLadderBreakdown(blob, question);
    out.breakdownAvailable = true;
    const targetLeg = pickWcPlayerPropTargetLeg(uniqueLegs, question);
    if (targetLeg) {
      const th = targetLeg[1];
      const odds = targetLeg[2];
      const implied = wcAmericanImpliedPct(odds);
      const pct = implied != null ? ` (~${implied}% implied)` : "";
      const asked = String(question || "").match(/(\d+\.?\d*)\s*shots?/i)?.[1];
      const verdict = wcPlayerPropLegShortVerdict(odds);
      out.whyNow =
        asked && parseFloat(th) !== parseFloat(asked)
          ? `Over ${th} at ${odds}${pct} — nearest posted line to your ${asked} ask.`
          : `Over ${th} at ${odds}${pct} — ${verdict}.`;
      if (!out.line) {
        out.line = `Over ${th} at ${odds}`;
      }
    } else {
      const ctx = extractWcShotsPropContextLine(blob);
      if (ctx) out.whyNow = ctx;
    }
  }

  return out;
}

/**
 * Shots ladder repair, then pass-card repair when still applicable.
 * @param {object} structured
 * @param {string} question
 */
export function finalizeWcPlayerPropStructured(structured, question = "") {
  if (!structured || typeof structured !== "object") return structured;
  let out = repairWcShotsPropStructured(structured, question);
  if (isWcPlayerPropPassStructured(out, question)) {
    out = repairWcPlayerPropPassCard(out, question);
  }
  return ensureWcCardFaceNumericWhy(out, question, { wcIntent: WC_INTENT.PLAYER_PROP });
}

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
export function formatWcPlayerMarketPromptRules(wcIntent, question = "") {
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  if (isWcFixturePlayerPropsQuestion(question)) {
    return `FIXTURE PLAYER PROPS (binding):
  User asked for MULTIPLE player props on this match — list 3-5 named players with market + American price.
  Put a numbered list in lean (one line each, e.g. "1. Enner Valencia anytime scorer +450").
  HEADLINE/call: lead player #1 only; full list lives in lean so mobile can scan every leg.
  Cover both teams when MATCH PLAYER PROPS has rows for each side — never collapse to one vague sentence.`;
  }
  if (isGenericWcPlayerPropQuestion(question)) {
    return `SLATE PLAYER PROPS (binding):
  User asked for player props across today's / remaining World Cup matches — NOT NBA/NFL/MLB.
  When MATCH PLAYER PROPS has rows, list 3-5 named players with market + American price (numbered lean).
  When no verified match lines exist, Pass honestly — never ask which sport or paste a multi-sport checklist.
  Never treat question words (Best, What, Remaining) as player names.`;
  }
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
  SHOTS HEADLINE RULE: never open with outright/+190/structural longshot language on a shots ask — headline must name the ladder leg (e.g. "Lean: over 3 at -135").
  MILESTONE LADDER (shots/assists O/U): when books post over 1 / over 2 / over 3 etc., WHY must be one short line per leg — "Over 1 at -2500 — juice." / "Over 3 at -135 — worth paying." — not one dense paragraph.
  If user asks over X.X and only milestone thresholds post, name the nearest posted line and answer "worth paying for?" directly in THE PLAY.
  THE PLAY must be explicit: "Worth it at -135 on over 3", "Pass — over 1/2 are juice", or "Lean over 3 at -135" — never "Pass — no actionable line" when MATCH PLAYER PROPS list prices.
  PASS CARD FACE: HEADLINE ≤18 words — thesis only; put ladder detail in WHY, not the headline.
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

const WC_PLAYER_PROP_LEAD_WORDS = new Set([
  "what",
  "who",
  "which",
  "where",
  "when",
  "why",
  "how",
  "best",
  "list",
  "give",
  "show",
  "rank",
  "create",
  "build",
  "name",
  "tell",
  "are",
  "is",
  "will",
  "can",
  "could",
  "should",
  "would",
  "any",
  "top",
  "good",
  "great",
  "sneaky",
  "remaining",
  "today",
  "tonight",
  "matches",
  "match",
  "slate",
  "player",
  "props",
  "prop",
]);

/**
 * Named player in a prop ask — null for slate/generic questions ("best player props today").
 * @param {string} question
 */
export function extractWcNamedPlayerFromQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return null;

  const willScore = q.match(
    /\bwill\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]+)?)\s+score\b/i,
  );
  if (willScore?.[1]) return willScore[1].trim();

  const propFor = q.match(
    /\b(?:prop|scorer|shots?)\s+for\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]+)?)\b/i,
  );
  if (propFor?.[1] && !WC_PLAYER_PROP_LEAD_WORDS.has(propFor[1].toLowerCase())) {
    return propFor[1].trim();
  }

  const lead = q.match(/^([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+)/)?.[1]?.toLowerCase();
  if (!lead || WC_PLAYER_PROP_LEAD_WORDS.has(lead)) return null;

  const m = q.match(
    /^([A-Za-zÀ-ÿ][\wÀ-ÿ' -]*?)(?:\s+(?:\d|o\/u|over|under|to\s+)|\s*\d+\.?\d*|\?|$)/i,
  );
  const raw = String(m?.[1] || "").trim();
  if (!raw || raw.length < 2) return null;
  const name = raw.split(/\s+/).slice(0, 3).join(" ");
  const first = name.split(/\s+/)[0]?.toLowerCase();
  if (!first || WC_PLAYER_PROP_LEAD_WORDS.has(first)) return null;
  return name;
}

/**
 * @param {string} name
 */
export function isWcGenericPlayerPropSubjectName(name) {
  const first = String(name || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();
  return !first || WC_PLAYER_PROP_LEAD_WORDS.has(first);
}

/**
 * Slate-wide or fixture-scoped player prop asks with no named subject.
 * @param {string} question
 */
export function isGenericWcPlayerPropQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return true;
  if (extractWcNamedPlayerFromQuestion(q)) return false;
  return /\bplayer props?\b/i.test(q);
}

/**
 * Multi-prop ask pinned to a head-to-head fixture (both teams in the question).
 * @param {string} question
 */
export function isWcFixturePlayerPropsQuestion(question) {
  const q = String(question || "").trim();
  if (!q || !/\bplayer props?\b/i.test(q)) return false;
  if (extractWcNamedPlayerFromQuestion(q)) return false;
  return /\b(vs\.?|versus)\b/i.test(q);
}

/**
 * @param {string} question
 */
export function extractWcPlayerPropNameHint(question) {
  return extractWcNamedPlayerFromQuestion(question) || "Player";
}

/**
 * @param {string} question
 */
export function buildWcPlayerPropPassHeadline(question) {
  const named = extractWcNamedPlayerFromQuestion(question);
  if (!named) {
    if (/\bremaining matches?\b/i.test(question)) {
      return "Player props for remaining matches — Pass until lines post.";
    }
    if (/\b(today|tonight|slate|schedule|matchday)\b/i.test(question)) {
      return "Player props for today's slate — Pass until lines post.";
    }
    return "No verified player prop lines — Pass.";
  }
  const market = detectWcPlayerPropMarketLabel(question);
  return `No posted ${named} ${market} line — Pass.`;
}

/**
 * @param {object | null | undefined} structured
 * @param {string} question
 */
export function isWcPlayerPropPassStructured(structured, question = "") {
  if (!structured || typeof structured !== "object") return false;
  const blob = `${structured.call || ""} ${structured.lean || ""} ${structured.line || ""} ${structured.whyNow || ""} ${structured.edge || ""}`;
  if (CITED_BOOK_ODDS_RE.test(blob)) return false;
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
  const named = extractWcNamedPlayerFromQuestion(question);
  const sgpCombo = detectWcSgpComboIntent(question);
  const headline = sgpCombo
    ? buildWcSgpComboPassHeadline(question)
    : buildWcPlayerPropPassHeadline(question);

  out.call = headline;
  if (sgpCombo) {
    out.lean = "Pass the SGP — legs share one script; wait for verified match prices.";
  } else if (!String(out.lean || "").trim() || wcCardPlayRestatesCall(out.lean, out.call)) {
    out.lean = named
      ? `Pass — no verified ${market} line in the feed yet.`
      : "Pass — no verified player prop lines in the feed yet.";
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
    out.edge = named
      ? `Watch for ${named} in confirmed lineups once books post match ${market}.`
      : "Re-ask closer to kickoff once MATCH PLAYER PROPS populate in VERIFIED CONTEXT.";
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
    wcContext?.playerMarketPromptBlock || formatWcPlayerMarketPromptRules(wcIntent, question);

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
