/**
 * Grounding QA — catch invented stats/odds without killing analyst voice.
 */

const XG_CLAIM_RE = /\b(xg|x-g|expected goals?|opta xg)\b/i;
const POSSESSION_CLAIM_RE = /(\d{1,3})%\s*possession|\bpossession\s*(\d{1,3})%/i;

/**
 * @param {string} text
 */
export function detectWcInventedXgClaim(text) {
  const blob = String(text || "");
  if (!blob.trim()) return null;
  if (!XG_CLAIM_RE.test(blob)) return null;
  return { reason: "xg_claim_without_verified_feed" };
}

/**
 * @param {string} text
 * @param {Array<Record<string, unknown>>} [matchDetails]
 */
export function detectWcInventedPossessionClaim(text, matchDetails = []) {
  const blob = String(text || "");
  if (!blob.trim()) return null;

  const allowed = new Set();
  for (const d of matchDetails || []) {
    for (const side of ["home", "away"]) {
      const stats = side === "home" ? d.teamStats?.home : d.teamStats?.away;
      const pct = Number(stats?.possessionPct);
      if (Number.isFinite(pct)) allowed.add(Math.round(pct));
    }
  }
  if (!allowed.size) {
    const first = blob.match(POSSESSION_CLAIM_RE);
    if (first) return { reason: "possession_pct_without_match_intel", claimed: Number(first[1] || first[2]) };
    return null;
  }

  for (const match of blob.matchAll(new RegExp(POSSESSION_CLAIM_RE.source, "gi"))) {
    const claimed = Number(match[1] || match[2]);
    if (!Number.isFinite(claimed)) continue;
    if (!allowed.has(Math.round(claimed))) {
      return { reason: "possession_pct_not_in_match_intel", claimed, allowed: [...allowed] };
    }
  }
  return null;
}

/**
 * @param {string} text
 * @param {Array<Record<string, unknown>>} [matchDetails]
 */
export function runWcGroundingQA(text, matchDetails = []) {
  /** @type {string[]} */
  const issueCodes = [];
  if (detectWcInventedXgClaim(text)) issueCodes.push("wc_invented_xg_claim");
  if (detectWcInventedPossessionClaim(text, matchDetails)) {
    issueCodes.push("wc_invented_possession_claim");
  }
  return { passed: issueCodes.length === 0, issueCodes };
}

export const WC_GROUNDING_REGEN_SUFFIX = `

WC GROUNDING (mandatory — prior answer cited stats not in VERIFIED CONTEXT):
- Never cite xG, expected goals, or Opta unless MATCH INTEL explicitly lists them (it does not — use chance index + shots/SOT/possession only).
- Possession % must match MATCH INTEL team stats exactly — if missing, say "possession not in feed" instead of guessing.
- Keep the same arguing voice — fix the numbers, not the personality.`;
