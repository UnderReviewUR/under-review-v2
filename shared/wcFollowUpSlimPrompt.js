/**
 * Slim WC follow-up prompt — skip card-contract bloat on thread turns.
 */

/**
 * @param {{ sportHint?: string, isConversationFollowUp?: boolean }} opts
 */
export function shouldUseWcFollowUpSlimPrompt(opts = {}) {
  return (
    String(opts.sportHint || "").trim().toLowerCase() === "worldcup" &&
    Boolean(opts.isConversationFollowUp)
  );
}

export const WC_FOLLOW_UP_SLIM_USER_APPENDIX = `FOLLOW-UP THREAD (mandatory):
- Answer the new question in 3–5 short sentences — no section headers, no full card reprint.
- Build on the prior lean; do not cold-start an unrelated thesis.
- Cite only teams, odds, and stats from VERIFIED CONTEXT — never invent prices.`;
