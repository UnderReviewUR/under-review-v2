/**
 * GET /api/ncaaf-board — college football slate + GOAT odds/props.
 */
import { applyCors } from "./_cors.js";
import { buildNcaafLiveBoard } from "./_ncaafBdl.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const q = req.query || {};
    const includeProps = q.includeProps === "1" || q.includeProps === "true" || q.props === "1";
    const board = await buildNcaafLiveBoard({
      week: q.week != null && q.week !== "" ? Number(q.week) : undefined,
      season: q.season != null && q.season !== "" ? Number(q.season) : undefined,
      includeProps,
      maxPropGames: q.maxPropGames ?? q.max_props ?? undefined,
    });
    res.setHeader("Cache-Control", "private, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(board);
  } catch (err) {
    console.error("[ncaaf-board]", err);
    return res.status(500).json({ ok: false, error: err?.message || "ncaaf_board_failed" });
  }
}
