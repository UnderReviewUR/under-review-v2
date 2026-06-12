/**
 * Invoke ur-take handler directly (local crash repro).
 * Usage: UR_TAKE_REQUIRE_AUTH=false node scripts/invoke-ur-take-local.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
process.env.UR_TAKE_REQUIRE_AUTH = "false";

const handler = (await import("../api/ur-take/handler.js")).default;

const question =
  "What's the best group-stage value bet right now — one pick, direct answer?";

/** @type {import('http').IncomingMessage} */
const req = {
  method: "POST",
  headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
  body: {
    question,
    sportHint: "worldcup",
    structured: true,
  },
};

/** @type {import('http').ServerResponse} */
const res = {
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader(k, v) {
    this.headers[k] = v;
  },
  json(payload) {
    console.log(
      JSON.stringify(
        {
          status: this.statusCode,
          lean: String(payload?.response || payload?.error || "").slice(0, 300),
          fallback: payload?.fallback,
          fallbackReason: payload?.fallbackReason,
          wcIntent: payload?.wcIntent,
        },
        null,
        2,
      ),
    );
  },
  end() {},
};

try {
  const t0 = Date.now();
  await handler(req, res);
  console.log("elapsedMs", Date.now() - t0);
} catch (e) {
  console.error("HANDLER THREW", e?.stack || e);
  process.exit(1);
}
