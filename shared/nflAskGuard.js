/**
 * Post-model NFL Ask guard — posted lines, suitcase grade, call/body, invented numbers.
 * Prompt copy is not enough; this rewrites the structured take when the model
 * invents a line, contradicts itself, or treats an empty briefcase as a ticket.
 */

import { confidenceForNflMarket, detectNflAskPhase } from "./nflAskDiscipline.js";
import { detectNflAskMarket } from "./nflGoatExtractionContract.js";
import {
  findNflInactivePlayer,
  isNflDressingAsk,
  nflInactivesPostedForAsk,
} from "./nflEspnInactives.js";

const CONF_RANK = Object.freeze({ Speculative: 0, Medium: 1, High: 2 });
const PRICED_MARKET_IDS = new Set(["spread", "total", "moneyline", "sgp"]);

/**
 * @param {string} label
 * @param {string} cap
 */
export function clampNflConfidence(label, cap) {
  const cur = String(label || "").trim();
  const head = /^(High|Medium|Speculative)\b/i.exec(cur)?.[1] || "";
  const normalized = head
    ? head.charAt(0).toUpperCase() + head.slice(1).toLowerCase()
    : "Speculative";
  const want = String(cap || "High");
  const curRank = CONF_RANK[normalized] ?? 0;
  const capRank = CONF_RANK[want] ?? 0;
  if (curRank <= capRank) return normalized;
  return want;
}

/**
 * @param {string} a
 * @param {string} b
 */
function minConfidenceCap(a, b) {
  const ar = CONF_RANK[a] ?? 2;
  const br = CONF_RANK[b] ?? 2;
  return ar <= br ? a : b;
}

/**
 * @param {{ marketId?: string, propTypeHints?: string[] } | null | undefined} detected
 */
export function isNflPricedAskMarket(detected) {
  if (!detected) return false;
  if (Array.isArray(detected.propTypeHints) && detected.propTypeHints.length > 0) return true;
  return PRICED_MARKET_IDS.has(String(detected.marketId || ""));
}

/**
 * @param {{
 *   grade?: string,
 *   detected?: { marketId?: string, propTypeHints?: string[] },
 *   propMatch?: { matched?: number },
 * } | null | undefined} briefcase
 * @param {string} [question]
 */
export function resolveNflSuitcaseGuard(briefcase, question = "") {
  const detected =
    briefcase?.detected && typeof briefcase.detected === "object"
      ? briefcase.detected
      : detectNflAskMarket(question);
  const grade = String(briefcase?.grade || "").toLowerCase();
  const matched = Number(briefcase?.propMatch?.matched ?? briefcase?.propMatched ?? 0);
  const noLiveProp =
    Array.isArray(detected.propTypeHints) &&
    detected.propTypeHints.length > 0 &&
    !(matched > 0);
  const priced = isNflPricedAskMarket(detected);
  const missingNeeded = Array.isArray(briefcase?.missingNeeded) ? briefcase.missingNeeded : [];
  const corePriceMissing = missingNeeded.some(
    (p) => p === "slate.odds" || p === "slate.games" || p === "slate.playerProps",
  );
  const isPropAsk = Array.isArray(detected.propTypeHints) && detected.propTypeHints.length > 0;
  const forcePass = Boolean(priced && (noLiveProp || (!isPropAsk && corePriceMissing)));

  let confidenceCap = "High";
  if (forcePass || grade === "red") confidenceCap = "Speculative";
  else if (grade === "yellow") confidenceCap = "Medium";

  const band = confidenceForNflMarket(detected.marketId).band;
  if (band === "lottery" || band === "soft") {
    confidenceCap = minConfidenceCap(confidenceCap, "Speculative");
  } else if (band === "medium") {
    confidenceCap = minConfidenceCap(confidenceCap, "Medium");
  }

  return { forcePass, confidenceCap, detected, grade, noLiveProp, priced };
}

/**
 * @param {string} reason
 */
