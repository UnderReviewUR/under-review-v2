/**
 * NFL props batch-2 — “new / more / different props” follow-ups exclude prior board names.
 */
import { looksLikeNflPropsBoardAsk, normalizeNflAskQuestion } from "./nflAskNormalize.js";

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
    // "another set of player props" / "new set of props" / "different board"
    /\b(?:another|new|different|fresh|other)\s+(?:set|batch|board|round|list)\b/.test(q) ||
    /\b(?:another|new|different|fresh)\s+set\s+of\s+(?:player\s+)?props?\b/.test(q) ||
    // "provide a few more" / "give me a few more" — common follow-ups without saying "props"
    /\b(?:provide|give\s+me)\s+(?:me\s+)?(?:a\s+few\s+)?(?:new|more|different|other|fresh|another)\b/.test(
      q,
    ) ||
    /\ba\s+few\s+more\b/.test(q) ||
    /\bfew\s+more\b/.test(q) ||
    /\bmore\s+(?:please|options?|ideas?|tickets?|leans?|plays?)\b/.test(q) ||
    /\b(?:new|another|fresh)\s+batch\b/.test(q) ||
    /\bnext\s+(?:board|batch|set|ticket)\b/.test(q) ||
    /\bdifferent\s+(?:board|tickets?|leans?|plays?)\b/.test(q) ||
    /\bwho\s+else\b/.test(q) ||
    /\banything\s+else\b/.test(q) ||
    /\bother\s+(?:ideas?|leans?|tickets?|plays?)\b/.test(q) ||
    /\breshuffle\b/.test(q) ||
    /\b(?:same\s+game|this\s+game|this\s+matchup).{0,24}\b(?:more|other|different|fresh)\b/.test(q)
  );
}

/**
 * Refresh phrasing OR a second props-board ask in a thread that already shipped a board.
 * Prevents "another set of player props" / repeat "best props" from reprinting the same card.
 * @param {string} question
 * @param {unknown[]} [history]
 */
export function shouldNflPropsRefreshBatch(question, history) {
  if (looksLikeNflPropsRefreshAsk(question)) return true;
  if (!looksLikeNflPropsBoardAsk(question)) return false;
  const prior = extractNflPriorBoardPlayerKeys(history);
  return prior.size >= 2;
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
      for (const m of blob.matchAll(/\b([A-Za-z][A-Za-z.'’\-]{2,})\s+(?:over|under)\s+\d/gi)) {
        const k = normalizePlayerKey(m[1]);
        if (k && k.length >= 3 && k !== "lean" && k !== "the") keys.add(k);
      }
    }
  }
  return keys;
}

/**
 * Prior board tickets as player + line fingerprints (block near-duplicate reprints).
 * @param {unknown[]} history
 * @returns {Array<{ playerKey: string, line: number }>}
 */
export function extractNflPriorBoardTicketLines(history) {
  /** @type {Array<{ playerKey: string, line: number }>} */
  const out = [];
  const turns = Array.isArray(history) ? history : [];
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") continue;
    const role = String(turn.role || "").toLowerCase();
    if (role && role !== "assistant" && role !== "ai") continue;
    const structured =
      (turn.structured && typeof turn.structured === "object" && turn.structured) ||
      (turn.structuredResponse && typeof turn.structuredResponse === "object" && turn.structuredResponse) ||
      null;
    const blobs = [structured?.whyNow, structured?.lean, structured?.call, turn.content, turn.text]
      .filter(Boolean)
      .map((x) => String(x));
    for (const blob of blobs) {
      for (const m of blob.matchAll(
        /(?:^\s*\d+\.\s*|Lean:\s*|THE PLAY:\s*)?([A-Za-z][A-Za-z.'’\-]+)\s+(?:over|under)\s+(\d+(?:\.\d+)?)/gim,
      )) {
        const playerKey = normalizePlayerKey(m[1]);
        const line = Number(m[2]);
        if (!playerKey || playerKey.length < 3 || !Number.isFinite(line)) continue;
        if (playerKey === "lean" || playerKey === "the") continue;
        out.push({ playerKey, line });
      }
    }
  }
  return out;
}

/**
 * True when this row reprints a prior board ticket (same player, line within band).
 * @param {Record<string, unknown>} row
 * @param {Array<{ playerKey: string, line: number }>} priorTickets
 * @param {number} [band]
 */
export function nflPropRowNearPriorBoardTicket(row, priorTickets, band = 3) {
  const key = normalizePlayerKey(row?.player);
  const line = Number(row?.line);
  if (!key || !Number.isFinite(line) || !Array.isArray(priorTickets) || !priorTickets.length) {
    return false;
  }
  const last = key.split(/\s+/).pop();
  for (const prior of priorTickets) {
    const pk = String(prior?.playerKey || "");
    if (!pk) continue;
    const same =
      key === pk ||
      key.includes(pk) ||
      pk.includes(key) ||
      (last && last.length >= 3 && (pk === last || pk.endsWith(` ${last}`)));
    if (!same) continue;
    if (Math.abs(Number(prior.line) - line) <= band) return true;
  }
  return false;
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
