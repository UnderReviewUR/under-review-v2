// GET ?token= — verify magic link, re-check Stripe, redirect with Pro HMAC token in hash.

import { getEnv, resolveAccessTokenSecretForHandler } from "../_env.js";
import Stripe from "stripe";
import { verifyMagicTokenAndIssuePro } from "./magicLinkCore.js";

function appBaseUrl(req) {
  const env = String(getEnv("APP_BASE_URL") || "").replace(/\/$/, "");
  if (env) return env;
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
  const host =
    String(req.headers["x-forwarded-host"] || req.headers.host || "")
      .split(",")[0]
      .trim() || "localhost:5173";
  return `${proto === "http" ? "http" : "https"}://${host}`;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", appBaseUrl(req));
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  const tokenSecret = resolveAccessTokenSecretForHandler(res);
  if (tokenSecret === null) return;

  const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) return res.status(500).send("Server misconfiguration");

  const raw = req.query?.token ?? req.query?.Token;
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  const result = await verifyMagicTokenAndIssuePro(String(raw || ""), stripe, tokenSecret);
  const base = appBaseUrl(req);

  if (!result.ok) {
    return res.redirect(302, `${base}/?magic_link=invalid`);
  }

  const enc = encodeURIComponent(result.token);
  return res.redirect(302, `${base}/#ur_access_token=${enc}`);
}
