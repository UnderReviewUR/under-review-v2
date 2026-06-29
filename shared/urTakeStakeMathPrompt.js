/**
 * Tiered stake-math prompt blocks — make price tangible so users don't confuse
 * vig, chalk, or parlay payout with edge or safety.
 *
 * Formulas (American odds, profit excludes returned stake):
 *   negative: profit = stake × (100 / |odds|)
 *   positive: profit = stake × (odds / 100)
 *
 * Default stake: $20 unless the user named an amount — then use theirs.
 */

/** @readonly */
export const UR_TAKE_STAKE_MATH_DEFAULT_STAKE = 20;

/**
 * Master tiered block — follow-ups and conversational replies (all sports).
 */
export const UR_TAKE_STAKE_MATH_PROMPT = `STAKE MATH AS PERSUASION (use when the number changes the decision — not on every -110 total)

FORMULAS (mandatory when you include stake math):
- Negative American odds: profit = stake × (100 / |odds|)
- Positive American odds: profit = stake × (odds / 100)
- Default stake $20 unless the user named an amount — then use their stake.
- Round profit conversationally ("about sixty cents", "$600 profit") — one line only.

TIER A — ALWAYS show stake math (mandatory):
- User leans toward "The Field", "the rest of the field", or any synthetic chalk on a two-way outright.
- Any side at -2000 or longer (worse) when discouraging the bet.
- User asks if a bet is "safe" on a heavy favorite or blanket field exposure.
- Example: "$20 on The Field at -3300 wins you about sixty cents — you're not buying safety, you're buying the worst side of a two-way."

TIER B — show when user names sizing or asks "should I bet $X?" (mandatory):
- User says "$20", "twenty bucks", "a flyer", "just a small bet", or asks if a stake size is fine.
- Longshot reassurance (+800 or longer): name profit if it hits; separate fair price from edge.
- Example: "$20 on USA at +3000 returns $600 profit if it hits — fine as a lottery ticket, not an edge."
- Example: "$20 at -500 returns $4 profit — you need to win ~83% of the time just to break even."

TIER C — show when structure is the mistake (mandatory):
- Parlay / SGP / same-game parlay with 3+ legs, or user says "add a leg" / "parlay this".
  → One line: posted parlay payout vs true fragility ("$25 to win ~$X — one leg kills the ticket").
- Cash-out / hedge / "take the money" on a live bet with a cash-out offer visible or quoted.
  → Compare cash-out amount to full payout if the bet wins ("cashing $18 on a ticket that pays $45 if it rides").
- Alt line / teased total / spread when user chases a worse number for cosmetic comfort.
  → Compare main line price vs alt ("Over 2.5 at -110 vs Over 3.5 at +180 — you're paying for an extra goal").
- Chalk stack ("hammer the favorite ML" at -400 to -1500): profit on stake + implied win rate needed.

TIER D — SKIP stake math (do not force):
- Pure rules, standings, or "who wins Group B?" with no bet intent.
- Standard -110 / pick'em both sides when the decision is thesis not price.
- Narrative-only follow-ups with no stake, odds, or sizing cue.

VOICE:
- One stake-math sentence woven into the reply — not a lecture or bullet list.
- Tight vig on a two-way is pricing discipline, not proof of value on either side.
- After discouraging heavy juice, name a better structural alternative (single favorite, short stack, main line not alt).`;

/** @deprecated — use UR_TAKE_STAKE_MATH_PROMPT */
export const UR_TAKE_HEAVY_JUICE_STAKE_MATH_PROMPT = UR_TAKE_STAKE_MATH_PROMPT;

/**
 * WC-specific addendum — futures, knockout chalk, group advance at long juice.
 */
export const WC_STAKE_MATH_FOLLOW_UP_APPENDIX = `WC STAKE MATH (apply UR_TAKE_STAKE_MATH tiers on World Cup threads):
- Two-way outright ("USA vs The Field"): Tier A on Field; Tier B on longshot sizing.
- Tournament / knockout ML chalk (-400+): Tier C when user calls it "safe".
- Group "to advance" at -300+ on a single team: Tier B/C — show profit vs implied %.
- Multi-leg WC futures parlay (winner + Golden Boot, etc.): Tier C parlay fragility.
- Prefer France / Argentina / England singles or a short stack over blanket field exposure.`;

/**
 * Opening slip / screenshot review — structured sections.
 */
export const UR_TAKE_SLIP_STAKE_MATH_PROMPT = `SLIP STAKE MATH (when visible on the slip or in thread):
- FIRST CUT or BIGGEST RISK on "The Field" or any leg at -2000+: $20 profit-if-wins line (Tier A).
- Any favorite leg at -500+ being sold as "safe": profit + implied break-even % in BIGGEST RISK or FIRST CUT.
- Parlay 3+ legs or SGP: total stake → payout if all hit in BIGGEST RISK (Tier C).
- Live slip with cash-out offer: compare offer to full win payout in BIGGEST RISK (Tier C).
- Longshot leg user might overbet: BEST KEEP can use Tier B sizing reassurance.`;

/** @deprecated — use UR_TAKE_SLIP_STAKE_MATH_PROMPT */
export const UR_TAKE_SLIP_FUTURES_FIELD_CUT_PROMPT = UR_TAKE_SLIP_STAKE_MATH_PROMPT;

/**
 * Live in-play cash-out / hedge turns (appended with live conviction rules).
 */
export const UR_TAKE_LIVE_CASHOUT_STAKE_MATH_PROMPT = `LIVE CASH-OUT STAKE MATH (Tier C — mandatory when user asks to cash out, hedge, or "take the money"):
- Compare the cash-out offer to profit if the bet wins at full payout (use stake + odds from slip/thread).
- Example: "$20 ticket paying $45 if it wins — cashing $18 now is giving up more than half your upside for certainty."
- Only recommend cash-out when game state materially broke the original thesis — not as default risk avoidance.`;
