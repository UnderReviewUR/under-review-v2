import { applyApiNoStoreHeaders, applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  buildStaticGroupsFallback,
  enrichMatchesWithDetailMeta,
  getWcMatchDetailPayload,
  readWcGroupsFromKv,
  readWcMatchesFromKv,
  readWcOutrightsFromKv,
  scrapeAndCacheWcStandingsAndFixtures,
} from "./_wcData.js";
import {
  WC_GROUPS_TTL_SECONDS,
  WC_MATCHES_TTL_SECONDS,
} from "../shared/wc2026Constants.js";
import { attachMatchListOddsFreshness } from "../shared/wcOddsFreshness.js";

const FIFA_BASE = "https://api.balldontlie.io/fifa/worldcup/v1";
const GROUPS_TTL = WC_GROUPS_TTL_SECONDS;
const MATCHES_TTL = WC_MATCHES_TTL_SECONDS;

function buildQueryString(params = {}) {
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

async function bdlFifaFetch(endpoint, params = {}) {
  const apiKey = getEnv("BALLDONTLIE_API_KEY") || "";
  if (!apiKey) {
    return { ok: false, status: 0, data: null, error: "Missing BALLDONTLIE_API_KEY", url: null };
  }
  const query = buildQueryString(params);
  const url = `${FIFA_BASE}${endpoint}${query}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
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
  return String(row?.[`${side}_abbr`] || row?.[`${side}Abbr`] || "").trim().toUpperCase();
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

function normalizeMatchRow(row) {
  if (!row || typeof row !== "object") return null;
  const homeTeam = pickTeamAbbr(row, "home");
  const awayTeam = pickTeamAbbr(row, "away");
  const homeScore =
    row.home_score ?? row.homeScore ?? row.score_home ?? row.home_goals ?? null;
  const awayScore =
    row.away_score ?? row.awayScore ?? row.score_away ?? row.away_goals ?? null;
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

async function fetchAllMatchesBdl() {
  const rows = [];
  let cursor = null;
  let guard = 0;
  do {
    const params = cursor ? { cursor } : {};
    const res = await bdlFifaFetch("/matches", params);
    if (!res.ok) return { ok: false, error: res.error, matches: rows };
    const data = res.data;
    const batch = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.matches)
        ? data.matches
        : Array.isArray(data)
          ? data
          : [];
    for (const row of batch) {
      const m = normalizeMatchRow(row);
      if (m?.homeTeam && m?.awayTeam) rows.push(m);
    }
    cursor = data?.meta?.next_cursor ?? data?.next_cursor ?? null;
    guard += 1;
  } while (cursor && guard < 20);
  rows.sort((a, b) => (a.commenceTs || 0) - (b.commenceTs || 0));
  return { ok: true, matches: rows };
}

function normalizeGroupStandings(data) {
  const groups = {};
  const rawGroups =
    data?.groups ||
    data?.group_standings ||
    data?.data ||
    (Array.isArray(data) ? data : null);
  if (!rawGroups) return groups;

  if (Array.isArray(rawGroups)) {
    for (const g of rawGroups) {
      const letter = String(g.group || g.name || g.letter || "")
        .trim()
        .toUpperCase()
        .replace(/^GROUP\s*/i, "");
      const teams = Array.isArray(g.standings)
        ? g.standings
        : Array.isArray(g.teams)
          ? g.teams
          : [];
      if (!letter || !teams.length) continue;
      groups[letter] = teams.map((t) => ({
        team: String(t.team || t.name || t.abbreviation || t.abbr || "").trim(),
        played: Number(t.played ?? t.mp ?? t.games_played ?? 0),
        won: Number(t.won ?? t.w ?? t.win ?? 0),
        drawn: Number(t.drawn ?? t.d ?? t.draw ?? 0),
        lost: Number(t.lost ?? t.l ?? t.loss ?? 0),
        gf: Number(t.gf ?? t.goals_for ?? t.for ?? 0),
        ga: Number(t.ga ?? t.goals_against ?? t.against ?? 0),
        gd: Number(t.gd ?? t.goal_difference ?? 0),
        points: Number(t.points ?? t.pts ?? 0),
      }));
    }
    return groups;
  }

  if (typeof rawGroups === "object") {
    for (const [key, teams] of Object.entries(rawGroups)) {
      const letter = String(key).trim().toUpperCase().replace(/^GROUP\s*/i, "");
      if (!Array.isArray(teams)) continue;
      groups[letter] = teams.map((t) => ({
        team: String(t.team || t.name || t.abbreviation || "").trim(),
        played: Number(t.played ?? t.mp ?? 0),
        won: Number(t.won ?? t.w ?? 0),
        drawn: Number(t.drawn ?? t.d ?? 0),
        lost: Number(t.lost ?? t.l ?? 0),
        gf: Number(t.gf ?? t.goals_for ?? 0),
        ga: Number(t.ga ?? t.goals_against ?? 0),
        gd: Number(t.gd ?? 0),
        points: Number(t.points ?? t.pts ?? 0),
      }));
    }
  }
  return groups;
}

function buildStaticGroupsPayload() {
  return {
    groups: buildStaticGroupsFallback(),
    lastUpdated: Date.now(),
    source: "static",
    fallback: true,
  };
}

export async function getGroupsPayload() {
  const kv = await readWcGroupsFromKv(GROUPS_TTL * 1000);
  if (kv?.groups && Object.keys(kv.groups).length >= 12) {
    return {
      groups: kv.groups,
      lastUpdated: kv.lastUpdated,
      source: kv.source || "espn",
      fallback: Boolean(kv.stale),
      stale: Boolean(kv.stale),
    };
  }

  const bdlRes = await bdlFifaFetch("/group_standings");
  if (bdlRes.ok && bdlRes.data) {
    const groups = normalizeGroupStandings(bdlRes.data);
    if (Object.keys(groups).length) {
      const payload = { groups, lastUpdated: Date.now(), source: "balldontlie" };
      await setDurableJson("wc2026_groups", payload, { ttlSeconds: GROUPS_TTL });
      return payload;
    }
  }

  if (kv?.groups && Object.keys(kv.groups).length) {
    return {
      ...kv,
      fallback: true,
      error: bdlRes.error || kv.error || "stale_kv",
    };
  }

  return {
    ...buildStaticGroupsPayload(),
    error: bdlRes.error || "no_live_groups",
  };
}

export async function getMatchesPayload() {
  const kv = await readWcMatchesFromKv(MATCHES_TTL * 1000);
  if (kv?.matches?.length) {
    const matches = attachMatchListOddsFreshness(kv.matches, kv.lastUpdated);
    return {
      matches,
      lastUpdated: kv.lastUpdated,
      source: kv.source || "espn",
      fallback: Boolean(kv.stale),
      stale: Boolean(kv.stale),
      ageMinutes: kv.stale && kv.lastUpdated
        ? Math.round((Date.now() - Number(kv.lastUpdated)) / 60000)
        : 0,
    };
  }

  const bdlFetched = await fetchAllMatchesBdl();
  if (bdlFetched.ok && bdlFetched.matches.length) {
    const payload = {
      matches: bdlFetched.matches,
      lastUpdated: Date.now(),
      source: "balldontlie",
    };
    await setDurableJson("wc2026_matches", payload, { ttlSeconds: MATCHES_TTL });
    return payload;
  }

  if (kv?.matches?.length) {
    return {
      ...kv,
      fallback: true,
      error: bdlFetched.error || "stale_kv",
    };
  }

  return { matches: [], fallback: true, error: bdlFetched.error || "No match data", source: "none" };
}

export async function getOutrightsPayload() {
  const kv = await readWcOutrightsFromKv();
  if (kv?.outrights && Object.keys(kv.outrights).length) {
    return {
      outrights: kv.outrights,
      lastUpdated: kv.lastUpdated,
      source: kv.source || "espn",
      fallback: Boolean(kv.stale),
      stale: Boolean(kv.stale),
      ageMinutes: kv.freshness?.ageMinutes ?? null,
      freshness: kv.freshness ?? null,
    };
  }
  return {
    outrights: {},
    fallback: true,
    source: "none",
    stale: true,
    ageMinutes: null,
    freshness: null,
  };
}

/** Cron-only live ESPN refresh (never called from user GET handlers). */
export { scrapeAndCacheWcStandingsAndFixtures };

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

function buildContextText(groupsPayload, matchesPayload) {
  const lines = ["WORLD CUP 2026 CONTEXT:"];
  const matches = matchesPayload?.matches || [];
  const live = matches.filter((m) => isLiveStatus(m.status));
  if (live.length) {
    lines.push("LIVE NOW:");
    for (const m of live.slice(0, 8)) {
      lines.push(
        `  ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam} (${m.status})`,
      );
    }
  }
  const groups = groupsPayload?.groups || {};
  const keys = Object.keys(groups).sort();
  if (keys.length) {
    lines.push("GROUP STANDINGS (top 2 advance + 8 best 3rd place):");
    for (const g of keys) {
      const top = (groups[g] || [])
        .slice(0, 2)
        .map((t) => `${t.team}(${t.points}pts)`)
        .join(", ");
      lines.push(`  Group ${g}: ${top} leading`);
    }
  }
  const upcoming = matches.filter((m) => isScheduled(m.status)).slice(0, 3);
  if (upcoming.length) {
    lines.push("NEXT MATCHES:");
    for (const m of upcoming) {
      lines.push(
        `  ${m.homeTeam} vs ${m.awayTeam} — ${m.date} ${m.time} at ${m.stadium || m.city || "TBD"}`,
      );
    }
  }
  const text = lines.join("\n");
  return text.length > 3000 ? `${text.slice(0, 2997)}...` : text;
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    applyApiNoStoreHeaders(res);
    return res.status(405).json({ error: "Method not allowed" });
  }
  applyApiNoStoreHeaders(res);

  try {
    const view = String(req.query?.view || "matches").toLowerCase();

    if (view === "groups") {
      const payload = await getGroupsPayload();
      return res.status(200).json(payload);
    }

    if (view === "matches") {
      const payload = await getMatchesPayload();
      const matches = await enrichMatchesWithDetailMeta(payload.matches || []);
      return res.status(200).json({ ...payload, matches });
    }

    if (view === "outrights") {
      const payload = await getOutrightsPayload();
      return res.status(200).json(payload);
    }

    if (view === "upcoming") {
      const payload = await getMatchesPayload();
      const now = Date.now();
      const upcomingRaw = (payload.matches || [])
        .filter((m) => isScheduled(m.status) && (m.commenceTs == null || m.commenceTs >= now - 86400000))
        .slice(0, 8);
      const upcoming = await enrichMatchesWithDetailMeta(upcomingRaw);
      return res.status(200).json({
        upcoming,
        lastUpdated: payload.lastUpdated,
        fallback: payload.fallback,
      });
    }

    if (view === "live") {
      const payload = await getMatchesPayload();
      const liveRaw = (payload.matches || []).filter((m) => isLiveStatus(m.status));
      const live = await enrichMatchesWithDetailMeta(liveRaw);
      return res.status(200).json({
        live,
        lastUpdated: payload.lastUpdated,
        fallback: payload.fallback,
      });
    }

    if (view === "detail") {
      const eventId = req.query?.eventId ?? req.query?.id;
      const detailPayload = await getWcMatchDetailPayload(eventId);
      if (!detailPayload.ok) {
        return res.status(detailPayload.error === "missing_event_id" ? 400 : 404).json(detailPayload);
      }
      return res.status(200).json(detailPayload);
    }

    if (view === "context") {
      const [groupsPayload, matchesPayload] = await Promise.all([
        getGroupsPayload(),
        getMatchesPayload(),
      ]);
      const context = buildContextText(groupsPayload, matchesPayload);
      return res.status(200).json({ context, chars: context.length });
    }

    return res.status(400).json({
      error: "Invalid view — use groups, matches, outrights, upcoming, live, detail, or context.",
    });
  } catch (err) {
    console.error("[world-cup]", err);
    const cachedGroups = await getDurableJson("wc2026_groups");
    const cachedMatches = await getDurableJson("wc2026_matches");
    const staticGroups = buildStaticGroupsFallback();
    return res.status(200).json({
      error: "fetch_failed",
      fallback: true,
      groups:
        cachedGroups?.groups && Object.keys(cachedGroups.groups).length
          ? cachedGroups.groups
          : staticGroups,
      matches: cachedMatches?.matches || [],
    });
  }
}
