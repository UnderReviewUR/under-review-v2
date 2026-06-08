import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

process.env.UR_TAKE_REQUIRE_AUTH = "false";

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error(
    "ANTHROPIC_API_KEY missing — add it to .env in the project root or export it in your shell.",
  );
  process.exit(1);
}

import handler from "../api/ur-take.js";

const question =
  process.argv[2] ||
  "What's the best group-stage value bet right now — one pick, direct answer?";

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
          sport: body.sport,
          responseHead: String(body.response || "").slice(0, 300),
        },
        null,
        2,
      ),
    );
    process.exit(this.statusCode >= 500 ? 1 : 0);
  },
  end() {},
};

await handler(req, res);
