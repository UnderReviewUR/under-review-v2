// GET /api/health — lightweight deploy check (no secrets leaked).
import { applyCors, applyApiNoStoreHeaders } from "./_cors.js";
import { isAccessTokenSecretConfigured } from "./_env.js";
import { buildWcHealthSnapshot } from "./_wcHealth.js";
import { buildNbaHealthSnapshot } from "./_nbaHealth.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  applyApiNoStoreHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const includeWc = String(req.query?.wc || "") === "1";
  const includeNba = String(req.query?.nba || "") === "1";
  let wc = null;
  let nba = null;
  if (includeWc) {
    try {
      wc = await buildWcHealthSnapshot();
    } catch (err) {
      wc = { ok: false, error: err?.message || "wc_health_failed" };
    }
  }
  if (includeNba) {
    try {
      nba = await buildNbaHealthSnapshot();
    } catch (err) {
      nba = { ok: false, error: err?.message || "nba_health_failed" };
    }
  }

  let ok = true;
  if (wc && wc.ok === false) ok = false;
  if (nba && nba.ok === false) ok = false;

  return res.status(200).json({
    ok,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    accessTokenSecretConfigured: isAccessTokenSecretConfigured(),
    wc,
    nba,
  });
}
