/**
 * World Cup Card Contract Option 1 — complete-sentence card face + deep breakdown.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { tierMetaFor } from "./wcPlayerMarketResolve.js";
import { wcCardPlayRestatesCall } from "./wcCardContractVoice.js";
import {
  parseWcPredictionSlots,
} from "./wcPredictionsRoundup.js";
import {
  capWcDeepWords,
  splitWcSentences,
} from "./wcSentenceBoundaries.js";

const WC_LIST_CARD_LEAN = "Top 5 — tap to view full breakdown.";

/**
 * @param {string} question
 */
function isWcPlayerVolumeQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  const statAsk =
    /\b(how many|what are the chances|chances|likelihood|probability|what are the odds)\b/i.test(
      q,
    ) || /\brecord(?:s)?\s+\d+\b/i.test(q);
  return statAsk && /\b(assist|goal|score)s?\b/i.test(q);
}

/**
 * @param {string} summary
 * @param {string} lean
 */
function isWcPassVerdict(summary, lean) {
  const blob = `${summary}\n${String(lean || "").replace(/^lean:\s*/i, "")}`.slice(0, 800);
  if (/\b(mispriced|underpric|value play)\b/i.test(blob)) return false;
  if (/\blean:\s*(?!pass)/i.test(blob) && !/\bpass\b/i.test(blob)) return false;
  return /\b(pass at|pass —|no play|no edge|fair price|fairly priced|not worth pricing|not mispriced)\b/i.test(
    blob,
  );
}

/**
 * @param {string[]} summarySents
 * @param {string} deep
 */
function synthesizeWcLine(summarySents, deep) {
  const fromSummary = summarySents[1]?.trim();
  if (fromSummary) return fromSummary;

  const deepText = String(deep || "");
  const simSent = splitWcSentences(deepText).find((s) => /\bsims?\b/i.test(s));
  if (simSent) return simSent;

  const paceMatch = deepText.match(/[^.!?]*\d+\.?\d*\s*(?:assists?|goals?)\s+per\s+match[^.!?]*[.!?]/i);
  if (paceMatch) return paceMatch[0].trim();

  const passMatch = deepText.match(/\bPass[^.!?]+[.!?]/i);
  if (passMatch) return passMatch[0].trim();

  return "";
}

/**
 * @param {string} deep
 * @param {boolean} pass
 */
function extractWatchFor(deep, pass) {
  const deepText = String(deep || "");
  const watchMatch = deepText.match(/(?:watch for:?|what breaks:?)[^.!?]+[.!?]?/i);
  if (watchMatch) {
    return watchMatch[0].trim().replace(/^watch for:?\s*/i, "Watch for ");
  }

  const sents = splitWcSentences(deepText);
  const riskSent = [...sents].reverse().find((s) =>
    /\b(watch for|what breaks|risk|breaks if|lineup|injury|bracket|confirmed)\b/i.test(s),
  );
  if (riskSent) return riskSent;

  if (pass) return "Fair price — recheck after lineups lock.";
  return sents.length ? sents[sents.length - 1] : "";
}

/**
 * @param {string} call
 */
function extractTeamFromCall(call) {
  const c = String(call || "").trim();
  const m = c.match(/^([A-Z][\wÀ-ÿ]+(?:\s+[A-Z][\wÀ-ÿ]+)?)\s+(?:wins|to win|are|is|at|—|-)/);
  if (m) return m[1];
  const m2 = c.match(/^([A-Z][\wÀ-ÿ]+)/);
  return m2?.[1] || "Outright";
}

/**
 * @param {string} question
 */
function isWcCrazyPredictionQuestion(question) {
  return /\b(craziest|wildest|hot take|boldest|spiciest|outrageous|share your)\b/i.test(
    String(question || ""),
  );
}

/**
 * @param {string} line
 * @param {string} call
 * @param {string} deep
 */
function synthesizePlayFromLineDelta(line, call, deep) {
  const l = String(line || "");
  const blob = `${l}\n${deep}`;
  const team = extractTeamFromCall(call);

  const marketLong =
    l.match(/(\d+)-to-1 longshot/i) ||
    blob.match(/(?:pricing as a|priced as a|at)\s*(\d+)-to-1/i);
  const urLong = l.match(/closer to (\d+)-to-1/i) || blob.match(/should be closer to (\d+)-to-1/i);
  if (marketLong && urLong) {
    return `Lean: ${team} outright — market ~${marketLong[1]}-to-1, UR path ~${urLong[1]}-to-1.`;
  }

  const american = blob.match(/\+\d{3,}/)?.[0];
  if (american && /\b(mispriced|should be closer|abandoned|longshot|edge)\b/i.test(blob)) {
    return `Lean: ${team} ${american} — structural longshot thesis.`;
  }

  const pct = l.match(/(\d+\.?\d*)%\s+outright/i) || blob.match(/(\d+\.?\d*)%\s+(?:to win|outright)/i);
  if (pct && /\b(mispriced|longshot|abandoned|should be|path)\b/i.test(blob)) {
    return `Lean: ${team} outright — sims ${pct[1]}%, books over-discount the path.`;
  }

  return "";
}

