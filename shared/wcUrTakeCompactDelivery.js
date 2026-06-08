/**
 * World Cup Card Contract v1 — compact delivery maps summary/deep → card fields.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { tierMetaFor } from "./wcPlayerMarketResolve.js";
import { wcCardPlayRestatesCall } from "./wcCardContractVoice.js";

/** Player-market cards stay tight; group/matchup headlines need full sentences. */
const WC_CALL_PLAYER_MAX = 100;
const WC_CALL_DIRECT_MAX = 280;
const WC_LEAN_MAX = 140;

/**
 * @param {string} text
 * @param {number} max
 */
function clipWcText(text, max) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > max * 0.55) return `${slice.slice(0, lastSpace).trim()}…`;
  return `${slice.trim()}…`;
}

/**
 * @param {string} text
 */
function summarySentences(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  return t.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) || [t];
}

/**
 * @param {string} deep
 * @param {boolean} pass
 */
function extractWatchFor(deep, pass) {
  if (pass) return "Fair price — recheck after lineups lock.";
  const sents = summarySentences(deep);
  if (sents.length >= 2) {
    return clipWcText(sents[sents.length - 1], 200);
  }
  const watchMatch = String(deep || "").match(
    /(?:watch for|what breaks|risk:|breaks if)[^.!?]+[.!?]?/i,
  );
  if (watchMatch) return clipWcText(watchMatch[0], 200);
  return clipWcText(String(deep || "").slice(0, 200), 200);
}

/**
 * @param {string} summary
 * @param {string} deep
 * @param {boolean} pass
 * @param {string} call
 */
function extractPlayDecision(summary, deep, pass, call) {
  const blob = `${summary}\n${deep}`;
  const playMatch = blob.match(
    /\b(Pass at[^.!?]+[.!?]|Pass —[^.!?]+[.!?]|No play[^.!?]+[.!?]|Lean:[^.!?]+[.!?]|Lean [^.!?]+[.!?])/i,
  );
  if (playMatch) {
    let p = playMatch[1].trim();
    if (/^lean /i.test(p) && !/^lean:/i.test(p)) p = p.replace(/^lean /i, "Lean: ");
    if (!/^lean:/i.test(p) && !/^pass/i.test(p) && !/^no play/i.test(p)) {
      p = `Lean: ${p}`;
    }
    if (!wcCardPlayRestatesCall(p, call)) {
      return clipWcText(p, WC_LEAN_MAX);
    }
  }

  if (pass) {
    const odds = (summary.match(/\+\d{3,}/) || [])[0] || "";
    return clipWcText(
      odds ? `Pass at ${odds} — fair price, no edge.` : "Pass — fair price, no edge.",
      WC_LEAN_MAX,
    );
  }

  const deepSents = summarySentences(deep);
  const actionSent = deepSents.find(
    (s) => /\b(pass at|no play|lean)\b/i.test(s) && !wcCardPlayRestatesCall(s, call),
  );
  if (actionSent) {
    const normalized = actionSent.replace(/^lean:\s*/i, "").trim();
    return clipWcText(`Lean: ${normalized}`, WC_LEAN_MAX);
  }

  return clipWcText("No play yet — see Watch For before locking a line.", WC_LEAN_MAX);
}

/**
 * @param {string} summary
 * @param {number} callMax
 */
function buildCallFromSummary(summary, callMax) {
  const sents = summarySentences(summary);
  const headline = sents[0]?.replace(/^lean:\s*/i, "").trim() || "";
  return clipWcText(headline, callMax);
}

/**
 * @param {string} tier
 */
function callTypeForPlayerTier(tier) {
  const meta = tierMetaFor(tier);
  return meta?.callType || "player_market_odds";
}

/**
 * @param {object} opts
 * @param {string} [opts.question]
 * @param {string} [opts.wcIntent]
 * @param {string} [opts.summary]
 * @param {string} [opts.deep]
 * @param {string} [opts.playerMarketTier]
 * @param {object | null} [opts.structuredSeed]
 */
