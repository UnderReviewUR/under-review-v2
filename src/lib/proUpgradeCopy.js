/**
 * Outcome-first Pro upgrade copy — ICP: NFL + La Liga weekend companion.
 * Lead differentiators: THE PLAY, play tracking, session memory, graded record.
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

export { VALUE_TRIAL_DAYS } from "../../shared/valueConversion.js";

export const HOME_ICP_TAGLINE = "NFL + La Liga weekend companion";
export const HOME_ICP_SUBLINE =
  "Posted lines, matchup reads, and prop angles before kickoff.";

export const THREAD_UPGRADE_NUDGE_TEXT =
  "Like the read? Try Pro free for 7 days — THE PLAY, tracking, and unlimited NFL + La Liga takes.";

export const THREAD_UPGRADE_NUDGE_CTA = "Try 7 days free";

export const VALUE_TRIAL_MODAL_HEADLINE = "Your slate reads are working";
export const VALUE_TRIAL_MODAL_SUB = "Keep the weekend edge going.";
export const VALUE_TRIAL_MODAL_BODY =
  "7 days unlimited on NFL + La Liga: THE PLAY on every ask, play tracking, and your graded record. Then $9.99/mo — cancel anytime.";
export const VALUE_TRIAL_CTA_LABEL = "Start 7-day free trial";

export const TRACK_PLAY_PRO_TEASER = "Track THE PLAY · Pro";

export const LEDGER_TEASER_UNLOCK =
  "Your graded record: every THE PLAY tracked, win/loss tallied, CLV proxy on structure.";

export const LEDGER_RENEWAL_HEADLINE = "Your record is the product";
export const LEDGER_RENEWAL_BODY = (wins, losses, pushes, roiUnits) =>
  `${wins}-${losses}-${pushes} graded · ${roiUnits > 0 ? "+" : ""}${Number(roiUnits).toFixed(1)}u ROI. Keep every play tracked and graded — not just unlimited asks.`;

export const PRO_UNLOCK_BUTTON_LABEL = "Unlock Pro · $9.99/mo";

export const PRO_RESTORE_RECEIPT_HINT =
  "New phone or browser? Enter the email from your Stripe receipt. We'll email you a secure login link.";

export const PRO_SUBSCRIPTION_BODY = `Built for NFL and La Liga weekends: posted lines, injury context, and prop boards before kickoff.
Every Pro take closes with THE PLAY — what to bet and why.
Your plays grade into a running record you can trust.`;

/** @type {[string, string][]} */
export const PRO_VALUE_GRID_ROWS = [
  [
    "NFL + LA LIGA WEEKENDS",
    `Posted spreads, totals, and props
on today's verified board.
Ask before the line moves.`,
  ],
  [
    "THE PLAY. EVERY TIME.",
    `Every Pro response closes with a
direct call. No hedging.
No 'on the other hand.'`,
  ],
  [
    "YOUR GRADED RECORD",
    `Track THE PLAY. Win/loss and ROI
update as markets settle.
Renew because the record matters.`,
  ],
  [
    "SESSION MEMORY",
    `Follow-ups stay in context.
Pro recalls recent takes across
sessions on the same slate.`,
  ],
];

export const PRO_CTA_BULLETS = [
  "NFL + La Liga boards every weekend",
  "THE PLAY + graded record, not generic AI",
  "7-day trial — then $9.99/mo",
];

export const PRO_PROOF_LINES = [
  `NFL props and spreads from verified boards — not stale pick lists.`,
  `La Liga 1X2 and goalscorer lines when the matchweek is live.`,
  `Every tracked play grades to win/loss so you see what actually worked.`,
];

/**
 * Pro tab feature list — NFL + La Liga first; other sports de-emphasized.
 * @type {Array<{ kind: "section", label: string } | { kind: "feature", color: string, name: string, desc: string }>}
 */
export const PRO_PAGE_FEATURE_ROWS = [
  { kind: "section", label: "Weekend companion" },
  {
    kind: "feature",
    color: "#4A90D9",
    name: "NFL: Props, Spreads & Match Reads",
    desc: "Verified weekly slate: passing TDs, spreads, totals, and injury-aware matchup reads on today's board.",
  },
  {
    kind: "feature",
    color: "#EE4444",
    name: "La Liga: 1X2 & Goalscorer Props",
    desc: "Matchweek board with posted moneylines and scorer props. Bet, fade, or pass before kickoff.",
  },
  { kind: "section", label: "Pro differentiators" },
  {
    kind: "feature",
    color: "var(--cyan-bright)",
    name: "THE PLAY, Every Time",
    desc: "The full conviction read: what to bet and why. Free gets analysis + soft lean only.",
  },
  {
    kind: "feature",
    color: "#C9A227",
    name: "Play Tracker + Graded Record",
    desc: "Track THE PLAY on every response. Win/loss and ROI build your record — the renewal reason.",
  },
  {
    kind: "feature",
    color: "#C9A227",
    name: "Session Memory",
    desc: "Follow-ups stay in context. Pro recalls your last few takes across sessions on the same slate.",
  },
  {
    kind: "feature",
    color: "var(--cyan-bright)",
    name: "Betting Style",
    desc: "Bold and committed, or full picture to decide. Toggle anytime.",
  },
  { kind: "section", label: "More sports (seasonal)" },
  {
    kind: "feature",
    color: "#FF6B00",
    name: "NBA, MLB, Golf, Tennis, F1, World Cup",
    desc: "Seasonal library included with Pro. We are not expanding the front door until NFL and La Liga boards are elite every weekend.",
  },
];

/** @deprecated Use PRO_PAGE_FEATURE_ROWS; kept for any external imports. */
export const PRO_PAYWALL_FEATURE_ROWS = PRO_PAGE_FEATURE_ROWS.filter((r) => r.kind === "feature");
