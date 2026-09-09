/**
 * UR NFL compose rule — beat generalist chat by owning the ticket + private why.
 *
 * Live BDL GOAT / board = the number.
 * Hand paste (angles, H2H, Clay, D prior) = the why.
 * PASS only when the *asked* priced market has no live row.
 */

export const NFL_ASK_COMPOSE_RULE = Object.freeze({
  id: "nfl_ask_compose_v2",
  summary:
    "Answer the asked market like a sharp friend. Live GOAT prices are the number. Live GOAT stats, logs, injuries, and defense are the why. PASS only when that market’s price is missing.",
  steps: Object.freeze([
    "Classify: prop | spread | total | ML | opinion.",
    "Load the GOAT analyst packet first — season form, recent logs, injuries, opponent D, posted line.",
    "GOAT owns the posted number and the football why. Static paste / season O/Us are fallback only.",
    "Form one logical opinion: does the number look short, long, or fair vs the evidence.",
    "One lean. Soft markets stay Speculative.",
    "PASS only if the asked priced market has no matching live row.",
  ]),
});

/**
 * Prompt block injected every NFL Ask turn.
 */
export function buildNflAskComposePromptBlock() {
  return [
    "UR COMPOSE RULE (non-negotiable — this is how we beat generic chat):",
    `1. ${NFL_ASK_COMPOSE_RULE.summary}`,
    "2. If a live row exists for the asked market, lean that number — do not invent or swap markets (yards ≠ TDs).",
    "3. Use the GOAT analyst packet (season stats, recent logs, injuries, live D) for WHY. Static paste is fallback.",
    "4. Opinion / who-wins asks: answer a side lean without requiring player props. Do not PASS just because props are empty.",
    "5. Spread/total/ML: empty player-prop pockets do not force PASS. Missing posted game price does.",
    "6. One primary market per take. Close PASS only when the asked priced market is missing — never to sound clever.",
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
