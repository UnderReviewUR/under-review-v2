import { isKnockoutPhase } from "./wcPhaseUtils.js";

/**
 * Phase-aware World Cup quick prompts for empty WC thread.
 * @param {object} [opts]
 * @param {number} [opts.liveCount]
 * @param {number} [opts.todayCount]
 * @param {boolean} [opts.xiConfirmed]
 * @param {string} [opts.tournamentPhase]
 */
export function getWcQuickPrompts(opts = {}) {
  const live = Number(opts.liveCount) || 0;
  const today = Number(opts.todayCount) || 0;
  const xi = Boolean(opts.xiConfirmed);
  const knockout = isKnockoutPhase(opts.tournamentPhase);

  if (live > 0) {
    return [
      "Who wins the live knockout match?",
      "Best live angle right now?",
      "Any mispriced live line?",
    ];
  }
  if (today > 0) {
    if (knockout) {
      const base = [
        "Best bet on today's knockout slate — not just the moneyline",
        "Who advances in today's featured match?",
      ];
      if (xi) base.push("Best player prop tonight?");
      else base.push("Any upset value on the knockout board?");
      return base;
    }
    const base = [
      "Best bet on today's slate — not just the moneyline",
      "Both teams to advance on today's best match?",
    ];
    if (xi) base.push("Best player prop tonight?");
    else base.push("Golden Boot — who has value?");
    return base;
  }
  if (knockout) {
    return [
      "What's the best knockout value bet right now?",
      "Which Round of 32 matchup is most mispriced?",
      "Who advances if it goes to penalties?",
      "Best bet on the next knockout fixture if I only know the moneyline",
    ];
  }
  return [
    "What's the best group-stage value bet right now?",
    "Golden Boot pick — who scores most and why?",
    "Which team is most mispriced to win the tournament?",
    "USA vs Paraguay — best bet if I only know the moneyline",
  ];
}
