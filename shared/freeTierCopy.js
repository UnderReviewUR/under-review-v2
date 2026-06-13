/**
 * Free-tier user-facing copy — session wall vs daily quota wall (UTC reset).
 */

/** Home first-session footnote (primary line). */
export const FREE_TIER_HOME_FOOTNOTE_PRIMARY = "3 free questions · No card · No signup";

/** Home first-session footnote (secondary — optional). */
export const FREE_TIER_HOME_FOOTNOTE_SECONDARY =
  "Email for 3 more per day (resets midnight UTC)";

/** Wall 1 — anonymous session exhausted (question 4, no email). */
export const EMAIL_GATE_SESSION_MESSAGE =
  "You've used your 3 free questions. Add email for 3 more today (resets midnight UTC).";

export const EMAIL_GATE_HEADLINE = "You've used your 3 free questions";

export const EMAIL_GATE_BODY =
  "Add email for 3 more today (resets midnight UTC). Or go Pro for unlimited reads.";

/** Wall 2 — identified user hit daily UTC cap. */
export const DAILY_QUOTA_LIMIT_MESSAGE =
  "You've used today's 3 questions (resets midnight UTC). Upgrade for unlimited.";

export const UPGRADE_LIMIT_HIT_HEADLINE = DAILY_QUOTA_LIMIT_MESSAGE;

export const UPGRADE_MODAL_DAILY_TAGLINE = "Upgrade for unlimited reads.";

export const UPGRADE_LIMIT_HIT_BODY = `Pro members get the full take, not the summary. Session memory means Pro recalls your recent takes and follow-up context. THE PLAY block means it tells you exactly what to bet and why.

$9.99/month · cancel anytime`;

/**
 * @param {number} remaining
 */
export function freeLimitChipMessage(remaining) {
  const qWord = remaining === 1 ? "question" : "questions";
  return `${remaining} free ${qWord} left. Pro gives the full read with THE PLAY, not the summary.`;
}
