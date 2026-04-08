// api/gate.js
// Tracks free-tier query usage and handles email gate.
// Free tier: 5 queries per 7-day rolling window, email required after query 1.
// Uses Vercel KV if available, falls back to in-memory (resets on cold start).
// No user accounts. Identity = email stored in localStorage.

import { applyCors } from "./_cors.js";
import crypto from "crypto";

// ── In-memory fallback (works without KV, resets on cold start) ──────────────
const memStore = new Map();

function getStore() {
  // Try Vercel KV first (if configured), else use memory
  // KV integration: npm install @vercel/kv then uncomment below
  // import { kv } from "@vercel/kv";
  // return kv;
  return null; // memory fallback
}

async function getRecord(email) {
  const key = "gate:" + email.toLowerCase().trim();
  const store = getStore();
  if (store) {
    return await store.get(key);
  }
  return memStore.get(key) || null;
}

async function setRecord(email, record) {
  const key = "gate:" + email.toLowerCase().trim();
  const store = getStore();
  if (store) {
    await store.set(key, record, { ex: 60 * 60 * 24 * 8 }); // 8 day TTL
  } else {
    memStore.set(key, record);
  }
}

const FREE_QUERIES_PER_WEEK = 5;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, email, fingerprint } = req.body || {};

  // ── action: "check" — can this user ask a question? ──────────────────────
  if (action === "check") {
    if (!email || !isValidEmail(email)) {
      return res.status(200).json({ allowed: false, reason: "email_required" });
    }

    const record = await getRecord(email) || { queries: [], emailVerified: true };
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recentQueries = (record.queries || []).filter(t => t > windowStart);

    if (recentQueries.length >= FREE_QUERIES_PER_WEEK) {
      const oldestInWindow = Math.min(...recentQueries);
      const resetsIn = Math.ceil((oldestInWindow + WINDOW_MS - now) / (1000 * 60 * 60));
      return res.status(200).json({
        allowed: false,
        reason: "limit_reached",
        used: recentQueries.length,
        limit: FREE_QUERIES_PER_WEEK,
        resetsInHours: resetsIn,
      });
    }

    return res.status(200).json({
      allowed: true,
      used: recentQueries.length,
      remaining: FREE_QUERIES_PER_WEEK - recentQueries.length,
      limit: FREE_QUERIES_PER_WEEK,
    });
  }

  // ── action: "consume" — record that a query was used ─────────────────────
  if (action === "consume") {
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const record = await getRecord(email) || { queries: [], emailVerified: true };
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recentQueries = (record.queries || []).filter(t => t > windowStart);
    recentQueries.push(now);

    await setRecord(email, { ...record, queries: recentQueries, lastSeen: now });

    return res.status(200).json({
      ok: true,
      used: recentQueries.length,
      remaining: Math.max(0, FREE_QUERIES_PER_WEEK - recentQueries.length),
    });
  }

  // ── action: "register" — save email for first-time gate ──────────────────
  if (action === "register") {
    if (!email || !isValidEmail(email)) {
      return res.status(200).json({ ok: false, error: "Invalid email" });
    }

    const existing = await getRecord(email);
    if (!existing) {
      await setRecord(email, { queries: [], emailVerified: false, registeredAt: Date.now() });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
