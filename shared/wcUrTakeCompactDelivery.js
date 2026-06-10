/**
 * World Cup Card Contract Option 1 — complete-sentence card face + deep breakdown.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { isWcAdvancementMarketQuestion } from "./wcAdvancementMarket.js";
import { tierMetaFor } from "./wcPlayerMarketResolve.js";
import { wcCardHasDeltaSignal, wcCardPlayRestatesCall } from "./wcCardContractVoice.js";
import { isWcValidPlayLine } from "./wcPlayLineQA.js";
import {
  extractWcRoundupSlotNation,
  extractWcRoundupSlotPlayer,
} from "./wcRoundupCardQA.js";
import {
  parseWcPredictionSlots,
} from "./wcPredictionsRoundup.js";
import {
  capWcDeepWords,
  splitWcSentences,
} from "./wcSentenceBoundaries.js";
import { wcSentenceSimilarity } from "./wcTakeRetentionQA.js";

const WC_LIST_CARD_LEAN = "Top 5 — tap to view full breakdown.";

const ORPHAN_PRONOUN_RE = /\b(him|her|he|she|they)\b/i;

const FAIR_ONLY_SUMMARY_RE =
  /\b(pricing them fairly|fair price|no edge|not mispriced)\b/i;

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
 * @param {string | string[]} [avoidTexts]
 */
