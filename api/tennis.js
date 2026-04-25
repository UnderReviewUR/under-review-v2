import { applyApiNoStoreHeaders, applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { fetchBdlAtpFixturesForBoard } from "./_tennisAtpBdl.js";
import { fetchOddsAtpFixturesForBoard } from "./_tennisOddsAtpFallback.js";
import { buildStaticWtaBoardRows } from "./_staticWtaBoard.js";
import { shouldRetainRecentFinishedTennisFinals } from "../shared/tennisIntent.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method !== "GET") {
    applyApiNoStoreHeaders(res);
    return res.status(405).json({ error: "Method not allowed" });
  }

  applyApiNoStoreHeaders(res);

  try {
    const BDL_KEY = getEnv("BALLDONTLIE_API_KEY");
    const ODDS_KEY = getEnv("ODDS_API_KEY");

    const { tour = "atp", activeTournament = "", intent = "board" } = req.query;

    const now = new Date();

    const start = new Date(now);
    start.setDate(start.getDate() - 4);

    const end = new Date(now);
    end.setDate(end.getDate() + 45);

    let results = [];
    let source = "none";

    if (tour === "atp") {
      if (BDL_KEY) {
        const bdl = await fetchBdlAtpFixturesForBoard({
          windowStart: start,
          windowEnd: end,
        });

        if (bdl.ok && bdl.fixtures.length > 0) {
          results = bdl.fixtures;
          source = "balldontlie_atp";
        }
      }

      if (results.length === 0 && ODDS_KEY) {
        const odds = await fetchOddsAtpFixturesForBoard();
        if (odds.ok && odds.fixtures.length > 0) {
          results = odds.fixtures;
          source = "odds_atp";
        }
      }

      if (results.length === 0 && !BDL_KEY && !ODDS_KEY) {
        return res.status(500).json({
          error:
            "No tennis feed keys configured. Set BALLDONTLIE_API_KEY (ATP draws) and/or ODDS_API_KEY (confirmed pricing matchups).",
        });
      }

      return res.status(200).json(
        normalizeTennisBoardResponse({
          results,
          source,
          tour,
          activeTournament,
          intent: String(intent || "board").toLowerCase(),
        }),
      );
    }

    if (tour === "wta") {
      results = buildStaticWtaBoardRows(activeTournament);
      source = "ur_static_wta";

      return res.status(200).json(
        normalizeTennisBoardResponse({
          results,
          source,
          tour,
          activeTournament,
          intent: String(intent || "board").toLowerCase(),
        }),
      );
    }

    return res.status(400).json({ error: "Invalid tour — use atp or wta." });
  } catch (err) {
    console.error("Tennis fetch error:", err);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}

