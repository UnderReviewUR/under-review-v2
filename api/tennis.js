export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const API_KEY = process.env.API_TENNIS_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API_TENNIS_KEY" });
    }export default async function handler(req, res) {
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

    // --- Known WTA players in your current Miami field ---
    // Expand this list whenever needed.
    const WTA_NAMES = new Set([
      "E. Arango",
      "O. Selekhmeteva",
      "H. Baptiste",
      "T. Maria",
      "J. Brady",
      "S. Stephens",
      "G. Ruse",
      "A. Ruzic",
      "J. Tjen",
      "Y. Putintseva",
      "D. Yastremska",
      "A. Krueger",
      "P. Badosa",
      "A. Sasnovich",
      "S. Bejlek",
      "T. Gibson",
      "D. Galfi",
      "E. Kalieva",
      "V. Golubic",
      "P. Stearns",
      "E. Jones",
      "L. Fruhvirtova",
      "A. Li",
      "K. Birrell",
      "E. Lys",
      "Y. Starodubtseva",
      "C. McNally",
      "R. Masarova",
      "A. Parks",
      "S. Kraus",
      "D. Semenistaja",
      "E. Cocciaretto",
      "S. Sierra",
      "K. Rakhimova",
      "L. Sun",
      "T. Townsend",
      "L. Tagger",
      "E. Seidel",
      "T. Valentova",
      "K. Volynets",
      "A. Zakharova",
      "A. Bondar",
      "F. Jones",
      "V. Williams"
    ]);

    function detectTour(match) {
      const p1 = match.event_first_player || "";
      const p2 = match.event_second_player || "";

      const p1IsWta = WTA_NAMES.has(p1);
      const p2IsWta = WTA_NAMES.has(p2);

      if (p1IsWta || p2IsWta) return "wta";
      return "atp";
    }

    // 1) Miami only
    const miamiOnly = results.filter((match) => {
      const tournament = String(
        match.tournament_name || match.league_name || ""
      ).toLowerCase();

      return tournament.includes("miami");
    });

    // 2) Requested tour only
    const byTour = miamiOnly.filter((match) => detectTour(match) === tour);

    // 3) Keep scheduled/live, remove obvious finished matches
    const activeMatches = byTour.filter((match) => {
      const status = String(match.event_status || "").toLowerCase();
      const live = String(match.event_live || "0");

      const isFinished =
        status.includes("finished") ||
        status.includes("final") ||
        status.includes("ended");

      return !isFinished || live === "1";
    });

    // 4) Transform for frontend
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
