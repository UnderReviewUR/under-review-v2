/**
 * NBA Finals UR Take — scannable card display (parse + headline correction).
 */

import {
  isNbaFinalsQuestion,
  overlayFinalsScheduledGame,
  resolveNextNbaFinalsScheduledGame,
} from "./nbaFinalsUtils.js";

const TEAM_NICK = { NYK: "Knicks", SAS: "Spurs" };

const SCAN_LABELS = [
  ["sharpAngle", /^SHARP\s+ANGLE\s*:\s*(.+)$/im],
  ["context", /^Context\s*:\s*(.+)$/im],
  ["thePlay", /^The\s+Play\s*:\s*(.+)$/im],
  ["confidence", /^Confidence\s*:\s*(High|Medium|Speculative)\b/i],
  ["watchFor", /^(?:Watch\s+For|Live\s+trigger)\s*:\s*(.+)$/im],
  ["oneThing", /^One\s+Thing\s*:\s*(.+)$/im],
];

/**
 * @param {string} text
 */
export function parseNbaFinalsScannableTake(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, re] of SCAN_LABELS) {
    const m = raw.match(re);
    if (m?.[1]) out[key] = String(m[1]).trim();
  }

  const confLine = raw.match(/\bConfidence\s*:\s*(High|Medium|Speculative)\b/i);
  if (confLine?.[1]) out.confidence = confLine[1];

  if (Object.keys(out).length >= 3) {
    return {
      sharpAngle: out.sharpAngle || null,
      context: out.context || null,
      thePlay: out.thePlay || null,
      confidence: out.confidence || null,
      watchFor: out.watchFor || null,
      oneThing: out.oneThing || null,
      parsed: true,
    };
  }

  return extractNbaFinalsHeuristicSections(raw);
}

/**
 * @param {string} raw
 */
function extractNbaFinalsHeuristicSections(raw) {
  const conf = raw.match(/\bConfidence\s*:\s*(High|Medium|Speculative)\b/i);
  const live = raw.match(/\b(?:Live\s+trigger|Watch\s+for)\s*:\s*([^.]+\.?)/i);
  const lookFor = raw.match(/\bLook\s+for\s+([^.]+\.?)/i);

  const sharpest = raw.match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'?s?\s+[\w\s]+\s+is\s+the\s+sharpest\s+angle/i,
  );
  const linePlay = raw.match(
    /\b(?:line\s+posts?\s+at|at)\s+([\d.]+)\s+or\s+higher,?\s+(under|over)\s+is\s+the\s+play/i,
  );

  const fragileBlock = raw.match(
    /(?:THE\s+FRAGILE\s+ASSUMPTION|fragile assumption)\s*([^]*?)(?=The\s+live\s+trigger|Confidence:|Look\s+for|$)/i,
  );
  const contextText = fragileBlock
    ? String(fragileBlock[1] || "")
        .replace(/^[\s:—\-]+/, "")
        .split(/\.\s+/)
        .slice(0, 2)
        .join(". ")
        .trim()
        .slice(0, 320)
    : null;

  const speedFlip = raw.match(/\b(SAS|Spurs|Knicks|NYK)\s+will\s+try\s+to[^.]+\./i);

  let sharpAngle = null;
  if (lookFor) sharpAngle = String(lookFor[1]).trim().slice(0, 120);
  else if (sharpest) sharpAngle = String(sharpest[0]).trim().slice(0, 120);
  else if (linePlay) {
    sharpAngle = `${linePlay[2]} ${linePlay[1]}`.trim();
  }

  let thePlay = null;
  if (linePlay) thePlay = `Line at ${linePlay[1]}+ → ${linePlay[2].toUpperCase()}`;
  else if (lookFor) thePlay = String(lookFor[1]).trim().slice(0, 100);

  if (!conf && !sharpAngle && !thePlay && !live && !contextText) return null;

  return {
    sharpAngle,
    context: contextText,
    thePlay,
    confidence: conf ? conf[1] : null,
    watchFor: live ? String(live[1]).trim() : null,
    oneThing: speedFlip ? String(speedFlip[0]).trim() : null,
    parsed: false,
  };
}

/**
 * @param {object | null | undefined} nbaRelevance
 * @param {string} [userQuestion]
 */
export function buildNbaFinalsDisplayHeadline(nbaRelevance, userQuestion = "") {
  const finalsMode =
    Boolean(nbaRelevance?.finalsMode) || isNbaFinalsQuestion(userQuestion);
  if (!finalsMode) return null;

  const next = resolveNextNbaFinalsScheduledGame();
  const gn = Number(nbaRelevance?.finalsGameNumber) || next?.gameNumber || null;
  const sched =
    gn != null
      ? overlayFinalsScheduledGame(
          {
            isFinals: true,
            seriesScoreLabel: String(nbaRelevance?.finalsSeriesSummary || "").trim(),
            gameNumber: gn,
            gameState: "",
          },
          Date.now(),
        )
      : null;

  const series =
    String(nbaRelevance?.finalsSeriesSummary || sched?.seriesScoreLabel || "").trim() ||
    "NBA Finals";
  const matchup =
    String(nbaRelevance?.finalsMatchupLabel || sched?.tonightMatchupLabel || "").trim();
  const venue = String(nbaRelevance?.finalsVenueLabel || sched?.venueLabel || "").trim();

  const parts = [series];
  if (gn) parts.push(`Game ${gn}`);
  if (venue) parts.push(`in ${venue.split("(")[0].trim()}`);
  if (matchup) parts.push(matchup);

  return parts.filter(Boolean).join(" · ");
}

/**
 * @param {string} headline
 * @param {object | null | undefined} nbaRelevance
 */
export function shouldReplaceNbaFinalsHeadline(headline, nbaRelevance) {
  const h = String(headline || "").toLowerCase();
  const gn = Number(nbaRelevance?.finalsGameNumber) || 0;
  if (gn >= 3 && h.includes("san antonio") && h.includes("road")) return true;
  if (gn >= 3 && gn <= 4 && h.includes("san antonio") && !h.includes("new york")) return true;
  return false;
}

/**
 * @param {string} userQuestion
 * @param {object | null | undefined} nbaRelevance
 */
export function isNbaFinalsTakeForDisplay(userQuestion, nbaRelevance) {
  if (Boolean(nbaRelevance?.finalsMode)) return true;
  return isNbaFinalsQuestion(userQuestion);
}

/**
 * @param {ReturnType<typeof overlayFinalsScheduledGame>} sched
 */
export function finalsVenueShort(sched) {
  if (!sched?.homeAbbr) return "";
  return sched.homeAbbr === "NYK"
    ? "New York"
    : sched.homeAbbr === "SAS"
      ? "San Antonio"
      : TEAM_NICK[sched.homeAbbr] || sched.homeAbbr;
}
