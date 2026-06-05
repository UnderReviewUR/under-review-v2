/** @file NBA response text sanitizers — extracted from handler.js */
const NBA_BDL_LEAK_PATTERN =
  /\bBDL\s+grounding\b|\bBallDontLie\s+(?:grounding|roster|slate|data)\b|\b(?:could|cannot|couldn't|can't|did\s+not|didn't)\s+cleanly\s+match\b/i;

/** Drops leading roster/data-disclosure paragraphs models still emit despite prompt bans. */
export function stripNbaLeadInDisclosure(text) {
  let s = String(text || "").trim();
  if (!s) return s;
  const bannedLead =
    /\b(?:I don't have tonight's confirmed roster|beyond the verified names in the system|Working from partial roster data|working from partial roster data|verified names in the system|partial roster data|roster data is still loading|combined API \+ product UI|clientUiAugmented)\b/i;
  const cantConfirm =
    /^I can't confirm[^\n]*(roster|lineup|availability|names|data)[^\n]*$/im;
  for (let i = 0; i < 4; i += 1) {
    const paras = s.split(/\n\n+/);
    if (!paras.length) break;
    const head = paras[0].trim();
    if (!head) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    if (bannedLead.test(head) || cantConfirm.test(head) || NBA_BDL_LEAK_PATTERN.test(head)) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    break;
  }
  // Body sweep — drop any paragraph anywhere that mentions BDL grounding leak phrasing.
  s = s
    .split(/\n\n+/)
    .filter((p) => !NBA_BDL_LEAK_PATTERN.test(p))
    .join("\n\n")
    .trim();
  return s.trim();
}

/**
 * Post-gen confidence vocabulary normalizer — runs on every NBA response.
 * Maps any legacy Tier 1/2/3 + STRONG EDGE/LEAN/WATCH labels the model still produces
 * back into the canonical High / Medium / Speculative vocabulary.
 */
export function normalizeConfidenceVocabularyInText(text) {
  let s = String(text || "");
  if (!s) return s;
  const tierMap = { 1: "High", 2: "Medium", 3: "Speculative" };
  // "Tier N" with optional "- STRONG EDGE / LEAN / WATCH" suffix → canonical label.
  s = s.replace(
    /\bTier\s*([1-3])(?:\s*[-—:]\s*(?:STRONG\s*EDGE|Strong\s*Edge|strong\s*edge|LEAN|Lean|lean|WATCH|Watch|watch))?\b/g,
    (_m, n) => tierMap[Number(n)] || _m,
  );
  // CONFIDENCE label lines that still emit STRONG EDGE / LEAN / WATCH.
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)STRONG\s+EDGE\b/gi, "$1High");
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)LEAN\b/gi, "$1Medium");
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)WATCH\b/gi, "$1Speculative");
  // Bare uppercase compound STRONG EDGE anywhere is unambiguously the legacy label.
  s = s.replace(/\bSTRONG\s+EDGE\b/g, "High");
  return s;
}
