/**
 * Outcome-first Pro upgrade copy (modal, chips, nudges, Pro tab).
 * Lead differentiators: full take + THE PLAY, session memory.
 * No em dashes in user-facing strings.
 */

export {
  DAILY_QUOTA_LIMIT_MESSAGE,
  EMAIL_GATE_BODY,
  EMAIL_GATE_HEADLINE,
  EMAIL_GATE_SESSION_MESSAGE,
  FREE_TIER_HOME_FOOTNOTE_PRIMARY,
  FREE_TIER_HOME_FOOTNOTE_SECONDARY,
  UPGRADE_LIMIT_HIT_BODY,
  UPGRADE_LIMIT_HIT_HEADLINE,
  UPGRADE_MODAL_DAILY_TAGLINE,
  freeLimitChipMessage,
} from "../../shared/freeTierCopy.js";

export const THREAD_UPGRADE_NUDGE_TEXT =
  "Get the full take with THE PLAY. Pro remembers your positions across the slate.";

export const LEDGER_TEASER_UNLOCK =
  "Your full record. Every THE PLAY tracked and graded with Pro.";

export const PRO_UNLOCK_BUTTON_LABEL = "Unlock Pro · $9.99/mo";

export const PRO_RESTORE_RECEIPT_HINT =
  "New phone or browser? Enter the email from your Stripe receipt. We'll email you a secure login link.";

export const PRO_SUBSCRIPTION_BODY = `UR Take reads the slate: lineups, lines, and matchup context.
Then it closes with a direct call.
Not picks. A real-time edge with THE PLAY every time.
World Cup match reads update when XIs confirm.`;

/** @type {[string, string][]} */
export const PRO_VALUE_GRID_ROWS = [
  [
    "KNOW BEFORE THE LINE MOVES",
    `Lineup gaps, injury context,
and pace math before the market
adjusts.`,
  ],
  [
    "THE PLAY. EVERY TIME.",
    `Every response closes with a
direct call. No hedging.
No 'on the other hand.'`,
  ],
  [
    "IT REMEMBERS. YOU BUILD.",
    `UR Take carries the thread
across sessions. Your angles
compound.`,
  ],
  [
    "ASK EVERYTHING. PAY NOTHING EXTRA.",
    `No weekly ceiling. No per-query
fees. One price, unlimited reads.`,
  ],
];

export const PRO_CTA_BULLETS = [
  "Lines move. You move first.",
  "Real-time edges, not yesterday's picks",
  "Built to beat the market",
];

export const PRO_PROOF_LINES = [
  `Injury and lineup moves tracked across active slates.
The market reacts slower than this.`,
  `280+ player profiles updated every 30 minutes.
World Cup, NBA, and Golf plus the full seasonal library.`,
  `Live game scripts adjust in real time.
You know before the line moves.`,
];

/**
 * Pro tab feature list: differentiators, active nav sports, then seasonal library.
 * @type {Array<{ kind: "section", label: string } | { kind: "feature", color: string, name: string, desc: string }>}
 */
export const PRO_PAGE_FEATURE_ROWS = [
  { kind: "section", label: "Pro differentiators" },
  {
    kind: "feature",
    color: "#C9A227",
    name: "Session Memory",
    desc: "The app remembers your positions across takes. A betting companion that knows you, not a one-off answer.",
  },
  {
    kind: "feature",
    color: "var(--cyan-bright)",
    name: "THE PLAY, Every Time",
    desc: "The full conviction read: what to bet and why. Free gets the summary; Pro closes with a mandatory play call.",
  },
  {
    kind: "feature",
    color: "var(--cyan-bright)",
    name: "Betting Companion, Not a Chatbot",
    desc: "Deeper responses that carry your angles forward. Built for how you actually bet the slate.",
  },
  {
    kind: "feature",
    color: "var(--cyan-bright)",
    name: "Betting Style Personalization",
    desc: "Tell UR Take how you approach your bets. Bold and committed, or full picture to decide. Toggle anytime.",
  },
  { kind: "section", label: "Active now" },
  {
    kind: "feature",
    color: "#00F5E9",
    name: "World Cup 2026: Match Reads & Knockout",
    desc: "XI-aware match reads, group-winner lines, and advancement angles when lineups confirm.",
  },
  {
    kind: "feature",
    color: "#FF6B00",
    name: "NBA: PRA Calibration",
    desc: "Pace-adjusted floors and ceilings. Live injury replacement plays in real time.",
  },
  {
    kind: "feature",
    color: "#FFFFFF",
    name: "Golf: Course Fit & Matchup H2Hs",
    desc: "PGA SG profiles, make-cut plays, and outright value the market underprices weekly.",
  },
  { kind: "section", label: "Seasonal library (included with Pro)" },
  {
    kind: "feature",
    color: "#4A90D9",
    name: "NFL: QB, RB, WR & TE Database",
    desc: "NFL Predictor live now. TD rates, prop floors, and scheme angles. Full live UR Take props return with the 2026 season.",
  },
  {
    kind: "feature",
    color: "#FFE600",
    name: "Tennis: Elo + Surface Edges",
    desc: "ATP/WTA rally profiles, serve baselines, and draw-path value. Surfaces when the tour is live.",
  },
  {
    kind: "feature",
    color: "#1DB954",
    name: "MLB: Pitcher K Props",
    desc: "Park-adjusted, platoon-split, barrel rate. Returns when the MLB slate is active.",
  },
  {
    kind: "feature",
    color: "#E10600",
    name: "F1: Race-Day Angles",
    desc: "Full 2026 driver grid. Race-day edges the market has not priced yet.",
  },
];

/** @deprecated Use PRO_PAGE_FEATURE_ROWS; kept for any external imports. */
export const PRO_PAYWALL_FEATURE_ROWS = PRO_PAGE_FEATURE_ROWS.filter((r) => r.kind === "feature");
