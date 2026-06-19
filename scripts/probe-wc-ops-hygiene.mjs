#!/usr/bin/env node
/**
 * Ops / hygiene — env presence, GOAT primary, monitoring config, prod health.
 * Does not print secret values.
 *
 * Usage: node scripts/probe-wc-ops-hygiene.mjs [prodBaseUrl]
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.production.local") });

const PROD_BASE = (process.argv[2] || "https://www.under-review.app").replace(/\/$/, "");

const { isWcGoatPrimaryEnabled, hasWcBdlApiKey } = await import("../shared/wcBdlPolicy.js");
const { isWcUrTakeV2DeliverEnabled } = await import("../shared/wcUrTakePipeline.js");

/** @type {string[]} */
const failures = [];
/** @type {string[]} */
const warnings = [];

function pass(label, detail = "") {
  console.log(`OK   ${label}${detail ? ` — ${detail}` : ""}`);
}

function warn(label, detail) {
  warnings.push(`${label}: ${detail}`);
  console.warn(`WARN ${label} — ${detail}`);
}

function fail(label, detail) {
  failures.push(`${label}: ${detail}`);
  console.error(`FAIL ${label} — ${detail}`);
}

console.log("\n=== WC ops / hygiene ===\n");

pass("BALLDONTLIE_API_KEY", hasWcBdlApiKey() ? "set locally" : "missing locally");
pass("GOAT primary", isWcGoatPrimaryEnabled() ? "enabled" : "disabled");
pass("V2 deliver default", isWcUrTakeV2DeliverEnabled({}) ? "ON" : "OFF");

const resend = Boolean(String(process.env.RESEND_API_KEY || "").trim());
const from = Boolean(
  String(process.env.AUTH_EMAIL_FROM || process.env.WC_PROPS_ALERT_FROM || "").trim(),
);
if (resend && from) {
  pass("Monitoring email", "RESEND + FROM configured locally");
} else {
  warn(
    "Monitoring email",
    `local RESEND=${resend} FROM=${from} — prod must set RESEND_API_KEY + AUTH_EMAIL_FROM for alerts`,
  );
}

const alertTo = String(process.env.WC_PROPS_ALERT_EMAIL || "").trim() || "jon.shepherd@myyahoo.com (default)";
pass("Alert recipient", alertTo.includes("@") ? "configured" : alertTo);

warn(
  "BDL key rotation",
  "Rotate BALLDONTLIE_API_KEY if it was ever shared in chat or committed; update Vercel + local .env",
);

try {
  const res = await fetch(`${PROD_BASE}/api/world-cup?view=goat&probe=1`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    fail("prod-goat-probe", `HTTP ${res.status}`);
  } else {
    const j = await res.json();
    const goatOk = j?.liveGoat?.standings?.ok && j?.liveGoat?.futures?.ok;
    pass("prod-goat-probe", `matches=${j?.currentStack?.matches?.source || "?"} goat=${goatOk ? "ok" : "partial"}`);
    if (j?.stillEspnOrScrape && isWcGoatPrimaryEnabled()) {
      warn("prod-goat-probe", "stillEspnOrScrape true on prod — verify GOAT env on Vercel");
    }
  }
} catch (err) {
  fail("prod-goat-probe", err instanceof Error ? err.message : String(err));
}

console.log(`\n=== OPS ${failures.length ? "FAILED" : "PASSED"} (${warnings.length} warnings) ===\n`);
if (warnings.length) {
  for (const w of warnings) console.warn(`  • ${w}`);
}
if (failures.length) {
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