export function buildNflPassStructuredTake(reason = "suitcase_red") {
  const leans = {
    suitcase_red: "Lean: Pass. Live line not in payload. No invented number.",
    no_live_prop: "Lean: Pass. No live row for this prop. No invented number.",
    structured_parse_failed: "Lean: Pass. Take did not parse cleanly. No invented number.",
    invented_line: "Lean: Pass. Cited number is not on the live board.",
    call_body_conflict: "Lean: Pass. Call and writeup disagreed on the side.",
    spread_invert: "Lean: Pass. Posted favorite was inverted. Do not bet the flip.",
    preseason_starter_assumption: "Lean: Pass. Preseason default is sit or one series.",
    inactives_not_posted: "Lean: Pass. Official inactives not posted yet (~90 min before kick).",
    inactive_confirmed: "Lean: Pass. Named player is on the official inactive list.",
  };
  const lean = leans[reason] || leans.suitcase_red;
  return {
    sport: "NFL",
    call: "PASS",
    callType: "prop",
    confidence: "Speculative",
    lean,
    whyNow:
      "The priced market for this ask is missing or the take was not safe to ship. Passing is the call until a live number is on the board.",
    edge:
      "No priced edge without a verified live number. Role notes and season pace are not a substitute for a posted prop or spread.",
    analysis: {
      matchupAnalysis:
        "Suitcase pockets for this ask are too thin to price a ticket. Do not invent a line or treat a season O/U as tonight's prop.",
      injuryContext:
        "Availability is not confirmed enough to force a play. Wait for the official report or a posted market.",
      marketContext:
        "No verified live line for the asked market. PASS is the honest closer, not a delayed pick.",
      lineMovement: "No live number to shop. Come back when the board posts the market.",
      statisticalEdge:
        "Role and history are context only. They do not become a ticket without a posted line.",
    },
    caveats: [
      "Live line not in payload.",
      "Do not treat this PASS as a delayed over.",
    ],
    timestamp: new Date().toISOString(),
  };
}

/**
 * @param {Record<string, unknown>} structured
 * @param {string} reason
 * @param {string} [leanOverride]
 */
function rewriteStructuredToPass(structured, reason, leanOverride) {
  const pass = buildNflPassStructuredTake(reason);
  structured.call = pass.call;
  structured.callType = structured.callType || pass.callType;
  structured.confidence = "Speculative";
  structured.lean = leanOverride || pass.lean;
  structured.whyNow = pass.whyNow;
  structured.edge = pass.edge;
  structured.analysis = { ...pass.analysis };
  if (!Array.isArray(structured.caveats) || structured.caveats.length < 1) {
    structured.caveats = pass.caveats;
  }
  return structured;
}

/**
 * @param {Array<Record<string, unknown>>} games
 * @returns {Array<{
 *   home: string,
 *   away: string,
 *   favoriteAbbr: string,
 *   dogAbbr: string,
 *   points: number,
 *   displayLine: string,
 * }>}
 */
export function parseNflPostedSpreads(games) {
  /** @type {Array<{ home: string, away: string, favoriteAbbr: string, dogAbbr: string, points: number, displayLine: string }>} */
  const out = [];
  for (const g of Array.isArray(games) ? games : []) {
    const home = String(g?.homeAbbr || g?.home || "").toUpperCase();
    const away = String(g?.awayAbbr || g?.away || "").toUpperCase();
    if (!home || !away) continue;
    const spread = g?.spread && typeof g.spread === "object" ? g.spread : {};
    const display = String(spread.displayLine || g?.spread || "").toUpperCase().trim();
    const m = display.match(/\b([A-Z]{2,3})\s*([+-]?\d+(?:\.\d)?)\b/);
    let favoriteAbbr = String(spread.favoriteAbbr || "").toUpperCase();
    let points = Number(spread.favoritePoint ?? spread.point ?? spread.points);
    if (m) {
      favoriteAbbr = m[1];
      const n = Number(m[2]);
      if (Number.isFinite(n)) points = Math.abs(n);
    }
    if (!favoriteAbbr || !Number.isFinite(points) || points <= 0) continue;
    if (favoriteAbbr !== home && favoriteAbbr !== away) continue;
    const dogAbbr = favoriteAbbr === home ? away : home;
    out.push({
      home,
      away,
      favoriteAbbr,
      dogAbbr,
      points,
      displayLine: `${favoriteAbbr} -${points}`,
    });
  }
  return out;
}

