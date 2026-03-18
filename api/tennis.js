export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const API_KEY = process.env.API_TENNIS_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API_TENNIS_KEY" });
    }

    const { tour = "atp" } = req.query;

    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 7);

    const formatDate = (d) => d.toISOString().split("T")[0];
    const date_start = formatDate(today);
    const date_stop = formatDate(end);

    const url =
      "https://api.api-tennis.com/tennis/?method=get_fixtures" +
      "&APIkey=" + API_KEY +
      "&date_start=" + date_start +
      "&date_stop=" + date_stop;

    const tennisRes = await fetch(url);
    const data = await tennisRes.json();

    if (!tennisRes.ok) {
      return res.status(tennisRes.status).json(data);
    }

    const results = Array.isArray(data?.result) ? data.result : [];

    const miamiOnly = results.filter((match) => {
      const tournamentName = String(match.tournament_name || "").toLowerCase();
      return tournamentName.includes("miami");
    });

    const tourFiltered = miamiOnly.filter((match) => {
      const rawType = String(match.event_type_type || "").toLowerCase();
      const rawCategory = String(match.league_name || "").toLowerCase();
      const combined = `${rawType} ${rawCategory}`;

      if (tour === "wta") {
        return combined.includes("women") || combined.includes("wta");
      }

      return !combined.includes("women") && !combined.includes("wta");
    });

    const liveAndUpcoming = tourFiltered.filter((match) => {
      const status = String(match.event_status || "").toLowerCase();
      const live = String(match.event_live || "0");

      const isFinished =
        status.includes("finished") ||
        status.includes("final") ||
        status.includes("ended");

      return !isFinished || live === "1";
    });

    const transformed = liveAndUpcoming.map((match) => ({
      id: match.event_key,
      commence_time:
        match.event_date && match.event_time
          ? `${match.event_date}T${match.event_time}:00`
          : null,
      home_team: match.event_first_player || "Player 1",
      away_team: match.event_second_player || "Player 2",
      tournament: match.tournament_name || "Miami",
      round: match.tournament_round || "",
      status: match.event_status || "Scheduled",
      live: match.event_live || "0",
      score: match.event_final_result || "-",
      event_type_type: match.event_type_type || "",
      league_name: match.league_name || "",
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
