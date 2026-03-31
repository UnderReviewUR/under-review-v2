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

    const isFinishedStatus = (status) => {
      const s = normalize(status);
      return (
        s.includes("finished") ||
        s.includes("final") ||
        s.includes("ended") ||
        s.includes("retired") ||
        s.includes("walkover") ||
        s.includes("cancelled") ||
        s.includes("canceled")
      );
    };

    const isWtaMatch = (match) => {
      const combined = [
        match.event_type_type,
        match.league_name,
        match.tournament_name,
      ]
        .map(normalize)
        .join(" ");

      return combined.includes("women") || combined.includes("wta");
    };

    const hasRealPlayers = (match) => {
      const p1 = String(match.event_first_player || "").trim();
      const p2 = String(match.event_second_player || "").trim();

      if (!p1 || !p2) return false;

      const bad = ["player 1", "player 2", "tbd", "unknown"];
      if (bad.includes(p1.toLowerCase()) || bad.includes(p2.toLowerCase())) return false;

      return true;
    };

    const hasUsefulTournament = (match) => {
      const t = String(match.tournament_name || "").trim().toLowerCase();
      return !!t && t !== "tour match";
    };

    const matchesByTour = results.filter((match) => {
      if (tour === "wta") return isWtaMatch(match);
      return !isWtaMatch(match);
    });

    const cleaned = matchesByTour.filter((match) => {
      const live = String(match.event_live || "0") === "1";
      const finished = isFinishedStatus(match.event_status);

      if (!hasRealPlayers(match)) return false;
      if (!hasUsefulTournament(match)) return false;

      return live || !finished;
    });

    const withSortMeta = cleaned.map((match) => {
      const live = String(match.event_live || "0") === "1";

      let commenceTime = null;
      if (match.event_date && match.event_time) {
        commenceTime = `${match.event_date}T${match.event_time}:00`;
      } else if (match.event_date) {
        commenceTime = `${match.event_date}T00:00:00`;
      }

      const commenceTs = commenceTime
        ? new Date(commenceTime).getTime()
        : Number.MAX_SAFE_INTEGER;

      return {
        match,
        live,
        commenceTime,
        commenceTs: Number.isFinite(commenceTs) ? commenceTs : Number.MAX_SAFE_INTEGER,
      };
    });

    withSortMeta.sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return a.commenceTs - b.commenceTs;
    });

    const transformed = withSortMeta.map(({ match, live, commenceTime }) => ({
      id:
        match.event_key ||
        `${match.event_first_player}-${match.event_second_player}-${match.event_date}`,
      commence_time: commenceTime,
      home_team: String(match.event_first_player || "").trim(),
      away_team: String(match.event_second_player || "").trim(),
      tournament: String(match.tournament_name || "").trim(),
      round: String(match.tournament_round || "").trim(),
      status: live ? "Live" : String(match.event_status || "Scheduled").trim(),
      live: live ? "1" : "0",
      score: String(match.event_final_result || match.event_game_result || "-").trim(),
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
                  name: String(match.event_first_player || "").trim(),
                  price: match.odd_1 || "N/A",
                },
                {
                  name: String(match.event_second_player || "").trim(),
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
