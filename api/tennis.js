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

    const filtered = results;

    return res.status(200).json(filtered);
  } catch (err) {
    console.error("Tennis fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch tennis fixtures" });
  }
}
