import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
process.env.UR_TAKE_REQUIRE_AUTH = "false";

const handler = (await import("../api/ur-take.js")).default;
const question = process.argv[2] || "James Cook rush yards vs Eagles — over or under 72.5?";

let body = null;
let statusCode = 200;
const req = {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-ur-take-structured": "1",
  },
  body: { question, sportHint: "nfl", structured: true, history: [] },
};
const res = {
  status(code) {
    statusCode = code;
    return this;
  },
  setHeader() {},
  json(payload) {
    body = payload;
  },
  end() {},
};
const t0 = Date.now();
await handler(req, res);
const rec = {
  id: "cook_prop_eagles",
  label: "Same prop, Eagles (avoid PHI→NBA hijack)",
  question,
  statusCode,
  elapsedMs: Date.now() - t0,
  sport: body?.sport ?? null,
  fallback: body?.fallback ?? false,
  nflMatchupThesis: body?.nflMatchupThesis ?? null,
  nflMatchup: body?.nflMatchup ?? null,
  response: String(body?.response || ""),
  structured: body?.structured
    ? {
        callType: body.structured.callType ?? null,
        call: body.structured.call ?? null,
        lean: body.structured.lean ?? null,
        line: body.structured.line ?? null,
        edge: body.structured.edge ?? null,
        confidence: body.structured.confidence ?? null,
      }
    : null,
};
const file = path.join(root, "scripts", "_nfl-ask-live-results.json");
const prev = JSON.parse(fs.readFileSync(file, "utf8"));
prev.results.push(rec);
fs.writeFileSync(file, JSON.stringify(prev, null, 2));
console.log(
  JSON.stringify(
    {
      sport: rec.sport,
      elapsedMs: rec.elapsedMs,
      thesis: rec.nflMatchupThesis,
      head: rec.response.slice(0, 400),
    },
    null,
    2,
  ),
);
