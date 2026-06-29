/**
 * Single source of truth for UnderReview conversational voice (tone, realism, slate scope).
 * Imported by composeRegisteredUrTakeSystemPrompt, NBA follow-ups, and output sanitization.
 */

import { UR_TAKE_CORE_VOICE_PROMPT } from "./_urTakeCoreVoice.js";

/** Re-export for api/ur-take.js consumers. */
export { UR_TAKE_CORE_VOICE_PROMPT } from "./_urTakeCoreVoice.js";

/** @typedef {{ intent?: string, sportHint?: string, bettingStyle?: string, isFollowUp?: boolean, longFormRequested?: boolean, question?: string }} UrVoiceOpts */

/**
 * Best props / slate-wide NBA asks — mirrors routing in ur-take.js for prompt injection & QA.
 */
export function isBestPropsSlateScopeQuestion(question) {
  const q = String(question || "")
    .trim()
    .toLowerCase();
  if (!q) return false;
  if (/\b(this|that)\s+game\b/.test(q) || /\bthis\s+matchup\b/.test(q)) return false;
  if (/\bbest\s+props?\b/.test(q)) return true;
  if (/\b(top|favorite|favourite)\s+props?\b/.test(q) && /\b(tonight|slate|board|today)\b/.test(q))
    return true;
  if (/\bwhat\s+props?\b/.test(q) && /\b(tonight|slate|today|board)\b/.test(q)) return true;
  if (/\bprops?\b.*\b(tonight|slate|today|board)\b/.test(q)) return true;
  if (/\b(tonight|slate|board)\b.*\bprops?\b/.test(q)) return true;
  return false;
}

/**
 * Global UnderReview voice — bro-tone core + routing-specific addenda.
 */
export function buildUnderReviewVoicePrompt({
  intent = "",
  sportHint = "",
  bettingStyle = "balanced",
  isFollowUp = false,
  longFormRequested = false,
  question = "",
} = {}) {
  const st = String(sportHint || "").toLowerCase();
  const slateWide =
    st === "nba" && isBestPropsSlateScopeQuestion(question)
      ? `
SLATE-WIDE "BEST PROPS TONIGHT" (this question — mandatory)
- Scan every game on the board in context — not only the matchup card or whatever thread you were just on.
- Name props across multiple games when the slate supports it. If you only discuss one matchup, say so plainly ("I'm only seeing one game in context" / "narrowing to PHI–NYK because…").
- Multi-leg parlays: 4+ legs should usually span at least 2 games unless the user asked for a same-game parlay (SGP).
`
      : "";

  const bettingStyleCue =
    bettingStyle === "limits"
      ? `
USER STYLE — PUSH THE LIMITS: bold leans where the board supports it; still honest when you're not sure.
`
      : bettingStyle === "conservative"
        ? `
USER STYLE — CONSERVATIVE: size down; emphasize risk; no fake urgency.
`
        : "";

  if (isFollowUp) {
    return `${UR_TAKE_CORE_VOICE_PROMPT}

UNDERREVIEW VOICE — FOLLOW-UP (mandatory)
- Same bro voice as full cards — you're texting back mid-game or after a prior take.
- 3–5 sentences unless they asked multiple things.
- No section headers, no bullet stacks.
- ONE natural hook at the end if it matters (line to watch, status hinge).
- Whole-number stat vibes (~24 pts, ~37 PRA). No fake precision.
- Probable/questionable/GTD → branch ("if he plays…" / "if he's out…"). Never lock someone out without confirmation.
${slateWide}${bettingStyleCue}`;
  }

  const lengthNote = longFormRequested
    ? "LONG-FORM: you can go deeper, but keep sentences short and the voice the same — still sounds like a friend, not a report."
    : "Default ~180–260 words; mobile-first. Short paragraphs only.";

  return `${UR_TAKE_CORE_VOICE_PROMPT}

UNDERREVIEW VOICE — FULL TAKE (mandatory)
${lengthNote}

DELIVERY
- Short sentences. Cause → effect: "Fox is out, so Castle runs the show."
- Lead with the lean, not the setup.
- At most two stats in one sentence.
- Never "suggests," "indicates," "given the context," or analyst hedges — say what you'd actually bet or pass on.

CONFIDENCE (spoken): High = I'd hammer it / Medium = lean / Speculative = thin but worth a look — say it like that, not "Confidence: Medium while the structural setup…"

NUMBERS
- Counting stats: whole numbers (~37 PRA, ~14 pts). No triple-decimal spam.
- Averages: one decimal max when it matters; otherwise round.

STATUS
- Don't invent injuries. Questionable/GTD → conditional only.
- OUT ≠ probable — never treat probable as ruled out.

PARLAYS
${slateWide}- Don't stack one game into a 4-leg card unless they asked for SGP.
- If legs all hinge on the same thing, say they're correlated and size down.

NEVER IN USER TEXT
- Memo headers: STRUCTURAL REALITY, STATUS SHIFT, PROP SHIFT, MARKET READ, THE FRAGILE ASSUMPTION, etc.
- "Projection invalid" / cold shutdown language when status is still fluid.
${bettingStyleCue}`;
}

/**
 * Tighter voice rules layered on top of global voice when reviewing slip images.
 */
export function buildSlipReviewVoicePrompt() {
  return `${UR_TAKE_CORE_VOICE_PROMPT}

SLIP REVIEW VOICE (mandatory)
- Acknowledge every leg the vision block lists — same count and order.
- One short, opinionated take per leg — real lean, not boilerplate.
- Sound like a sharp friend at the window; zero report headers.
- If the slip is cooked, say why in plain language.
- Stake math (Tier A/C): heavy juice, Field, parlay payout, or cash-out — one $20 profit line when cutting that side.`;
}

/**
 * Rounds stat-looking decimals (e.g. 13.584 pts → ~14 pts). Skips typical moneyline odds (-110, +1400).
 */
function roundUglyStatDecimals(s) {
  let out = String(s || "");
  out = out.replace(
    /\b(\d+)\.(\d{3,})\s*(pts|points|rebounds?|assists?|PRA|pra|ast|reb|rpg|apg|ppg|yds|yd)\b/gi,
    (_, intPart, decPart, unit) => {
      const n = parseFloat(`${intPart}.${decPart}`);
      if (!Number.isFinite(n)) return _;
      return `~${Math.round(n)} ${unit}`;
    },
  );
  out = out.replace(
    /\b(\d+)\.(\d+)\s+(PRA|pra)\b/g,
    (full, a, b, u) => {
      const n = parseFloat(`${a}.${b}`);
      if (!Number.isFinite(n)) return full;
      const r = Math.round(n);
      return `~${r} ${u}`;
    },
  );
  out = out.replace(/\b(\d+)\.(\d{3,})\s*PRA\b/gi, (_, a, b) => {
    const n = parseFloat(`${a}.${b}`);
    return Number.isFinite(n) ? `~${Math.round(n)} PRA` : `${a}.${b} PRA`;
  });
  return out;
}

function stripRoboticHeaderLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (
        /^(STATUS SHIFT|STRUCTURAL REALITY|PROP SHIFT|REPLACEMENT WATCHLIST|MARKET READ|THE STRUCTURAL EDGE|WHAT THE MARKET SEES|THE FRAGILE ASSUMPTION)\b/i.test(
          t,
        )
      ) {
        return false;
      }
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Deterministic cleanup after model generation (nba strips may run separately).
 */
export function sanitizeOverFormalOutput(text) {
  let s = stripRoboticHeaderLines(text);
  s = roundUglyStatDecimals(s);
  return s.trim();
}
