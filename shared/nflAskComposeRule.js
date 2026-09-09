/**
 * UR NFL compose rule — beat generalist chat by owning the ticket + private why.
 *
 * Live BDL GOAT / board = the number.
 * Hand paste (angles, H2H, Clay, D prior) = the why.
 * PASS only when the *asked* priced market has no live row.
 */

export const NFL_ASK_COMPOSE_RULE = Object.freeze({
  id: "nfl_ask_compose_v3",
  summary:
    "Answer the asked market like a sharp friend. Every prop or game-line ask ships Over/Under (or a spread/ML side) plus one why. Live prices are the number. Live stats, logs, injuries, and defense are the why. PASS only when that market’s price is missing.",
  steps: Object.freeze([
    "Classify: prop | spread | total | ML | opinion.",
    "Load the analyst packet first — season form, recent logs, injuries, opponent D, posted line.",
    "Ticket: Over X, Under X, or a named side. Never a naked number. Never a menu of unsided lines.",
    "If books disagree, fade the high print and buy the low print. Else take the less-juiced side.",
    "Weeks 1–3: last year’s D is a prior, not this year’s rank. Cap Speculative/Medium.",
    "One lean. Soft markets stay Speculative.",
    "PASS only if the asked priced market has no matching live row.",
  ]),
});

/**
 * Weeks 1–3: live 2026 ranks are thin. Last year is a prior only.
 * @param {unknown} week
 */
export function isNflOpenerWeek(week) {
  const w = Number(week);
  return Number.isFinite(w) && w >= 1 && w <= 3;
}

/**
 * Prompt block injected every NFL Ask turn.
 */
export function buildNflAskComposePromptBlock() {
  return [
    "UR COMPOSE RULE (non-negotiable — this is how we beat generic chat):",
    `1. ${NFL_ASK_COMPOSE_RULE.summary}`,
    "2. TICKET RULE: Over X / Under X (or spread/ML side) + one why. Never “start with 262.5”. Broad asks list 3–5 sided tickets, not naked numbers.",
    "3. DIRECTION: If shops disagree, high print → Under, low print → Over. Else the less-juiced / plus-money side. Weeks 1–3: last-year D is a prior — do not call it this year’s ELITE rank.",
    "4. VOICE: text a friend. Short sentences. No “Action: bet”, “Grab one”, “shop juice”, “live book numbers”, vendor names.",
    "5. Use the analyst packet (season stats, recent logs, injuries, D) for WHY. Static paste is fallback.",
    "6. Opinion / who-wins asks: answer a side lean without requiring player props. Do not PASS just because props are empty.",
    "7. Spread/total/ML: empty player-prop pockets do not force PASS. Missing posted game price does.",
    "8. Best props / best bets / this game / X vs Z: one primary Over/Under, then list 3–5 sided tickets (player, side, number). Never a menu of unsided lines. PASS only when the asked priced market is missing.",
  ].join("\n");
}

/**
 * Pockets that should not red-grade / force-pass when the ask is not a player-prop ticket.
 * @param {{ marketId?: string, propTypeHints?: string[] } | null | undefined} detected
 */
export function nflAskGradeExemptPockets(detected) {
  const hints = Array.isArray(detected?.propTypeHints) ? detected.propTypeHints : [];
  const id = String(detected?.marketId || "");
  const isPropAsk = hints.length > 0;
  if (isPropAsk) return new Set();
  // Opinion / general: no ticket number required — odds + props + rosters optional.
  if (id === "general" || id === "opinion") {
    return new Set(["slate.playerProps", "league.rosters", "slate.odds"]);
  }
  if (id === "props_board") {
    return new Set(["league.rosters"]);
  }
  // Game prices: props/rosters optional; posted odds/games still required.
  if (id === "spread" || id === "total" || id === "moneyline" || id === "sgp") {
    return new Set(["slate.playerProps", "league.rosters"]);
  }
  return new Set(["slate.playerProps", "league.rosters"]);
}
