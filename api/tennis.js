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

    const { tour = "atp" } = req.query;

    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 7);

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const date_start = formatDate(today);
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

    const isWtaMatch = (match) => {
      const rawType = normalize(match.event_type_type);
      const rawCategory = normalize(match.league_name);
      const tournament = normalize(match.tournament_name);
      const combined = `${rawType} ${rawCategory} ${tournament}`;

      return (
        combined.includes("women") ||
        combined.includes("wta") ||
        combined.includes("girls")
      );
    };

    const isAtpMatch = (match) => !isWtaMatch(match);

    const matchesByTour = results.filter((match) => {
      if (tour === "wta") return isWtaMatch(match);
      return isAtpMatch(match);
    });

    const liveAndUpcoming = matchesByTour.filter((match) => {
      const status = normalize(match.event_status);
      const live = String(match.event_live || "0") === "1";

      const isFinished =
        status.includes("finished") ||
        status.includes("final") ||
        status.includes("ended") ||
        status.includes("after penalties") ||
        status.includes("retired") ||
        status.includes("walkover") ||
        status.includes("cancelled") ||
        status.includes("canceled");

      return live || !isFinished;
    });

    const withSortMeta = liveAndUpcoming.map((match) => {
      const live = String(match.event_live || "0") === "1";
      const status = String(match.event_status || "Scheduled").trim();

      let commenceTime = null;
      if (match.event_date && match.event_time) {
        commenceTime = `${match.event_date}T${match.event_time}:00`;
      } else if (match.event_date) {
        commenceTime = `${match.event_date}T00:00:00`;
      }

      const commenceTs = commenceTime ? new Date(commenceTime).getTime() : Number.MAX_SAFE_INTEGER;

      return {
        match,
        live,
        commenceTime,
        commenceTs: Number.isFinite(commenceTs) ? commenceTs : Number.MAX_SAFE_INTEGER,
        status,
      };
    });

    withSortMeta.sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return a.commenceTs - b.commenceTs;
    });

    const transformed = withSortMeta.map(({ match, live, commenceTime, status }) => ({
      id: match.event_key || `${match.event_first_player || "player1"}-${match.event_second_player || "player2"}-${match.event_date || "date"}`,
      commence_time: commenceTime,
      home_team: match.event_first_player || "Player 1",
      away_team: match.event_second_player || "Player 2",
      tournament: match.tournament_name || "Tour Match",
      round: match.tournament_round || "",
      status: live ? "Live" : status || "Scheduled",
      live: live ? "1" : String(match.event_live || "0"),
      score: match.event_final_result || match.event_game_result || "-",
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
                  name: match.event_first_player || "Player 1",
                  price: match.odd_1 || "N/A",
                },
                {
                  name: match.event_second_player || "Player 2",
                  price: match.odd_2 || "N/A",
                },
              ],
            },
          ],
        },
      ],
    }));

    return res.status(200).json(transformed);
  } catch (err) {
    console.error("Tennis fetch error:", err);

    return res.status(500).json({
      error: "Failed to fetch tennis fixtures",
      details: err.message,
    });
  }
}
