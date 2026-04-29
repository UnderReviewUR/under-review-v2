import { applyCors } from "./_cors.js";
import { buildCanonicalNflContext } from "./_nflContext.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const context = await buildCanonicalNflContext();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(context);
  } catch (err) {
    console.error("NFL context error:", err);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
