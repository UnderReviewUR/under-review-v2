import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { fetchNflRosterSnapshot } from "./_nflEspnRoster.js";

export const config = {
  api: { bodyParser: false },
};

function isAuthorizedCron(req) {
  const secret = getEnv("CRON_SECRET");
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
