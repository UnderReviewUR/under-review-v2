/**
 * Outcome-first Pro upgrade copy (modal, chips, nudges).
 * Lead differentiators: full take + THE PLAY, session memory.
 */

export const UPGRADE_LIMIT_HIT_HEADLINE =
  "You've used your 3 free questions today — come back tomorrow or go Pro for unlimited access.";

export const UPGRADE_LIMIT_HIT_BODY = `Pro members get the full take — not the summary. Session memory means the app knows your positions. THE PLAY block means it tells you exactly what to bet and why.

$9.99/month · cancel anytime`;

export const UPGRADE_MODAL_DAILY_TAGLINE = "3 free questions every day. Unlimited with Pro.";

export function freeLimitChipMessage(remaining) {
  const qWord = remaining === 1 ? "question" : "questions";
  return `${remaining} free ${qWord} left today — Pro gives the full read with THE PLAY, not the summary.`;
}

export const THREAD_UPGRADE_NUDGE_TEXT =
  "Get the full take with THE PLAY — Pro remembers your positions across the slate.";

export const LEDGER_TEASER_UNLOCK = "Your full record — every THE PLAY tracked and graded with Pro.";

/** Pro tab feature list (free paywall) — differentiators first, then sport coverage. */
export const PRO_PAYWALL_FEATURE_ROWS = [
  {
    color: "#C9A227",
    name: "Session Memory",
    desc: "The app remembers your positions across takes — a betting companion that knows you, not a one-off answer.",
  },
  {
    color: "var(--cyan-bright)",
    name: "THE PLAY — Every Time",
    desc: "The full conviction read: what to bet and why. Free gets the summary; Pro closes with a mandatory play call.",
  },
  {
    color: "var(--cyan-bright)",
    name: "Betting Companion, Not a Chatbot",
    desc: "Deeper responses that carry your angles forward — built for how you actually bet the slate.",
  },
  {
    color: "#FFE600",
    name: "Tennis — Elo + Surface Edges",
    desc: "ATP/WTA rally profiles, serve baselines, draw-path value across every surface.",
  },
  {
    color: "#1DB954",
    name: "MLB — Pitcher K Props",
    desc: "Park-adjusted, platoon-split, barrel rate. Know before the line moves.",
  },
  {
    color: "#FF6B00",
    name: "NBA — PRA Calibration",
    desc: "Pace-adjusted floors and ceilings. Live injury replacement plays in real time.",
  },
  {
    color: "#4A90D9",
    name: "NFL — QB, RB, WR & TE Database",
    desc: "TD rates, prop floors and ceilings for every QB, RB, WR, and TE. Scheme and matchup angles. Full live props arriving with the 2026 season.",
  },
  {
    color: "#E10600",
    name: "F1 — Race-Day Angles",
    desc: "Full 2026 driver grid. Race-day edges the market hasn't priced yet.",
  },
  {
    color: "#FFFFFF",
    name: "Golf — Course Fit & Matchup H2Hs",
    desc: "PGA SG profiles, make-cut plays, and outright value the market underprices weekly.",
  },
];
