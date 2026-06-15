#!/usr/bin/env node
/**
 * In-process WC thread follow-up audit — invokes ur-take handler directly.
 * No HTTP server; auth disabled. Prebuilt fast paths return without live LLM.
 *
 * Usage: npm run audit:wc-card-contract:handler:threads
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { WC_CARD_CONTRACT_THREAD_CASES } from "../shared/wcCardContractGolden.fixture.js";
import { scoreWcCardContractCase } from "../shared/wcCardContractScorer.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

process.env.UR_TAKE_REQUIRE_AUTH = "false";

const handler = (await import("../api/ur-take.js")).default;

/**
 * @param {import("../shared/wcCardContractGolden.fixture.js").WcCardContractGoldenCase} row
 */
async function invokeHandler(row) {
  /** @type {Record<string, unknown> | null} */
  let body = null;
  const req = {
    method: "POST",
    headers: { "content-length": "0" },
    body: {
      question: row.question,
      sportHint: "worldcup",
      wcEventId: row.wcEventId || undefined,
      history: row.history || [],
    },
  };
  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(payload) {
      body = payload;
    },
    end() {},
  };
  await handler(req, res);
  return body;
}

async function main() {
  const cases = WC_CARD_CONTRACT_THREAD_CASES.filter((c) => c.followUpExpect || c.routingExpect);
  console.log(`WC thread handler audit (${cases.length} cases)\n`);

  let pass = 0;
  for (const row of cases) {
    const intentOnly = classifyWcQuestionIntent(row.question, row.history || []);
    const intentOk = intentOnly === row.expectedIntent;
    /** @type {string[]} */
    const issueCodes = intentOk ? [] : ["intent_mismatch"];

    let deliveryOk = false;
    let passKind = "";
    try {
      const data = await invokeHandler(row);
      passKind = String(data?.passKind || data?.meta?.passKind || "").trim();
      if (data?.fallback) {
        issueCodes.push(`fallback:${data.fallbackReason || "unknown"}`);
      }
      const structured = data?.structured;
      if (!structured || typeof structured !== "object") {
        issueCodes.push("missing_structured");
      } else {
        const scored = scoreWcCardContractCase({
          question: row.question,
          expectedIntent: row.expectedIntent,
          structured,
          wcIntent: intentOnly,
          history: row.history || [],
          followUpExpect: row.followUpExpect,
          routingExpect: row.routingExpect,
        });
        deliveryOk = scored.passed;
        issueCodes.push(...scored.issueCodes.filter((c) => c !== "intent_mismatch"));
      }
    } catch (err) {
      issueCodes.push(`handler_error:${err.message}`);
    }

    const ok = intentOk && deliveryOk && issueCodes.length === 0;
    if (ok) pass += 1;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${row.id.padEnd(32)} intent=${intentOk ? "ok" : intentOnly}  ${passKind ? `pass=${passKind}` : ""}  ${ok ? "" : issueCodes.join(", ")}`,
    );
  }

  console.log(`\n${pass}/${cases.length} handler thread checks passed`);
  process.exitCode = pass === cases.length ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
