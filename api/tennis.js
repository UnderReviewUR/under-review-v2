export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const API_KEY = process.env.API_TENNIS_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API_TENNIS_KEY" });
    }

    const { tour = "atp" } = req.query;

    // Adjust this if your provider uses a different method or parameter names
    const url = `https://api.api-tennis.com/tennis/?method=get_fixtures&APIkey=${API_KEY}`;

    const tennisRes = await fetch(url);
    const data = await tennisRes.json();

    if (!tennisRes.ok) {
      return res.status(tennisRes.status).json(data);
    }

    // Log once so you can inspect the real response shape in Vercel logs
    console.log("API Tennis response:", JSON.stringify(data, null, 2));

    // Start by returning raw results so we can confirm it works
    return res.status(200).json(data);

  } catch (err) {
    console.error("Tennis fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch tennis data" });
  }
}
