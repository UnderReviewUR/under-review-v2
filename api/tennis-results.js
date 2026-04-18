// api/tennis-results.js
// Previously pulled completed draws from api-tennis. Product now uses BallDontLie for ATP
// fixtures and static player DB + tournamentMeta for WTA context — no third-party results feed.
// Endpoint kept for compatibility; returns an empty draw path.

import { applyCors } from "./_cors.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  return res.status(200).json([]);
}
