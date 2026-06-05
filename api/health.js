// GET /api/health — lightweight deploy check (no secrets leaked).
import { applyCors, applyApiNoStoreHeaders } from "./_cors.js";
import { isAccessTokenSecretConfigured } from "./_env.js";
import { allowMethods } from "../shared/methodGuard.js";

export default function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;
  applyApiNoStoreHeaders(res);

  if (!allowMethods(req, res, ["GET"])) return;

  return res.status(200).json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    accessTokenSecretConfigured: isAccessTokenSecretConfigured(),
  });
}
