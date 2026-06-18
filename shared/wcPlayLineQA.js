/**
 * World Cup THE PLAY / lean line validation — rejects fragments and orphan verdicts.
 */

import { isWcCompleteSentence } from "./wcSentenceBoundaries.js";

const INVALID_PLAY_PATTERNS = [
  /^lean:\s*that\b/i,
  /^lean:\s*this\b/i,
  /^lean:\s*if\b/i,
  /^lean:\s*see\b/i,
  /^lean:\s*the\b/i,
  /^lean:\s*when\b/i,
  /\bthat actually holds\b/i,
  /\bactually holds\.?\s*$/i,
  /^lean:\s*[^.!?]{0,18}\.?\s*$/i,
];

const PLAY_ANCHOR_RE =
  /[+-]\d{2,}|\+\d{3,}|\d+(?:\.\d+)?%|\bno draw\b|\bgolden boot\b|\bboot\b|\boutright\b|\bto advance\b|\bgroup [a-l]\b|\bover\s+\d+(?:\.\d+)?\b/i;

const NATION_OR_PLAYER_RE =
  /\b(Spain|France|Brazil|Argentina|England|Germany|Portugal|Colombia|Norway|Morocco|USA|Mexico|Canada|Mbappé|Mbappe|Yamal|Haaland|Kane|Vinícius|Vinicius|Salah|Messi|Rodrygo|Endrick|Griezmann|Musiala|Lewandowski|Díaz|Pedri|Gavi|Saka|Foden|De Bruyne|Ronaldo|Martínez|Martinez)\b/i;

/**
 * @param {string} lean
 */
export function isWcValidPlayLine(lean) {
  const t = String(lean || "").trim();
  if (!t || t === "—") return false;
  if (!isWcCompleteSentence(t)) return false;
  if (INVALID_PLAY_PATTERNS.some((re) => re.test(t))) return false;

  if (/^pass\b/i.test(t) || /^no play\b/i.test(t)) {
    return t.length >= 14 || /\+\d{3,}/.test(t);
  }

  if (!/^lean:/i.test(t)) return false;

  const body = t.replace(/^lean:\s*/i, "").trim();
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;

  return PLAY_ANCHOR_RE.test(body) || NATION_OR_PLAYER_RE.test(body);
}

/**
 * @param {string} lean
 */
export function wcPlayLineIssueCode(lean) {
  return isWcValidPlayLine(lean) ? null : "wc_play_line_invalid";
}