function extractWatchFor(deep, pass, avoidTexts = []) {
  const deepText = String(deep || "");
  const avoid = (Array.isArray(avoidTexts) ? avoidTexts : [avoidTexts])
    .map((t) => String(t || "").trim())
    .filter(Boolean);

  const isTooSimilar = (sent) =>
    avoid.some((a) => wcSentenceSimilarity(sent, a) >= 0.8);

  const watchMatch = deepText.match(/(?:watch for:?|what breaks:?)[^.!?]+[.!?]?/i);
  if (watchMatch) {
    const candidate = watchMatch[0].trim().replace(/^watch for:?\s*/i, "Watch for ");
    if (!isTooSimilar(candidate)) return candidate;
  }

  const sents = splitWcSentences(deepText);
  const riskSent = [...sents].reverse().find(
    (s) =>
      /\b(watch for|what breaks|risk|breaks if|lineup|injury|bracket|confirmed)\b/i.test(s) &&
      !isTooSimilar(s),
  );
  if (riskSent) {
    return /^watch/i.test(riskSent)
      ? riskSent
      : `Watch for ${riskSent.replace(/^watch for:?\s*/i, "")}`;
  }

  for (const sent of sents) {
    if (/\b(lineup|injury|bracket|confirmed|form|fixture)\b/i.test(sent) && !isTooSimilar(sent)) {
      return /^watch/i.test(sent)
        ? sent
        : `Watch for ${sent.replace(/^watch for:?\s*/i, "")}`;
    }
  }

  if (pass) return "Fair price — recheck after lineups lock.";
  return "Watch for lineup news and confirmed paths before locking the bet.";
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
 * @param {string} wcIntent
 * @param {string} question
 */
function isWcNonBettingCardIntent(wcIntent, question) {
  const intent = String(wcIntent || "");
  const q = String(question || "").trim();
  if (intent === WC_INTENT.RULES) return true;
  if (intent !== WC_INTENT.GENERAL) return false;
  return /\b(how do i|how to|what happens|what is a|what's a|explain|can both teams|include extra time|easiest thing|rules|format|tie(d)? after|penalt)/i.test(
    q,
  );
}

/**
 * @param {string} summary
 * @param {string} call
 */
function synthesizeNonBettingPlay(summary, call) {
  const lead = String(call || summary || "")
    .replace(/^lean:\s*/i, "")
    .trim();
  if (!lead) return "See breakdown below.";
  if (/[.!?]$/.test(lead)) return lead;
  return `${lead}.`;
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
  const wcIntent = String(opts.wcIntent || "");
  const pass = Boolean(opts.pass);

  if (isWcNonBettingCardIntent(wcIntent, question)) {
    return synthesizeNonBettingPlay(summary, call);
  }

  const blob = `${summary}\n${deep}`;
  const playMatch = blob.match(
    /\b(?:PLAY:\s*)?(Pass at[^.!?]+[.!?]|Pass —[^.!?]+[.!?]|No play[^.!?]+[.!?]|Lean:[^.!?]+[.!?]|Lean [^.!?]+[.!?])/i,
  );
  if (playMatch) {
    let p = playMatch[1].trim();
    if (/^lean /i.test(p) && !/^lean:/i.test(p)) p = p.replace(/^lean /i, "Lean: ");
    if (!/^lean:/i.test(p) && !/^pass/i.test(p) && !/^no play/i.test(p)) {
      p = `Lean: ${p}`;
    }
    if (isWcValidPlayLine(p) && !wcCardPlayRestatesCall(p, call)) return p;
  }

  if (pass) {
    const odds = (summary.match(/\+\d{3,}/) || [])[0] || "";
    return odds ? `Pass at ${odds} — fair price, no edge.` : "Pass — fair price, no edge.";
  }

  const fromDelta = synthesizePlayFromLineDelta(line, call, deep);
  if (fromDelta && !wcCardPlayRestatesCall(fromDelta, call)) return fromDelta;

  const deepSents = splitWcSentences(deep);
  const actionSent = deepSents.find((s) => {
    if (!/\b(pass at|no play|lean:)\b/i.test(s)) return false;
    const candidate = /^lean:/i.test(s)
      ? s.trim()
      : `Lean: ${s.replace(/^lean:\s*/i, "").trim()}`;
    return isWcValidPlayLine(candidate) && !wcCardPlayRestatesCall(candidate, call);
  });
  if (actionSent) {
    const candidate = /^lean:/i.test(actionSent)
      ? actionSent.trim()
      : `Lean: ${actionSent.replace(/^lean:\s*/i, "").trim()}`;
    if (isWcValidPlayLine(candidate)) return candidate;
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
 * @param {Array<{ key: string, value: string }>} predictionSlots
 * @param {string} summary
 * @param {string} deep
 * @param {string} call
 * @param {string} line
 */
function extractRoundupScorerOdds(slotValue, blob) {
  const v = String(slotValue || "");
  const b = String(blob || "");
  return (
    v.match(/raw\s*(\+\d{3,})/i)?.[1] ||
    b.match(/raw\s*(\+\d{3,})/i)?.[1] ||
    v.match(/(\+\d{3,})/g)?.slice(-1)[0] ||
    b.match(/(\+\d{3,})/)?.[0] ||
    ""
  );
}

function extractPlayDecisionRoundup(predictionSlots, summary, deep, call, line) {
  const topScorer = predictionSlots.find((s) => s.key === "topScorer");
  const winners = predictionSlots.find((s) => s.key === "winners");
  const blob = `${summary}\n${deep}\n${line}`;
  const fairSummary = /\b(fairly priced|fair price|no edge|pricing them fairly)\b/i.test(blob);

  if (topScorer?.value) {
    const player = extractWcRoundupSlotPlayer(topScorer.value);
    const odds = extractRoundupScorerOdds(topScorer.value, blob);
    if (player && odds) {
      if (fairSummary && /\badjusted|UR|mispriced|games-played|volume\b/i.test(blob)) {
        const play = `Lean: ${player} Golden Boot ${odds} — adjusted path edge vs market.`;
        if (isWcValidPlayLine(play)) return play;
      }
      if (!fairSummary) {
        const play = `Lean: ${player} Golden Boot ${odds} — structural games-played edge.`;
        if (isWcValidPlayLine(play)) return play;
      }
      if (fairSummary) {
        const play = `Pass at ${odds} on ${player} — fair Golden Boot price.`;
        if (isWcValidPlayLine(play)) return play;
      }
    }
  }

  if (winners?.value) {
    const nation = extractWcRoundupSlotNation(winners.value);
    const odds = extractRoundupScorerOdds(winners.value, blob) || blob.match(/\+\d{3,}/)?.[0];
    if (nation && odds && fairSummary) {
      const play = `Pass ${nation} ${odds} — fair co-favorite, no misprice.`;
      if (isWcValidPlayLine(play)) return play;
    }
    if (nation && odds && /\b\d+\.?\d*%\s*win/i.test(blob)) {
      const play = `Lean: ${nation} outright ${odds} — path thesis from sims.`;
      if (isWcValidPlayLine(play)) return play;
    }
  }

  const base = extractPlayDecision(summary, deep, call, {
    line,
    question: "",
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
  });
  if (isWcValidPlayLine(base)) return base;

  return "Pass — no single leg clears vig after lineup check; see full breakdown.";
}

/**
 * @param {Array<{ key: string, value: string, label?: string }>} slots
 * @param {string[]} summarySents
 */
function synthesizeRoundupCall(slots, summarySents) {
  const winners = slots.find((s) => s.key === "winners");
  const scorer = slots.find((s) => s.key === "topScorer");
  const nation = winners ? extractWcRoundupSlotNation(winners.value) : "";
  const bootPlayer = scorer ? extractWcRoundupSlotPlayer(scorer.value) : "";
  if (nation && bootPlayer) {
    return `${nation} path leads the board — ${bootPlayer} is the Boot leg if you want one bet.`;
  }
  if (nation) {
    const thesis = winners.value.split(/—|–|-/).slice(1).join(" ").trim();
    if (thesis) return `${nation}'s path is the thesis — ${thesis}`.slice(0, 140);
  }
  const first = summarySents[0]?.trim();
  return first && !FAIR_ONLY_SUMMARY_RE.test(first) ? first : "";
}

/**
 * @param {Array<{ key: string, value: string }>} slots
 * @param {string[]} summarySents
 * @param {string} deep
 */
function synthesizeRoundupLine(slots, summarySents, deep) {
  const fromSummary = summarySents[1]?.trim();
  if (fromSummary && wcCardHasDeltaSignal(fromSummary)) return fromSummary;

  const scorer = slots.find((s) => s.key === "topScorer");
  const market =
    deep.match(/Market\s*(\+\d{3,})/i)?.[1] ||
    scorer?.value?.match(/raw\s*(\+\d{3,})/i)?.[1] ||
    scorer?.value?.match(/(\+\d{3,})/)?.[0];
  const ur =
    deep.match(/UR\s*~?\s*(\+\d{3,})/i)?.[1] ||
    deep.match(/adjusted[^+]*(\+\d{3,})/i)?.[1];
  if (market && ur) return `Market ${market} · UR ~${ur} on the top Boot leg.`;

  const winPct = deep.match(/(\d+\.?\d*)%\s*win/i)?.[1];
  if (winPct) return `Sims: ${winPct}% title edge on the favorite path vs market price.`;

  return synthesizeWcLine(summarySents, deep);
}

/**
 * Knockout-reach / group-advance futures — delta line for stat grid.
 * @param {string[]} summarySents
 * @param {string} deep
 * @param {string} [question]
 */
function synthesizeWcAdvancementLine(summarySents, deep, question = "") {
  const fromSummary = summarySents[1]?.trim();
  if (fromSummary && wcCardHasDeltaSignal(fromSummary)) return fromSummary;

  const blob = `${(summarySents || []).join("\n")}\n${deep}`;
  const odds =
    blob.match(/(?:FanDuel|DraftKings|BDL|futures seed)[^.]*?(-1[0-9]{2}|\+[1-9]\d{2,4})/i)?.[1] ||
    blob.match(/\b(-1[0-9]{2}|\+[1-9]\d{2,4})\b/)?.[0];
  const simPct =
    blob.match(/\br16Pct[^.\n]*?(\d+\.?\d*)%/i)?.[1] ||
    blob.match(/\badvancePct[^.\n]*?(\d+\.?\d*)%/i)?.[1] ||
    blob.match(/roughly\s+(\d+\.?\d*)%\s+of tournament sims/i)?.[1] ||
    blob.match(/(\d+\.?\d*)%\s+of tournament sims/i)?.[1];
  const marketPct =
    blob.match(/(?:market|implies|priced at|~)(\d+\.?\d*)%\s*(?:probability|implied)?/i)?.[1] ||
    blob.match(/implies\s+~?(\d+\.?\d*)%/i)?.[1];

  if (odds && simPct) {
    const verdict = /\bpass\b/i.test(blob) ? "Pass" : /\blean\b/i.test(blob) ? "Lean" : "Pass";
    const marketClause = marketPct ? ` vs market ~${marketPct}%` : "";
    const displayOdds = odds.startsWith("+") || odds.startsWith("-") ? odds : odds;
    return `${verdict} at ${displayOdds} — sim ${simPct}%${marketClause}.`;
  }

  return synthesizeWcLine(summarySents, deep);
}

/**
 * @param {Array<{ key: string, value: string }>} slots
 * @param {string} deep
 * @param {boolean} pass
 */
function synthesizeRoundupWatchFor(slots, deep, pass) {
  let edge = extractWatchFor(deep, pass);
  if (!ORPHAN_PRONOUN_RE.test(edge)) return edge;

  const breakout = slots.find((s) => s.key === "breakout");
  const scorer = slots.find((s) => s.key === "topScorer");
  const name =
    extractWcRoundupSlotPlayer(breakout?.value || "") ||
    extractWcRoundupSlotPlayer(scorer?.value || "");

  if (name) {
    edge = edge
      .replace(/\bhim\b/gi, name)
      .replace(/\bher\b/gi, name)
      .replace(/\bhe\b/gi, name)
      .replace(/\bshe\b/gi, name);
    if (!edge.toLowerCase().includes(name.toLowerCase().split(" ")[0])) {
      return `Watch for ${name} minutes or role change before locking the Boot leg.`;
    }
    return edge;
  }
  return "Watch for confirmed lineups before locking any Boot or outright leg.";
}

/**
 * @param {string} tier
 */
function callTypeForPlayerTier(tier) {
  const meta = tierMetaFor(tier);
  return meta?.callType || "player_market_odds";
}

/**
 * @param {string} sent
 */
function isWcDeepMetaSentence(sent) {
  return /\b(watch for|what breaks|lean:|pass at|no play|play:)\b/i.test(String(sent || ""));
}

/**
 * @param {string} summary
 * @param {string} deep
 */
function buildWhyNow(summary, deep, wcIntent) {
  const summarySents = splitWcSentences(summary);
  const deepSents = splitWcSentences(deep).filter((s) => !isWcDeepMetaSentence(s));
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

  const pass = isWcPassVerdict(summary, "");
  const call = String(
    seed?.call ||
      synthesizeRoundupCall(predictionSlots, summarySents) ||
      (summarySents[0] || summary).replace(/^lean:\s*/i, "").trim(),
  ).trim();
  const line = String(
    seed?.line || synthesizeRoundupLine(predictionSlots, summarySents, deep),
  ).trim();
  const edge = String(
    seed?.edge || synthesizeRoundupWatchFor(predictionSlots, deep, pass),
  ).trim();
  const lean = String(
    seed?.lean && isWcValidPlayLine(seed.lean)
      ? seed.lean
      : extractPlayDecisionRoundup(predictionSlots, summary, deep, call, line),
  ).trim();
  const slotFace = predictionSlots
    .map((s) => {
      const nation = extractWcRoundupSlotNation(s.value);
      const player = extractWcRoundupSlotPlayer(s.value);
      if (s.key === "winners" || s.key === "darkHorse") return `${s.label}: ${nation || s.value}`;
      return `${s.label}: ${player || s.value}`;
    })
    .join(" · ");
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

  if (seed?.callType === "group_slate" && seed?.lean && seed?.call) {
    const pathLine = String(seed.line || "").trim();
    return {
      sport: "worldcup",
      callType: "group_slate",
      groupLetter: seed.groupLetter,
      lean: String(seed.lean).trim(),
      call: String(seed.call).trim(),
      line: pathLine || String(seed.whyNow || "").trim(),
      whyNow: String(seed.whyNow || buildWhyNow(summary, deep, wcIntent)).trim(),
      edge: String(seed.edge || extractWatchFor(deep, false, seed.whyNow)).trim(),
      deep,
      breakdownAvailable: Boolean(deep && deep.length > 40),
      confidence: String(seed.confidence || "Speculative"),
      caveats: [],
      timestamp: seed.timestamp || new Date().toISOString(),
    };
  }

  if (wcIntent === WC_INTENT.PREDICTIONS_ROUNDUP) {
    return buildWcPredictionsRoundupStructured({
      summary,
      deep,
      question,
      structuredSeed: seed,
    });
  }

  const isAdvancementIntent =
    seed?.callType === "advancement" ||
    (wcIntent === WC_INTENT.ENTITY_PRICING && isWcAdvancementMarketQuestion(question));

  const summarySents = splitWcSentences(summary);

  if (isAdvancementIntent) {
    const call = String(
      seed?.call || (summarySents[0] || summary).replace(/^lean:\s*/i, "").trim(),
    ).trim();
    const line = String(
      seed?.line || synthesizeWcAdvancementLine(summarySents, deep, question),
    ).trim();
    const lean = String(
      seed?.lean ||
        extractPlayDecision(summary, deep, call, { line, question, wcIntent, pass: isWcPassVerdict(summary, "") }),
    ).trim();
    const pass = isWcPassVerdict(summary, lean);
    const whyNow = String(seed?.whyNow || buildWhyNow(summary, deep, wcIntent)).trim();
    return {
      sport: "worldcup",
      callType: "advancement",
      lean,
      call,
      line,
      whyNow,
      edge: String(seed?.edge || extractWatchFor(deep, pass, whyNow)).trim(),
      deep,
      breakdownAvailable: Boolean(deep && deep.length > 40),
      confidence: String(seed?.confidence || (pass ? "Medium" : "Medium")),
      caveats: [],
      timestamp: seed?.timestamp || new Date().toISOString(),
    };
  }

  const isListIntent = wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST;

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
  const nonBetting = isWcNonBettingCardIntent(wcIntent, question);
  const lean = isListIntent
    ? WC_LIST_CARD_LEAN
    : nonBetting
      ? synthesizeNonBettingPlay(summary, call)
      : extractPlayDecision(summary, deep, call, { line, question, wcIntent });
  const pass = nonBetting ? false : isWcPassVerdict(summary, lean);
  const whyNow = buildWhyNow(summary, deep, wcIntent);
  const edge = extractWatchFor(deep, pass, whyNow);

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
