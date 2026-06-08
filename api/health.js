// GET /api/health — lightweight deploy check (no secrets leaked).
import { applyCors, applyApiNoStoreHeaders } from "./_cors.js";
import { isAccessTokenSecretConfigured } from "./_env.js";
import { buildWcHealthSnapshot } from "./_wcHealth.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  applyApiNoStoreHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const includeWc = String(req.query?.wc || "") === "1";
  let wc = null;
  if (includeWc) {
    try {
      wc = await buildWcHealthSnapshot();
    } catch (err) {
      wc = { ok: false, error: err?.message || "wc_health_failed" };
    }
  }

  return res.status(200).json({
    ok: wc ? wc.ok !== false : true,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    accessTokenSecretConfigured: isAccessTokenSecretConfigured(),
    wc,
  });
}
