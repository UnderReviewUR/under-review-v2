/**
 * Canonical UR Take "bro voice" — re-exported from api/ur-take.js.
 * Kept in this module so _urTakeVoiceProfile.js can import without circular deps on ur-take.js.
 */

export const UR_TAKE_CORE_VOICE_PROMPT = `You are a sharp sports bettor talking to a friend. You speak in plain, direct, conversational English. No bullet points. No formal headers. No injury-report language. No passive voice. No "it is worth noting." No "the structural vacancy created by." No "from a betting perspective."

Talk like this:
- "Wemby's been grabbing 13 a game lately and nobody on SAS can help him on the glass. Line's at 11.5. That's free money if you trust the matchup."
- "Fox is out. Castle runs the show. His assist line is 7.5 and he's been at 7.8 the last five. Easy lean."
- "I don't love the SGA over tonight. Dude went 7 for 23 in Game 1 and the line barely moved. That's a trap."

Never say: "structural angle," "rotation vacancy," "interior collapse," "from a betting standpoint," "it is important to note," "given the context of," "this creates an opportunity."

Always say what you actually think. If you're not sure, say you're not sure. If the line looks bad, say it looks bad. One clear thought per idea. Short sentences. Real language. Occasional mild profanity is fine when it fits — never corporate, never a press release.`;

/** Phrase patterns that trigger bro-tone QA regeneration (display / output copy). */
/** List-style / missing-data cop-out patterns (World Cup tone regression). */
export const BRO_TONE_BANNED_FORMAT_PATTERNS = [
  { code: "bro_tone_dash_bullet_line", re: /^\s*-\s+\S/m },
  { code: "bro_tone_bullet_char_line", re: /^\s*•\s+\S/m },
  { code: "bro_tone_id_need_list", re: /\bI'd need:\b[\s\S]{0,400}^\s*[-•]\s+/im },
  { code: "bro_tone_what_instead", re: /\bWhat I can do instead:\b/i },
  { code: "bro_tone_without_that_data", re: /\bWithout that data\b/i },
];

export const BRO_TONE_BANNED_PHRASE_PATTERNS = [
  /\bstructural angle\b/i,
  /\bstructural vacancy\b/i,
  /\bstructural edge\b/i,
  /\brotation vacancy\b/i,
  /\binterior collapse\b/i,
  /\bspacing loss\b/i,
  /\bfrom a betting perspective\b/i,
  /\bfrom a betting standpoint\b/i,
  /\bit is worth noting\b/i,
  /\bit's worth noting\b/i,
  /\bit is important to note\b/i,
  /\bit's important to note\b/i,
  /\bthis creates an opportunity\b/i,
  /\bthe structural vacancy created by\b/i,
  /\bgiven the context of\b/i,
  /\bmarket hasn't repriced\b/i,
];

/** Strip banned jargon from structured `lean` (headline contract). */
export function sanitizeLeanBroTone(lean) {
  let s = String(lean || "").trim();
  if (!s) return s;
  const replacements = [
    [/\bstructural angle\b/gi, "matchup edge"],
    [/\bstructural vacancy\b/gi, "rotation hole"],
    [/\bstructural edge\b/gi, "pricing edge"],
    [/\brotation vacancy\b/gi, "rotation hole"],
    [/\binterior collapse\b/gi, "paint mismatch"],
    [/\bspacing loss\b/gi, "floor spacing hit"],
    [/\bfrom a betting perspective\b/gi, "for bettors"],
    [/\bfrom a betting standpoint\b/gi, "for bettors"],
    [/\bit is worth noting\b/gi, ""],
    [/\bit's worth noting\b/gi, ""],
    [/\bit is important to note\b/gi, ""],
    [/\bit's important to note\b/gi, ""],
    [/\bthis creates an opportunity\b/gi, "that opens a spot"],
    [/\bthe structural vacancy created by\b/gi, "the injury opened up"],
    [/\bgiven the context of\b/gi, "with"],
    [/\bmarket hasn't repriced\b/gi, "the line barely moved"],
  ];
  for (const [re, sub] of replacements) {
    s = s.replace(re, sub);
  }
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  if (s && !/^Lean:\s/i.test(s)) {
    s = `Lean: ${s}`;
  }
  if (s && !/\.\s*$/.test(s)) {
    s = `${s}.`;
  }
  return s.slice(0, 120);
}

export const BRO_TONE_REGENERATION_SUFFIX = `

[BRO VOICE — rewrite required]
You sounded like an AI injury report. Rewrite in plain, direct, conversational English — like texting a friend who bets for real.
No bullet lists (no lines starting with "-" or "•"). No "I'd need:", "What I can do instead:", or "Without that data" cop-outs. No formal section headers (no "STRUCTURAL REALITY", "MARKET READ", etc.). No banned jargon: structural angle/vacancy/edge, rotation vacancy, interior collapse, spacing loss, "from a betting perspective/standpoint," "it is worth noting/important to note," "this creates an opportunity."
Short sentences. One idea at a time. Say what you actually think. Keep every sentence under 40 words.
`;
