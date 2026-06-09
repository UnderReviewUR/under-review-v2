/**
 * US/host-nation editorial context for WC UR Take (SportsLine / Jon Eimer, Jun 9 2026).
 * Narrative corroboration only — not a price feed; model must prefer CURRENT OUTRIGHT ODDS block.
 */

const USMNT_MEDIA_CONTEXT = `US / HOST-NATION MEDIA CONTEXT (SportsLine — Jon "Buckets" Eimer, published Jun 9 2026; editorial, not a live book feed):
  - FanDuel tournament-winner lines cited in piece: Spain +470, France +480, England +650, Brazil +850, Argentina +1000, USA +5500, Mexico +6000, Canada +15000.
  - Advancement angle: Eimer backs USA Reach Round of 16 (-115, 1 unit) — home-field edge vs likely Round of 32 foe (Egypt if USA finishes second in group).
  - Host-nation history note in piece: 17 of 22 prior host nations reached at least the quarterfinals.
  - Use for USMNT narrative and group-advancement framing only. For any price or "mispriced" claim, quote CURRENT OUTRIGHT ODDS / verified fixture lines in this prompt — treat SportsLine as background, not authoritative market data.`;

const US_HOST_PATTERNS = [
  /\b(usmnt|team usa)\b/i,
  /\b(united states|u\.?\s?s\.?\s?a\.?)\b/i,
  /\b(americans?|american squad|american team)\b/i,
  /\b(host nation|host countries|co-?host)\b/i,
  /\b(mexico|canada)\b.*\b(host|world cup|wc)\b/i,
  /\b(world cup|wc 2026)\b.*\b(usa|u\.?\s?s\.?\s?a\.?|usmnt|host)\b/i,
];

/**
 * @param {string} question
 * @param {string[]} [mentionedTeams]
 */
export function shouldInjectWcUsmntMediaContext(question, mentionedTeams = []) {
  const q = String(question || "").trim();
  if (!q) return false;

  const teams = (mentionedTeams || []).map((t) => String(t || "").trim().toUpperCase());
  if (teams.some((t) => ["USA", "MEX", "CAN"].includes(t))) return true;

  return US_HOST_PATTERNS.some((re) => re.test(q));
}

/**
 * @param {string} question
 * @param {string[]} [mentionedTeams]
 * @returns {string | null}
 */
export function buildWcUsmntMediaContextBlock(question, mentionedTeams = []) {
  if (!shouldInjectWcUsmntMediaContext(question, mentionedTeams)) return null;
  return USMNT_MEDIA_CONTEXT;
}