/**
 * @param {string} text
 * @returns {{ abbr: string, signed: number, raw: string } | null}
 */
export function parseNflSpreadCall(text) {
  const m = String(text || "")
    .toUpperCase()
    .match(/\b([A-Z]{2,3})\s*([+-]\d+(?:\.\d)?)\b/);
  if (!m) return null;
  const signed = Number(m[2]);
  if (!Number.isFinite(signed) || signed === 0) return null;
  return { abbr: m[1], signed, raw: `${m[1]} ${m[2]}` };
}

/**
 * Favorite written as a dog (TEN -6 posted, call TEN +6) or dog written as favorite.
 * @param {string} call
 * @param {Array<Record<string, unknown>>} games
 */
export function detectNflSpreadInvert(call, games) {
  const parsed = parseNflSpreadCall(call);
  if (!parsed) return null;
  for (const g of parseNflPostedSpreads(games)) {
    if (
      parsed.abbr !== g.favoriteAbbr &&
      parsed.abbr !== g.dogAbbr &&
      parsed.abbr !== g.home &&
      parsed.abbr !== g.away
    ) {
      continue;
    }
    const abs = Math.abs(parsed.signed);
    if (Math.abs(abs - g.points) > 0.15) continue;
    const callAsFavorite = parsed.signed < 0;
    const isPostedFavorite = parsed.abbr === g.favoriteAbbr;
    if (callAsFavorite === isPostedFavorite) return null;
    return {
      invert: true,
      posted: g.displayLine,
      call: parsed.raw,
      fadeCorrect: `${g.dogAbbr} +${g.points}`,
    };
  }
  return null;
}

/**
 * "If Love only plays one series" — hypothesis, not a confirmed exit.
 * @param {string} question
 */
export function isNflConditionalSnapAsk(question) {
  const q = String(question || "");
  return (
    /\bif\b[\s\S]{0,100}\b(only plays?|one series|sits?|yanked|limited snaps?|doesn'?t play|not dress(?:ing)?|rests?)\b/i.test(
      q,
    ) || /\b(only plays? one series|get yanked|starters sit)\b/i.test(q)
  );
}

/**
 * @param {Array<Record<string, unknown>>} games
 */
export function isNflPreseasonSlate(games) {
  const list = Array.isArray(games) ? games : [];
  return list.some((g) => {
    const t = String(g?.seasonType || "").toLowerCase();
    return t.includes("pre") || t === "1" || t.includes("pre_season");
  });
}

/**
 * Model assumed regular-season starter usage on a preseason slate.
 * @param {string} text
 */
export function isNflPreseasonStarterAssumption(text) {
  return /\bstarters will play\b|\bstarters play meaningful\b|\bfull[- ]game (?:volume|snaps?) for starters\b/i.test(
    String(text || ""),
  );
}

/**
 * Posted ticket numbers from games + prop rows.
 * @param {Array<Record<string, unknown>>} games
 * @param {Array<Record<string, unknown>>} propLines
 * @returns {number[]}
 */
export function collectNflPostedNumbers(games, propLines) {
  /** @type {number[]} */
  const out = [];
  const push = (n) => {
    if (Number.isFinite(n) && n > 0 && n < 1000) out.push(n);
  };
  for (const g of Array.isArray(games) ? games : []) {
    push(Number(g?.total?.line));
    push(Math.abs(Number(g?.spread?.homePoint)));
    push(Math.abs(Number(g?.spread?.awayPoint)));
    push(Math.abs(Number(g?.spread?.favoritePoint)));
    const display = String(g?.spread?.displayLine || "");
    const m = display.match(/([+-]?\d+(?:\.\d)?)/);
    if (m) push(Math.abs(Number(m[1])));
  }
  for (const row of Array.isArray(propLines) ? propLines : []) {
    push(Number(row?.line));
  }
  return out;
}

/**
 * Ticket-shaped numbers in a call/lean (over/under N, TEAM +/-N).
 * @param {string} text
 * @returns {number[]}
 */
