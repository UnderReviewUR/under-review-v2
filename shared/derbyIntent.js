/**
 * Kentucky Derby 2026 — tight text intent for UR Take routing (no broader horse-racing scope).
 */
import { DERBY_2026, isDerbyActive } from "./data/derby2026.js";

/** Prep / other derbies — not the Kentucky Derby card context */
const OTHER_DERBY = /\b(arkansas|florida|tampa bay|sam f\.?|sunland|louisiana)\s+derby\b/i;

const EVENT_PHRASES = [
  "kentucky derby",
  "run for the roses",
  "churchill downs",
  "race for the roses",
];

/** Companion tokens when the user says "derby" without "kentucky" — avoids bare false positives */
const DERBY_COMPANION =
  /\b(kentucky|churchill|roses|louisville|152nd|exacta|trifecta|superfecta|gate\b|paddock|morning line|churchill downs)\b/i;

/** Single-word or common-phrase runners that need a Derby companion token to avoid hijacks */
const NAME_REQUIRES_COMPANION = new Set([
  "renegade",
  "robusta",
  "commandment",
  "so happy",
  "emerging market",
]);

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when the question is likely about the 2026 Kentucky Derby (not other sports,
 * not other prep derbies). Requires active window unless `requireActive: false` (tests).
 *
 * @param {string} question
 * @param {{ at?: Date, requireActive?: boolean }} [opts]
 */
export function questionReferencesDerby(question, opts = {}) {
  const at = opts.at instanceof Date ? opts.at : new Date();
  if (opts.requireActive !== false && !isDerbyActive(at)) return false;

  const q = String(question || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!q) return false;

  if (OTHER_DERBY.test(q)) return false;

  if (/\b152nd\b/.test(q) && /\b(kentucky|derby|roses)\b/.test(q)) return true;

  for (const p of EVENT_PHRASES) {
    if (q.includes(p)) return true;
  }

  if (
    /\bchurchill\b/.test(q) &&
    /\b(downs|derby|race|track|gate|paddock|saturday|tonight|today)\b/.test(q)
  ) {
    return true;
  }

  if (/\b(the derby|win (?:the )?derby|for the derby)\b/.test(q)) return true;

  if (/\bderby saturday\b/.test(q) || /\bfirst saturday in may\b/.test(q)) return true;

  if (/\bkentucky derby\b/.test(q)) return true;

  if (/\bderby\b/.test(q)) {
    if (OTHER_DERBY.test(q)) return false;
    if (DERBY_COMPANION.test(q)) return true;
  }

  if (q.includes("further ado")) return true;
  if (q.includes("the puma")) return true;
  if (/\bchief wallabee\b/.test(q)) return true;

  for (const h of DERBY_2026.field) {
    const name = String(h.name || "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    let matched = false;
    if (lower.includes(" ")) {
      matched = q.includes(lower);
    } else {
      const re = new RegExp(`\\b${escapeRegExp(lower)}\\b`, "i");
      matched = re.test(q);
    }
    if (!matched) continue;
    if (NAME_REQUIRES_COMPANION.has(lower) && !DERBY_COMPANION.test(q)) continue;
    return true;
  }

  return false;
}
