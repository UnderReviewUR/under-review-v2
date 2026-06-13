/**
 * Time common WC ur-take questions through the handler (local).
 * Usage: UR_TAKE_REQUIRE_AUTH=false node scripts/probe-ur-take-timing.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
process.env.UR_TAKE_REQUIRE_AUTH = "false";

const handler = (await import("../api/ur-take/handler.js")).default;

const CASES = [
  {
    label: "cross-group value",
    body: {
      question: "What's the best group-stage value bet right now — one pick, direct answer?",
      sportHint: "worldcup",
      structured: true,
    },
  },
  {
    label: "USA vs PAR matchup",
    body: {
      question: "Who wins USA vs PAR?",
      sportHint: "worldcup",
      structured: true,
    },
  },
  {
    label: "sneaky bets tomorrow",
    body: {
      question: "What are sneaky good bets for World Cup matches tomorrow?",
      sportHint: "worldcup",
      structured: true,
    },
  },
];

for (const c of CASES) {
  /** @type {import('http').ServerResponse} */
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(payload) {
      this.payload = payload;
    },
    end() {},
  };
  const t0 = Date.now();
  await handler(
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
      body: c.body,
    },
    res,
  );
  const ms = Date.now() - t0;
  const lean = String(res.payload?.response || "").slice(0, 80);
  console.log(JSON.stringify({ label: c.label, ms, status: res.statusCode, lean, fallback: res.payload?.fallback }));
}
