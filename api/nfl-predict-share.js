import { applyCors } from "./_cors.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

const STORE_PREFIX = "nfl_share_";
const TTL_SECONDS = 60 * 60 * 24 * 90;

function randomId6() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const a = new Uint8Array(6);
    globalThis.crypto.getRandomValues(a);
    return [...a].map((x) => chars[x % chars.length]).join("");
  }
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;

  if (req.method === "POST") {
    const picksEncoded = req.body?.picksEncoded;
    if (typeof picksEncoded !== "string" || !picksEncoded.trim()) {
      return res.status(400).json({ error: "Missing picksEncoded" });
    }
    if (picksEncoded.length > 2000) {
      return res.status(400).json({ error: "picksEncoded too long" });
    }
    let id = randomId6();
    for (let attempt = 0; attempt < 8; attempt++) {
      const existing = await getDurableJson(STORE_PREFIX + id);
      if (!existing) break;
      id = randomId6();
    }
    const payload = {
      picksEncoded: picksEncoded.trim(),
      createdAt: Date.now(),
      viewCount: 0,
    };
    await setDurableJson(STORE_PREFIX + id, payload, { ttlSeconds: TTL_SECONDS });
    return res.status(200).json({
      id,
      url: `https://under-review.app/nfl?predictor=1&share=${id}`,
    });
  }

  if (req.method === "GET") {
    const id = String(req.query?.id || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const row = await getDurableJson(STORE_PREFIX + id);
    if (!row || typeof row.picksEncoded !== "string") {
      return res.status(404).json({ error: "Not found" });
    }
    const viewCount = Number(row.viewCount || 0);
    void (async () => {
      try {
        await setDurableJson(
          STORE_PREFIX + id,
          { ...row, viewCount: viewCount + 1 },
          { ttlSeconds: TTL_SECONDS },
        );
      } catch {
        /* best-effort */
      }
    })();
    return res.status(200).json({
      picksEncoded: row.picksEncoded,
      viewCount,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
