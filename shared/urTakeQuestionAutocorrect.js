/**
 * Lightweight typo normalization for UR Take questions — routing + model clarity.
 * Client inputs also use native OS autocorrect (AskBar spellCheck + autoCorrect).
 */

/** @type {Array<[RegExp, string, string]>} [pattern, replacement, label] */
const TERM_FIXES = [
  [/\bwordl\s+cup\b/gi, "World Cup", "world cup"],
  [/\bwrold\s+cup\b/gi, "World Cup", "world cup"],
  [/\bwrld\s+cup\b/gi, "World Cup", "world cup"],
  [/\bwrldcup\b/gi, "World Cup", "worldcup"],
  [/\bworldcup\b/gi, "World Cup", "worldcup"],
  [/\bgolascorer\b/gi, "goalscorer", "goalscorer"],
  [/\bgol scorer\b/gi, "goal scorer", "goal scorer"],
  [/\btop\s+golscorer\b/gi, "top goalscorer", "top goalscorer"],
  [/\bgolden\s+boot\b/gi, "Golden Boot", "golden boot"],
  [/\bgoldenboot\b/gi, "Golden Boot", "goldenboot"],
  [/\bdark\s+hors\b/gi, "dark horse", "dark horse"],
  [/\bbreakout\s+playr\b/gi, "breakout player", "breakout player"],
  [/\bparly\b/gi, "parlay", "parlay"],
  [/\bprarlay\b/gi, "parlay", "parlay"],
  [/\bpropps\b/gi, "props", "props"],
  [/\bprop\b(?=\s+tonight)/gi, "props", "props tonight"],
  [/\bnba\s+fianls\b/gi, "NBA Finals", "nba finals"],
  [/\bnba\s+final\b/gi, "NBA Finals", "nba final"],
  [/\bmispricd\b/gi, "mispriced", "mispriced"],
  [/\bmispricced\b/gi, "mispriced", "mispriced"],
  [/\bunderpricd\b/gi, "underpriced", "underpriced"],
  [/\boverpricd\b/gi, "overpriced", "overpriced"],
  [/\btonihgt\b/gi, "tonight", "tonight"],
  [/\btonoght\b/gi, "tonight", "tonight"],
  [/\btongiht\b/gi, "tonight", "tonight"],
];

/**
 * @param {string} text
 * @returns {{ text: string, corrections: string[] }}
 */
export function autocorrectUrTakeQuestion(text) {
  let out = String(text || "");
  if (!out.trim()) return { text: out, corrections: [] };

  /** @type {string[]} */
  const corrections = [];

  for (const [re, sub, label] of TERM_FIXES) {
    re.lastIndex = 0;
    if (re.test(out)) {
      corrections.push(label);
      re.lastIndex = 0;
      out = out.replace(re, sub);
    }
  }

  // Collapse repeated spaces/tabs only — never merge newlines (breaks client Follow-up: routing).
  out = out.replace(/[^\S\n]{2,}/g, " ").trim();
  return { text: out, corrections: [...new Set(corrections)] };
}
