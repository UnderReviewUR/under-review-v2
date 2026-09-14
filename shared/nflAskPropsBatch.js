/**
 * NFL props batch-2 — “new / more / different props” follow-ups exclude prior board names.
 */
import { normalizeNflAskQuestion } from "./nflAskNormalize.js";

/**
 * @param {string} name
 */
function normalizePlayerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} question
 */
export function looksLikeNflPropsRefreshAsk(question) {
  const q = normalizeNflAskQuestion(question).toLowerCase();
  if (!q) return false;
  return (
    /\b(?:new|more|different|other|fresh|another)\s+(?:\d+\s+)?(?:player\s+)?props?\b/.test(q) ||
    /\b(?:new|more|different|other|fresh)\s+player\s+props?\b/.test(q) ||
    /\bprovide\s+(?:me\s+)?(?:new|more|different|other|fresh)\b/.test(q) ||
    /\bgive\s+me\s+(?:new|more|different|other|fresh)\b/.test(q) ||
    /\b(?:new|another|fresh)\s+batch\b/.test(q) ||
    /\bnext\s+(?:board|batch|set|ticket)\b/.test(q) ||
    /\bdifferent\s+(?:board|tickets?|leans?|plays?)\b/.test(q) ||
    /\bwho\s+else\b/.test(q) ||
    /\banything\s+else\b/.test(q) ||
    /\bother\s+(?:ideas?|leans?|tickets?|plays?)\b/.test(q)
  );
}

/**
 * @param {string} name
 * @param {Set<string>|string[]} excludeKeys
 */
export function nflPlayerKeyIsExcluded(name, excludeKeys) {
  const exclude =
    excludeKeys instanceof Set
      ? excludeKeys
      : new Set([...(excludeKeys || [])].map((k) => normalizePlayerKey(k)).filter(Boolean));
  if (!exclude.size) return false;
  const key = normalizePlayerKey(name);
  if (!key) return false;
  if (exclude.has(key)) return true;
  const last = key.split(/\s+/).pop();
  if (last && last.length >= 3 && exclude.has(last)) return true;
  for (const ex of exclude) {
    if (!ex) continue;
    if (key === ex || key.includes(ex) || ex.includes(key)) return true;
    const exLast = ex.split(/\s+/).pop();
    if (last && exLast && last === exLast && last.length >= 3) return true;
  }
  return false;
}

/**
 * Pull last-name / player keys from prior assistant boards in chat history.
 * @param {unknown[]} history
 * @returns {Set<string>}
 */
export function extractNflPriorBoardPlayerKeys(history) {
  /** @type {Set<string>} */
  const keys = new Set();
  const turns = Array.isArray(history) ? history : [];
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") continue;
    const role = String(turn.role || "").toLowerCase();
    if (role && role !== "assistant" && role !== "ai") continue;

    const structured =
      (turn.structured && typeof turn.structured === "object" && turn.structured) ||
      (turn.structuredResponse && typeof turn.structuredResponse === "object" && turn.structuredResponse) ||
      null;
    const blobs = [
      structured?.whyNow,
      structured?.lean,
      structured?.call,
      structured?.edge,
      structured?.analysis?.marketContext,
      structured?.analysis?.matchupAnalysis,
      turn.content,
      turn.text,
      turn.take,
      turn.response,
      turn.lean,
    ]
      .filter(Boolean)
      .map((x) => String(x));

    for (const blob of blobs) {
      for (const m of blob.matchAll(
        /(?:^\s*\d+\.\s*|Lean:\s*|THE PLAY:\s*)([A-Za-z][A-Za-z.'’\-]+)/gim,
      )) {
        const k = normalizePlayerKey(m[1]);
        if (k && k.length >= 3) keys.add(k);
      }
      for (const m of blob.matchAll(
        /\b([A-Z][A-Za-z.'’\-]{2,})\s+(?:OVER|UNDER)\s+\d/g,
      )) {
        const k = normalizePlayerKey(m[1]);
        if (k && k.length >= 3) keys.add(k);
      }
    }
  }
  return keys;
}

/**
 * Prior featured matchup abbrs from history text (e.g. DEN @ KC).
 * @param {unknown[]} history
 * @returns {{ awayAbbr: string, homeAbbr: string }|null}
 */
export function extractNflPriorMatchupAbbrs(history) {
  const turns = Array.isArray(history) ? history : [];
  const blobs = [];
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") continue;
    for (const key of ["content", "text", "take", "response", "question", "lean"]) {
      if (turn[key]) blobs.push(String(turn[key]));
    }
    const structured = turn.structured || turn.structuredResponse;
    if (structured && typeof structured === "object") {
      if (structured.whyNow) blobs.push(String(structured.whyNow));
      if (structured.lean) blobs.push(String(structured.lean));
    }
  }
  const text = blobs.join("\n");
  const matches = [...text.matchAll(/\b([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\b/g)];
  if (!matches.length) return null;
  const last = matches[matches.length - 1];
  const awayAbbr = String(last[1] || "").toUpperCase();
  const homeAbbr = String(last[2] || "").toUpperCase();
  if (!awayAbbr || !homeAbbr || awayAbbr === homeAbbr) return null;
  return { awayAbbr, homeAbbr };
}
