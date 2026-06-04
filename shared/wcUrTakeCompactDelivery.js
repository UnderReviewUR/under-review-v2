/**
 * World Cup UR Take — compact card + display text (no thesis / section dump).
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { tierMetaFor } from "./wcPlayerMarketResolve.js";

/**
 * @param {string} text
 */
function firstSentence(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const m = t.match(/[^.!?]+[.!?]+/);
  return m ? m[0].trim() : t.slice(0, 160);
}

/**
 * @param {string} text
 */
function restAfterFirstSentence(text) {
  const t = String(text || "").trim();
  const first = firstSentence(t);
  if (!first || t.length <= first.length) return "";
  return t.slice(first.length).trim();
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

  if (seed?.lean && seed?.call && isWcPlayerMarketIntent(wcIntent)) {
    return {
      sport: "worldcup",
      callType: String(seed.callType || callTypeForPlayerTier(tier)),
      playerMarketTier: String(seed.playerMarketTier || tier),
      lean: String(seed.lean || "").slice(0, 120),
      call: String(seed.call || "").slice(0, 100),
      whyNow: String(seed.whyNow || "").slice(0, 400),
      edge: String(seed.edge || "").slice(0, 200),
      confidence: String(seed.confidence || "Speculative"),
      caveats: [],
      timestamp: seed.timestamp || new Date().toISOString(),
    };
  }

  const lead = firstSentence(summary).replace(/^lean:\s*/i, "").trim();
  const tail = restAfterFirstSentence(summary);
  const pass =
    /\b(pass|no play|no edge|fairly priced|fair price|not mispriced)\b/i.test(summary) &&
    !/\b(lean|buy|value play|hammer)\b/i.test(lead);

  let call = lead.slice(0, 100);
  let lean = lead.length <= 110 ? `Lean: ${lead.endsWith(".") ? lead : `${lead}.`}` : `Lean: ${lead.slice(0, 95)}.`;

  if (isWcPlayerMarketIntent(wcIntent)) {
    const odds = (summary.match(/\+\d{3,}/) || [])[0] || "";
    if (pass) {
      call = odds ? `PASS — ${lead.slice(0, 72)}` : `PASS — ${lead.slice(0, 80)}`;
      lean = `Lean: ${call.replace(/^PASS\s*—\s*/i, "").slice(0, 90)}.`;
    } else if (odds && !call.includes(odds)) {
      call = `${call.slice(0, 60)} ${odds}`.trim();
    }
    const whyNow = (tail || deep || "").slice(0, 320);
    return {
      sport: "worldcup",
      callType: callTypeForPlayerTier(tier),
      playerMarketTier: tier,
      lean: lean.slice(0, 120),
      call: call.slice(0, 100),
      whyNow,
      edge: pass ? "Fair price — recheck after lineups lock." : "",
      confidence: pass ? "Speculative" : "Medium",
      caveats: [],
      timestamp: new Date().toISOString(),
    };
  }

  const whyNow = (tail || deep || "").slice(0, 400);
  return {
    sport: "worldcup",
    callType:
      wcIntent === WC_INTENT.MATCHUP
        ? "matchup"
        : wcIntent === WC_INTENT.ENTITY_PRICING
          ? "analysis"
          : "single",
    lean: lean.slice(0, 120),
    call: call.slice(0, 100),
    whyNow,
    edge: "",
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
