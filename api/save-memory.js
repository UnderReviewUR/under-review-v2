import { applyCors } from "./_cors.js";
import { saveMemoryTakeIfNotDuplicate } from "./_urTakeMemory.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";

function normalizeEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

function authorizeEmail(req, email) {
  if (!shouldRequireUrTakeAuth()) return true;
  const auth = verifyBearerForUrTake(req.headers.authorization);
  if (!auth.ok) return false;
  if (auth.email && auth.email === email) return true;
  if (!auth.email && (auth.tier === "owner" || auth.tier === "friend")) return true;
  return false;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = normalizeEmail(body.email);
    const take = body.take && typeof body.take === "object" ? body.take : null;

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    if (!take) {
      return res.status(400).json({ error: "Missing take" });
    }
    if (!authorizeEmail(req, email)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const saved = await saveMemoryTakeIfNotDuplicate(email, take);
    return res.status(200).json({ ok: true, saved });
  } catch (err) {
    console.warn("[save-memory]", err?.message || err);
    return res.status(500).json({ error: "Internal error" });
  }
}
