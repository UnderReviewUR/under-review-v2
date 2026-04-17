import { applyCors } from "./_cors.js";
import { buildCanonicalNflContext } from "./_nflContext.js";

export default function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const context = buildCanonicalNflContext();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(context);
  } catch (err) {
    console.error("NFL context error:", err);
    return res.status(500).json({
      error: "Failed to build NFL context",
      details: err?.message || "Unknown error",
    });
  }
}
