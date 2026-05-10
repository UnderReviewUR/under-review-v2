import { applyCors } from "./_cors.js";
import { ACCESS_TOKEN_SECRET_MISSING_MESSAGE } from "./_env.js";
import {
  aggregatePublicLedgerStats,
  buildPerformanceSnapshot,
  gradeAndGetTakesForUser,
} from "./_takeLedger.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;

  if (req.method === "GET") {
    try {
      const agg = await aggregatePublicLedgerStats();
      if (!agg) return res.status(204).end();
      return res.status(200).json({
        totalTakes: agg.totalTakes,
        highConfidenceWinRate: agg.highConfidenceWinRate,
      });
    } catch (err) {
      console.warn("[performance GET]", err?.message || err);
      return res.status(500).json({ error: "internal" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Missing or invalid email" });
  }

  if (shouldRequireUrTakeAuth()) {
    const auth = verifyBearerForUrTake(req.headers.authorization);
    if (!auth.ok) {
      if (auth.reason === "server_misconfigured") {
        return res.status(503).json({
          error: "server_misconfigured",
          response: ACCESS_TOKEN_SECRET_MISSING_MESSAGE,
        });
      }
      return res.status(401).json({ error: auth.reason || "unauthorized" });
    }
    if (auth.email && auth.email !== email) {
      return res.status(403).json({ error: "Email does not match token" });
    }
    if (
      !auth.email &&
      auth.tier !== "owner" &&
      auth.tier !== "friend"
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  try {
    const takes = await gradeAndGetTakesForUser(email);
    const snapshot = buildPerformanceSnapshot(takes);
    return res.status(200).json(snapshot);
  } catch (err) {
    console.error("Performance API error:", err);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
