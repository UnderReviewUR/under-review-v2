/**
 * World Cup Card Contract Option 1 — complete-sentence card face + deep breakdown.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { tierMetaFor } from "./wcPlayerMarketResolve.js";
import { wcCardPlayRestatesCall } from "./wcCardContractVoice.js";
import {
  capWcDeepWords,
  splitWcSentences,
} from "./wcSentenceBoundaries.js";

const WC_LIST_CARD_LEAN = "Top 5 — tap to view full breakdown.";

/**
 * @param {string} deep
 * @param {boolean} pass
 */
function extractWatchFor(deep, pass) {
  if (pass) return "Fair price — recheck after lineups lock.";
  const sents = splitWcSentences(deep);
  if (sents.length >= 1) {
    const last = sents[sents.length - 1];
    if (/\b(watch for|what breaks|risk|breaks if|lineup|injury|bracket)\b/i.test(last)) {
      return last;
    }
  }
  const watchMatch = String(deep || "").match(
    /(?:watch for|what breaks|risk:|breaks if)[^.!?]+[.!?]?/i,
  );
  if (watchMatch) return watchMatch[0].trim();
  return sents.length ? sents[sents.length - 1] : "";
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
    if (!wcCardPlayRestatesCall(p, call)) return p;
  }

  if (pass) {
    const odds = (summary.match(/\+\d{3,}/) || [])[0] || "";
    return odds ? `Pass at ${odds} — fair price, no edge.` : "Pass — fair price, no edge.";
  }

  const deepSents = splitWcSentences(deep);
  const actionSent = deepSents.find(
    (s) => /\b(pass at|no play|lean)\b/i.test(s) && !wcCardPlayRestatesCall(s, call),
  );
  if (actionSent) {
    const normalized = actionSent.replace(/^lean:\s*/i, "").trim();
    return `Lean: ${normalized}`;
  }

  return "No play yet — see Watch For before locking a line.";
}

/**
 * @param {string} tier
 */
function callTypeForPlayerTier(tier) {
  const meta = tierMetaFor(tier);
  return meta?.callType || "player_market_odds";
}

/**
 * @param {string} summary
 * @param {string} deep
 */
function buildWhyNow(summary, deep, wcIntent) {
  const summarySents = splitWcSentences(summary);
  const deepSents = splitWcSentences(deep);
  const delta = summarySents[1]?.trim() || "";
  const whyFromDeep =
    deepSents.length > 1
      ? deepSents.slice(0, -1).join(" ").trim()
      : deepSents[0]?.trim() || "";
  const whyLead = summarySents.slice(2).join(" ").trim();
  const merged = [whyFromDeep, whyLead].filter(Boolean).join(" ").trim();
  if (merged) return merged;
  if (wcIntent === WC_INTENT.SCORE_PREDICTION && delta) return delta;
  return deep.trim();
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
  const deepRaw = String(opts.deep || "").trim();
  const deep = capWcDeepWords(deepRaw, 600);
  const wcIntent = String(opts.wcIntent || "");
  const tier = String(opts.playerMarketTier || "market_only");
  const seed =
    opts.structuredSeed && typeof opts.structuredSeed === "object"
      ? opts.structuredSeed
      : null;

  const isListIntent = wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST;
  const summarySents = splitWcSentences(summary);

  if (seed?.lean && seed?.call && (isWcPlayerMarketIntent(wcIntent) || isListIntent)) {
    const call = String(seed.call || "").trim();
    const line = String(seed.line || summarySents[1] || "").trim();
    const lean = isListIntent ? WC_LIST_CARD_LEAN : String(seed.lean || "").trim();
    return {
      sport: "worldcup",
      callType: String(seed.callType || (isListIntent ? "goalscorers_list" : callTypeForPlayerTier(tier))),
      playerMarketTier: String(seed.playerMarketTier || tier),
      lean,
      call,
      line,
      whyNow: String(seed.whyNow || buildWhyNow(summary, deep, wcIntent)).trim(),
      edge: String(seed.edge || extractWatchFor(deep, false)).trim(),
      deep,
      breakdownAvailable: Boolean(deep && deep.length > 40),
      confidence: String(seed.confidence || "Speculative"),
      caveats: [],
      timestamp: seed.timestamp || new Date().toISOString(),
    };
  }

  const pass =
    /\b(pass|no play|no edge|fairly priced|fair price|not mispriced)\b/i.test(summary) &&
    !/\b(mispriced|underpric|value play|hammer|lean)\b/i.test(summary);

  const call = (summarySents[0] || summary).replace(/^lean:\s*/i, "").trim();
  const line = summarySents[1]?.trim() || "";
  const lean = isListIntent ? WC_LIST_CARD_LEAN : extractPlayDecision(summary, deep, pass, call);
  const edge = extractWatchFor(deep, pass);
  const whyNow = buildWhyNow(summary, deep, wcIntent);

  const base = {
    sport: "worldcup",
    lean,
    call,
    line,
    whyNow,
    edge,
    deep,
    breakdownAvailable: Boolean(deep && deep.length > 40),
    confidence: pass ? "Speculative" : "Medium",
    caveats: [],
    timestamp: new Date().toISOString(),
  };

  if (isWcPlayerMarketIntent(wcIntent) && !isListIntent) {
    const odds = (summary.match(/\+\d{3,}/) || [])[0] || "";
    let playerCall = call;
    if (pass && !/^pass/i.test(playerCall)) {
      playerCall = odds ? `Pass at ${odds} — ${playerCall}` : `Pass — ${playerCall}`;
    } else if (odds && !playerCall.includes(odds) && line && line.includes(odds)) {
      // delta sentence holds odds; headline stays thesis-only
    } else if (odds && !playerCall.includes(odds) && !line) {
      playerCall = `${playerCall.replace(/\.$/, "")}. Market ${odds}.`;
    }
    return {
      ...base,
      callType: callTypeForPlayerTier(tier),
      playerMarketTier: tier,
      call: playerCall,
      confidence: pass ? "Speculative" : "Medium",
    };
  }

  return {
    ...base,
    callType:
      wcIntent === WC_INTENT.MATCHUP
        ? "matchup"
        : wcIntent === WC_INTENT.SCORE_PREDICTION
          ? "score_prediction"
          : wcIntent === WC_INTENT.ENTITY_PRICING
            ? "analysis"
            : isListIntent
              ? "goalscorers_list"
              : "single",
    confidence: /\b(high|strong)\b/i.test(summary) ? "Medium" : base.confidence,
  };
}

/**
 * @param {object} opts
 */
export function resolveWcQaStructured(opts = {}) {
  const wcIntent = String(opts.wcIntent || "");
  if (wcIntent === WC_INTENT.RULES) {
    return opts.structuredSeed && typeof opts.structuredSeed === "object"
      ? opts.structuredSeed
      : null;
  }
  return buildWcCompactStructured({
    question: opts.question,
    wcIntent,
    summary: opts.summary,
    deep: opts.deep,
    playerMarketTier: opts.playerMarketTier,
    structuredSeed: opts.structuredSeed,
  });
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
  return splitWcSentences(s).slice(0, 2).join(" ").trim();
}