/**
 * @param {string} summary
 * @param {string} deep
 * @param {string} call
 * @param {{ line?: string, question?: string, wcIntent?: string, pass?: boolean }} [opts]
 */
function extractPlayDecision(summary, deep, call, opts = {}) {
  const line = String(opts.line || "");
  const question = String(opts.question || "");
  const pass = Boolean(opts.pass);
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

  const fromDelta = synthesizePlayFromLineDelta(line, call, deep);
  if (fromDelta && !wcCardPlayRestatesCall(fromDelta, call)) return fromDelta;

  const deepSents = splitWcSentences(deep);
  const actionSent = deepSents.find(
    (s) => /\b(pass at|no play|lean)\b/i.test(s) && !wcCardPlayRestatesCall(s, call),
  );
  if (actionSent) {
    const normalized = actionSent.replace(/^lean:\s*/i, "").trim();
    return `Lean: ${normalized}`;
  }

  if (isWcCrazyPredictionQuestion(question)) {
    const team = extractTeamFromCall(call);
    if (/\b(abandoned|mispriced|longshot|path|structural edge|not \d+-to-1)\b/i.test(`${line}\n${deep}`)) {
      return `Lean: ${team} outright — thesis longshot; size for variance only.`;
    }
    return "Pass — thesis only until verified outright odds post.";
  }

  return "Pass — no actionable line yet; see Watch For before locking a bet.";
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
 * @param {string} [opts.summary]
 * @param {string} [opts.deep]
 * @param {string} [opts.question]
 * @param {object | null} [opts.structuredSeed]
 */
function buildWcPredictionsRoundupStructured(opts = {}) {
  const summary = String(opts.summary || "").trim();
  const deep = String(opts.deep || "").trim();
  const question = String(opts.question || "");
  const seed =
    opts.structuredSeed && typeof opts.structuredSeed === "object"
      ? opts.structuredSeed
      : null;
  const summarySents = splitWcSentences(summary);
  const blob = `${summary}\n${deep}`.trim();

  let predictionSlots = Array.isArray(seed?.predictionSlots) ? seed.predictionSlots : [];
  if (!predictionSlots.length) {
    predictionSlots = parseWcPredictionSlots(deep);
    if (predictionSlots.length < 2) predictionSlots = parseWcPredictionSlots(blob);
  }

  const call = (summarySents[0] || summary).replace(/^lean:\s*/i, "").trim();
  const line = summarySents[1]?.trim() || synthesizeWcLine(summarySents, deep);
  const pass = isWcPassVerdict(summary, "");
  const edge = String(seed?.edge || extractWatchFor(deep, pass)).trim();
  const lean = String(
    seed?.lean ||
      extractPlayDecision(summary, deep, call, {
        line,
        question,
        wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
      }),
  ).trim();
  const slotFace = predictionSlots.map((s) => `${s.label}: ${s.value}`).join(" ");
  const whyNow = String(
    seed?.whyNow ||
      (slotFace.length >= 20
        ? slotFace
        : buildWhyNow(summary, deep, WC_INTENT.PREDICTIONS_ROUNDUP)),
  ).trim();

  return {
    sport: "worldcup",
    callType: "predictions_roundup",
    lean,
    call,
    line,
    whyNow,
    edge,
    deep,
    predictionSlots,
    breakdownAvailable: Boolean(deep && deep.length > 40),
    confidence: String(seed?.confidence || "Medium"),
    caveats: [],
    timestamp: seed?.timestamp || new Date().toISOString(),
  };
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
  const question = String(opts.question || "");
  const tier = String(opts.playerMarketTier || "market_only");
  const seed =
    opts.structuredSeed && typeof opts.structuredSeed === "object"
      ? opts.structuredSeed
      : null;

  if (wcIntent === WC_INTENT.PREDICTIONS_ROUNDUP) {
    return buildWcPredictionsRoundupStructured({
      summary,
      deep,
      question,
      structuredSeed: seed,
    });
  }

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

  const call = (summarySents[0] || summary).replace(/^lean:\s*/i, "").trim();
  const line = synthesizeWcLine(summarySents, deep);
  const lean = isListIntent
    ? WC_LIST_CARD_LEAN
    : extractPlayDecision(summary, deep, call, { line, question, wcIntent });
  const pass = isWcPassVerdict(summary, lean);
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

  let callType =
    wcIntent === WC_INTENT.MATCHUP
      ? "matchup"
      : wcIntent === WC_INTENT.SCORE_PREDICTION
        ? "score_prediction"
        : wcIntent === WC_INTENT.ENTITY_PRICING
          ? "analysis"
          : wcIntent === WC_INTENT.PLAYER_PROP
            ? "player_prop"
            : isListIntent
              ? "goalscorers_list"
              : "single";

  if (callType === "single" && isWcPlayerVolumeQuestion(question)) {
    callType = "player_prop";
  }

  return {
    ...base,
    callType,
    confidence: /\b(high|strong)\b/i.test(summary) ? "Medium" : base.confidence,
  };
}

/**
 * @param {object} opts
 */
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
