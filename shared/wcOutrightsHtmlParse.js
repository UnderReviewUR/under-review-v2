/**
 * Tournament winner outrights from aggregator/editorial HTML (Covers, OddsShark, etc.).
 */

import { formatAmericanOdds, parseAmericanOddsNumber } from "./wcGoldenBootConsensus.js";
import { abbrForWcTeamName } from "./wcOutrightsTeamResolve.js";

const MIN_PARSE_ROWS = 8;

const JUNK_TEAM =
  /\b(nav|image|world cup|favorite|darkhorse|value pick|group|odds shark|covers|strong|href|twitter|meta)\b/i;

/**
 * @param {string} raw
 */
function formatOutrightsOddsToken(raw) {
  const s = String(raw || "").trim().replace(/,/g, "");
  if (!s) return null;
  if (/^\d+\s*-\s*\d+$/.test(s)) {
    const [num, den] = s.split(/\s*-\s*/).map(Number);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return formatAmericanOdds(Math.round((num / den) * 100));
    }
  }
  if (/^\d+\s*\/\s*\d+$/.test(s)) {
    const [num, den] = s.split("/").map(Number);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return formatAmericanOdds(Math.round((num / den) * 100));
    }
  }
  const n = parseAmericanOddsNumber(s);
  return n != null ? formatAmericanOdds(n) : null;
}

/**
 * @param {Record<string, string>} map
 * @param {string} teamLabel
 * @param {string} oddsRaw
 */
/**
 * @param {string | null} odds
 */
function isPlausibleTournamentWinnerOdds(odds) {
  const n = parseAmericanOddsNumber(odds);
  if (n == null) return false;
  if (n >= 0) return n >= 100;
  return n <= -101;
}

/**
 * @param {string} html
 */
function normalizeOddsSharkHtml(html) {
  return String(html || "").replace(/\\t/g, "\t");
}

function ingestTeamOdds(map, teamLabel, oddsRaw) {
  const label = String(teamLabel || "").trim();
  if (!label || label.length < 3 || JUNK_TEAM.test(label)) return;
  const abbr = abbrForWcTeamName(label);
  const odds = formatOutrightsOddsToken(oddsRaw);
  if (!abbr || !odds || !isPlausibleTournamentWinnerOdds(odds)) return;
  if (!map[abbr]) map[abbr] = odds;
}

/**
 * Slice HTML to tournament-winner section (avoid group-winner negative odds bleed).
 * @param {string} html
 */
export function sliceCoversWinnerSection(html) {
  const text = String(html || "");
  const startRe =
    /odds to win(?: the)?(?: 2026)? (?:fifa )?world cup|win the (?:2026 )?world cup|tournament winner|fifa world cup odds/i;
  const endRe = /group winner|top goalscorer|golden boot|to qualify from group/i;
  const start = text.search(startRe);
  if (start < 0) return text;
  const endMatch = text.slice(start + 80).search(endRe);
  const end = endMatch >= 0 ? start + 80 + endMatch : start + 120_000;
  return text.slice(start, end);
}

/**
 * Covers: <strong>Spain (+400):</strong>
 * @param {string} html
 */
export function parseCoversOutrightsFromHtml(html) {
  const scoped = sliceCoversWinnerSection(html);
  /** @type {Record<string, string>} */
  const map = {};
  const re =
    /(?:<strong>)?\s*([A-Z][A-Za-z&'.\s-]{2,40}?)\s*\(\s*([+\-]?\d[\d,]*|\d+\s*-\s*\d+)\s*\)\s*(?::)?(?:<\/strong>)?/g;
  let m;
  while ((m = re.exec(scoped))) {
    ingestTeamOdds(map, m[1], m[2]);
  }
  return map;
}

/**
 * OddsShark tabular blocks: Spain\t+440\tFrance\t+460
 * @param {string} html
 */
export function parseOddsSharkOutrightsFromHtml(html) {
  /** @type {Record<string, string>} */
  const map = {};
  const text = normalizeOddsSharkHtml(html);
  const re = /([A-Z][A-Za-z&'.\s-]{2,35})[\t]+([+\-]\d{2,6})/g;
  let m;
  while ((m = re.exec(text))) {
    ingestTeamOdds(map, m[1], m[2]);
  }
  return map;
}

/**
 * Prose: "Spain with +450 odds"
 * @param {string} html
 */
export function parseOutrightsProseFromHtml(html) {
  /** @type {Record<string, string>} */
  const map = {};
  const text = normalizeOddsSharkHtml(html);
  const patterns = [
    /([A-Z][A-Za-z&'.\s-]{2,35})\s+(?:with|at)\s+([+\-]\d{2,6}|\d+\s*-\s*\d+)\s+odds/gi,
    /([A-Z][A-Za-z&'.\s-]{2,35}),?\s+are\s+hot[^+]{0,80}?with\s+([+\-]\d{2,6})/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) {
      ingestTeamOdds(map, m[1], m[2]);
    }
  }
  return map;
}

/**
 * Markdown-style: | Spain | +450 |
 * @param {string} html
 */
export function parseOutrightsTableFromHtml(html) {
  /** @type {Record<string, string>} */
  const map = {};
  const re =
    /\|\s*([A-Z][A-Za-z&'.\s-]{2,35})\s*\|\s*([+\-]\d{2,6}|\d+\s*-\s*\d+|Even)\s*\|/g;
  let m;
  while ((m = re.exec(html))) {
    const odds = m[2].toLowerCase() === "even" ? "+100" : m[2];
    ingestTeamOdds(map, m[1], odds);
  }
  return map;
}

/**
 * @param {string} html
 * @param {string} [sourceKey]
 */
export function parseWcTournamentWinnerOutrightsFromHtml(html, sourceKey = "generic") {
  const text = String(html || "");
  const key = String(sourceKey || "").toLowerCase();

  /** @type {Array<() => Record<string, string>>} */
  const strategies = [];
  if (key === "covers" || key.includes("covers")) {
    strategies.push(() => parseCoversOutrightsFromHtml(text));
  }
  if (key === "oddsshark" || key.includes("oddsshark")) {
    strategies.push(() => parseOddsSharkOutrightsFromHtml(text));
    strategies.push(() => parseOutrightsProseFromHtml(text));
  }
  if (key === "oddschecker" || key.includes("oddschecker")) {
    strategies.push(() => parseOutrightsTableFromHtml(text));
    strategies.push(() => parseOddsSharkOutrightsFromHtml(text));
  }

  strategies.push(
    () => parseCoversOutrightsFromHtml(text),
    () => parseOddsSharkOutrightsFromHtml(text),
    () => parseOutrightsProseFromHtml(text),
    () => parseOutrightsTableFromHtml(text),
  );

  /** @type {Record<string, string>} */
  let best = {};
  for (const run of strategies) {
    const map = run();
    if (Object.keys(map).length > Object.keys(best).length) best = map;
  }
  return best;
}

/**
 * @param {Record<string, string>} map
 */
export function isViableWcOutrightsMap(map) {
  return Object.keys(map || {}).length >= MIN_PARSE_ROWS;
}
