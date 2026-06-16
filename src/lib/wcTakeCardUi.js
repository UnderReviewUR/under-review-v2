/**
 * World Cup UR Take card — section mapping + stat grid (Card Contract Option 1).
 */

import { capWcDeepWords, splitWcSentences } from "../../shared/wcSentenceBoundaries.js";
import { getWcTeamByAbbr } from "../data/wc2026Teams.js";
import { dedupeWcBreakdownParagraphs } from "../../shared/wcBreakdownParse.js";
import { sanitizeWcUserFacingProse } from "../../shared/wcUserFacingCopy.js";
import {
  extractWcMatchupPlayHeadline,
  extractWcMatchupWinnerLine,
  isWcMatchupPathsBoilerplate,
  parseWcMatchGoalsOverUnder,
  parseWcMatchupTeamsFromBlob,
  parseWcMatchupTeamsFromQuestion,
  resolveWcMatchupCardHeadline,
  wcMatchupTeamDisplayName,
} from "../../shared/wcMatchupWinnerLine.js";
import { isWcMatchupAltMarketFollowUp } from "../../shared/wcMatchBettingPrompt.js";
import {
  extractWcModelAttributionPrefix,
  stripWcModelAttributionPrefix,
  wcCardFaceBlobHasNumericWhy,
  detectWcDeepMetaLeak,
} from "../../shared/wcTakeRetentionQA.js";

export const UR_TAKE_BREAKDOWN_LABEL = "More detail";
export const UR_TAKE_SLATE_BREAKDOWN_LABEL = "View full board";
export const UR_TAKE_FULL_BREAKDOWN_LABEL = "Full breakdown";

/**
 * @param {string} [callType]
 */
export function pickWcBreakdownLabel(callType = "", opts = {}) {
  const ct = String(callType || "").toLowerCase();
  const slateAngles = Array.isArray(opts.slateAngles) ? opts.slateAngles : [];
  if (ct === "tomorrow_slate" || slateAngles.length >= 2) {
    return UR_TAKE_FULL_BREAKDOWN_LABEL;
  }
  return UR_TAKE_BREAKDOWN_LABEL;
}

const WC_SLATE_COUNT_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/**
 * @param {string} lean
 * @param {string} [predictionPick]
 */
export function formatWcSlateListLean(lean, predictionPick) {
  const pick = String(predictionPick || "").trim();
  if (pick) return pick;
  const raw = String(lean || "")
    .replace(/^lean:\s*/i, "")
    .replace(/^pass on ml\s*[—-]\s*/i, "")
    .trim();
  if (!raw) return "";
  if (/^lean\b/i.test(raw)) return raw;
  return `lean ${raw}`;
}

/**
 * Scannable list face for multi-match WC slates.
 * @param {{
 *   angles?: Array<{ label?: string, lean?: string, predictionPick?: string | null }>,
 *   slateDay?: "today" | "tomorrow" | string,
 *   fixtureCount?: number,
 * }} opts
 * @returns {{ intro: string, rows: Array<{ label: string, lean: string }> } | null}
 */
export function buildWcSlateListFace(opts = {}) {
  const angles = Array.isArray(opts.angles) ? opts.angles : [];
  const count = angles.length || Number(opts.fixtureCount) || 0;
  if (count < 2) return null;

  const slateDay = opts.slateDay === "tomorrow" ? "tomorrow" : "today";
  const countWord =
    count > 0 && count < WC_SLATE_COUNT_WORDS.length
      ? WC_SLATE_COUNT_WORDS[count]
      : String(count);
  const intro = `${countWord.charAt(0).toUpperCase()}${countWord.slice(1)} World Cup ${
    count === 1 ? "match" : "matches"
  } ${slateDay}:`;

  const rows = angles
    .map((a) => {
      const label = String(a?.label || "").trim();
      const lean = formatWcSlateListLean(a?.lean, a?.predictionPick);
      if (!label) return null;
      return { label, lean };
    })
    .filter(Boolean);

  if (rows.length < 2) return null;
  return { intro, rows };
}

