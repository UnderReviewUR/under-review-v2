/**
 * NFL Ask discipline — anti-blur lanes + the quiet failure modes.
 * One primary market, clear data vintage, calibrated confidence, next step.
 */

import { detectNflAskMarket, NFL_TOP_25_BET_MARKETS } from "./nflGoatExtractionContract.js";
import { shouldSkipNflLiveBoardForAsk } from "./nflAskBoardPolicy.js";
import { isNflConditionalSnapAsk } from "./nflAskGuard.js";
import { buildNflAskComposePromptBlock } from "./nflAskComposeRule.js";

/** @typedef {'draft'|'futures'|'weekly_props'|'game_core'|'live'|'exotic'|'mixed'} NflAskPhase */

/**
 * Confidence / tone bands by market family (not unit advice).
 * @type {Record<string, { band: 'firm'|'medium'|'soft'|'lottery', note: string }>}
 */
export const NFL_MARKET_CONFIDENCE = Object.freeze({
  spread: { band: "firm", note: "Main game price — firm structural read OK." },
  total: { band: "firm", note: "Main total — firm if weather/injuries checked." },
  moneyline: { band: "firm", note: "ML — firm on dogs only with a clear number case." },
  team_total: { band: "medium", note: "One-sided scoring — medium." },
  pass_yds: { band: "medium", note: "Volume props — medium; script moves the number." },
  rush_yds: { band: "medium", note: "Volume props — medium; committee + script." },
  rec_yds: { band: "medium", note: "Volume props — medium; target share first." },
  receptions: { band: "medium", note: "Catch volume — medium." },
  rush_rec_yds: { band: "medium", note: "Combo yards — medium/safer than pure rush sometimes." },
  completions_attempts: { band: "medium", note: "Pace props — medium." },
  pass_tds: { band: "soft", note: "TD props are lumpy — soft conviction." },
  anytime_td: { band: "soft", note: "Anytime TD — soft; never lock language." },
  first_td: { band: "lottery", note: "First TD — lottery variance." },
  longest_play: { band: "lottery", note: "Longest play — lottery." },
  interceptions: { band: "soft", note: "INT thrown — soft rare-event." },
  sacks: { band: "soft", note: "Sacks — soft; opportunity + OL." },
  tackles: { band: "soft", note: "Tackles — soft/thin books." },
  kicking: { band: "soft", note: "Kicking — soft; RZ TD vs FG." },
  sgp: { band: "soft", note: "SGP — soft; name correlation explicitly." },
  alt_spread_total: { band: "soft", note: "Alts — juiced; don't treat like the main." },
  "1h_spread_total": { band: "medium", note: "1H — medium; early script." },
  live_in_game: { band: "soft", note: "Live — soft; board can yank." },
  season_win_total: { band: "medium", note: "Season wins — medium pathing." },
  sb_outright: { band: "soft", note: "SB futures — soft pathing." },
  award_futures: { band: "soft", note: "Awards — soft narrative." },
  defense_st: { band: "soft", note: "D/ST props — soft/thin." },
  method_exact: { band: "lottery", note: "Exotic / exact margin — lottery only." },
  general: { band: "medium", note: "General — stay medium until market clears." },
  opinion: { band: "medium", note: "Opinion lean — medium; no invented ticket number." },
});

/**
 * @param {string} question
 * @returns {NflAskPhase}
 */
export function detectNflAskPhase(question) {
  const q = String(question || "").toLowerCase();
  if (shouldSkipNflLiveBoardForAsk(q) && /\b(draft|prospect|mock|on the clock)\b/.test(q)) {
    return "draft";
  }
  if (
    /\b(super\s*bowl|win\s+totals?|mvp|oroy|droy|futures?|outright|conference\s+winner)\b/.test(q) &&
    !/\b(tonight|this week|sunday|monday night|prop)\b/.test(q)
  ) {
    return "futures";
  }
  if (/\b(live|in[-\s]?game|right now|current score)\b/.test(q)) return "live";
  if (
    /\b(race to|both teams to score|winning margin|exact (score|margin)|coin toss|anthem|method of victory|highest scoring)\b/.test(
      q,
    )
  ) {
    return "exotic";
  }
  if (/\b(spread|moneyline|\bML\b|total|over\/under|ATS|cover)\b/i.test(q) && !/\b(yards?|td|reception|sack|tackle)\b/.test(q)) {
    return "game_core";
  }
  if (/\b(yards?|touchdown|reception|anytime|sacks?|tackles?|targets?|prop|SGP|parlay)\b/i.test(q)) {
    return "weekly_props";
  }
  if (shouldSkipNflLiveBoardForAsk(q)) return "futures";
  return "mixed";
}

