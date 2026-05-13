/**
 * Fallback ATP matchups from The Odds API (paid) when BallDontLie returns nothing.
 * Maps events into the same fixture shape as `_tennisAtpBdl.bdlMatchToFixtureShape` consumers.
 */
import { getEnv } from "./_env.js";
import { logOddsApiUsage } from "./_oddsApiUsageLog.js";

const BASE = "https://api.the-odds-api.com/v4";
const REGIONS = "us,us2";
const ODDS_FORMAT = "american";
const FETCH_MS = 12000;

function logOddsUnavailable(status, scope) {
  console.warn(
    `[odds] unavailable — running without lines (${scope}${Number.isFinite(status) ? ` status=${status}` : ""})`,
  );
}

export async function fetchOddsAtpFixturesForBoard() {
  const API_KEY = getEnv("ODDS_API_KEY");
  if (!API_KEY) {
    return { ok: false, fixtures: [], reason: "no_odds_key" };
  }

  const sportKeys = ["tennis_atp_miami", "tennis_atp"];

  let events = [];
  let usedSportKey = null;

  for (const sportKey of sportKeys) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_MS);
    try {
      const url = `${BASE}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=${ODDS_FORMAT}`;
      const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      logOddsApiUsage({ label: `tennis.fetchOddsAtpFixturesForBoard.list:${sportKey}`, url, response: r });
      if (!r.ok) {
        logOddsUnavailable(r.status, `tennis fallback ${sportKey}`);
        clearTimeout(t);
        continue;
      }
      clearTimeout(t);
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        events = data;
        usedSportKey = sportKey;
        break;
      }
    } catch {
      clearTimeout(t);
      continue;
    }
  }

  if (events.length === 0) {
    return { ok: false, fixtures: [], reason: "odds_unavailable" };
  }

  const fixtures = events.map((event) => oddsEventToFixtureShape(event, usedSportKey));

  return { ok: true, fixtures };
}

function oddsEventToFixtureShape(event, sportKey) {
  const home = String(event.home_team || "").trim();
  const away = String(event.away_team || "").trim();
  const commence = event.commence_time ? String(event.commence_time) : null;
  let event_date = "";
  let event_time = "";
  if (commence) {
    const d = new Date(commence);
    if (!Number.isNaN(d.getTime())) {
      event_date = d.toISOString().slice(0, 10);
      const pad = (n) => String(n).padStart(2, "0");
      event_time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    }
  }

  return {
    event_first_player: home,
    event_second_player: away,
    tournament_name: "ATP Tour",
    tournament_round: "",
    event_date,
    event_time,
    event_status: "scheduled",
    event_live: "0",
    event_final_result: "",
    event_game_result: "",
    league_name: "ATP",
    event_type_type: "ATP Singles",
    odd_1: null,
    odd_2: null,
    source: "odds_atp",
    odds_event_id: event.id,
    bdl_match_id: null,
    bdl_tournament_surface: "",
    bdl_tournament_category: "",
    bdl_scheduled_time: commence,
    commence_iso: commence,
    odds_sport_key: sportKey || "",
  };
}