function normalizeTennisBoardResponse({
  results,
  source,
  tour,
  activeTournament,
  intent = "board",
}) {
  const normalize = (value) => String(value || "").trim().toLowerCase();

  const isFinishedStatus = (status) => {
    const s = normalize(status);
    return (
      s.includes("finished") ||
      s.includes("final") ||
      s.includes("ended") ||
      s.includes("retired") ||
      s.includes("walkover") ||
      s.includes("defaulted") ||
      s.includes("cancelled") ||
      s.includes("canceled") ||
      s.includes("postponed")
    );
  };

  const isClearlyUpcomingOrLive = (match) => {
    const s = normalize(match.event_status);
    if (!s) return true;
    return (
      s.includes("scheduled") ||
      s.includes("not started") ||
      s.includes("not_started") ||
      s.includes("due") ||
      s.includes("in progress") ||
      s.includes("in_progress") ||
      s.includes("about to start")
    );
  };

  const isLiveMatch = (match) => {
    if (String(match.event_live || "0") === "1") return true;
    const st = normalize(match.event_status);
    return st.includes("in_progress");
  };

  const isWtaMatch = (match) => {
    const combined = [
      match.event_type_type,
      match.league_name,
      match.tournament_name,
    ]
      .map(normalize)
      .join(" ");

    return (
      combined.includes("women") ||
      combined.includes("wta") ||
      combined.includes("girls")
    );
  };

  const hasRealPlayers = (match) => {
    const p1 = String(match.event_first_player || "").trim();
    const p2 = String(match.event_second_player || "").trim();

    if (!p1 || !p2) return false;

    const badNames = new Set([
      "player 1",
      "player 2",
      "tbd",
      "unknown",
      "n/a",
      "-",
    ]);

    if (badNames.has(p1.toLowerCase()) || badNames.has(p2.toLowerCase())) {
      return false;
    }

    if (p1.toLowerCase() === p2.toLowerCase()) return false;

    return true;
  };

  const hasUsefulTournament = (match) => {
    const t = normalize(match.tournament_name);
    if (match.bdl_match_id && t === "atp tour") return true;
    return !!t && t !== "tour match" && t !== "unknown";
  };

  const parseCommenceTime = (match) => {
    if (match.commence_iso) return match.commence_iso;
    if (match.bdl_scheduled_time) return match.bdl_scheduled_time;
    if (match.event_date && match.event_time) {
      const tm = String(match.event_time || "").trim();
      const hasSeconds = /^\d{2}:\d{2}:\d{2}$/.test(tm);
      const base = hasSeconds ? tm.slice(0, 5) : tm;
      return `${match.event_date}T${base}:00`;
    }
    if (match.event_date) {
      return `${match.event_date}T12:00:00`;
    }
    return null;
  };

  const getTimestamp = (isoString) => {
    if (!isoString) return Number.MAX_SAFE_INTEGER;
    const ts = new Date(isoString).getTime();
    return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
  };

  /** Keep recently finished ATP rows so the board shows same-day finals, not only live + future. */
  const isRecentFinishedBoardMatch = (match, commence_time) => {
    if (!isFinishedStatus(match.event_status)) return false;
    let ts = commence_time ? new Date(commence_time).getTime() : NaN;
    if (!Number.isFinite(ts)) {
      const d = String(match.event_date || "").trim();
      if (d) ts = new Date(`${d}T22:30:00Z`).getTime();
    }
    if (!Number.isFinite(ts)) return false;
    const ageMs = Date.now() - ts;
    return ageMs >= 0 && ageMs < 54 * 60 * 60 * 1000;
  };

  const preferredTournamentTerms = String(activeTournament || "")
    .split(",")
    .map((term) => normalize(term))
    .filter(Boolean);

  const tournamentPriority = (match) => {
    const tournament = normalize(match.tournament_name);
    if (!tournament) return 0;

    for (const term of preferredTournamentTerms) {
      if (tournament.includes(term)) return 4;
    }

    if (tour === "wta") {
      if (
        tournament.includes("roland garros") ||
        tournament.includes("french open") ||
        tournament === "rg"
      ) {
        return 4;
      }
      if (tournament.includes("charleston")) return 4;
      if (tournament.includes("madrid")) return 4;
      if (tournament.includes("italian") || tournament.includes("rome")) return 3;
      if (tournament.includes("bogota")) return 3;
      if (tournament.includes("stuttgart")) return 3;
      if (tournament.includes("rouen")) return 2;
    } else {
      if (
        tournament.includes("roland garros") ||
        tournament.includes("french open") ||
        tournament === "rg"
      ) {
        return 4;
      }
      if (tournament.includes("monte carlo")) return 4;
      if (tournament.includes("madrid")) return 4;
      if (tournament.includes("italian") || tournament.includes("rome")) return 3;
      if (tournament.includes("barcelona")) return 3;
      if (tournament.includes("houston")) return 3;
      if (tournament.includes("marrakech")) return 2;
    }

    return 1;
  };

  const matchesByTour = results.filter((match) => {
    if (tour === "wta") return isWtaMatch(match);
    return !isWtaMatch(match);
  });

  /** Board/history surfaces may retain ~54h finals; home ingestion must not. */
  const allowRecentFinishedRetention =
    shouldRetainRecentFinishedTennisFinals(intent);

  const cleaned = matchesByTour.filter((match) => {
    if (!hasRealPlayers(match)) return false;
    if (!hasUsefulTournament(match)) return false;

    const commenceEarly = parseCommenceTime(match);
    const live = isLiveMatch(match);
    const finished = isFinishedStatus(match.event_status);
    if (live || isClearlyUpcomingOrLive(match)) return true;
    if (
      allowRecentFinishedRetention &&
      isRecentFinishedBoardMatch(match, commenceEarly)
    ) {
      return true;
    }

    return !finished;
  });

  const enriched = cleaned.map((match) => {
    const commence_time = parseCommenceTime(match);
    const commenceTs = getTimestamp(commence_time);
    const live = isLiveMatch(match);
    const priority = tournamentPriority(match);
    const finished = isFinishedStatus(match.event_status);
    const recentResult =
      !!finished && isRecentFinishedBoardMatch(match, commence_time);

    return {
      raw: match,
      commence_time,
      commenceTs,
      live,
      priority,
      recentResult,
    };
  });

  enriched.sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1;

    if (!!a.recentResult !== !!b.recentResult)
      return a.recentResult ? -1 : 1;

    if (a.priority !== b.priority) return b.priority - a.priority;

    if (a.commenceTs !== b.commenceTs) return a.commenceTs - b.commenceTs;

    const aTournament = normalize(a.raw.tournament_name);
    const bTournament = normalize(b.raw.tournament_name);
    return aTournament.localeCompare(bTournament);
  });

  const seen = new Set();

  const transformed = enriched
    .map(({ raw: match, commence_time, live }) => {
      const home = String(match.event_first_player || "").trim();
      const away = String(match.event_second_player || "").trim();
      const tournament = String(match.tournament_name || "").trim();
      const round = String(match.tournament_round || "").trim();
      const eventDate = String(match.event_date || "").trim();
      const status = live
        ? "Live"
        : String(match.event_status || "Scheduled").trim();

      const dedupeKey = [
        home.toLowerCase(),
        away.toLowerCase(),
        tournament.toLowerCase(),
        round.toLowerCase(),
        eventDate,
      ].join("|");

      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      const truth_layer = match.bdl_match_id
        ? "bdl_fixture"
        : match.odds_event_id || source === "odds_atp"
          ? "odds_market_fallback"
          : source === "balldontlie_atp"
            ? "bdl_fixture"
            : "other";

      return {
        id:
          match.bdl_match_id ||
          match.odds_event_id ||
          match.event_key ||
          `${home}-${away}-${eventDate || "date"}-${round || "round"}`,
        /** Present on real BDL rows; client uses this to reject synthetic/db fallback cards. */
        bdl_match_id:
          match.bdl_match_id != null && match.bdl_match_id !== ""
            ? match.bdl_match_id
            : null,
        odds_event_id:
          match.odds_event_id != null && match.odds_event_id !== ""
            ? match.odds_event_id
            : null,
        /** UI + pipeline: schedule truth vs market-only rows (see shared/tennisTruthPolicy.js). */
        truth_layer,
        commence_time,
        home_team: home,
        away_team: away,
        tournament,
        round,
        status,
        live: live ? "1" : "0",
        score: String(
          match.event_final_result || match.event_game_result || "-",
        ).trim(),
        event_type_type: match.event_type_type || "",
        league_name: match.league_name || "",
        event_date: match.event_date || "",
        event_time: match.event_time || "",
        odd_1: match.odd_1 || null,
        odd_2: match.odd_2 || null,
        source,
        ur_static_snapshot: !!match.ur_static_snapshot,
        ur_tournament_key: match.ur_tournament_key || "",
        bdl_tournament_surface: match.bdl_tournament_surface || "",
        bdl_tournament_category: match.bdl_tournament_category || "",
        bookmakers: [
          {
            markets: [
              {
                key: "h2h",
                outcomes: [
                  {
                    name: home,
                    price: match.odd_1 || "N/A",
                  },
                  {
                    name: away,
                    price: match.odd_2 || "N/A",
                  },
                ],
              },
            ],
          },
        ],
      };
    })
    .filter(Boolean);

  return transformed;
}
