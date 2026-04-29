import { applyCors } from "./_cors.js";
import { fetchNflRosterSnapshot } from "./_nflEspnRoster.js";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const snap = await fetchNflRosterSnapshot();
    return res.status(200).json({
      ok: true,
      playerCount: Array.isArray(snap.players) ? snap.players.length : 0,
      fetchedAt: snap.fetchedAt,
    });
  } catch (err) {
    console.error("[nfl-roster-refresh]", err);
    return res.status(500).json({ ok: false, error: err?.message || "refresh failed" });
  }
}
