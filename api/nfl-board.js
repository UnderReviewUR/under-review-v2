/**
 * Live NFL game lines + optional player props from Action Network.
 * GET /api/nfl-board
 * GET /api/nfl-board?includeProps=1
 * GET /api/nfl-board?gameId=290801
 * GET /api/nfl-board?week=1&season=2026
 */
import { applyCors } from "./_cors.js";
import { buildNflLiveBoard } from "./_nflBoard.js";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = req.query || {};
    const includeProps =
      q.includeProps === "1" ||
      q.includeProps === "true" ||
      q.props === "1" ||
      q.gameId != null ||
      q.game_id != null;

    const board = await buildNflLiveBoard({
      dateYmd: q.date || q.dateYmd || undefined,
      week: q.week != null && q.week !== "" ? q.week : undefined,
      season: q.season != null && q.season !== "" ? q.season : undefined,
      gameId: q.gameId ?? q.game_id ?? undefined,
      includeProps,
      maxPropGames: q.maxPropGames ?? q.max_props ?? undefined,
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(board);
  } catch (err) {
    console.error("[nfl-board]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "nfl_board_failed",
    });
  }
}
