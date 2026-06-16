/**
 * World Cup follow-up explain — subject resolution, routing guards, prebuilt explain cards.
 */

import { isWcCardContractExplainFollowUp } from "./wcCardContractFollowUpScorer.js";
import { extractLastAssistantStructured } from "./wcCardContractFollowUpScorer.js";
import {
  extractPriorTotalsLeanFromHistory,
} from "./wcFixtureMatchupPrebuilt.js";
import {
  isWcMatchupOtherSideFollowUp,
  isWcTotalsExplainFollowUp,
} from "./wcMatchBettingPrompt.js";
import { endsWithEllipsisTruncation } from "./wcSentenceBoundaries.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import { tierMetaFor } from "./wcPlayerMarketResolve.js";
import { wcSentenceSimilarity } from "./wcTakeRetentionQA.js";

/** @typedef {{
 *   kind: "totals"|"player_prop"|"parlay_leg"|"parlay_correlation"|"golden_boot_pushback"|"list_drilldown"|"continuation"|null,
 *   priorStructured?: Record<string, unknown> | null,
 *   priorTotals?: { kind: "over"|"under", line: string } | null,
 *   pickIndex?: number | null,
 *   legIndex?: number | null,
 *   playerName?: string | null,
 * }} WcFollowUpSubject */

/**
 * @param {string} question
 */
function extractNamedPlayerFromQuestion(question) {
  const q = String(question || "").trim();
  const m = q.match(
    /\bwhy\s+([A-Za-z][A-Za-z.'\u00C0-\u024F-]+(?:\s+[A-Za-z][A-Za-z.'\u00C0-\u024F-]+){0,2})\s+(?:over|under)\b/i,
  );
  return m?.[1]?.trim() || null;
}

/**
 * @param {string} lean
 * @param {number} index 1-based
 */
