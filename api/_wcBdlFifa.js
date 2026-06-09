/**
 * BallDontLie FIFA World Cup API client (GOAT tier for matches, futures, players, rosters).
 */

import { getEnv } from "./_env.js";

export const BDL_FIFA_BASE = "https://api.balldontlie.io/fifa/worldcup/v1";

/** GOAT trial: 5 requests/min — stay under limit with 13s spacing. */
export const BDL_GOAT_RATE_LIMIT_MS = 13_000;

export function buildBdlQueryString(params = {}) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * @param {string} endpoint
 * @param {Record<string, unknown>} [params]
 */
export async function bdlFifaFetch(endpoint, params = {}) {
  const apiKey = getEnv("BALLDONTLIE_API_KEY") || "";
  if (!apiKey) {
    return { ok: false, status: 0, data: null, error: "Missing BALLDONTLIE_API_KEY", url: null };
  }
  const query = buildBdlQueryString(params);
  const url = `${BDL_FIFA_BASE}${endpoint}${query}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });
    clearTimeout(timer);
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: json,
        error:
          (json && (json.error || json.message)) ||
          `FIFA BDL request failed with status ${res.status}`,
        url,
      };
    }
    return { ok: true, status: res.status, data: json, error: null, url };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || "FIFA fetch failed",
      url,
    };
  }
}

export function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} endpoint
 * @param {Record<string, unknown>} [params]
 * @param {{ maxPages?: number, delayMs?: number, perPage?: number }} [opts]
 */
export async function bdlFifaFetchPaginated(endpoint, params = {}, opts = {}) {
  const maxPages = opts.maxPages ?? 50;
  const delayMs = opts.delayMs ?? 0;
  const rows = [];
  let cursor = null;
  let page = 0;
  let lastError = null;

  do {
    if (page > 0 && delayMs > 0) {
      await sleepMs(delayMs);
    }
    const pageParams = { ...params };
    if (cursor != null) pageParams.cursor = cursor;
    if (opts.perPage) pageParams.per_page = opts.perPage;

    const res = await bdlFifaFetch(endpoint, pageParams);
    if (!res.ok) {
      lastError = res.error;
      break;
    }

    const data = res.data;
    const batch = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.matches)
        ? data.matches
        : Array.isArray(data)
          ? data
          : [];

    rows.push(...batch);
    cursor = data?.meta?.next_cursor ?? data?.next_cursor ?? null;
    page += 1;
  } while (cursor != null && page < maxPages);

  return {
    ok: !lastError || rows.length > 0,
    rows,
    pages: page,
    error: lastError,
  };
}

function pickTeamAbbr(row, side) {
  const team = row?.[side] || row?.[`${side}_team`] || row?.[`${side}Team`];
  if (typeof team === "string") return team.trim().toUpperCase();
  if (team && typeof team === "object") {
    return String(
      team.abbreviation || team.abbr || team.code || team.fifa_code || team.name || "",
    )
      .trim()
      .toUpperCase();
  }
  return String(row?.[`${side}_abbr`] || row?.[`${side}Abbr`] || "")
    .trim()
    .toUpperCase();
}

function normalizeMatchStatus(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return "NS";
  if (["live", "in_progress", "in progress", "1h", "2h", "ht", "halftime"].includes(s)) {
    return s.includes("ht") || s.includes("half") ? "HT" : "live";
  }
  if (["finished", "ft", "final", "completed", "ended"].includes(s)) return "FT";
  if (["scheduled", "not started", "ns", "upcoming", "timed"].includes(s)) return "NS";
  return raw;
}

/**
 * @param {Record<string, unknown>} row
 */
export function normalizeBdlMatchRow(row) {
  if (!row || typeof row !== "object") return null;
  const homeTeam = pickTeamAbbr(row, "home");
  const awayTeam = pickTeamAbbr(row, "away");
  const homeScore = row.home_score ?? row.homeScore ?? row.score_home ?? row.home_goals ?? null;
  const awayScore = row.away_score ?? row.awayScore ?? row.score_away ?? row.away_goals ?? null;
  const dateRaw =
    row.date || row.match_date || row.start_time || row.kickoff || row.datetime || "";
  const timeRaw = row.time || row.kickoff_time || "";
  return {
    id: row.id ?? row.match_id ?? `${homeTeam}-${awayTeam}-${dateRaw}`,
    homeTeam,
    awayTeam,
    homeScore: homeScore != null ? Number(homeScore) : null,
    awayScore: awayScore != null ? Number(awayScore) : null,
    status: normalizeMatchStatus(row.status || row.match_status || row.state),
    date: String(dateRaw).slice(0, 10),
    time: String(timeRaw || String(dateRaw).slice(11, 16) || ""),
    stadium: String(row.stadium || row.venue || row.venue_name || "").trim(),
    city: String(row.city || row.venue_city || "").trim(),
    group: String(row.group || row.group_name || row.group_letter || "")
      .trim()
      .toUpperCase()
      .replace(/^GROUP\s*/i, ""),
    round: String(row.round || row.stage || row.phase || "").trim(),
    commenceTs: Date.parse(String(dateRaw)) || null,
    odds: row.odds || undefined,
  };
}

export async function fetchAllMatchesBdl(opts = {}) {
  const paginated = await bdlFifaFetchPaginated("/matches", { "seasons[]": 2026 }, {
    maxPages: 20,
    delayMs: opts.delayMs ?? 0,
  });
  const matches = [];
  for (const row of paginated.rows) {
    const m = normalizeBdlMatchRow(row);
    if (m?.homeTeam && m?.awayTeam) matches.push(m);
  }
  matches.sort((a, b) => (a.commenceTs || 0) - (b.commenceTs || 0));
  return {
    ok: paginated.ok && matches.length > 0,
    matches,
    pages: paginated.pages,
    error: paginated.error,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function normalizeBdlPlayerRow(row) {
  if (!row || typeof row !== "object") return null;
  const id = row.id;
  const name = String(row.name || "").trim();
  if (id == null || !name) return null;
  return {
    id,
    name,
    shortName: row.short_name ? String(row.short_name).trim() : null,
    position: row.position ? String(row.position).trim() : null,
    countryCode: row.country_code ? String(row.country_code).trim().toUpperCase() : null,
    jerseyNumber: row.jersey_number != null ? String(row.jersey_number) : null,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function normalizeBdlRosterRow(row) {
  if (!row || typeof row !== "object") return null;
  const teamId = row.team_id ?? row.teamId;
  const player = normalizeBdlPlayerRow(row.player || row);
  if (teamId == null || !player) return null;
  return {
    teamId,
    seasonYear: row.season?.year ?? row.season_year ?? 2026,
    player,
  };
}