/**
 * @param {string} marketId
 */
export function confidenceForNflMarket(marketId) {
  return (
    NFL_MARKET_CONFIDENCE[marketId] ||
    NFL_MARKET_CONFIDENCE.general
  );
}

/**
 * Alt vs main detection.
 * @param {string} question
 */
export function isNflAltLineAsk(question) {
  return /\b(alt(?:ernate)?|juiced|plus[\s-]?money|alt\s+(?:spread|total|yards?))\b/i.test(
    String(question || ""),
  );
}

/**
 * SGP / correlated stack ask.
 * @param {string} question
 */
export function isNflSgpAsk(question) {
  return /\b(SGP|same[-\s]?game\s+parlay|parlay)\b/i.test(String(question || ""));
}

/**
 * Summarize book disagreement for one player + market hints.
 * @param {Array<Record<string, unknown>>} propLines
 * @param {string} playerName
 * @param {string[]} hints
 */
export function summarizeNflBookDisagreement(propLines, playerName, hints = []) {
  const name = String(playerName || "").toLowerCase();
  const want = (hints || []).map((h) => String(h).toLowerCase());
  const rows = (Array.isArray(propLines) ? propLines : []).filter((r) => {
    const p = String(r?.player || "").toLowerCase();
    if (!p.includes(name.split(" ").pop() || name)) return false;
    if (!want.length) return true;
    const raw = String(r.propRaw || r.prop || "").toLowerCase();
    return want.some((h) => raw.includes(h));
  });
  if (rows.length < 2) {
    return { disagree: false, min: null, max: null, books: [], line: rows[0]?.line ?? null };
  }
  const lines = rows
    .map((r) => Number(r.line))
    .filter((n) => Number.isFinite(n));
  if (lines.length < 2) {
    return { disagree: false, min: null, max: null, books: [], line: rows[0]?.line ?? null };
  }
  const min = Math.min(...lines);
  const max = Math.max(...lines);
  const books = [...new Set(rows.map((r) => String(r.book || "book")))];
  return {
    disagree: max - min >= 0.5,
    min,
    max,
    books,
    line: rows[0]?.line ?? null,
    spread: Math.round((max - min) * 10) / 10,
  };
}

/**
 * Game-script clause from slate spread (favorite implied).
 * @param {Record<string, unknown>|null} game
 * @param {string} playerTeam
 */
export function buildNflGameScriptLine(game, playerTeam) {
  if (!game || typeof game !== "object") return null;
  const team = String(playerTeam || "").toUpperCase();
  const spread = game.spread;
  if (!spread || typeof spread !== "object") return null;
  const fav = String(spread.favoriteAbbr || "").toUpperCase();
  const home = String(game.homeAbbr || "").toUpperCase();
  const away = String(game.awayAbbr || "").toUpperCase();
  if (!fav || (team !== home && team !== away)) return null;
  const isFav = team === fav;
  const display = spread.displayLine || fav;
  if (isFav) {
    return `Script: ${team} favored (${display}) — lean pass/rush volume with a lead script; trailing dog props differ.`;
  }
  return `Script: ${team} dog vs ${fav} (${display}) — trailing/pass-catcher upside; compress pure rush for RB1s unless committee-proof.`;
}

/**
 * Preseason / season-type warning from slate games.
 * @param {Array<Record<string, unknown>>} games
 */
