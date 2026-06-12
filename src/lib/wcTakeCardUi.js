/**
 * World Cup UR Take card — section mapping + stat grid (Card Contract Option 1).
 */

import { capWcDeepWords, splitWcSentences } from "../../shared/wcSentenceBoundaries.js";
import {
  extractWcModelAttributionPrefix,
  wcCardFaceBlobHasNumericWhy,
} from "../../shared/wcTakeRetentionQA.js";

const WC_FACE_HEADLINE_WORDS = 14;
const WC_FACE_WHY_WORDS = 36;
const WC_FACE_FOCUS_WHY_WORDS = 16;
const WC_FACE_WATCH_WORDS = 22;
const WC_FACE_FOCUS_WATCH_WORDS = 34;
const WC_FACE_BREAKDOWN_WORDS = 220;

/**
 * @param {string} text
 * @param {{ maxWords?: number, maxSentences?: number }} [opts]
 */
export function capWcCardFaceField(text, opts = {}) {
  const maxWords = opts.maxWords ?? 32;
  const maxSentences = opts.maxSentences ?? 2;
  const t = String(text || "").trim();
  if (!t) return "";

  let sents = splitWcSentences(t);
  if (maxSentences > 0) sents = sents.slice(0, maxSentences);
  let out = sents.join(" ").trim() || t;
  const words = out.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    out = `${words.slice(0, maxWords).join(" ")}…`;
    if (/\(\d*\.?$/.test(out) || /\(\s*$/.test(out)) {
      out = out.replace(/\s*\([^)]*$/, "").trim();
      if (out && !out.endsWith("…")) out = `${out}…`;
    }
  }
  return out;
}

/**
 * One scannable numeric why for compact dock cards.
 * @param {string} why
 * @param {string} [lineSlot]
 */
export function pickWcFocusWhyLine(why, lineSlot = "") {
  const line = String(lineSlot || "").trim();
  if (line && wcLineSlotIsNumericDelta(line)) {
    return capWcCardFaceField(line, {
      maxWords: WC_FACE_FOCUS_WHY_WORDS,
      maxSentences: 1,
    });
  }

  const t = String(why || "").trim();
  const pctPair = t.match(
    /market[^.]{0,80}?(\d+\.?\d*)\s*%[^.]{0,80}?(?:UR sims?|sims? put)[^.]{0,40}?(\d+\.?\d*)\s*%(?:\s*\(([+-]?\d+\.?\d*)pt\))?/i,
  );
  if (pctPair) {
    const delta = pctPair[3] ? ` (${pctPair[3]}pt)` : "";
    return `Market ${pctPair[1]}% · UR sim ${pctPair[2]}%${delta}.`;
  }

  if (t && wcCardFaceBlobHasNumericWhy(t)) {
    return capWcCardFaceField(t, {
      maxWords: WC_FACE_FOCUS_WHY_WORDS,
      maxSentences: 1,
    });
  }
  return "";
}

/**
 * Card-face LINE slot — numeric delta only (not path prose).
 * @param {string} line
 */
export function wcLineSlotIsNumericDelta(line) {
  const t = String(line || "").trim();
  if (!t) return false;
  if (!wcCardFaceBlobHasNumericWhy(t)) return false;
  if (
    /\bneeds a top-two finish\b|\bpath is not finishing\b|\bfour teams:\b|\bnot finishing last on points\b/i.test(
      t,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Actionable headline — lean / THE PLAY, not thesis essay.
 * @param {{ lean?: string, call?: string, thePlay?: string, callType?: string }} opts
 */
/**
 * Short actionable play line — never thesis / delta parentheticals on the face.
 * @param {string} lean
 */
function pickWcAdvancementPlayHeadline(lean) {
  const play = formatWcPlaySlot(lean);
  if (!play) return "";

  const misprice = play.match(
    /Group\s+([A-L])\s*[—-]\s*([A-Z]{2,4})\s+advancement\s+misprice/i,
  );
  if (misprice) {
    return `${misprice[2]} to advance in Group ${misprice[1]}`;
  }

  const std = play.match(/^(.+?)\s+to advance in Group\s+([A-L])(?:\s+at\s+([+-]?\d+))?/i);
  if (std) {
    const odds = std[3] ? ` at ${std[3]}` : "";
    return `${std[1].trim()} to advance in Group ${std[2]}${odds}`;
  }

  return play.replace(/^lean:\s*/i, "").replace(/\s*\([^)]*sim vs market[^)]*\)\s*\.?$/i, "").trim();
}

export function pickWcCardHeadline(opts = {}) {
  const ct = String(opts.callType || "").toLowerCase();
  if (ct === "group_slate" || ct === "advancement" || ct === "matchup") {
    const advancementHeadline = pickWcAdvancementPlayHeadline(opts.lean);
    if (advancementHeadline) {
      return capWcCardFaceField(advancementHeadline, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    const leanPlay = formatWcPlaySlot(opts.lean);
    if (leanPlay) {
      return capWcCardFaceField(leanPlay.replace(/^lean:\s*/i, ""), {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
  }
  const play =
    wcCardSectionText(opts.thePlay) ||
    formatWcPlaySlot(opts.lean) ||
    wcCardSectionText(opts.lean);
  if (play && play.length >= 6) {
    return capWcCardFaceField(play.replace(/^lean:\s*/i, ""), {
      maxWords: WC_FACE_HEADLINE_WORDS,
      maxSentences: 1,
    });
  }
  const call = String(opts.call || "").trim();
  if (/^(pass|lean:)/i.test(call)) {
    return capWcCardFaceField(call, { maxWords: WC_FACE_HEADLINE_WORDS, maxSentences: 1 });
  }
  return capWcCardFaceField(call, { maxWords: WC_FACE_HEADLINE_WORDS, maxSentences: 1 });
}

function wcAppendUniqueBlock(base, extra) {
  const b = String(base || "").trim();
  const e = String(extra || "").trim();
  if (!e) return b;
  if (b && b.includes(e.slice(0, Math.min(48, e.length)))) return b;
  return b ? `${b}\n\n${e}` : e;
}

/**
 * Compress card face; overflow lives in breakdown.
 * @param {object} opts
 */
export function prepareWcCardFaceDisplay(opts = {}) {
  const focusLayout = Boolean(opts.focusLayout);
  const fullWhy = String(opts.why || "").trim();
  const fullWatch = String(opts.watchFor || "").trim();
  const fullPlay = String(opts.thePlay || "").trim();
  const fullDeep = String(opts.breakdown || "").trim();
  const lineSlot = String(opts.lineSlot || "").trim();

  const headline = pickWcCardHeadline({
    lean: opts.lean,
    call: opts.call,
    thePlay: fullPlay,
    callType: opts.callType,
  });

  let whyFace = "";
  if (focusLayout) {
    whyFace = pickWcFocusWhyLine(fullWhy, lineSlot);
  } else {
    whyFace = capWcCardFaceField(fullWhy, {
      maxWords: WC_FACE_WHY_WORDS,
      maxSentences: 2,
    });
  }
  const focusWhyCompressed =
    focusLayout && Boolean(whyFace) && pickWcFocusWhyLine(fullWhy, lineSlot) === whyFace;

  const watchFace = focusLayout
    ? ""
    : capWcCardFaceField(fullWatch, {
        maxWords: WC_FACE_WATCH_WORDS,
        maxSentences: 1,
      });

  let thePlayFace = focusLayout ? "" : fullPlay;
  if (!focusLayout && normLine(thePlayFace) === normLine(headline)) thePlayFace = "";

  let breakdown = capWcDeepWords(fullDeep, WC_FACE_BREAKDOWN_WORDS);
  const ladderBreakdown = /\bover\s+\d+\s*·/i.test(breakdown);
  const pathLine =
    lineSlot && !wcLineSlotIsNumericDelta(lineSlot) ? lineSlot : "";
  if (pathLine && !breakdown.includes(pathLine.slice(0, 40))) {
    breakdown = wcAppendUniqueBlock(pathLine, breakdown);
  }
  if (focusLayout) {
    if (fullWatch) breakdown = wcAppendUniqueBlock(breakdown, fullWatch);
    if (fullDeep) breakdown = wcAppendUniqueBlock(breakdown, fullDeep);
    if (fullWhy && !focusWhyCompressed) breakdown = wcAppendUniqueBlock(breakdown, fullWhy);
    if (fullPlay) breakdown = wcAppendUniqueBlock(breakdown, fullPlay);
  } else if (fullWhy && fullWhy !== whyFace && !ladderBreakdown) {
    breakdown = wcAppendUniqueBlock(breakdown, fullWhy);
  }
  if (!focusLayout && fullWatch && !breakdown.includes(fullWatch.slice(0, 40))) {
    breakdown = wcAppendUniqueBlock(breakdown, fullWatch);
  }
  if (!focusLayout && fullPlay && !breakdown.includes(fullPlay.slice(0, 40))) {
    breakdown = wcAppendUniqueBlock(breakdown, fullPlay);
  }

  const breakdownAvailable =
    Boolean(opts.breakdownAvailable) || breakdown.length > (whyFace.length + 24);

  return {
    headline,
    sections: {
      why: whyFace,
      watchFor: watchFace,
      thePlay: thePlayFace,
    },
    breakdownText: breakdown,
    breakdownAvailable,
  };
}

/**
 * @param {string} lean
 */
function formatWcPlaySlot(lean) {
  const l = String(lean || "")
    .replace(/^lean:\s*/i, "")
    .trim();
  if (!l || l.length < 8) return "";
  const first = l.match(/[^.!?]+[.!?]+/)?.[0]?.trim();
  return first || l;
}

/**
 * WC card stat grid — never duplicate the headline in a truncated UR read cell.
 * @param {{ call?: string, line?: string, lean?: string, confidence?: string, callType?: string, compactFace?: boolean }} opts
 */
export function buildWcTakeStatGrid(opts = {}) {
  const conf = String(opts.confidence || "Medium").trim();
  const lineVal = String(opts.line || "").trim();
  const call = String(opts.call || "").trim();
  const ct = String(opts.callType || "single").toLowerCase();
  const play = formatWcPlaySlot(opts.lean);
  const compactFace = Boolean(opts.compactFace);

  if (compactFace) {
    if (lineVal && wcLineSlotIsNumericDelta(lineVal)) {
      return {
        mode: ct,
        slots: [
          { key: "ln", label: "Line", value: lineVal, highlight: true },
          { key: "c", label: "Confidence", value: conf, highlight: false },
        ],
      };
    }
    return {
      mode: "confidence_only",
      slots: [{ key: "c", label: "Confidence", value: conf, highlight: false }],
    };
  }

  if (ct === "advancement" || ct === "group_slate") {
    const numericLine = wcLineSlotIsNumericDelta(lineVal) ? lineVal : "";
    const slotLine =
      numericLine ||
      (wcLineSlotIsNumericDelta(formatWcPlaySlot(opts.lean)) ? formatWcPlaySlot(opts.lean) : "") ||
      "";
    if (!slotLine) {
      return {
        mode: ct,
        slots: [{ key: "c", label: "Confidence", value: conf, highlight: true }],
      };
    }
    return {
      mode: ct,
      slots: [
        { key: "ln", label: "Line", value: slotLine, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (ct === "predictions_roundup") {
    const slotLine = lineVal || "Tap breakdown for full board";
    return {
      mode: "predictions_roundup",
      slots: [
        { key: "ln", label: "Line", value: slotLine, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (ct.startsWith("player_market") || ct === "player_prop") {
    const slotLine = lineVal || play || "";
    if (!slotLine || normLine(slotLine) === normLine(call)) {
      return {
        mode: ct,
        slots: [{ key: "c", label: "Confidence", value: conf, highlight: true }],
      };
    }
    return {
      mode: ct,
      slots: [
        { key: "ln", label: "Line", value: slotLine, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (lineVal) {
    return {
      mode: "line",
      slots: [
        { key: "ln", label: "Line", value: lineVal, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (play && play.toLowerCase() !== call.toLowerCase()) {
    return {
      mode: "play",
      slots: [
        { key: "pl", label: "Play", value: play, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  return {
    mode: "confidence_only",
    slots: [{ key: "c", label: "Confidence", value: conf, highlight: false }],
  };
}

function normWcCardBlob(text) {
  return String(text || "")
    .replace(/^lean:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function wcCardTextOverlaps(a, b, minLen = 24) {
  const x = normWcCardBlob(a);
  const y = normWcCardBlob(b);
  if (!x || !y) return false;
  const shorter = x.length <= y.length ? x : y;
  if (shorter.length < minLen) return false;
  return x.includes(y) || y.includes(x);
}

/**
 * Drop card rows that repeat the headline, line slot, or each other.
 * @param {{ headline?: string, lineSlot?: string, why?: string, watchFor?: string, thePlay?: string, callType?: string }} opts
 */
export function compressWcCardSections(opts = {}) {
  const ct = String(opts.callType || "").toLowerCase();
  if (!wcCardUsesUnifiedLayout(ct)) {
    return {
      why: String(opts.why || "").trim(),
      watchFor: String(opts.watchFor || "").trim(),
      thePlay: String(opts.thePlay || "").trim(),
    };
  }

  const headline = String(opts.headline || "").trim();
  const lineSlot = String(opts.lineSlot || "").trim();
  let why = String(opts.why || "").trim();
  let watchFor = String(opts.watchFor || "").trim();
  let thePlay = String(opts.thePlay || "").trim();

  if (lineSlot && why) {
    if (wcCardTextOverlaps(why, lineSlot, 20)) {
      why = why.split(lineSlot).join(" ").replace(/\s+/g, " ").trim();
    }
    if (lineSlot && wcCardTextOverlaps(why, lineSlot, 12)) {
      why = "";
    }
  }
  if (headline && wcCardTextOverlaps(why, headline, 20)) {
    why = "";
  }
  if (lineSlot && wcCardTextOverlaps(thePlay, lineSlot, 12)) {
    thePlay = "";
  }
  if (headline && wcCardTextOverlaps(thePlay, headline, 12)) {
    thePlay = "";
  }
  if (watchFor && wcCardTextOverlaps(watchFor, why, 20)) {
    watchFor = "";
  }

  return { why, watchFor, thePlay };
}

function wcCardUsesUnifiedLayout(callType) {
  const ct = String(callType || "").toLowerCase();
  return ct === "group_slate" || ct === "advancement" || ct === "matchup";
}

/**
 * @param {string} a
 * @param {string} b
 */
function normLine(a, b) {
  return String(a || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {{ lean?: string, call?: string, headline?: string }} opts
 */
export function pickWcThePlayLine(opts = {}) {
  const headline = String(opts.headline || "").trim();
  const lean = String(opts.lean || "").trim();
  const call = String(opts.call || "").trim();
  const lineSlot = String(opts.lineSlot || "").trim();
  const ct = String(opts.callType || "").toLowerCase();

  if (ct === "advancement" || ct === "group_slate") {
    if (lineSlot) return "";
    const play = formatWcPlaySlot(lean) || formatWcPlaySlot(call);
    if (play && normLine(play) !== normLine(headline)) return play;
    return "";
  }

  if (lean && lean !== "—" && normLine(lean) !== normLine(headline) && lean.length >= 8) {
    if (lineSlot && normLine(lean) === normLine(lineSlot)) return "";
    return lean;
  }
  if (call && call !== "—" && normLine(call) !== normLine(headline) && call.length > headline.length + 4) {
    if (lineSlot && normLine(call) === normLine(lineSlot)) return "";
    return call;
  }
  return "";
}

/**
 * @param {string} text
 */
export function wcCardSectionText(text) {
  const t = String(text || "").trim();
  if (!t || t === "—") return "";
  return t;
}

/**
 * WHY body for display — attribution lives in card footer, not inline brackets.
 * @param {string} rawWhy
 * @returns {{ why: string, modelAttribution: string | null }}
 */
export function prepareWcCardWhyDisplay(rawWhy) {
  const base = wcCardSectionText(rawWhy);
  if (!base) return { why: "", modelAttribution: null };
  const { body, attribution } = extractWcModelAttributionPrefix(base);
  return { why: body, modelAttribution: attribution };
}

/**
 * Card-face lines — one sentence or ladder row per block.
 * @param {string} text
 * @returns {string[]}
 */
function isWcCardOrphanLadderLine(line) {
  const l = String(line || "").trim();
  if (!l) return true;
  if (/^(?:is\s+)?(?:juice|still heavy|where the value lives|speculative)\b/i.test(l)) {
    return true;
  }
  return /^is\s+[a-z]/i.test(l) && !/^over\s/i.test(l);
}

export function formatWcCardSectionLines(text) {
  const t = wcCardSectionText(text);
  if (!t) return [];
  if (t.includes("\n")) {
    return t
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !isWcCardOrphanLadderLine(line));
  }
  return splitWcSentences(t)
    .map((line) => line.trim())
    .filter((line) => line && !isWcCardOrphanLadderLine(line));
}