/** Collapsed thread teaser only — active card face shows full why. */
export const WC_COLLAPSED_THREAD_WHY_WORDS = 16;

const WC_FACE_HEADLINE_WORDS = 14;
const WC_FACE_BREAKDOWN_PREVIEW_WORDS = 220;
const WC_FACE_PREMIUM_BREAKDOWN_PREVIEW_WORDS = 340;

/**
 * @param {string} full
 * @param {string} preview
 */
export function wcBreakdownPreviewIsTruncated(full, preview) {
  const f = String(full || "").trim();
  const p = String(preview || "").trim();
  if (!f || !p) return false;
  if (p === f) return false;
  return p.endsWith("…") || p.length < f.length;
}

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
      maxWords: WC_COLLAPSED_THREAD_WHY_WORDS,
      maxSentences: 1,
    });
  }

  const t = String(why || "").trim();
  const simAdvance = t.match(
    /([A-Za-z][A-Za-z\s.'-]{1,28}|[A-Z]{2,4})\s+advances?\s+in\s+(\d+\.?\d*)%\s+of\s+sims/i,
  );
  if (simAdvance) {
    const label = String(simAdvance[1] || "").trim();
    if (label && !/^ur model/i.test(label)) {
      return `UR sim: ${label} ${simAdvance[2]}% to advance.`;
    }
  }

  const pctPair = t.match(
    /market[^.]{0,80}?(\d+\.?\d*)\s*%[^.]{0,80}?(?:UR sims?|sims? put)[^.]{0,40}?(\d+\.?\d*)\s*%(?:\s*\(([+-]?\d+\.?\d*)pt\))?/i,
  );
  if (pctPair) {
    const delta = pctPair[3] ? ` (${pctPair[3]}pt)` : "";
    return `Market ${pctPair[1]}% · UR sim ${pctPair[2]}%${delta}.`;
  }

  if (t && wcCardFaceBlobHasNumericWhy(t)) {
    return capWcCardFaceField(t, {
      maxWords: WC_COLLAPSED_THREAD_WHY_WORDS,
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
 * @param {string} token
 */
function wcDisplayTeamToken(token) {
  const t = String(token || "").trim();
  if (/^[A-Z]{2,4}$/.test(t)) {
    const team = getWcTeamByAbbr(t);
    if (team?.name) return team.name;
  }
  return t;
}

/**
 * Short actionable play line — never thesis / delta parentheticals on the face.
 * @param {string} lean
 */
function pickWcAdvancementPlayHeadline(lean) {
  const play = formatWcPlaySlot(lean);
  if (!play) return "";

  const pass = play.match(
    /^Pass on (.+?) to advance in Group\s+([A-L])(?:\s+at\s+([+-]?\d+))?/i,
  );
  if (pass) {
    const odds = pass[3] ? ` at ${pass[3]}` : "";
    return `Pass on ${wcDisplayTeamToken(pass[1].trim())} to advance in Group ${pass[2]}${odds}`;
  }

  const fade = play.match(/^Fade (.+?) Group\s+([A-L]) advance(?:\s+at\s+([+-]?\d+))?/i);
  if (fade) {
    const odds = fade[3] ? ` at ${fade[3]}` : "";
    return `Fade ${wcDisplayTeamToken(fade[1].trim())} Group ${fade[2]} advance${odds}`;
  }

  const misprice = play.match(
    /Group\s+([A-L])\s*[—-]\s*([A-Z]{2,4})\s+advancement\s+misprice/i,
  );
  if (misprice) {
    return `${wcDisplayTeamToken(misprice[2])} to advance in Group ${misprice[1]}`;
  }

  const std = play.match(/^(.+?)\s+to advance in Group\s+([A-L])(?:\s+at\s+([+-]?\d+))?/i);
  if (std) {
    const odds = std[3] ? ` at ${std[3]}` : "";
    return `${wcDisplayTeamToken(std[1].trim())} to advance in Group ${std[2]}${odds}`;
  }

  return play.replace(/^lean:\s*/i, "").replace(/\s*\([^)]*sim vs market[^)]*\)\s*\.?$/i, "").trim();
}

/**
 * Matchup card face — winner ML when cited, else the actionable play (never advancement paths).
 * @param {{ call?: string, why?: string, line?: string, thePlay?: string, lean?: string, breakdown?: string, question?: string }} opts
 */
export function pickWcMatchupWinnerHeadline(opts = {}) {
  const question = String(opts.question || "").trim();
  const callRaw = String(opts.call || "").trim();
  const callPlay = extractWcMatchupPlayHeadline(callRaw);
  if (callPlay && !/\bto win\b/i.test(callPlay)) return callPlay;
  if (isWcMatchupAltMarketFollowUp(question) && callRaw && !/\bto win\b/i.test(callRaw)) {
    return callRaw.replace(/^lean:\s*/i, "").trim();
  }

  const callPlayWin = extractWcMatchupPlayHeadline(callRaw);
  if (callPlayWin) return callPlayWin;

  const blob = [opts.call, opts.why, opts.line, opts.thePlay, opts.lean, opts.breakdown]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join("\n");
  if (!blob) return "";

  const vs =
    String(opts.call || "").match(/^([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})\b/i) ||
    blob.match(/\b([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})\b/i);
  const teams = vs
    ? { home: vs[1].toUpperCase(), away: vs[2].toUpperCase() }
    : parseWcMatchupTeamsFromBlob(blob, opts.question);

  const headline = resolveWcMatchupCardHeadline(blob, teams, opts.lean, opts.call);
  if (headline) return headline;

  const abbrs = teams.home && teams.away ? [teams.home, teams.away] : [];
  const favored = blob.match(
    /\b([A-Z]{2,4})\b[^.\n]{0,40}\b(?:favored|favorite lean|slight edge|lean)\b/i,
  );
  if (favored && abbrs.includes(favored[1].toUpperCase())) {
    return `${wcMatchupTeamDisplayName(favored[1])} favored`;
  }

  return "";
}

/**
 * Alternate market when ML is fair — shown below matchup winner headline.
 * @param {string} lean
 * @param {string} headline
 * @param {{ call?: string, why?: string, line?: string, thePlay?: string, lean?: string, breakdown?: string, question?: string }} [opts]
 */
export function pickWcMatchupAltPlay(lean, headline, opts = {}) {
  const headlineStr = String(headline || "").trim();
  const play = extractWcMatchupPlayHeadline(lean);

  if (/\bto win\b/i.test(headlineStr)) {
    if (!play) return "";
    if (normLine(play) === normLine(headlineStr)) return "";
    return play.startsWith("Alt:") ? play : `Alt: ${play}`;
  }

  if (play && normLine(play) === normLine(headlineStr)) {
    const blob = [opts.call, opts.why, opts.line, opts.thePlay, opts.lean, opts.breakdown]
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .join("\n");
    const fromQuestion = parseWcMatchupTeamsFromQuestion(String(opts.question || ""));
    const vs =
      String(opts.call || "").match(/^([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})\b/i) ||
      blob.match(/\b([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})\b/i);
    const teams =
      fromQuestion.home && fromQuestion.away
        ? { home: fromQuestion.home, away: fromQuestion.away }
        : vs
          ? { home: vs[1].toUpperCase(), away: vs[2].toUpperCase() }
          : parseWcMatchupTeamsFromBlob(blob, opts.question);
    const winner = extractWcMatchupWinnerLine(blob, teams);
    if (winner && normLine(winner) !== normLine(headlineStr)) {
      return winner.startsWith("Alt:") ? winner : `Alt: ${winner}`;
    }
  }

  const raw = String(lean || "").replace(/^lean:\s*/i, "").trim();
  const ouFallback = parseWcMatchGoalsOverUnder(raw);
  const fallback = ouFallback
    ? `Lean ${ouFallback.side} ${ouFallback.line} goals`
    : formatWcPlaySlot(lean);
  if (!fallback) return "";
  if (normLine(fallback) === normLine(headlineStr)) return "";
  if (!/\b(under|over|btts|advance|both teams|draw no bet|handicap|alt)\b/i.test(fallback)) {
    return "";
  }
  return fallback.startsWith("Alt:") ? fallback : `Alt: ${fallback}`;
}

/**
 * @param {string} lean
 * @param {string} [call]
 */
function pickWcPlayerPropListHeadline(lean, call = "") {
  const leanStr = String(lean || "").trim();
  const leanIsPass = /^pass\s*[—-]\s*no actionable line yet/i.test(leanStr);
  const numbered = leanStr.match(/^\s*1\.\s+(.+)$/m);
  if (numbered) {
    const lead = numbered[1].split(/\n/)[0].trim();
    const count = (leanStr.match(/^\s*\d+\.\s+/gm) || []).length;
    if (count > 1) {
      return capWcCardFaceField(`${lead} (+${count - 1} more)`, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    return capWcCardFaceField(lead, {
      maxWords: WC_FACE_HEADLINE_WORDS,
      maxSentences: 1,
    });
  }
  const callStr = String(call || "").trim();
  const callIsPassHeadline =
    /^pass\b|^no verified|^same-script legs|^player parlay legs|^player props for/i.test(callStr);

  if (leanIsPass) {
    if (callIsPassHeadline && callStr) {
      return capWcCardFaceField(callStr, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    return capWcCardFaceField(leanStr, {
      maxWords: WC_FACE_HEADLINE_WORDS,
      maxSentences: 1,
    });
  }

  if (callStr && !/^pass\b/i.test(callStr) && !leanIsPass) {
    return capWcCardFaceField(callStr, {
      maxWords: WC_FACE_HEADLINE_WORDS,
      maxSentences: 1,
    });
  }
  const leanPlay = formatWcPlaySlot(lean);
  if (leanPlay && !/\blean his\b/i.test(leanPlay)) {
    return capWcCardFaceField(leanPlay.replace(/^lean:\s*/i, ""), {
      maxWords: WC_FACE_HEADLINE_WORDS,
      maxSentences: 1,
    });
  }
  return "";
}

export function pickWcCardHeadline(opts = {}) {
  const ct = String(opts.callType || "").toLowerCase();
  const call = String(opts.call || "").trim();
  const leanRaw = stripWcModelAttributionPrefix(String(opts.lean || "").trim());
  const leanIsPassBoilerplate = /^pass\s*[—-]\s*no actionable line yet/i.test(leanRaw);
  const playerMarketCt =
    ct.startsWith("player_market") || ct === "player_prop" || ct === "goalscorers_list";

  if (playerMarketCt) {
    const propHeadline = pickWcPlayerPropListHeadline(leanRaw, call);
    if (propHeadline) return propHeadline;
  }

  if (
    (ct === "matchup" || playerMarketCt) &&
    leanIsPassBoilerplate &&
    call &&
    call !== "—"
  ) {
    const callIsPassHeadline =
      /^pass\b|^no verified|^same-script legs|^player parlay legs|^player props for/i.test(call);
    if (!playerMarketCt || callIsPassHeadline) {
      return capWcCardFaceField(call, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    return capWcCardFaceField(leanRaw, {
      maxWords: WC_FACE_HEADLINE_WORDS,
      maxSentences: 1,
    });
  }

  if (ct === "matchup") {
    const winnerHeadline = pickWcMatchupWinnerHeadline({
      call: opts.call,
      why: opts.why,
      line: opts.line,
      thePlay: opts.thePlay,
      lean: opts.lean,
      breakdown: opts.breakdown,
      question: opts.question,
    });
    if (winnerHeadline) {
      return capWcCardFaceField(winnerHeadline, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    if (call && call !== "—" && !isWcMatchupPathsBoilerplate(call)) {
      return capWcCardFaceField(call, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    const leanPlay = formatWcPlaySlot(opts.lean);
    if (leanPlay && !leanIsPassBoilerplate) {
      return capWcCardFaceField(leanPlay.replace(/^lean:\s*/i, ""), {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
  }

  if (ct === "group_slate" || ct === "tomorrow_slate" || ct === "advancement") {
    if (ct === "tomorrow_slate") {
      const slateSummary =
        (/\d+\s+(?:goal-total|spread)\s+leans?\b/i.test(leanRaw) && leanRaw) ||
        (/\d+\s+(?:goal-total|spread|angles?|match(?:es)?\s+predictions?)\b/i.test(call) && call) ||
        (/\d+\s+angles?\s+on\b/i.test(leanRaw) && leanRaw) ||
        (/slate\s*[—-]\s*lead\b/i.test(leanRaw) && leanRaw) ||
        "";
      if (slateSummary && !/^pass\b/i.test(slateSummary)) {
        return capWcCardFaceField(slateSummary.replace(/^lean:\s*/i, ""), {
          maxWords: WC_FACE_HEADLINE_WORDS,
          maxSentences: 1,
        });
      }
    }
    if (ct === "tomorrow_slate" && call && /\bmatch predictions?\b/i.test(call)) {
      return capWcCardFaceField(call, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    const advancementHeadline = pickWcAdvancementPlayHeadline(opts.lean);
    if (advancementHeadline) {
      return capWcCardFaceField(advancementHeadline, {
        maxWords: WC_FACE_HEADLINE_WORDS,
        maxSentences: 1,
      });
    }
    const leanPlay = formatWcPlaySlot(opts.lean);
    if (leanPlay && !leanIsPassBoilerplate) {
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
  if (/^(pass|lean:)/i.test(call)) {
    return capWcCardFaceField(call, { maxWords: WC_FACE_HEADLINE_WORDS, maxSentences: 1 });
  }
  const callHeadline = capWcCardFaceField(call, {
    maxWords: WC_FACE_HEADLINE_WORDS,
    maxSentences: 1,
  });
  if (callHeadline && callHeadline !== "—") return callHeadline;
  return capWcCardFaceField(play, { maxWords: WC_FACE_HEADLINE_WORDS, maxSentences: 1 });
}

/**
 * True when the WC card face would render blank without a fallback.
 * @param {{ headline?: string, sections?: { why?: string, watchFor?: string, thePlay?: string }, breakdownText?: string, breakdownAvailable?: boolean, modelAttribution?: string | null, statSlots?: object[], predictionSlots?: object[] }} opts
 */
export function wcTakeCardHasVisibleContent(opts = {}) {
  if (opts.slateListFace?.rows?.length) return true;
  const headline = String(opts.headline || "").trim();
  if (headline && headline !== "—" && headline !== "—.") return true;
  const sections = opts.sections || {};
  if (String(sections.why || "").trim()) return true;
  if (String(sections.watchFor || "").trim()) return true;
  if (String(sections.thePlay || "").trim()) return true;
  if (String(opts.modelAttribution || "").trim()) return true;
  if (Array.isArray(opts.statSlots) && opts.statSlots.length > 0) return true;
  if (Array.isArray(opts.predictionSlots) && opts.predictionSlots.length > 0) return true;
  const deep = String(opts.breakdownText || "").trim();
  return Boolean(opts.breakdownAvailable && deep.length > 24);
}

function wcAppendUniqueBlock(base, extra) {
  const b = String(base || "").trim();
  const e = String(extra || "").trim();
  if (!e) return b;
  if (b && wcBreakdownContainsWatchText(b, e)) return b;
  if (b && b.includes(e.slice(0, Math.min(48, e.length)))) return b;
  return b ? `${b}\n\n${e}` : e;
}

function wcNormalizeWatchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/^watch for:?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wcBreakdownContainsWatchText(breakdown, watchText) {
  const w = wcNormalizeWatchText(watchText);
  if (!w) return true;
  const b = wcNormalizeWatchText(breakdown);
  return b.includes(w.slice(0, Math.min(80, w.length)));
}

/**
 * Only show expandable breakdown when deep adds scannable structure beyond the card face.
 * @param {string} deep
 * @param {string} [whyNow]
 * @param {string} [watchFor]
 */
export function wcDeepAddsReaderValue(deep, whyNow = "", watchFor = "") {
  const d = sanitizeWcUserFacingProse(String(deep || "").trim());
  if (!d || d.length < 40) return false;
  if (detectWcDeepMetaLeak(d)) return false;
  if (
    /^Angle:/im.test(d) ||
    /^Match:/im.test(d) ||
    /\bMatch:\s+\S/im.test(d) ||
    /^Sim vs market:/im.test(d)
  ) {
    return true;
  }

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const nw = norm(whyNow);
  const nd = norm(d);
  if (nw && nw.length > 60 && nd.includes(nw.slice(0, Math.min(100, nw.length)))) {
    if (nd.length < nw.length + 100) return false;
  }
  if (watchFor && wcBreakdownContainsWatchText(d, watchFor) && d.split(/\n\n+/).length < 2) {
    return false;
  }
  return d.split(/\n\n+/).filter(Boolean).length >= 2;
}

/**
 * Compress card face; overflow lives in breakdown.
 * @param {object} opts
 */
export function prepareWcCardFaceDisplay(opts = {}) {
  const focusLayout = Boolean(opts.focusLayout);
  const ct = String(opts.callType || "").toLowerCase();
  const premiumBreakdownCall = ct === "group_slate" || ct === "advancement";
  const hasSlateAngles =
    Array.isArray(opts.tomorrowSlateAngles) && opts.tomorrowSlateAngles.length >= 2;
  const selfContainedSlateBreakdown = ct === "tomorrow_slate" || hasSlateAngles;
  const fullWhy = sanitizeWcUserFacingProse(String(opts.why || "").trim());
  const fullWatch = sanitizeWcUserFacingProse(String(opts.watchFor || "").trim());
  const fullPlay = String(opts.thePlay || "").trim();
  const fullDeep = String(opts.breakdown || "").trim();
  const lineSlot = String(opts.lineSlot || "").trim();

  const slateListFace =
    selfContainedSlateBreakdown
      ? buildWcSlateListFace({
          angles: opts.tomorrowSlateAngles,
          slateDay: opts.slateDay,
          fixtureCount: opts.tomorrowFixtureCount,
        })
      : null;

  let headline = pickWcCardHeadline({
    lean: opts.lean,
    call: opts.call,
    why: fullWhy,
    line: lineSlot,
    thePlay: fullPlay,
    breakdown: fullDeep,
    question: opts.question,
    callType: opts.callType,
  });
  if (slateListFace) {
    headline = slateListFace.intro;
  }

  const playerMarketCt =
    ct.startsWith("player_market") || ct === "player_prop" || ct === "goalscorers_list";
  const leanStr = String(opts.lean || "").trim();
  const numberedPropList = playerMarketCt && /^\s*\d+\.\s+/m.test(leanStr);

  const whyFace =
    slateListFace
      ? ""
      : focusLayout && numberedPropList
        ? sanitizeWcUserFacingProse(fullWhy || leanStr)
        : fullWhy;

  const watchFace = focusLayout ? "" : fullWatch;

  let thePlayFace = "";
  if (focusLayout && ct === "matchup") {
    thePlayFace = pickWcMatchupAltPlay(opts.lean, headline, {
      call: opts.call,
      why: fullWhy,
      line: lineSlot,
      thePlay: fullPlay,
      lean: opts.lean,
      breakdown: fullDeep,
      question: opts.question,
    });
  } else if (!focusLayout) {
    thePlayFace = fullPlay;
    if (normLine(thePlayFace) === normLine(headline)) thePlayFace = "";
  }

  const breakdownPreviewWordCap =
    focusLayout && (premiumBreakdownCall || selfContainedSlateBreakdown)
      ? WC_FACE_PREMIUM_BREAKDOWN_PREVIEW_WORDS
      : WC_FACE_BREAKDOWN_PREVIEW_WORDS;
  let breakdownFull = fullDeep;
  const ladderBreakdown = /\bover\s+\d+\s*·/i.test(breakdownFull);
  const pathLine =
    lineSlot && !wcLineSlotIsNumericDelta(lineSlot) ? lineSlot : "";
  if (pathLine && !breakdownFull.includes(pathLine.slice(0, 40))) {
    breakdownFull = wcAppendUniqueBlock(pathLine, breakdownFull);
  }
  if (focusLayout) {
    const watchAlreadyInBreakdown =
      fullWatch &&
      breakdownFull &&
      wcBreakdownContainsWatchText(breakdownFull, fullWatch);
    if (fullWatch && !watchAlreadyInBreakdown && !selfContainedSlateBreakdown) {
      breakdownFull = wcAppendUniqueBlock(breakdownFull, fullWatch);
    }
    if (fullDeep && !selfContainedSlateBreakdown) {
      breakdownFull = wcAppendUniqueBlock(breakdownFull, fullDeep);
    }
    if (fullWhy && premiumBreakdownCall && !selfContainedSlateBreakdown) {
      breakdownFull = wcAppendUniqueBlock(breakdownFull, fullWhy);
    }
    if (fullPlay && !selfContainedSlateBreakdown) {
      breakdownFull = wcAppendUniqueBlock(breakdownFull, fullPlay);
    }
  } else if (fullWhy && fullWhy !== whyFace && !ladderBreakdown && !selfContainedSlateBreakdown) {
    breakdownFull = wcAppendUniqueBlock(breakdownFull, fullWhy);
  }
  if (!focusLayout && fullWatch && !wcBreakdownContainsWatchText(breakdownFull, fullWatch) && !selfContainedSlateBreakdown) {
    breakdownFull = wcAppendUniqueBlock(breakdownFull, fullWatch);
  }
  if (!focusLayout && fullPlay && !breakdownFull.includes(fullPlay.slice(0, 40)) && !selfContainedSlateBreakdown) {
    breakdownFull = wcAppendUniqueBlock(breakdownFull, fullPlay);
  }

  breakdownFull = dedupeWcBreakdownParagraphs(sanitizeWcUserFacingProse(breakdownFull));
  const breakdownPreview = capWcDeepWords(breakdownFull, breakdownPreviewWordCap);
  const breakdownTruncated = wcBreakdownPreviewIsTruncated(breakdownFull, breakdownPreview);

  const breakdownAvailable =
    (selfContainedSlateBreakdown &&
      breakdownFull.length > 80 &&
      (Boolean(opts.breakdownAvailable) || /\bMatch:\s+\S/im.test(breakdownFull))) ||
    ((Boolean(opts.breakdownAvailable) || breakdownFull.length > whyFace.length + 24) &&
      wcDeepAddsReaderValue(breakdownFull, fullWhy, fullWatch));

  return {
    headline,
    slateListFace,
    sections: {
      why: whyFace,
      watchFor: watchFace,
      thePlay: thePlayFace,
    },
    breakdownText: breakdownTruncated ? breakdownPreview : breakdownFull,
    breakdownTextFull: breakdownFull,
    breakdownTruncated,
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
  const playHeadline = extractWcMatchupPlayHeadline(l);
  if (playHeadline) return playHeadline;
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
  const base = wcCardSectionText(sanitizeWcUserFacingProse(rawWhy));
  if (!base) return { why: "", modelAttribution: null };
  const { body } = extractWcModelAttributionPrefix(base);
  return { why: sanitizeWcUserFacingProse(body), modelAttribution: null };
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