function extractNumberedPickLine(lean, index) {
  const lines = String(lean || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hit = lines.find((l) => new RegExp(`^${index}\\.\\s+`, "i").test(l));
  return hit || lines[index - 1] || "";
}

/**
 * @param {Array<unknown>} history
 * @param {string} question
 * @returns {WcFollowUpSubject}
 */
export function resolveWcFollowUpSubject(history, question) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  const prior = extractLastAssistantStructured(history);
  const priorCt = String(prior?.callType || "").toLowerCase();
  const priorBlob = [prior?.call, prior?.lean, prior?.whyNow].filter(Boolean).join(" ");

  const namedPlayer = extractNamedPlayerFromQuestion(q);
  if (namedPlayer && /\b(?:over|under)\s+\d+\.?\d*\b/i.test(q)) {
    if (priorCt.startsWith("player_market") || /\b(?:scorer|assist|shots?|goals?|card)\b/i.test(q)) {
      return { kind: "player_prop", priorStructured: prior, playerName: namedPlayer };
    }
  }

  if (isWcTotalsExplainFollowUp(q)) {
    const priorTotals = extractPriorTotalsLeanFromHistory(history);
    if (priorTotals) {
      return { kind: "totals", priorStructured: prior, priorTotals };
    }
    return { kind: null, priorStructured: prior };
  }

  if (/\bover or under goals\b/i.test(ql)) {
    const priorTotals = extractPriorTotalsLeanFromHistory(history);
    if (priorTotals) {
      return { kind: "totals", priorStructured: prior, priorTotals };
    }
  }

  if (
    (/\bwhy\s+(?:the\s+)?second\s+pick\b/i.test(q) || /\bwhy\s+#2\b/i.test(q)) &&
    priorCt.startsWith("player_market")
  ) {
    return { kind: "player_prop", priorStructured: prior, pickIndex: 2 };
  }

  const legMatch = q.match(/\bwhy\s+leg\s*(\d+)\b/i);
  if (legMatch && priorCt.startsWith("player_market") && /\bparlay\b/i.test(priorBlob)) {
    return {
      kind: "parlay_leg",
      priorStructured: prior,
      legIndex: Number(legMatch[1]),
    };
  }

  if (
    /\bexplain\b/i.test(q) &&
    /\b(?:correlat|those legs|the legs)\b/i.test(q) &&
    priorCt.startsWith("player_market") &&
    /\bparlay\b/i.test(priorBlob)
  ) {
    return { kind: "parlay_correlation", priorStructured: prior };
  }

  if (/\bexplain\b.+\b(?:pick|assist|prop)\b/i.test(ql) && priorCt.startsWith("player_market")) {
    return { kind: "player_prop", priorStructured: prior };
  }

  if (/\bwhy\s+not\b/i.test(q)) {
    for (const turn of history) {
      const blob = [turn?.content, turn?.text, turn?.structured?.call, turn?.structured?.lean]
        .filter(Boolean)
        .join(" ");
      if (/\b(?:golden boot|top goalscorer|golden boot value)\b/i.test(blob)) {
        return { kind: "golden_boot_pushback", priorStructured: prior };
      }
    }
  }

  if (/\bgo\s+deeper\b/i.test(q)) {
    const listPrior = extractLastAssistantStructured(history, { callType: "goalscorers_list" });
    if (listPrior) return { kind: "list_drilldown", priorStructured: listPrior };
    const slatePrior = extractLastAssistantSlateStructured(history);
    if (slatePrior && /\b(?:each|all|these|every|board|slate|match(?:es)?)\b/i.test(q)) {
      return { kind: "slate_drilldown", priorStructured: slatePrior };
    }
  }

  if (
    isWcCardContractExplainFollowUp(q) &&
    /\b(?:each|all|these|every|board|slate|match(?:es)?)\b/i.test(q)
  ) {
    const slatePrior = extractLastAssistantSlateStructured(history);
    if (slatePrior) return { kind: "slate_drilldown", priorStructured: slatePrior };
  }

  if (isWcMatchupOtherSideFollowUp(q)) {
    return { kind: "continuation", priorStructured: prior };
  }

  if (isWcCardContractExplainFollowUp(q) && priorCt.startsWith("player_market")) {
    return { kind: "player_prop", priorStructured: prior };
  }

  return { kind: null, priorStructured: prior };
}

/**
 * @param {Array<{ role?: string, structured?: Record<string, unknown> }>} history
 */
export function extractLastAssistantSlateStructured(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role !== "assistant" || !turn.structured || typeof turn.structured !== "object") {
      continue;
    }
    const s = turn.structured;
    const ct = String(s.callType || "").toLowerCase();
    const angles = Array.isArray(s.tomorrowSlateAngles) ? s.tomorrowSlateAngles : [];
    const deep = String(s.deep || "").trim();
    if (ct === "tomorrow_slate" || angles.length >= 2 || /\bMatch:\s+\S/im.test(deep)) {
      return s;
    }
  }
  return null;
}

/**
 * @param {string} question
 * @param {Array<unknown>} history
 */
export function isWcSlateDrilldownFollowUp(question, history) {
  const subject = resolveWcFollowUpSubject(history, question);
  return subject.kind === "slate_drilldown" && Boolean(subject.priorStructured);
}

/**
 * @param {Record<string, unknown> | null | undefined} priorStructured
 */
export function buildWcSlateDrilldownFollowUpStructured(priorStructured) {
  if (!priorStructured || typeof priorStructured !== "object") return null;
  const angles = Array.isArray(priorStructured.tomorrowSlateAngles)
    ? priorStructured.tomorrowSlateAngles
    : [];
  const deep = String(priorStructured.deep || "").trim();
  if (angles.length < 2 && !/\bMatch:\s+\S/im.test(deep)) return null;
  return {
    ...priorStructured,
    sport: "worldcup",
    callType: "tomorrow_slate",
    breakdownDefaultExpanded: true,
    breakdownAvailable: true,
  };
}

/**
 * Block matchup alt prebuilt when user pivoted to player markets since last totals lean.
 * @param {string} question
 * @param {Array<unknown>} history
 */
