/**
 * Phase-aware World Cup quick prompts for empty WC thread.
 * @param {object} [opts]
 * @param {number} [opts.liveCount]
 * @param {number} [opts.todayCount]
 * @param {boolean} [opts.xiConfirmed]
 */
export function getWcQuickPrompts(opts = {}) {
  const live = Number(opts.liveCount) || 0;
  const today = Number(opts.todayCount) || 0;
  const xi = Boolean(opts.xiConfirmed);

  if (live > 0) {
    return [
      "Who wins the live game?",
      "Best live angle right now?",
      "Any mispriced live line?",
    ];
  }
  if (today > 0) {
    const base = [
      "Best bet on today's slate — not just the moneyline",
      "Both teams to advance on today's best match?",
    ];
    if (xi) base.push("Best player prop tonight?");
    else base.push("Golden Boot — who has value?");
    return base;
  }
  return [
    "What's the best group-stage value bet right now?",
    "Golden Boot pick — who scores most and why?",
    "Which team is most mispriced to win the tournament?",
    "USA vs Paraguay — best bet if I only know the moneyline",
  ];
}