export function buildNflSeasonTypeWarning(games) {
  const list = Array.isArray(games) ? games : [];
  const types = list.map((g) => String(g.seasonType || "").toLowerCase());
  if (types.some((t) => t.includes("pre") || t === "preseason" || t === "1" || t.includes("pre_season"))) {
    const week = list[0]?.week;
    if (week === 1 || week === "1") {
      return "PRESEASON WEEK 1 HARD STOP: Default is sit or one series. Do NOT write \"starters will play.\" Star props and roster-bubble anytime TD = PASS unless inactives confirm they dress. Totals/spreads are backup-football numbers.";
    }
    return "SEASON TYPE: slate looks preseason — do not treat lines or usage as regular-season habits.";
  }
  if (types.some((t) => t.includes("post") || t.includes("playoff"))) {
    return "SEASON TYPE: postseason — knockout variance; roles can compress.";
  }
  return null;
}

/**
 * Injury timing note — status word + age if we have fetchedAt.
 * @param {string|null} injuryLine
 * @param {{ fetchedAt?: number|string|null, asOf?: string|null }} [meta]
 */
export function buildNflInjuryTimingNote(injuryLine, meta = {}) {
  if (!injuryLine) return null;
  const fetched = meta.fetchedAt != null ? Number(meta.fetchedAt) : NaN;
  const asOf = meta.asOf ? Date.parse(String(meta.asOf)) : NaN;
  const ts = Number.isFinite(fetched) ? fetched : asOf;
  if (!Number.isFinite(ts)) {
    return `${injuryLine} Timing: report age unknown — re-check inactives before betting.`;
  }
  const ageHrs = Math.max(0, Math.round((Date.now() - ts) / 3600_000));
  if (ageHrs >= 12) {
    return `${injuryLine} Timing: injury snapshot ~${ageHrs}h old — Sunday AM inactive can flip this.`;
  }
  return `${injuryLine} Timing: injury snapshot ~${ageHrs}h old — still verify inactives.`;
}

/**
 * Weather = modifier only (never the whole thesis).
 * @param {string|null} stadiumLine
 * @param {boolean} outdoor
 */
export function buildNflWeatherDisciplineLine(stadiumLine, outdoor) {
  if (!stadiumLine) return null;
  if (!outdoor) return `${stadiumLine} Weather: irrelevant (dome).`;
  return `${stadiumLine} Weather: modifier only (one clause) — never the whole thesis unless wind/cold is extreme and in payload.`;
}

/**
 * Mandatory closing "what to do next" by phase/market.
 * @param {{ phase: NflAskPhase, marketId: string, hasLiveLine: boolean, injuryFlag: boolean, isAlt: boolean }} ctx
 */
export function buildNflNextStepLine(ctx) {
  if (ctx.injuryFlag) {
    return "NEXT: Wait for inactive list (or confirmed Out) before placing — status beats the number.";
  }
  if (ctx.phase === "draft") {
    return "NEXT: Lock the team/pick context; don’t mix draft capital with weekly prop boards.";
  }
  if (ctx.phase === "futures") {
    return "NEXT: Shop the future price if shown; otherwise path qualitatively — no invented odds.";
  }
  if (ctx.isAlt) {
    return "NEXT: Compare alt price vs the main line — if juice is silly, pass or bet the main.";
  }
  if (!ctx.hasLiveLine) {
    return "NEXT: Confirm the live number at your book before betting; structural lean only until then.";
  }
  if (ctx.marketId === "sgp" || ctx.marketId === "anytime_td" || ctx.marketId === "first_td") {
    return "NEXT: Size smaller than a main spread/total — variance is higher; shop the best price.";
  }
  return "NEXT: Shop the number across books; place only if your number still has edge after juice.";
}

/**
 * Anti-blur + full discipline prompt for every NFL Ask.
 * @param {{
 *   question?: string,
 *   marketId?: string,
 *   phase?: NflAskPhase,
 *   hasLiveLine?: boolean,
 *   injuryFlag?: boolean,
 *   isAlt?: boolean,
 *   bookDisagree?: { disagree: boolean, min?: number|null, max?: number|null, spread?: number },
 *   seasonTypeWarning?: string|null,
 *   ambiguousPlayer?: string|null,
 *   namedIdBlock?: string|null,
 * }} [opts]
 */
