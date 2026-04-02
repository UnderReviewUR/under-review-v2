// api/tennis-results.js
// Fetches completed matches from the current active tournament window.
// Returns structured draw path: winner, loser, round, score.
// Injected into ur-take system prompt as TOURNAMENT DRAW PATH.
// Tournament filter is dynamic -- reads from tennis-context ACTIVE_TOURNAMENT.

import { applyCors } from "./_cors.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  try {
    const API_KEY = process.env.API_TENNIS_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API_TENNIS_KEY" });
    }

    const { tour = "atp" } = req.query;

    // Look back 21 days to capture full tournament draws including qualifying
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 21);

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

    // Get active tournament name from context to filter results
    let tournamentKeywords = [];
    try {
      const contextRes = await fetch(
        `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/tennis-context`
      );
      if (contextRes.ok) {
        const ctx = await contextRes.json();
        const name = ctx?.currentTournament?.name || "";
        const extracted = name
          .toLowerCase()
          .split(" ")
          .filter(w => w.length > 3 && !["open", "masters", "tournament", "championships"].includes(w));
        if (extracted.length > 0) tournamentKeywords = extracted;
      }
    } catch {
      // Context fetch failed -- use hardcoded keyword above
    }

    // Filter by active tournament if we have keywords, otherwise return all
    const tournamentFiltered = tournamentKeywords.length > 0
      ? results.filter((match) => {
          const name = String(match.tournament_name || "").toLowerCase();
          return tournamentKeywords.some(kw => name.includes(kw));
        })
      : results;

    // Tour filter (ATP vs WTA)
    const tourFiltered = tournamentFiltered.filter((match) => {
      const combined = `${match.event_type_type || ""} ${match.league_name || ""}`.toLowerCase();
      if (tour === "wta") {
        return combined.includes("women") || combined.includes("wta");
      }
      return !combined.includes("women") && !combined.includes("wta");
    });

    // Only finished matches with a score
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

    // Sort chronologically so draw path reads round by round
    finished.sort((a, b) => {
      const da = new Date(`${a.event_date}T${a.event_time || "00:00"}:00`);
      const db = new Date(`${b.event_date}T${b.event_time || "00:00"}:00`);
      return da - db;
    });

    // Determine winner -- event_winner: "1" = home (first player), "2" = away
    const transformed = finished.map((match) => {
      const p1 = match.event_first_player || "Player 1";
      const p2 = match.event_second_player || "Player 2";
      const score = match.event_final_result || "";
      const winnerCode = String(match.event_winner || "").trim();
      const winner = winnerCode === "2" ? p2 : p1;
      const loser = winner === p1 ? p2 : p1;
      const round = match.tournament_round || "Unknown Round";
      return { round, winner, loser, score, date: match.event_date || "" };
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
