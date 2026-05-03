#!/usr/bin/env node
/**
 * Audit Stripe for customers with multiple successful charges within a short window (possible duplicate checkouts).
 *
 * Usage (from repo root, with .env containing STRIPE_SECRET_KEY):
 *   node scripts/stripe-duplicate-audit.mjs
 *
 * Does not refund automatically — prints rows for manual review / refunds in Stripe Dashboard.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const WINDOW_MS = 12 * 60 * 1000;
const LOOKBACK_DAYS = 14;

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-04-10" });

function pairsClose(a, b) {
  return Math.abs(a.created - b.created) * 1000 <= WINDOW_MS;
}

async function main() {
  const since = Math.floor((Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000);
  const byCustomer = new Map();

  let startingAfter;
  for (;;) {
    const page = await stripe.paymentIntents.list({
      created: { gte: since },
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const pi of page.data) {
      if (pi.status !== "succeeded" || typeof pi.customer !== "string") continue;
      const list = byCustomer.get(pi.customer) || [];
      list.push(pi);
      byCustomer.set(pi.customer, list);
    }
    if (!page.has_more || !page.data.length) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  const suspects = [];
  for (const [customerId, pis] of byCustomer) {
    if (pis.length < 2) continue;
    const sorted = [...pis].sort((x, y) => x.created - y.created);
    for (let i = 1; i < sorted.length; i++) {
      if (pairsClose(sorted[i - 1], sorted[i])) {
        suspects.push({ customerId, a: sorted[i - 1], b: sorted[i] });
        break;
      }
    }
  }

  console.log(
    `Stripe duplicate-payment audit (${LOOKBACK_DAYS}d window, pairs within ${WINDOW_MS / 60000} min)\n`,
  );
  if (!suspects.length) {
    console.log("No close pairs of succeeded PaymentIntents found.");
    return;
  }

  for (const row of suspects) {
    let email = "";
    try {
      const c = await stripe.customers.retrieve(row.customerId);
      email = c.email || "";
    } catch {
      email = "(unknown)";
    }
    console.log("---");
    console.log("customer:", row.customerId, "email:", email);
    console.log("  PI", row.a.id, new Date(row.a.created * 1000).toISOString(), row.a.amount / 100, row.a.currency);
    console.log("  PI", row.b.id, new Date(row.b.created * 1000).toISOString(), row.b.amount / 100, row.b.currency);
    console.log("  Action: ensure Pro access; refund duplicate in Stripe if appropriate.");
  }
}

main().catch((e) => {
  if (e?.code === "api_key_expired" || e?.type === "StripeAuthenticationError") {
    console.error(
      "Stripe rejected the API key (expired or invalid). Update STRIPE_SECRET_KEY in .env and run again.",
    );
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});
