import { config } from "dotenv";
config();
import { buildNflFastAskContext } from "../api/_nflContextFast.js";

const question =
  "I'm looking at Maye 1.5 passing TDs (NE @ SEA). Should I fade the over, take the under, or pass?";
const t0 = Date.now();
const ctx = await buildNflFastAskContext({ question });
console.log(
  JSON.stringify({
    ok: Boolean(ctx),
    buildMs: ctx?.meta?.buildMs,
    props: ctx?.propLines?.length,
    chars: ctx?.meta?.nflPromptContextChars,
    elapsed: Date.now() - t0,
  }),
);
