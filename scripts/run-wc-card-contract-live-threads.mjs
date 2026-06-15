#!/usr/bin/env node
/**
 * Live WC thread follow-up audit — POST /api/ur-take for golden thread cases only.
 * Exercises prebuilt fast paths (matchup explain, props explain, pivot guard) without
 * running the full 36-case LLM suite.
 *
 * Usage:
 *   npm run dev:api:audit   # terminal 1 (auth disabled for local audit)
 *   npm run audit:wc-card-contract:live:threads
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { WC_CARD_CONTRACT_THREAD_CASES } from "../shared/wcCardContractGolden.fixture.js";
import { scoreWcCardContractCase } from "../shared/wcCardContractScorer.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

if (process.env.UR_TAKE_REQUIRE_AUTH == null) {
  process.env.UR_TAKE_REQUIRE_AUTH = "false";
}

const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : process.env.WARM_BASE_URL || "http://localhost:3001";

const timeoutMs = Number(process.env.WC_LIVE_AUDIT_TIMEOUT_MS || 120000);

/**
 * @param {string} question
 * @param {string | undefined} wcEventId
 * @param {Array<unknown>} history
 */
async function askUrTake(question, wcEventId, history = []) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/ur-take`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        question,
        sportHint: "worldcup",
        wcEventId: wcEventId || undefined,
        history,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function healthCheck() {
  try {
    await fetch(base.replace(/\/$/, ""), { signal: AbortSignal.timeout(5000) });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const healthy = await healthCheck();
  if (!healthy) {
    console.error(`Dev API not reachable at ${base} — start with: npm run dev:api:audit`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `WC thread live audit → ${base}/api/ur-take (${WC_CARD_CONTRACT_THREAD_CASES.length} thread cases)\n`,
  );

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  let pass = 0;

  for (const row of WC_CARD_CONTRACT_THREAD_CASES.filter((c) => c.followUpExpect || c.routingExpect)) {
    const history = row.history || [];
    const intentOnly = classifyWcQuestionIntent(row.question, history);
    const intentOk = intentOnly === row.expectedIntent;
    /** @type {string[]} */
    const issueCodes = intentOk ? [] : ["intent_mismatch"];

    let deliveryOk = false;
    let passKind = "";
    try {
      const data = await askUrTake(row.question, row.wcEventId, history);
      passKind = String(data?.passKind || data?.meta?.passKind || "").trim();
      const structured = data?.structured;
      if (!structured || typeof structured !== "object") {
        issueCodes.push("missing_structured");
      } else {
        const scored = scoreWcCardContractCase({
          question: row.question,
          expectedIntent: row.expectedIntent,
          structured,
          wcIntent: intentOnly,
          history,
          followUpExpect: row.followUpExpect,
          routingExpect: row.routingExpect,
        });
        deliveryOk = scored.passed;
        issueCodes.push(...scored.issueCodes.filter((c) => c !== "intent_mismatch"));
      }
    } catch (err) {
      issueCodes.push(`fetch_error:${err.message}`);
    }

    const ok = intentOk && deliveryOk && issueCodes.length === 0;
    if (ok) pass += 1;
    rows.push({ id: row.id, ok, passKind, issues: issueCodes.join(", ") || "—" });
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${row.id.padEnd(32)} intent=${intentOk ? "ok" : intentOnly}  ${passKind ? `pass=${passKind}` : ""}  ${ok ? "" : issueCodes.join(", ")}`,
    );
  }

  console.log(`\n${pass}/${rows.length} thread live checks passed`);
  process.exitCode = pass === rows.length ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
