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
      "Who wins tonight's headline match?",
      "Best bet on today's slate?",
    ];
    if (xi) base.push("Best player prop tonight?");
    else base.push("Golden Boot — who has value?");
    return base;
  }
  return [
    "🏆 Give me your full tournament predictions — winner, dark horse, breakout player, and Golden Boot",
    "Which team is most mispriced to win the tournament?",
    "Who wins Group A?",
    "Who lifts the trophy?",
  ];
}