export function extractNflTicketNumbers(text) {
  const s = String(text || "");
  /** @type {number[]} */
  const out = [];
  const re =
    /\b(?:over|under)\s+([+-]?\d+(?:\.\d)?)\b|\b[A-Z]{2,3}\s+([+-]\d+(?:\.\d)?)\b/gi;
  let m;
  while ((m = re.exec(s))) {
    const n = Math.abs(Number(m[1] || m[2]));
    if (Number.isFinite(n) && n > 0 && n < 1000 && n !== 2024 && n !== 2025 && n !== 2026) {
      out.push(n);
    }
  }
  return out;
}

/**
 * @param {number[]} cited
 * @param {number[]} posted
 */
export function detectNflInventedLine(cited, posted) {
  if (!cited.length) return null;
  if (!posted.length) {
    return { invented: true, cited: cited[0], posted: null };
  }
  for (const n of cited) {
    const hit = posted.some((p) => Math.abs(p - n) <= 0.15);
    if (!hit) return { invented: true, cited: n, posted: posted[0] };
  }
  return null;
}

/**
 * @param {string} call
 * @param {string} body
 */
export function detectNflCallBodyConflict(call, body) {
  const c = String(call || "").toUpperCase();
  const b = String(body || "").toUpperCase();
  if (!c.trim() || c === "PASS" || /\bPASS\b/.test(c)) return null;
  const callOver = /\bOVER\b/.test(c);
  const callUnder = /\bUNDER\b/.test(c);
  const bodyOver = /\b(LEAN\s+OVER|OVER\s+IS\s+THE\s+PLAY|TAKE\s+THE\s+OVER|FADE\s+THE\s+UNDER)\b/.test(
    b,
  );
  const bodyUnder = /\b(LEAN\s+UNDER|UNDER\s+IS\s+THE\s+PLAY|TAKE\s+THE\s+UNDER|FADE\s+THE\s+OVER)\b/.test(
    b,
  );
  const bodyPass = /\b(NO\s+BET|PASS\s+THIS|DO NOT BET|DON'T BET|LEAVE IT ALONE)\b/.test(b);
  if (callOver && bodyUnder) return { conflict: "over_vs_under" };
  if (callUnder && bodyOver) return { conflict: "under_vs_over" };
  if (bodyPass && (callOver || callUnder || parseNflSpreadCall(c))) {
    return { conflict: "ticket_vs_pass" };
  }
  return null;
}

const LINE_MOVE_CLAIM_RE =
  /\bline stable\b|\bno (?:recent )?sharp movement\b|\bsharp (?:money|action) (?:moved|move|ing)\b|\bCLV\b|\bopened at\b|\bopen(?:ed)?\s+(?:to|→|->)\b|\bsteamed\b/i;

/**
 * Opening line present in briefcase or game rows.
 * @param {{
 *   hasOpeningOdds?: boolean,
 *   briefcase?: Record<string, unknown>|null,
 *   games?: Array<Record<string, unknown>>,
 * }} opts
 */
export function nflPayloadHasOpeningOdds(opts = {}) {
  if (typeof opts.hasOpeningOdds === "boolean") return opts.hasOpeningOdds;
  const bc = opts.briefcase && typeof opts.briefcase === "object" ? opts.briefcase : null;
  const opening = bc?.openingOdds || bc?.slate?.openingOdds;
  if (Array.isArray(opening) && opening.length > 0) return true;
  return (Array.isArray(opts.games) ? opts.games : []).some(
    (g) =>
      g?.spread?.open != null ||
      g?.spread?.openPoint != null ||
      g?.total?.open != null ||
      g?.openingOdds != null ||
      g?.opening != null,
  );
}

/**
 * "Line stable / sharp movement" with no opener in the payload.
 * @param {string} text
 * @param {boolean} hasOpeningOdds
 */
export function detectNflInventedLineMove(text, hasOpeningOdds) {
  if (hasOpeningOdds) return false;
  return LINE_MOVE_CLAIM_RE.test(String(text || ""));
}

/**
 * @param {string} text
 */
export function stripNflInventedLineMove(text) {
  return String(text || "")
    .replace(
      /[^.?!]*\b(?:line stable|no (?:recent )?sharp movement|sharp (?:money|action) (?:moved|move|ing)|CLV|opened at|steamed)[^.?!]*[.?!]?/gi,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Current-season counting-stat voice when the payload is not current season.
 * @param {string} text
 * @param {boolean} isCurrentSeason
 */
export function detectNflVintageBlur(text, isCurrentSeason) {
  if (isCurrentSeason) return false;
  const t = String(text || "");
  if (
    /\bthis season\b/i.test(t) &&
    /\b(yards?|touchdowns?|targets?|receptions?|attempts?)\b/i.test(t)
  ) {
    return true;
  }
  const hasRate =
    /\b\d+(?:\.\d+)?\s*(?:yds?|yards?|pts?|points?)\s*\/\s*g\b/i.test(t) ||
    /\b(?:yds?|yards?|pts?|points?)\s*per\s*game\b/i.test(t);
  const attributed = /\b(2024|2025|prior|last season|a year ago|offseason snapshot)\b/i.test(t);
  return hasRate && !attributed;
}

/**
 * Rewrite structured take when the model violates slate/identity/preseason/suitcase rules.
 * @param {{
 *   question?: string,
 *   structured?: Record<string, unknown>|null,
 *   games?: Array<Record<string, unknown>>,
 *   propLines?: Array<Record<string, unknown>>,
 *   briefcase?: Record<string, unknown>|null,
 *   inactives?: { games?: Array<Record<string, unknown>> }|null,
 *   isCurrentSeason?: boolean,
 *   hasOpeningOdds?: boolean,
 * }} opts
 */
export function applyNflAskGuard(opts = {}) {
  const question = String(opts.question || "");
  const structured =
    opts.structured && typeof opts.structured === "object" ? { ...opts.structured } : null;
  const games = Array.isArray(opts.games) ? opts.games : [];
  const propLines = Array.isArray(opts.propLines) ? opts.propLines : [];
  /** @type {string[]} */
  const codes = [];
  if (!structured) return { structured: null, codes, invert: null };

  const suitcase = resolveNflSuitcaseGuard(opts.briefcase, question);
  const phase = detectNflAskPhase(question);
  const skipPriced =
    phase === "draft" || phase === "futures" || String(structured.call || "").toUpperCase() === "PASS";

  const call = String(structured.call || "");
  const lean = String(structured.lean || "");
  const analysis =
    structured.analysis && typeof structured.analysis === "object" ? structured.analysis : {};
  const body = `${lean} ${structured.edge || ""} ${analysis.matchupAnalysis || ""} ${analysis.marketContext || ""} ${analysis.statisticalEdge || ""}`;
  const blob = `${call} ${body}`;

  const invert = detectNflSpreadInvert(call, games);
  if (invert) {
    codes.push("spread_invert");
    rewriteStructuredToPass(
      structured,
      "spread_invert",
      `Lean: Pass. Posted line is ${invert.posted}. Fade is ${invert.fadeCorrect}.`,
    );
  }

  if (isNflConditionalSnapAsk(question) && String(structured.call || "").toUpperCase() !== "PASS") {
    codes.push("conditional_as_fact");
    structured.confidence = "Speculative";
    const cur = String(structured.lean || "");
    if (!/^conditional/i.test(cur) && !/^Lean:\s*Pass/i.test(cur)) {
      const tagged = `CONDITIONAL (user hypothesis, not confirmed). ${cur}`.trim();
      structured.lean = tagged.length > 120 ? "Lean: Pass. Conditional sit is not confirmed." : tagged;
    }
  }

  const pre = isNflPreseasonSlate(games);
  if (pre && isNflPreseasonStarterAssumption(blob)) {
    codes.push("preseason_starter_assumption");
    if (/\b(anytime\s+td|roster-?bubble|bubble|starters sit)\b/i.test(question)) {
      rewriteStructuredToPass(structured, "preseason_starter_assumption");
    }
  }

  const inactiveHit = findNflInactivePlayer(opts.inactives, question);
  if (inactiveHit?.player && String(structured.call || "").toUpperCase() !== "PASS") {
    codes.push("inactive_confirmed");
    const who = String(inactiveHit.player.player || inactiveHit.player.lastName || "Player");
    rewriteStructuredToPass(
      structured,
      "inactive_confirmed",
      `Lean: Pass. ${who} is on the official inactive list — not dressing.`,
    );
  } else if (
    isNflDressingAsk(question) &&
    !nflInactivesPostedForAsk(opts.inactives) &&
    String(structured.call || "").toUpperCase() !== "PASS"
  ) {
    codes.push("inactives_not_posted");
    rewriteStructuredToPass(structured, "inactives_not_posted");
  }

  if (suitcase.forcePass && !skipPriced && String(structured.call || "").toUpperCase() !== "PASS") {
    codes.push(suitcase.noLiveProp ? "no_live_prop" : "suitcase_red");
    rewriteStructuredToPass(structured, suitcase.noLiveProp ? "no_live_prop" : "suitcase_red");
  }

  const conflict = detectNflCallBodyConflict(
    String(structured.call || ""),
    `${structured.lean || ""} ${structured.edge || ""} ${analysis.matchupAnalysis || ""} ${analysis.statisticalEdge || ""}`,
  );
  if (conflict && String(structured.call || "").toUpperCase() !== "PASS") {
    codes.push("call_body_conflict");
    rewriteStructuredToPass(structured, "call_body_conflict");
  }

  if (String(structured.call || "").toUpperCase() !== "PASS") {
    const cited = extractNflTicketNumbers(`${structured.call || ""} ${structured.lean || ""}`);
    const posted = collectNflPostedNumbers(games, propLines);
    const invented = detectNflInventedLine(cited, posted);
    if (invented && (posted.length === 0 || invented.invented)) {
      codes.push("invented_line");
      rewriteStructuredToPass(structured, "invented_line");
    }
  }

  if (detectNflVintageBlur(blob, Boolean(opts.isCurrentSeason))) {
    codes.push("vintage_blur");
    structured.confidence = clampNflConfidence(structured.confidence, "Speculative");
    const tag = "Those counting stats are a prior, not this season.";
    const nextAnalysis =
      structured.analysis && typeof structured.analysis === "object"
        ? { ...structured.analysis }
        : { ...analysis };
    if (nextAnalysis.statisticalEdge && !/\bprior\b/i.test(String(nextAnalysis.statisticalEdge))) {
      nextAnalysis.statisticalEdge = `${tag} ${nextAnalysis.statisticalEdge}`.trim();
    } else if (structured.lean && !/\bprior\b/i.test(String(structured.lean))) {
      structured.lean = `${String(structured.lean).trim()} ${tag}`.trim();
    }
    structured.analysis = nextAnalysis;
  }

  const hasOpener = nflPayloadHasOpeningOdds(opts);
  const moveBlob = `${structured.lean || ""} ${structured.edge || ""} ${structured.whyNow || ""} ${JSON.stringify(structured.analysis || {})}`;
  if (detectNflInventedLineMove(moveBlob, hasOpener)) {
    codes.push("invented_line_move");
    structured.lean = stripNflInventedLineMove(String(structured.lean || "")) ||
      "Lean: posted number. No opener in payload — do not infer movement.";
    if (structured.edge) structured.edge = stripNflInventedLineMove(String(structured.edge));
    if (structured.whyNow) structured.whyNow = stripNflInventedLineMove(String(structured.whyNow));
    const nextAnalysis =
      structured.analysis && typeof structured.analysis === "object" ? { ...structured.analysis } : {};
    for (const key of ["matchupAnalysis", "marketContext", "lineMovement", "statisticalEdge", "injuryContext"]) {
      if (typeof nextAnalysis[key] === "string") {
        nextAnalysis[key] = stripNflInventedLineMove(nextAnalysis[key]);
      }
    }
    nextAnalysis.lineMovement = "No opener in payload. Do not infer movement.";
    structured.analysis = nextAnalysis;
  }

  structured.confidence = clampNflConfidence(structured.confidence, suitcase.confidenceCap);

  if (codes.length) {
    console.info(
      JSON.stringify({
        event: "nfl_ask_guard",
        codes,
        invert: invert || null,
        forcePass: suitcase.forcePass,
        confidenceCap: suitcase.confidenceCap,
        callWas: call,
        callNow: structured.call,
      }),
    );
  }

  return { structured, codes, invert, suitcase };
}
