import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getUnifiedGolfBoard } from "./_golfProviders.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const view = String(req.query.view || "board").toLowerCase();

  if (view !== "board") {
    return res.status(400).json({
      error: "Invalid view",
      allowed: ["board"],
    });
  }

  try {
    const board = await getUnifiedGolfBoard({
      oddsApiKey: getEnv("ODDS_API_KEY") || "",
    });

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json(board);
  } catch (err) {
    console.error("Golf API error:", err);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
