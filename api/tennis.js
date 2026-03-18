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

    const filtered = results.filter((match) => {
      const tournament = (match.tournament_name || "").toLowerCase();
      const status = (match.event_status || "").toLowerCase();
      const live = String(match.event_live || "0");

      const isFinished =
        status.includes("finished") ||
        status.includes("final") ||
        status.includes("ended");

      const isLiveOrUpcoming = !isFinished || live === "1";

      const isWTA =
        tournament.includes("wta") ||
        tournament.includes("women") ||
        tournament.includes("girls");

      const isATP =
        tournament.includes("atp") ||
        tournament.includes("men") ||
        tournament.includes("boys");

      if (tour === "wta") return isLiveOrUpcoming && isWTA;
      return isLiveOrUpcoming && isATP;
    });

    const transformed = filtered.map((match) => ({
      id: match.event_key,
      commence_time: match.event_date && match.event_time
        ? `${match.event_date}T${match.event_time}:00`
        : null,
      home_team: match.event_first_player,
      away_team: match.event_second_player,
      tournament: match.tournament_name,
      round: match.tournament_round,
      status: match.event_status,
      live: match.event_live,
      bookmakers: [
        {
          markets: [
            {
              key: "h2h",
              outcomes: [
                {
                  name: match.event_first_player,
                  price: match.odd_1 || "N/A",
                },
                {
                  name: match.event_second_player,
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