export function buildNflAskDisciplinePromptBlock(opts = {}) {
  const question = String(opts.question || "");
  const detected = detectNflAskMarket(question);
  const marketId = opts.marketId || detected.marketId;
  const phase = opts.phase || detectNflAskPhase(question);
  const conf = confidenceForNflMarket(marketId);
  const isAlt = opts.isAlt ?? isNflAltLineAsk(question);
  const isSgp = isNflSgpAsk(question);
  const next = buildNflNextStepLine({
    phase,
    marketId,
    hasLiveLine: Boolean(opts.hasLiveLine),
    injuryFlag: Boolean(opts.injuryFlag),
    isAlt,
  });

  const topLabels = NFL_TOP_25_BET_MARKETS.slice(0, 12)
    .map((m) => m.label)
    .join("; ");

  const lines = [
    buildNflAskComposePromptBlock(),
    "NFL ASK DISCIPLINE (anti-blur — mandatory)",
    `Phase lane: ${phase}. Do NOT mix draft capital, weekly props, futures, and exotics in one blurry answer unless the user asked for multiple.`,
    `Primary market: ${detected.label} (${marketId}). Lead with that market; secondary markets only if asked or needed for script (spread/total as context).`,
    `Conviction band: ${conf.band.toUpperCase()} — ${conf.note}`,
    "Data vintage lanes (never blur): (1) live board line + injuries/depth + recent/season stats = PRIMARY call, (2) role/volume prior = silent support only, (3) static season O/U = fallback. Never present prior-season box scores as \"this season\" unless labeled current.",
    "CITATION BAN (user-facing): Never name BallDontLie, BDL, GOAT, Action Network, Mike Clay, ESPN Fantasy, or other vendors/analysts. Argue the line, usage, role, and injuries in plain football.",
    "ONE CALL: one lean, one number, one reason. If role prior and live usage disagree, live usage + posted line win — describe the gap without dual-sourcing.",
    "Exotics (race to X, exact margin, coin toss, method): know them → answer if asked → mark lottery/novelty → do not steal airtime from the primary lean.",
  ];

  if (isSgp) {
    lines.push(
      "SGP CORRELATION: If stacking related legs (QB pass yards + WR yards + team total / anytime TD + total), say they share the same script — not independent. Prefer fewer correlated legs.",
    );
  }
  if (isAlt) {
    lines.push(
      "ALT VS MAIN: Alternate lines are juiced. Compare to the main; do not analyze an alt as if it were the consensus number.",
    );
  }
  if (opts.bookDisagree?.disagree) {
    lines.push(
      `BOOK DISAGREEMENT: lines span ${opts.bookDisagree.min}–${opts.bookDisagree.max} (Δ ${opts.bookDisagree.spread}). Cite the range; prefer shopping / best number over pretending one consensus.`,
    );
  }
  if (opts.seasonTypeWarning) {
    lines.push(opts.seasonTypeWarning);
  }
  if (opts.ambiguousPlayer) {
    lines.push(
      `PLAYER ID HARD STOP: Ambiguous last-name match (${opts.ambiguousPlayer}). Do NOT assume a player. Lean: Pass. Ask which athlete (full name). No MATCH READ, no invented line, no committee-back essay until they name one.`,
    );
  }
  if (isNflConditionalSnapAsk(question)) {
    lines.push(
      "CONDITIONAL HARD STOP: The user stated an IF (sit / one series / yanked). That is unconfirmed. Label the lean CONDITIONAL or PASS. Do not write as if the exit already happened.",
    );
  }
  if (opts.namedIdBlock) {
    lines.push(String(opts.namedIdBlock));
  }

  lines.push(
    "Game script: use spread/favorite as context for prop volume — dog trailing ≠ favorite lean-script.",
    "Weather: outdoor = one-clause modifier max unless extreme conditions are in payload; never the whole thesis.",
    "Injury timing: Out/Doubtful/Questionable beats baselines; re-check inactives — Wednesday tags ≠ Sunday actives.",
    "Bankroll tone: never imply the same unit size for anytime TD / first TD / SGP / exotics as for a main spread or total. No \"max bet\" / lock language.",
    "Disclosure: sharp ≠ lock. Soft/lottery bands must sound softer in the prose.",
    `${next}`,
    `Hot markets (volume): ${topLabels}.`,
  );

  return lines.join("\n");
}
