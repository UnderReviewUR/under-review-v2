// api/tennis-results.js
// Fetches completed Miami Open matches from the last 14 days.
// Returns a structured draw path: who beat who, round, and score.
// This is injected into the ur-take system prompt as TOURNAMENT DRAW PATH.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const API_KEY = process.env.API_TENNIS_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API_TENNIS_KEY" });
    }

    const { tour = "atp" } = req.query;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 14); // look back 14 days to capture full draw

    const formatDate = (d) => d.toISOString().split("T")[0];

    const url =
      "https://api.api-tennis.com/tennis/?method=get_fixtures" +
      "&APIkey=" + API_KEY +
      "&date_start=" + formatDate(start) +
      "&date_stop=" + formatDate(today);

    const tennisRes = await fetch(url);
    const data = await tennisRes.json();

    if (!tennisRes.ok) {
      return res.status(tennisRes.status).json(data);
    }

    const results = Array.isArray(data?.result) ? data.result : [];

    // Miami only
    const miamiOnly = results.filter((match) =>
      String(match.tournament_name || "").toLowerCase().includes("miami")
    );

    // Tour filter
    const tourFiltered = miamiOnly.filter((match) => {
      const combined = `${match.event_type_type || ""} ${match.league_name || ""}`.toLowerCase();
      if (tour === "wta") {
        return combined.includes("women") || combined.includes("wta");
      }
      return !combined.includes("women") && !combined.includes("wta");
    });

    // Only finished matches with a result
    const finished = tourFiltered.filter((match) => {
      const status = String(match.event_status || "").toLowerCase();
      const hasScore = match.event_final_result && match.event_final_result !== "-";
      return (
        (status.includes("finished") ||
          status.includes("final") ||
          status.includes("ended")) &&
        hasScore
      );
    });

    // Sort by date ascending so draw path reads chronologically
    finished.sort((a, b) => {
      const da = new Date(`${a.event_date}T${a.event_time || "00:00"}:00`);
      const db = new Date(`${b.event_date}T${b.event_time || "00:00"}:00`);
      return da - db;
    });

    // Determine winner from score
    // event_final_result format: "6-3 7-5" or "6-3 6-4 7-6" — first player is home_team
    // API-Tennis marks the winner via event_winner: "1" (home) or "2" (away)
    const transformed = finished.map((match) => {
      const p1 = match.event_first_player || "Player 1";
      const p2 = match.event_second_player || "Player 2";
      const score = match.event_final_result || "";
      const winnerCode = String(match.event_winner || "").trim();
      const winner = winnerCode === "2" ? p2 : p1; // default to p1 if ambiguous
      const loser = winner === p1 ? p2 : p1;
      const round = match.tournament_round || "Unknown Round";

      return {
        round,
        winner,
        loser,
        score,
        date: match.event_date || "",
      };
    });

    return res.status(200).json(transformed);
  } catch (err) {
    console.error("Tennis results fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch tennis results",
      details: err.message,
    });
  }
}
