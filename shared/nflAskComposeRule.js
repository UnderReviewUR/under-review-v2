/**
 * UR NFL compose rule — beat generalist chat by owning the ticket + private why.
 *
 * Live BDL GOAT / board = the number.
 * Hand paste (angles, H2H, Clay, D prior) = the why.
 * PASS only when the *asked* priced market has no live row.
 */

export const NFL_ASK_COMPOSE_RULE = Object.freeze({
  id: "nfl_ask_compose_v1",
  summary:
    "Answer the asked market. Live price when priced. Paste for why. PASS only when that market’s price is missing.",
  steps: Object.freeze([
    "Classify: prop | spread | total | ML | opinion.",
    "Load pockets for THAT market only — do not tax opinions with empty player props.",
    "GOAT/AN board owns the posted number; hand paste owns angles/H2H/usage/D prior.",
    "Season O/U and Clay are pace priors — never a substitute for tonight’s live row.",
    "One lean. Soft markets stay Speculative. Label '25 D priors as priors.",
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
    "3. Use matchup/paste/H2H/Clay/D-prior for WHY only. Prefer board over season O/Us.",
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
  // Game prices: props/rosters optional; posted odds/games still required.
  if (id === "spread" || id === "total" || id === "moneyline" || id === "sgp") {
    return new Set(["slate.playerProps", "league.rosters"]);
  }
  return new Set(["slate.playerProps", "league.rosters"]);
}
