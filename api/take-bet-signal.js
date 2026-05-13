import { applyCors } from "./_cors.js";
import { ACCESS_TOKEN_SECRET_MISSING_MESSAGE } from "./_env.js";
import { recordTakeBetSignal } from "./_takeLedger.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const takeId = String(req.body?.takeId || "").trim();
  const betYes = Boolean(req.body?.betYes);
  const timestamp = String(req.body?.timestamp || "").trim();

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Missing or invalid email" });
  }
  if (!takeId) {
    return res.status(400).json({ error: "Missing takeId" });
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
    if (!auth.email && auth.tier !== "owner" && auth.tier !== "friend") {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  try {
    const at = timestamp || new Date().toISOString();
    const out = await recordTakeBetSignal(email, takeId, betYes, at);
    if (!out.ok) {
      if (out.reason === "not_found") return res.status(404).json({ error: out.reason });
      if (out.reason === "already_recorded") return res.status(409).json({ error: out.reason });
      return res.status(400).json({ error: out.reason || "bad_input" });
    }
    return res.status(200).json({
      ok: true,
      betSignal: {
        betYes,
        at,
      },
    });
  } catch (err) {
    console.warn("[take-bet-signal]", err?.message || err);
    return res.status(500).json({ error: "internal" });
  }
}
