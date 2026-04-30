import { applyCors } from "./_cors.js";
import { deleteDurableJson } from "./_durableStore.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";

const MEMORY_PREFIX = "ur_memory_";
const TRACKER_PREFIX = "ur_tracker_";

function normalizeEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

function memoryKey(email) {
  return `${MEMORY_PREFIX}${normalizeEmail(email)}`;
}

function trackerKey(email) {
  return `${TRACKER_PREFIX}${normalizeEmail(email)}`;
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
    const type = String(body.type || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    if (!authorizeEmail(req, email)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (type !== "memory" && type !== "tracker" && type !== "all") {
      return res.status(400).json({ error: "Invalid type" });
    }

    if (type === "memory" || type === "all") {
      await deleteDurableJson(memoryKey(email));
    }
    if (type === "tracker" || type === "all") {
      await deleteDurableJson(trackerKey(email));
    }

    return res.status(200).json({ ok: true, cleared: type });
  } catch (err) {
    console.warn("[clear-memory]", err?.message || err);
    return res.status(500).json({ error: "Internal error" });
  }
}