export function shouldBlockMatchupAltPrebuiltAfterPlayerPivot(question, history) {
  if (!isWcTotalsExplainFollowUp(question)) return false;
  const last = extractLastAssistantStructured(history);
  const lastCt = String(last?.callType || "").toLowerCase();
  return lastCt.startsWith("player_market") || lastCt === "goalscorers_list";
}

/**
 * @param {string} question
 * @param {Array<unknown>} history
 */
export function isWcPlayerPropFollowUpExplain(question, history) {
  const subject = resolveWcFollowUpSubject(history, question);
  return (
    subject.kind === "player_prop" ||
    subject.kind === "parlay_leg" ||
    subject.kind === "parlay_correlation"
  );
}

/**
 * @param {string} pickLine
 * @param {string} priorWhy
 */
function buildPropMechanismWhy(pickLine, priorWhy, label = "pick") {
  const line = String(pickLine || "").trim();
  const prior = String(priorWhy || "").trim();
  if (!line) {
    return prior
      ? `Mechanism on the ${label} — ${prior.split(/[.!?]/)[0]}.`
      : `Here's the script behind that ${label}.`;
  }
  const player = line.replace(/^\d+\.\s*/, "").split(/\s+(?:over|under|anytime)/i)[0]?.trim();
  const market = line.match(/\b(?:over|under|anytime)[^.]+/i)?.[0] || line;
  if (prior && wcSentenceSimilarity(prior, `Volume path — ${player} ${market}.`) < 0.72) {
    return `Volume path — ${player} ${market}; role and matchup script drive the edge, not just the posted price.`;
  }
  return `Volume path — ${player} ${market}; role and matchup script drive the edge, not just the posted price.`;
}

/**
 * @param {{
 *   question: string,
 *   history?: Array<unknown>,
 *   subject?: WcFollowUpSubject,
 *   tier?: string,
 *   kvBlocks?: Record<string, unknown> | null,
 *   wcContext?: Record<string, unknown> | null,
 * }} opts
 */
export function buildWcPlayerPropExplainStructured(opts) {
  const question = String(opts.question || "").trim();
  const history = Array.isArray(opts.history) ? opts.history : [];
  const subject = opts.subject || resolveWcFollowUpSubject(history, question);
  const prior = subject.priorStructured || extractLastAssistantStructured(history);
  if (!prior) return null;

  const tier = String(opts.tier || "verified");
  const meta = tierMetaFor(tier);
  const priorWhy = String(prior.whyNow || "").trim();
  const priorLean = String(prior.lean || "").trim();
  const priorCall = String(prior.call || "").trim();
  const home = String(prior.fixtureHome || opts.wcContext?.requiredEntities?.[0] || "").toUpperCase();
  const away = String(prior.fixtureAway || opts.wcContext?.requiredEntities?.[1] || "").toUpperCase();

  let call = priorCall;
  let lean = priorLean.split("\n")[0]?.trim() || priorLean;
  let whyNow = "";
  let deep = String(prior.deep || "").trim();

  if (subject.kind === "parlay_correlation") {
    call = priorCall || "Parlay correlation";
    lean = priorLean.slice(0, 120);
    whyNow =
      "Legs 1–3 rise and fall together when the favorite controls territory — correlation is script, not independent coin flips.";
    if (!deep) deep = priorLean;
  } else if (subject.kind === "parlay_leg" && subject.legIndex) {
    const legLine = extractNumberedPickLine(priorLean, subject.legIndex) || priorLean;
    call = `Leg ${subject.legIndex} — ${legLine.replace(/^\d+\.\s*/, "").slice(0, 80)}`;
    lean = `Keep ${legLine.replace(/^\d+\.\s*/, "").slice(0, 90)}`;
    whyNow = buildPropMechanismWhy(legLine, priorWhy, `leg ${subject.legIndex}`);
    if (!deep) deep = priorLean;
  } else if (subject.pickIndex) {
    const pickLine = extractNumberedPickLine(priorLean, subject.pickIndex);
    call = pickLine.replace(/^\d+\.\s*/, "").slice(0, 100) || priorCall;
    lean = `Lean ${call}`.slice(0, 120);
    whyNow = buildPropMechanismWhy(pickLine, priorWhy, `#${subject.pickIndex} pick`);
    if (!deep) deep = priorLean;
  } else if (subject.playerName) {
    call = priorCall || `${subject.playerName} prop`;
    lean = priorLean.slice(0, 120) || `Lean ${subject.playerName}`;
    whyNow = buildPropMechanismWhy(
      `${subject.playerName} ${question.match(/\b(?:over|under)\s+\d+\.?\d*[^?]*/i)?.[0] || ""}`,
      priorWhy,
      subject.playerName,
    );
    if (!deep) deep = priorLean;
  } else {
    call = priorCall || "Player prop explain";
    lean = priorLean.split("\n")[0]?.slice(0, 120) || priorLean.slice(0, 120);
    whyNow = buildPropMechanismWhy(lean, priorWhy, "prop");
    if (!deep) deep = priorLean;
  }

  const edge = String(prior.edge || "").trim() || "Wait for confirmed lineups before sizing up.";

  return {
    sport: "worldcup",
    callType: meta.callType,
    playerMarketTier: tier,
    fixtureHome: home || undefined,
    fixtureAway: away || undefined,
    call: call.slice(0, 100),
    lean: lean.slice(0, 200),
    whyNow: whyNow.slice(0, 320),
    edge: edge.slice(0, 200),
    deep,
    breakdownAvailable: Boolean(deep.trim()),
    breakdownDefaultExpanded: true,
    confidence: prior.confidence || "Medium",
    analysis: question,
  };
}

