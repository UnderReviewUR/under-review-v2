/**
 * Curated high-volume H2H notes (player|OPP or POS|OPP).
 * Keep short — one clause for the matchup card, not a research dump.
 */
export const NFL_H2H_NOTES = Object.freeze({
  // Skill vs elite fronts / covers
  "James Cook|PHI":
    "Cook needs true workhorse volume (20+ carries) to clear PHI’s top-5 rush front; trailing script is the under path.",
  "Derrick Henry|PHI":
    "Henry’s between-tackles power still meets a stout PHI box — TD equity > raw yardage if the Ravens stack the line.",
  "Saquon Barkley|DAL":
    "Barkley’s explosive profile plays vs average DAL run D; watch early-down role if Philly leans pass-heavy.",
  "Josh Allen|KC":
    "Allen’s rush floor travels; KC pass D can compress pure pocket volume — dual-threat framing over yards-only.",
  "Patrick Mahomes|BUF":
    "Mahomes vs BUF often becomes a half-script game — weather + Bills pass rush can cut deep-shot rate.",
  "Ja'Marr Chase|BAL":
    "Chase still wins singles, but BAL’s Humphrey/Hamilton shell caps easy WR1 yards — slot/TE clears can steal targets.",
  "CeeDee Lamb|PHI":
    "Lamb vs PHI is a classic WR1 compression spot when Slay is healthy — volume needs target share, not just talent.",
  "Travis Kelce|DEN":
    "Kelce’s seam work vs DEN zone has historically held up better than outside WR props in that matchup.",

  // Position-level fallbacks vs tough Ds
  "RB|PHI": "Elite PHI rush D — default fade pure rush yards unless 25+ carry projection.",
  "WR|PHI": "PHI WR1 fade when healthy — prefer TE/slot or game script overs instead.",
  "QB|PHI": "PHI pass rush + coverage compresses QB yards; under lean unless dome/neutral script.",
  "RB|BAL": "BAL rush D is historically stingy — prefer receiving-back angles or TD lottery over yards.",
  "WR|BAL": "BAL outside fade; slot receivers are the cleaner prop path.",
  "QB|BAL": "BAL pass D tops the league bands — under on pass yards is the default until injuries hit the front.",
});

/**
 * @param {string} playerName
 * @param {string} pos
 * @param {string|null} opponentAbbr
 * @returns {string|null}
 */
export function lookupNflH2hNote(playerName, pos, opponentAbbr) {
  const opp = String(opponentAbbr || "").toUpperCase();
  if (!opp) return null;
  const playerKey = `${String(playerName || "").trim()}|${opp}`;
  if (NFL_H2H_NOTES[playerKey]) return NFL_H2H_NOTES[playerKey];
  const posKey = `${String(pos || "").toUpperCase()}|${opp}`;
  return NFL_H2H_NOTES[posKey] || null;
}
