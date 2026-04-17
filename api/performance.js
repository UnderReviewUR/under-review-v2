import { applyCors } from "./_cors.js";
import {
  buildPerformanceSnapshot,
  gradeAndGetTakesForUser,
} from "./_takeLedger.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Missing or invalid email" });
  }

  try {
    const takes = await gradeAndGetTakesForUser(email);
    const snapshot = buildPerformanceSnapshot(takes);
    return res.status(200).json(snapshot);
  } catch (err) {
    console.error("Performance API error:", err);
    return res.status(500).json({
      error: "Failed to load performance snapshot",
      details: err?.message || "Unknown error",
    });
  }
}