/**
 * @param {string} text
 */
function stripWcFaceEllipsis(text) {
  const t = String(text || "").trim();
  if (!t || !endsWithEllipsisTruncation(t)) return t;
  return t.replace(/…+$/u, "").trim();
}

/**
 * UI + LLM delivery — auto-expand breakdown on explain / drill-down turns.
 * @param {string} question
 * @param {boolean} [breakdownDefaultExpanded]
 */
export function shouldAutoExpandWcBreakdown(question, breakdownDefaultExpanded = false) {
  if (breakdownDefaultExpanded) return true;
  const q = String(question || "").trim();
  if (!q) return false;
  return isWcCardContractExplainFollowUp(q) || /\bgo\s+deeper\b/i.test(q);
}

/**
 * Post-process LLM / compact structured cards for explain follow-ups.
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 * @param {Array<unknown>} [history]
 */
export function applyWcFollowUpExplainDelivery(structured, question, history = []) {
  if (!structured || typeof structured !== "object") return structured;
  const q = String(question || "").trim();
  if (!q || !Array.isArray(history) || history.length === 0) return structured;
  if (!shouldAutoExpandWcBreakdown(q, Boolean(structured.breakdownDefaultExpanded))) {
    return structured;
  }

  const subject = resolveWcFollowUpSubject(history, q);
  /** @type {Record<string, unknown>} */
  const out = { ...structured };

  for (const field of ["call", "whyNow", "edge", "lean", "line"]) {
    if (out[field]) out[field] = stripWcFaceEllipsis(String(out[field]));
  }

  out.breakdownDefaultExpanded = true;
  const deep = String(out.deep || "").trim();
  out.breakdownAvailable = Boolean(out.breakdownAvailable) || deep.length > 40;

  const priorForWhy =
    subject.kind === "totals"
      ? extractLastAssistantStructured(history, { callType: "matchup" }) ||
        extractLastAssistantStructured(history)
      : subject.kind === "player_prop" ||
          subject.kind === "parlay_leg" ||
          subject.kind === "parlay_correlation"
        ? extractLastAssistantStructured(history, { callType: "player_market_verified" }) ||
          extractLastAssistantStructured(history)
        : extractLastAssistantStructured(history);

  const priorWhy = String(priorForWhy?.whyNow || "").trim();
  let nextWhy = String(out.whyNow || "").trim();
  if (priorWhy && nextWhy && wcSentenceSimilarity(priorWhy, nextWhy) >= 0.72) {
    if (subject.kind === "totals" && subject.priorTotals) {
      const side = subject.priorTotals.kind === "under" ? "Under" : "Over";
      out.whyNow =
        `${side} ${subject.priorTotals.line} cashes when the chance count stays down — you're betting game tempo and script, not a fade of the favorite.`.slice(
          0,
          320,
        );
    } else if (!/^(mechanism|volume path)\b/i.test(nextWhy)) {
      out.whyNow = `Mechanism — ${nextWhy}`.slice(0, 320);
    }
  } else if (priorWhy && nextWhy && subject.kind === "totals" && subject.priorTotals) {
    const side = subject.priorTotals.kind === "under" ? "Under" : "Over";
    if (wcSentenceSimilarity(priorWhy, nextWhy) >= 0.45) {
      out.whyNow =
        `${side} ${subject.priorTotals.line} cashes when the chance count stays down — you're betting game tempo and script, not a fade of the favorite.`.slice(
          0,
          320,
        );
    }
  }

  const priorDeep = String(priorForWhy?.deep || "").trim();
  if (subject.kind === "totals" && priorDeep && /wins if/i.test(priorDeep)) {
    const mergedDeep = String(out.deep || "").trim();
    if (!mergedDeep || !/wins if/i.test(mergedDeep)) {
      out.deep = mergedDeep ? `${priorDeep}\n\n${mergedDeep}` : priorDeep;
      out.breakdownAvailable = true;
    }
  }

  if (subject.kind === "player_prop" && priorForWhy?.lean && !deep) {
    out.deep = String(priorForWhy.lean || "");
    out.breakdownAvailable = true;
  }

  return out;
}

