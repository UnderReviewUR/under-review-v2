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
    end.setDate(today.getDate() + 14);

    const formatDate = (d) => d.toISOString().split("T")[0];

    const date_start = formatDate(today);
    const date_stop = formatDate(end);

    const url =
      `https://api.api-tennis.com/tennis/?method=get_fixtures` +
      `&APIkey=${API_KEY}` +
      `&date_start=${date_start}` +
      `&date_stop=${date_stop}`;

    const tennisRes = await fetch(url);
    const data = await tennisRes.json();

    if (!tennisRes.ok) {
      return res.status(tennisRes.status).json(data);
    }

    const results = Array.isArray(data?.result) ? data.result : [];

    // 1) Separate ATP vs WTA
    const filteredByTour = results.filter((match) => {
      const tournament = String(
        match.tournament_name || match.league_name || ""
      ).toLowerCase();

      if (tour === "wta") {
        return tournament.includes("wta") || tournament.includes("women");
      }

      return !tournament.includes("wta") && !tournament.includes("women");
    });

    // 2) Keep MIAMI only
    const miamiOnly = filteredByTour.filter((match) => {
      const tournament = String(
        match.tournament_name || match.league_name || ""
      ).toLowerCase();

      return (
        tournament.includes("miami") ||
        tournament.includes("miami open") ||
        tournament.includes("atp miami") ||
        tournament.includes("wta miami")
      );
    });

    // 3) Remove clearly finished matches unless still marked live
    const activeMatches = miamiOnly.filter((match) => {
      const status = String(match.event_status || "").toLowerCase();
      const live = String(match.event_live || "0");

      const isFinished =
        status.includes("finished") ||
        status.includes("final") ||
        status.includes("ended");

      return !isFinished || live === "1";
    });

    // 4) Return fields your frontend expects
    const transformed = activeMatches.map((match) => ({
      event_key: match.event_key || null,
      event_date: match.event_date || "",
      event_time: match.event_time || "",
      event_first_player: match.event_first_player || "",
      event_second_player: match.event_second_player || "",
      tournament_name: match.tournament_name || match.league_name || "",
      tournament_round: match.tournament_round || "",
      event_status: match.event_status || "Scheduled",
      event_live: match.event_live || "0",
      event_final_result: match.event_final_result || "",
      event_game_result: match.event_game_result || "",
      event_serve: match.event_serve || null,
      event_winner: match.event_winner || "",
      event_first_player_logo: match.event_first_player_logo || "",
      event_second_player_logo: match.event_second_player_logo || "",
      odd_1: match.odd_1 || "N/A",
      odd_2: match.odd_2 || "N/A",

      // normalized fields too
      id: match.event_key || null,
      commence_time:
        match.event_date && match.event_time
          ? `${match.event_date}T${match.event_time}:00`
          : null,
      home_team: match.event_first_player || "",
      away_team: match.event_second_player || "",
      tournament: match.tournament_name || match.league_name || "",
      round: match.tournament_round || "",
      status: match.event_status || "Scheduled",
      live: match.event_live || "0",

      bookmakers: [
        {
          markets: [
            {
              key: "h2h",
              outcomes: [
                {
                  name: match.event_first_player || "",
                  price: match.odd_1 || "N/A",
                },
                {
                  name: match.event_second_player || "",
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
    return res.status(500).json({ error: "Failed to fetch tennis fixtures" });
  }
}
