export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const API_KEY = process.env.API_TENNIS_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API_TENNIS_KEY" });
    }

    const { tour = "atp", activeTournament = "charleston" } = req.query;

    const now = new Date();

    // Wider window so the current tournament does not disappear
    const start = new Date(now);
    start.setDate(start.getDate() - 2);

    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const date_start = formatDate(start);
    const date_stop = formatDate(end);

    const url =
      "https://api.api-tennis.com/tennis/?method=get_fixtures" +
      "&APIkey=" + encodeURIComponent(API_KEY) +
      "&date_start=" + encodeURIComponent(date_start) +
      "&date_stop=" + encodeURIComponent(date_stop);

    const tennisRes = await fetch(url);
    const data = await tennisRes.json();

    if (!tennisRes.ok) {
      return res.status(tennisRes.status).json(data);
    }

    const results = Array.isArray(data?.result) ? data.result : [];

    const normalize = (value) => String(value || "").trim().toLowerCase();

    const isFinishedStatus = (status) => {
      const s = normalize(status);
      return (
        s.includes("finished") ||
        s.includes("final") ||
        s.includes("ended") ||
        s.includes("retired") ||
        s.includes("walkover") ||
        s.includes("cancelled") ||
        s.includes("canceled") ||
        s.includes("postponed")
      );
    };

    const isLiveMatch = (match) => String(match.event_live || "0") === "1";

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
      return !!t && t !== "tour match" && t !== "unknown";
    };

    const parseCommenceTime = (match) => {
      if (match.event_date && match.event_time) {
        return `${match.event_date}T${match.event_time}:00`;
      }
      if (match.event_date) {
        return `${match.event_date}T00:00:00`;
      }
      return null;
    };

    const getTimestamp = (isoString) => {
      if (!isoString) return Number.MAX_SAFE_INTEGER;
      const ts = new Date(isoString).getTime();
      return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
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

      // sensible defaults for current seasonal behavior
      if (tour === "wta") {
        if (tournament.includes("charleston")) return 4;
        if (tournament.includes("bogota")) return 3;
        if (tournament.includes("stuttgart")) return 3;
        if (tournament.includes("rouen")) return 2;
      } else {
        if (tournament.includes("monte carlo")) return 4;
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

    const cleaned = matchesByTour.filter((match) => {
      if (!hasRealPlayers(match)) return false;
      if (!hasUsefulTournament(match)) return false;

      const live = isLiveMatch(match);
      const finished = isFinishedStatus(match.event_status);

      return live || !finished;
    });

    const enriched = cleaned.map((match) => {
      const commence_time = parseCommenceTime(match);
      const commenceTs = getTimestamp(commence_time);
      const live = isLiveMatch(match);
      const priority = tournamentPriority(match);

      return {
        raw: match,
        commence_time,
        commenceTs,
        live,
        priority,
      };
    });

    enriched.sort((a, b) => {
      // 1. live first
      if (a.live !== b.live) return a.live ? -1 : 1;

      // 2. active/current tournament first
      if (a.priority !== b.priority) return b.priority - a.priority;

      // 3. earliest upcoming first
      if (a.commenceTs !== b.commenceTs) return a.commenceTs - b.commenceTs;

      // 4. stable fallback
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

        return {
          id:
            match.event_key ||
            `${home}-${away}-${eventDate || "date"}-${round || "round"}`,
          commence_time,
          home_team: home,
          away_team: away,
          tournament,
          round,
          status,
          live: live ? "1" : "0",
          score: String(
            match.event_final_result || match.event_game_result || "-"
          ).trim(),
          event_type_type: match.event_type_type || "",
          league_name: match.league_name || "",
          event_date: match.event_date || "",
          event_time: match.event_time || "",
          odd_1: match.odd_1 || null,
          odd_2: match.odd_2 || null,
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

    return res.status(200).json(transformed);
  } catch (err) {
    console.error("Tennis fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch tennis fixtures",
      details: err.message,
    });
  }
}