/**
 * History-aware follow-up intent override (runs before generic classifier).
 * @param {string} question
 * @param {object[]} history
 * @returns {string | null}
 */
export function classifyWcFollowUpIntent(question, history = []) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  if (!q || !Array.isArray(history) || history.length === 0) return null;

  const subject = resolveWcFollowUpSubject(history, q);

  if (/\bover or under goals\b/i.test(ql) && subject.priorTotals) {
    return "MATCHUP";
  }

  if (subject.kind === "totals") return "MATCHUP";

  if (
    subject.kind === "player_prop" ||
    subject.kind === "parlay_leg" ||
    subject.kind === "parlay_correlation"
  ) {
    return "PLAYER_PROP";
  }

  if (subject.kind === "golden_boot_pushback") return "GOLDEN_BOOT";

  if (subject.kind === "list_drilldown") return "CONTINUATION";

  if (/\bgo\s+deeper\b/i.test(ql)) {
    const prior = extractLastAssistantStructured(history, { callType: "advancement" });
    if (prior) return "ENTITY_PRICING";
  }

  if (/\bexplain\b.+\b(?:pick|assist|prop|leg|parlay)\b/i.test(ql)) {
    const prior = extractLastAssistantStructured(history);
    if (String(prior?.callType || "").startsWith("player_market")) return "PLAYER_PROP";
  }

  if (/\bwhy\s+(?:the\s+)?(?:second|third|#\d|leg\s*\d)\b/i.test(ql)) {
    const prior = extractLastAssistantStructured(history);
    if (String(prior?.callType || "").startsWith("player_market")) return "PLAYER_PROP";
  }

  const named = extractNamedPlayerFromQuestion(q);
  if (named && /\b(?:over|under)\s+\d+\.?\d*\b/i.test(q)) {
    return "PLAYER_PROP";
  }

  return null;
}

/**
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 */
export function formatFixtureLabel(homeAbbr, awayAbbr) {
  const home = wcMatchupTeamDisplayName(homeAbbr);
  const away = wcMatchupTeamDisplayName(awayAbbr);
  if (!home || !away) return "";
  return `${home} vs ${away}`;
}
