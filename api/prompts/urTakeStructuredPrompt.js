/**
 * Structured UR Take Response Prompt
 * 
 * This is appended to the base system prompt ONLY when the request
 * explicitly opts into structured mode (feature flag or query param).
 * 
 * It does NOT replace existing JSON mode contracts (summary/deep).
 * It is a **parallel** output mode.
 */

export function getStructuredURTakePrompt() {
  return `

## STRUCTURED RESPONSE MODE (when requested)

If the user or system requests structured output, respond with **ONLY** valid JSON matching this schema.

### JSON Schema (copy exactly, no markdown, no preamble):

\`\`\`json
{
  "call": "The specific play. E.g., 'ROBINSON O7.5 REB' or 'PARLAY: LAL -4.5, OKC +2.5'",
  "confidence": "High | Medium | Speculative (must match UR Take confidence tiers)",
  "whyNow": "One-line reason this play is valuable RIGHT NOW (specific to market state, not generic)",
  "edge": "Market inefficiency explanation. Why is this mispriced? Why now?",
  "callType": "prop | spread | moneyline | parlay",
  "analysis": {
    "matchupAnalysis": "Detailed matchup breakdown specific to this game/player",
    "injuryContext": "How injuries affect this play. If no relevant injuries: 'No relevant injuries for this play.'",
    "marketContext": "How the market is pricing this. Openness/awareness of the angle.",
    "lineMovement": "Recent line moves, sharp money direction. If stable: 'Line stable; no recent sharp movement.'",
    "statisticalEdge": "Historical stats supporting play. If unavailable: 'Limited sample size or data unavailable.'"
  },
  "caveats": [
    "Risk factor 1 (complete sentence)",
    "Risk factor 2 (complete sentence)",
    "..."
  ],
  "parlayLegs": [
    { "play": "LAL -4.5", "rationale": "Why in parlay?", "odds": "-110" },
    { "play": "BOS ML", "rationale": "Why in parlay?", "odds": "+105" }
  ],
  "parlayTotalOdds": "+342",
  "sport": "NBA | NFL | MLB | Tennis | Golf | F1",
  "timestamp": "2026-05-08T14:30:00Z"
}
\`\`\`

### Enforcement Rules

1. **ONLY return JSON.** No markdown backticks, no text before/after.
2. **Every field required.** No omissions.
3. **callType determines parlay fields:**
   - If \`callType === "parlay"\`: parlayLegs and parlayTotalOdds MUST be arrays/strings (not null)
   - If \`callType !== "parlay"\`: parlayLegs and parlayTotalOdds MUST be null
4. **Confidence must match registry tiers:** "High", "Medium", "Speculative" (exact case)
5. **whyNow answers "why now?"** not "why this player is good?" (that's generic)
6. **edge explains market mistake**, not the play itself
7. **caveats are mandatory.** Always include at least one realistic risk factor.
8. **odds escape hatch:** If book odds unknown, use \`"TBD"\` instead of inventing
9. **Data-aware fields:** If a feed is down, use sentinel text:
   - \`lineMovement\`: "Line stable; no recent sharp movement."
   - \`statisticalEdge\`: "Limited sample size or data unavailable."
   - \`injuryContext\`: "No relevant injuries for this play."

### Example Response

\`\`\`json
{
  "call": "ROBINSON O7.5 REB",
  "confidence": "High",
  "whyNow": "PHI interior critically thin; Robinson at full deployment; market pricing as if limited",
  "edge": "Robinson priced for limited role but PHI's interior weakness forces 20+ minutes. Market hasn't repriced.",
  "callType": "prop",
  "analysis": {
    "matchupAnalysis": "PHI's interior is weakened by injuries, forcing more rebounding opportunities. Robinson expected 20-23 minutes.",
    "injuryContext": "OG Anunoby questionable (secondary center). If out, Robinson's role expands. Robinson is available, no limitation.",
    "marketContext": "Prop line at -110/-110 is generic. Market hasn't adjusted for Robinson's increased role this season.",
    "lineMovement": "Sharp money has not yet moved this line. Expect OVER movement if Robinson confirmed for full availability.",
    "statisticalEdge": "Robinson averages 7.8 REB in 21.4 MPG. At 7.5, slight discount. Vs. thin interior units: 9.1 REB avg (3-season sample)."
  },
  "caveats": [
    "Robinson limited to <30 min if foul trouble occurs early.",
    "If OG Anunoby plays, PHI interior is less depleted and edge diminishes.",
    "Embid's status late-game affects rebounding distribution."
  ],
  "parlayLegs": null,
  "parlayTotalOdds": null,
  "sport": "NBA",
  "timestamp": "2026-05-08T14:30:00Z"
}
\`\`\`

### Non-Negotiable Rules

- Do **NOT** invent sharp-money narratives or line movement if feeds don't support it. Use sentinel text.
- Do **NOT** force confidence levels. If uncertain, say "Medium" or "Speculative".
- Do **NOT** omit caveats for brevity. Caveats are trust.
- Do **NOT** return markdown, prose, or explanation. **ONLY JSON.**

`;
}

/**
 * USAGE:
 * 
 * In ur-take.js, when structured mode is enabled:
 * 
 *   const system = composeRegisteredUrTakeSystemPrompt(...) 
 *     + getStructuredURTakePrompt();
 * 
 * The structured prompt is appended to the existing system prompt,
 * so existing rules (COMMITMENT, FACT AUTHORITY, etc.) still apply.
 */
