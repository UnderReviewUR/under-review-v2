export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const API_KEY = process.env.ODDS_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Missing ODDS_API_KEY" });

    const { tour = "atp" } = req.query;
    const sport = tour === "wta"
      ? "tennis_wta_miami_open"
      : "tennis_atp_miami_open";

    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us,uk,eu&markets=h2h&oddsFormat=american&apiKey=${API_KEY}`;

    const oddsRes = await fetch(url);
    const data = await oddsRes.json();

    if (!oddsRes.ok) return res.status(oddsRes.status).json(data);
    return res.status(200).json(Array.isArray(data) ? data : []);

  } catch (err) {
    console.error("Tennis fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch tennis odds" });
  }
}
