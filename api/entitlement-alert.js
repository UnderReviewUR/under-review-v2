// api/entitlement-alert.js
// POST — client reports suspected payment_success → still not Pro (webhook/token lag).
// Logs server-side for Vercel / ops review; do not log full email.

import { applyCors } from "./_cors.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, source } = req.body || {};
  const domain = typeof email === "string" && email.includes("@")
    ? email.split("@")[1]
    : null;

  console.error(
    "[UR_ENTITLEMENT_DESYNC]",
    JSON.stringify({
      at: new Date().toISOString(),
      source: source || "unknown",
      emailDomain: domain,
      hasEmail: Boolean(email),
    }),
  );

  return res.status(200).json({ received: true });
}
