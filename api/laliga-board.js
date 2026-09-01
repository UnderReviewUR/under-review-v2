/**
 * GET /api/laliga-board — La Liga match slate + GOAT odds/props.
 */
import { applyCors } from "./_cors.js";
import { buildLaligaLiveBoard } from "./_laligaBdl.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const q = req.query || {};
    const includeProps = q.includeProps === "1" || q.includeProps === "true" || q.props === "1";
    const dates = q.date ? [String(q.date)] : q.dates ? String(q.dates).split(",") : undefined;
    const board = await buildLaligaLiveBoard({
      season: q.season != null && q.season !== "" ? Number(q.season) : undefined,
      dates,
      includeProps,
      maxPropMatches: q.maxPropMatches ?? q.max_props ?? undefined,
    });
    res.setHeader("Cache-Control", "private, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(board);
  } catch (err) {
    console.error("[laliga-board]", err);
    return res.status(500).json({ ok: false, error: err?.message || "laliga_board_failed" });
  }
}
