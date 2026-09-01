import { applyCors } from "./_cors.js";
import { buildNcaafContextForAsk } from "./_ncaafContext.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const q = req.query || {};
    const ctx = await buildNcaafContextForAsk({
      question: q.q || q.question || "",
      includeLiveBoard: q.offline !== "1",
    });
    res.setHeader("Cache-Control", "private, s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json({ ok: true, ...ctx });
  } catch (err) {
    console.error("[ncaaf-context]", err);
    return res.status(500).json({ ok: false, error: err?.message || "ncaaf_context_failed" });
  }
}
