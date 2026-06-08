#!/usr/bin/env node
/**
 * Pre-launch WC Card Contract audit — POST /api/ur-take for golden questions.
 *
 * Usage:
 *   npm run dev:api   # terminal 1
 *   node scripts/run-wc-card-contract-audit.mjs [--base http://localhost:3001]
 *
 * Requires ANTHROPIC_API_KEY in .env for live model calls.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { WC_CARD_CONTRACT_GOLDEN_CASES } from "../shared/wcCardContractGolden.fixture.js";
import { scoreWcCardContractCase } from "../shared/wcCardContractScorer.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";
import { wcCardHeadlineAnnouncesOnly } from "../shared/wcCardContractVoice.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

/** Local audit: skip bearer auth unless explicitly required. */
if (process.env.UR_TAKE_REQUIRE_AUTH == null) {
  process.env.UR_TAKE_REQUIRE_AUTH = "false";
}

const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : process.env.WARM_BASE_URL || "http://localhost:3001";

const PRIOR_TURN = {
  role: "user",
  content: "Is Brazil mispriced to win the World Cup at +450?",
};

async function askUrTake(question, wcEventId) {
  const res = await fetch(`${base.replace(/\/$/, "")}/api/ur-take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      sportHint: "worldcup",
      wcEventId: wcEventId || undefined,
      history: [],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function extractStructured(data) {
  if (data?.structured && typeof data.structured === "object") return data.structured;
  return null;
}

async function main() {
  console.log(`WC Card Contract audit → ${base}/api/ur-take (${WC_CARD_CONTRACT_GOLDEN_CASES.length} cases)\n`);

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];

  for (const row of WC_CARD_CONTRACT_GOLDEN_CASES) {
    const history = row.requiresHistory ? [PRIOR_TURN] : [];
    const intentOnly = classifyWcQuestionIntent(row.question, history);
    const intentOk = intentOnly === row.expectedIntent;

    let layoutOk = null;
    let issueCodes = intentOk ? [] : ["intent_mismatch"];

    try {
      const data = await askUrTake(row.question, row.wcEventId);
      const structured = extractStructured(data);
      if (!structured) {
        layoutOk = false;
        issueCodes.push("missing_structured");
      } else {
        const scored = scoreWcCardContractCase({
          question: row.question,
          expectedIntent: row.expectedIntent,
          structured,
          wcIntent: intentOnly,
        });
        layoutOk = scored.passed;
        issueCodes = scored.issueCodes;
      }
    } catch (err) {
      layoutOk = false;
      issueCodes.push(`fetch_error:${err.message}`);
    }

    rows.push({
      id: row.id,
      intent: row.expectedIntent,
      intentOk,
      layoutOk,
      issues: issueCodes.join(", ") || "—",
    });
    const issueDetail = issueCodes.length ? `  [${issueCodes.join(", ")}]` : "";
    console.log(
      `${intentOk && layoutOk ? "PASS" : "FAIL"}  ${row.id.padEnd(22)} intent=${intentOk ? "ok" : intentOnly}  layout=${layoutOk}${issueDetail}`,
    );
  }

  const pass = rows.filter((r) => r.intentOk && r.layoutOk).length;
  console.log(`\n${pass}/${rows.length} passed`);
  process.exitCode = pass === rows.length ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
