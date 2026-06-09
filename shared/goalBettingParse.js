/**
 * Goal.com US betting articles — table + labeled-futures HTML parse.
 */

import { formatAmericanOddsFromRaw } from "../api/_wcBookScrapeCommon.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

const ODDS_CELL_RE = /^(\+\d{2,5}|\-\d{2,4})$/;
const PUBLISHED_RE =
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+20\d{2}/i;

/**
 * @param {string} html
 */
export function extractGoalPublishedAt(html) {
  const m = String(html || "").match(PUBLISHED_RE);
  return m ? m[0] : null;
}

/**
 * @param {string} line
 */
function splitTableCells(line) {
  return String(line || "")
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c && !/^---+$/.test(c));
}

/**
 * @param {string} html
 * @param {{ oddsColumnNames?: string[], nameColumnNames?: string[] }} [opts]
 */
export function parseGoalMarkdownTables(html, opts = {}) {
  const oddsCols = new Set(
    (opts.oddsColumnNames || ["odds", "price"]).map((s) => s.toLowerCase()),
  );
  const nameCols = new Set(
    (opts.nameColumnNames || ["team", "player", "bet", "selection"]).map((s) => s.toLowerCase()),
  );

  const text = String(html || "");
  const lines = text.split(/\r?\n/);
  /** @type {Array<{ label: string, odds: string, team?: string, position?: string, note?: string }>} */
  const rows = [];
  const seen = new Set();

  let headerIdx = -1;
  let nameIdx = -1;
  let teamIdx = -1;
  let noteIdx = -1;

  for (const line of lines) {
    const cells = splitTableCells(line);
    if (cells.length < 2) continue;

    const oddsCol = cells.findIndex((c) => oddsCols.has(c.toLowerCase()));
    if (oddsCol >= 0) {
      headerIdx = oddsCol;
      const header = cells.map((c) => c.toLowerCase());
      nameIdx = header.findIndex((c) => nameCols.has(c));
      teamIdx = header.findIndex((c) => c === "national team" || c === "confederation");
      noteIdx = header.findIndex((c) => c.includes("note"));
      continue;
    }

    if (headerIdx < 0) continue;
    if (cells.every((c) => /^-+$/.test(c))) continue;

    const oddsRaw = cells[headerIdx] ?? cells[cells.length - 1];
    const odds = formatAmericanOddsFromRaw(oddsRaw);
    if (!odds || !ODDS_CELL_RE.test(odds)) continue;

    const labelRaw = nameIdx >= 0 ? cells[nameIdx] : cells[0];
    const label = normalizeWcPlayerName(labelRaw);
    if (!label || label.length < 2) continue;

    const key = `${label}|${odds}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      label,
      odds,
      team: teamIdx >= 0 ? cells[teamIdx] : undefined,
      note: noteIdx >= 0 ? cells[noteIdx] : undefined,
    });
  }

  if (rows.length >= 2) return rows;

  const pipeRowRe =
    /\|\s*([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'.\s-]{2,48}?)\s*\|(?:[^|]*\|){0,4}\s*(\+\d{2,5}|\-\d{2,4})\s*\|/g;
  let m;
  while ((m = pipeRowRe.exec(text)) && rows.length < 30) {
    const label = normalizeWcPlayerName(m[1]);
    const odds = formatAmericanOddsFromRaw(m[2]);
    if (!label || !odds || !ODDS_CELL_RE.test(odds)) continue;
    const key = `${label}|${odds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, odds });
  }

  return rows;
}

/**
 * USMNT-style labeled futures blocks.
 * @param {string} html
 */
export function parseGoalLabeledFutures(html) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\r/g, "");
  /** @type {Array<{ label: string, odds: string }>} */
  const rows = [];
  const seen = new Set();

  const blockRe =
    /([A-Za-z][A-Za-z0-9\s'./-]{4,60})\s*\n+\s*(\+\d{2,5}|\-\d{2,4})\b/g;
  let m;
  while ((m = blockRe.exec(text)) && rows.length < 24) {
    const label = m[1].trim().replace(/\s+/g, " ");
    const odds = formatAmericanOddsFromRaw(m[2]);
    if (!odds || !label) continue;
    if (/^(Team|Player|Price|Bet|Odds|USMNT|Mexico|Canada)$/i.test(label)) continue;
    const key = `${label}|${odds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, odds });
  }

  if (rows.length >= 3) return rows;

  const inlineRe =
    /([A-Za-z][A-Za-z0-9\s'./-]{4,50})\s*\|\s*(\+\d{2,5}|\-\d{2,4})\s*\|/g;
  while ((m = inlineRe.exec(text)) && rows.length < 24) {
    const label = m[1].trim();
    const odds = formatAmericanOddsFromRaw(m[2]);
    if (!odds || !label) continue;
    const key = `${label}|${odds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, odds });
  }

  return rows;
}

/**
 * @param {string} html
 * @param {import("./goalBettingRegistry.js").GoalBettingPageConfig} page
 */
export function parseGoalBettingPage(html, page) {
  const publishedAt = extractGoalPublishedAt(html);
  let rows = [];

  if (page.rowKind === "futures") {
    rows = parseGoalLabeledFutures(html);
    if (rows.length < 3) {
      rows = parseGoalMarkdownTables(html, { nameColumnNames: ["bet"], oddsColumnNames: ["price"] });
    }
  } else if (page.rowKind === "team") {
    rows = parseGoalMarkdownTables(html, { nameColumnNames: ["team"], oddsColumnNames: ["odds", "price"] });
    if (rows.length < 2) {
      const text = html.replace(/<[^>]+>/g, " ");
      const teamRe =
        /(San Antonio Spurs|New York Knicks|Spain|France|England|Brazil|Argentina|Portugal|USMNT|Mexico|Canada)\s{0,40}(\+\d{2,5}|\-\d{2,4})/gi;
      let m;
      while ((m = teamRe.exec(text)) && rows.length < 12) {
        const odds = formatAmericanOddsFromRaw(m[2]);
        if (!odds) continue;
        rows.push({ label: m[1], odds });
      }
    }
  } else {
    rows = parseGoalMarkdownTables(html, {
      nameColumnNames: ["player"],
      oddsColumnNames: ["odds", "price"],
    });
  }

  return {
    marketId: page.id,
    label: page.label,
    url: page.url,
    publishedAt,
    rows: rows.slice(0, 30),
    ok: rows.length > 0,
  };
}
