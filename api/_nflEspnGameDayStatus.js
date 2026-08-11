import { getDurableJson, setDurableJson } from "./_durableStore.js";

const GAME_DAY_STATUS_KEY = "nfl_game_day_status";
const GAME_DAY_TTL_SECONDS = 3 * 24 * 60 * 60;

function normalizeTeam(competitor = {}) {
  return {
    id: competitor.id || null,
    abbr: competitor.team?.abbreviation || competitor.team?.shortDisplayName || null,
    name: competitor.team?.displayName || competitor.team?.name || null,
    homeAway: competitor.homeAway || null,
  };
}

function normalizeInjury(row = {}, teamAbbr = "") {
  const athlete = row.athlete || row.player || {};
  const status = row.status || row.type || row.injuryStatus || row.detail || "";
  return {
    team: teamAbbr,
    player: athlete.displayName || athlete.fullName || row.displayName || row.name || "",
    status: typeof status === "string" ? status : status?.name || status?.description || "",
    type: row.type?.description || row.type || "",
    detail: row.detail || row.description || row.shortComment || row.longComment || "",
  };
}

function normalizeSummaryInjuries(summary = {}, teams = []) {
  const out = [];
  const teamById = new Map(teams.map((team) => [String(team.id || ""), team.abbr]));
  const groups = Array.isArray(summary.injuries) ? summary.injuries : [];
  for (const group of groups) {
    const teamAbbr =
      group.team?.abbreviation || teamById.get(String(group.team?.id || "")) || group.team || "";
    const injuries = group.injuries || group.items || [];
    for (const row of injuries) out.push(normalizeInjury(row, teamAbbr));
  }
  return out.filter((row) => row.player || row.status || row.detail);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; UnderReview/1.0)" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchNflGameDayStatusSnapshot({ force = false } = {}) {
  const cached = await getDurableJson(GAME_DAY_STATUS_KEY);
  if (!force && cached?.fetchedAt && Date.now() - cached.fetchedAt < 60 * 60 * 1000) {
    return cached;
  }
  const board = await fetchJson(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100",
  );
  const events = [];
  for (const event of board.events || []) {
    const competition = event.competitions?.[0] || {};
    const teams = (competition.competitors || []).map(normalizeTeam);
    let injuries = [];
    try {
      const summary = await fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${event.id}`,
      );
      injuries = normalizeSummaryInjuries(summary, teams);
    } catch (err) {
      injuries = [{ team: "", player: "", status: "summary_unavailable", detail: err?.message || String(err) }];
    }
    events.push({
      id: event.id,
      name: event.name || event.shortName || "",
      date: event.date || null,
      status: event.status?.type?.description || event.status?.type?.name || "",
      completed: Boolean(event.status?.type?.completed),
      teams,
      injuries,
    });
  }
  const payload = {
    source: "espn_scoreboard_summary",
    fetchedAt: Date.now(),
    eventCount: events.length,
    injuryRowCount: events.reduce((sum, event) => sum + event.injuries.length, 0),
    events,
  };
  await setDurableJson(GAME_DAY_STATUS_KEY, payload, { ttlSeconds: GAME_DAY_TTL_SECONDS });
  return payload;
}

export async function readNflGameDayStatusSnapshot() {
  return getDurableJson(GAME_DAY_STATUS_KEY);
}
