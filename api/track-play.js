import { applyCors } from "./_cors.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";

const TRACKER_PREFIX = "ur_tracker_";
const TRACKER_TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_PLAYS = 50;
const TRACKER_SCHEMA_V = 1;

const CONFIDENCE_OK = new Set(["High", "Medium", "Speculative"]);
const RESULT_OK = new Set(["WIN", "LOSS", "PUSH", "VOID"]);

function trackerKey(email) {
  return `${TRACKER_PREFIX}${String(email || "").toLowerCase().trim()}`;
}

function normalizeEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

/** @param {unknown} data */
function normalizeTrackerPlays(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = /** @type {{ v?: unknown; plays?: unknown }} */ (data);
  if (Array.isArray(o.plays)) return o.plays;
  return [];
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
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;

  try {
    if (req.method === "GET") {
      const email = normalizeEmail(req.query?.email);
      if (!email) {
        return res.status(400).json({ error: "Missing email" });
      }
      if (!authorizeEmail(req, email)) {
        return res.status(401).json({ error: "unauthorized" });
      }
      const data = await getDurableJson(trackerKey(email));
      const plays = normalizeTrackerPlays(data);
      return res.status(200).json({ plays });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const action = String(body.action || "").trim().toLowerCase();
    const email = normalizeEmail(body.email);

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    if (!authorizeEmail(req, email)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (action === "save") {
      const play = String(body.play || "").trim();
      const sport = String(body.sport || "").trim();
      const confidence = String(body.confidence || "").trim();
      const takeText = String(body.takeText || "");

      if (!play || play.length < 1) {
        return res.status(400).json({ error: "Missing play" });
      }
      if (play.length > 300) {
        return res.status(400).json({ error: "Play too long" });
      }
      if (!sport) {
        return res.status(400).json({ error: "Missing sport" });
      }
      if (!CONFIDENCE_OK.has(confidence)) {
        return res.status(400).json({ error: "Invalid confidence" });
      }

      const playId = `play_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const key = trackerKey(email);
      const prev = await getDurableJson(key);
      const existingPlays = normalizeTrackerPlays(prev);

      const row = {
        playId,
        sport: sport.slice(0, 64),
        play: play.slice(0, 300),
        takeText: takeText.slice(0, 500),
        confidence,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        savedAt: Date.now(),
        result: null,
        resultMarkedAt: null,
      };

      const plays = [row, ...existingPlays].slice(0, MAX_PLAYS);
      await setDurableJson(
        key,
        { v: TRACKER_SCHEMA_V, plays, updatedAt: Date.now() },
        { ttlSeconds: TRACKER_TTL_SECONDS },
      );

      return res.status(200).json({ ok: true, playId });
    }

    if (action === "mark") {
      const playId = String(body.playId || "").trim();
      const result = String(body.result || "").trim().toUpperCase();
      if (!playId) {
        return res.status(400).json({ error: "Missing playId" });
      }
      if (!RESULT_OK.has(result)) {
        return res.status(400).json({ error: "Invalid result" });
      }

      const key = trackerKey(email);
      const data = await getDurableJson(key);
      const plays = [...normalizeTrackerPlays(data)];
      const idx = plays.findIndex((p) => p && String(p.playId) === playId);
      if (idx === -1) {
        return res.status(404).json({ error: "Play not found" });
      }
      plays[idx] = {
        ...plays[idx],
        result,
        resultMarkedAt: Date.now(),
      };
      await setDurableJson(
        key,
        { v: TRACKER_SCHEMA_V, plays, updatedAt: Date.now() },
        { ttlSeconds: TRACKER_TTL_SECONDS },
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.warn("[track-play]", err?.message || err);
    return res.status(500).json({ error: "Internal error" });
  }
}
