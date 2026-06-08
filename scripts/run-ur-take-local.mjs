/**
 * Local smoke for /api/ur-take handler (requires ANTHROPIC_API_KEY in env).
 * Usage: node scripts/run-ur-take-local.mjs "Who will win the Golden Boot?"
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error(
    "ANTHROPIC_API_KEY missing — add it to .env in the project root or export it in your shell.",
  );
  process.exit(1);
}

import handler from "../api/ur-take.js";

const question = process.argv[2] || "Who will win the Golden Boot?";

const req = {
  method: "POST",
  headers: { "content-length": "0" },
  body: {
    question,
    sportHint: "worldcup",
    history: [],
  },
};

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
  json(body) {
    console.log(
      JSON.stringify(
        {
          status: this.statusCode,
          fallback: body.fallback,
          fallbackReason: body.fallbackReason,
          wcIntent: body.wcIntent,
          responseHead: String(body.response || "").slice(0, 200),
        },
        null,
        2,
      ),
    );
    process.exit(body.fallback ? 1 : 0);
  },
  end() {},
};

await handler(req, res);