export function buildWcCompactStructured(opts = {}) {
  const summary = String(opts.summary || "").trim();
  const deep = String(opts.deep || "").trim();
  const wcIntent = String(opts.wcIntent || "");
  const tier = String(opts.playerMarketTier || "market_only");
  const seed =
    opts.structuredSeed && typeof opts.structuredSeed === "object"
      ? opts.structuredSeed
      : null;

  const isListIntent = wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST;
  if (seed?.lean && seed?.call && (isWcPlayerMarketIntent(wcIntent) || isListIntent)) {
    const leanMax = isListIntent ? 520 : WC_LEAN_MAX;
    const callMax = isListIntent ? WC_CALL_DIRECT_MAX : WC_CALL_PLAYER_MAX;
    return {
      sport: "worldcup",
      callType: String(seed.callType || (isListIntent ? "goalscorers_list" : callTypeForPlayerTier(tier))),
      playerMarketTier: String(seed.playerMarketTier || tier),
      lean: clipWcText(String(seed.lean || ""), leanMax),
      call: clipWcText(String(seed.call || ""), callMax),
      whyNow: clipWcText(String(seed.whyNow || ""), 400),
      edge: clipWcText(String(seed.edge || ""), 200),
      confidence: String(seed.confidence || "Speculative"),
      caveats: [],
      timestamp: seed.timestamp || new Date().toISOString(),
    };
  }

  const pass =
    /\b(pass|no play|no edge|fairly priced|fair price|not mispriced)\b/i.test(summary) &&
    !/\b(mispriced|underpric|value play|hammer|lean)\b/i.test(summary);

  const directCard =
    wcIntent === WC_INTENT.MATCHUP ||
    wcIntent === WC_INTENT.STRUCTURAL ||
    wcIntent === WC_INTENT.ENTITY_PRICING ||
    wcIntent === WC_INTENT.SCORE_PREDICTION ||
    wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST;
  const callMax = isWcPlayerMarketIntent(wcIntent)
    ? WC_CALL_PLAYER_MAX
    : directCard
      ? WC_CALL_DIRECT_MAX
      : WC_CALL_PLAYER_MAX;

  const call = buildCallFromSummary(summary, callMax);
  const lean = extractPlayDecision(summary, deep, pass, call);
  const edge = extractWatchFor(deep, pass);
  const sents = summarySentences(summary);
  const delta = sents[1]?.trim() || "";
  const whyLead = sents.slice(2).join(" ").trim();
  const whyNow = clipWcText(
    [delta, deep, whyLead].filter(Boolean).join(" ").trim() || deep,
    wcIntent === WC_INTENT.SCORE_PREDICTION ? 520 : 400,
  );

  if (isWcPlayerMarketIntent(wcIntent) && !isListIntent) {
    const odds = (summary.match(/\+\d{3,}/) || [])[0] || "";
    let playerCall = call;
    if (pass && !/^pass/i.test(playerCall)) {
      playerCall = odds ? `PASS — ${playerCall.slice(0, 72)}` : `PASS — ${playerCall.slice(0, 80)}`;
    } else if (odds && !playerCall.includes(odds)) {
      playerCall = `${playerCall.replace(/\.$/, "")} · Market ${odds}.`;
    }
    return {
      sport: "worldcup",
      callType: callTypeForPlayerTier(tier),
      playerMarketTier: tier,
      lean,
      call: clipWcText(playerCall, WC_CALL_PLAYER_MAX),
      whyNow,
      edge,
      confidence: pass ? "Speculative" : "Medium",
      caveats: [],
      timestamp: new Date().toISOString(),
    };
  }

  return {
    sport: "worldcup",
    callType:
      wcIntent === WC_INTENT.MATCHUP
        ? "matchup"
        : wcIntent === WC_INTENT.SCORE_PREDICTION
          ? "score_prediction"
          : wcIntent === WC_INTENT.ENTITY_PRICING
            ? "analysis"
            : "single",
    lean,
    call,
    whyNow,
    edge,
    confidence: /\b(high|strong)\b/i.test(summary) ? "Medium" : "Speculative",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Short plain text for bubbles / take extraction — never the legacy section stack.
 * @param {object | null | undefined} structured
 * @param {string} summaryFallback
 */
export function formatWcCompactDisplayText(structured, summaryFallback = "") {
  if (structured && typeof structured === "object") {
    const lean = String(structured.lean || "").replace(/^lean:\s*/i, "").trim();
    const call = String(structured.call || "").trim();
    const why = String(structured.whyNow || "").trim();
    const conf = String(structured.confidence || "").trim();
    const lines = [];
    if (lean) lines.push(lean.startsWith("Lean:") ? lean : `Lean: ${lean}`);
    if (call && call !== "—") lines.push(`THE PLAY: ${call}`);
    if (conf) lines.push(`CONFIDENCE\n${conf}`);
    if (why) lines.push(why);
    if (lines.length) return lines.join("\n\n");
  }
  const s = String(summaryFallback || "").trim();
  if (!s) return "";
  const sentences = s.match(/[^.!?]+[.!?]+/g) || [s];
  return sentences.slice(0, 2).join(" ").trim();
}
