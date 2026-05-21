/**
 * Parse Ourlads QB depth chart HTML (position page).
 * Ourlads 2026 markup: team via logo_thumb_{CODE}.gif, player links use full https URLs.
 */

const TEAM_MAP = {
  BUF: "BUF",
  MIA: "MIA",
  NE: "NE",
  NYJ: "NYJ",
  BAL: "BAL",
  CIN: "CIN",
  CLE: "CLE",
  PIT: "PIT",
  HOU: "HOU",
  IND: "IND",
  JAX: "JAX",
  TEN: "TEN",
  DEN: "DEN",
  KC: "KC",
  LV: "LV",
  SD: "LAC",
  DAL: "DAL",
  NYG: "NYG",
  PHI: "PHI",
  WAS: "WAS",
  CHI: "CHI",
  DET: "DET",
  GB: "GB",
  MIN: "MIN",
  ATL: "ATL",
  CAR: "CAR",
  NO: "NO",
  TB: "TB",
  ARZ: "ARZ",
  RAM: "LAR",
  SF: "SF",
  SEA: "SEA",
};

function titleCaseToken(word) {
  const w = String(word || "").trim();
  if (!w) return "";
  if (w.length <= 2 && w === w.toUpperCase()) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function titleCaseWords(s) {
  return String(s || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ");
}

/** @param {string} raw */
export function cleanOurladsPlayerName(raw) {
  if (!raw) return "";
  const cleaned = String(raw)
    .replace(/\s+\d{2}\/\d+$/, "")
    .replace(/\s+U\/\w+$/i, "")
    .replace(/\s+SF\d{2}$/i, "")
    .replace(/\s+CF\d{2}$/i, "")
    .replace(/\s+CC\/\w+$/i, "")
    .replace(/\s+W\/\w+$/i, "")
    .replace(/\s+T\/\w+$/i, "")
    .replace(/\s+P\/\w+$/i, "")
    .trim();

  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map((s) => s.trim());
    if (parts[0] && parts[1]) {
      return `${titleCaseWords(parts[1])} ${titleCaseWords(parts[0])}`.trim();
    }
  }

  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    return titleCaseWords(cleaned);
  }

  return cleaned;
}

/**
 * @param {string} html
 * @param {{ minTeams?: number }} [opts]
 * @returns {Record<string, { qb1: string, qb2: string | null, qb3: string | null, fetchedAt: string }> | null}
 */
export function parseOurladsQBs(html, opts = {}) {
  const minTeams = Number.isFinite(opts.minTeams) ? opts.minTeams : 28;
  const depth = {};
  const rows = String(html || "").match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    if (!/<td[^>]*>\s*QB\s*<\/td>/i.test(row)) continue;

    const logoMatch = row.match(/logo_thumb_([A-Z]+)\.gif/i);
    if (!logoMatch) continue;

    const ourladsCode = logoMatch[1].toUpperCase();
    const team = TEAM_MAP[ourladsCode] || ourladsCode;

    const players = [];
    const anchors = row.matchAll(
      /href=['"][^'"]*\/player\/(\d+)\/['"][^>]*>([^<]*)</gi,
    );
    for (const [, playerId, rawName] of anchors) {
      if (playerId === "0") continue;
      const name = cleanOurladsPlayerName(rawName);
      if (name) players.push(name);
    }

    if (players.length > 0) {
      depth[team] = {
        qb1: players[0],
        qb2: players[1] || null,
        qb3: players[2] || null,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  const teamCount = Object.keys(depth).length;
  return teamCount >= minTeams ? depth : null;
}

/** Lightweight parse probe for scrape logs (no minTeams gate). */
export function diagnoseOurladsHtml(html) {
  const src = String(html || "");
  const rows = src.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  let qbRows = 0;
  let rowsWithLogo = 0;
  for (const row of rows) {
    if (!/<td[^>]*>\s*QB\s*<\/td>/i.test(row)) continue;
    qbRows += 1;
    if (/logo_thumb_[A-Z]+\.gif/i.test(row)) rowsWithLogo += 1;
  }
  const logoTeams = (src.match(/logo_thumb_([A-Z]+)\.gif/gi) || []).length;
  const playerLinks = (src.match(/\/player\/\d+\//gi) || []).filter(
    (m) => !/\/player\/0\//.test(m),
  ).length;
  const looksLikeBlock =
    /access denied|cf-browser-verification|please enable cookies|bot detection/i.test(src);
  return {
    htmlLength: src.length,
    tableRows: rows.length,
    qbRows,
    rowsWithLogo,
    logoTeams,
    playerLinks,
    looksLikeBlock,
    hasDoctype: /<!DOCTYPE html>/i.test(src),
  };
}
