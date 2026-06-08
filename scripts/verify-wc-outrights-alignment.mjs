/**
 * Verify golden fixtures + WC context inject the same outright seed lines as readWcOutrightsFromKv.
 */
import { readWcOutrightsFromKv } from "../api/_wcData.js";
import { buildWorldCupUrTakeContext } from "../api/_wcUrTakeContext.js";
import { WC_GOLDEN_ESP_OUTRIGHT, WC_GOLDEN_NOR_OUTRIGHT } from "../shared/wcGoldenOutrightsRefs.js";
import { getGoldenEvalFixtureById } from "../shared/wcGoldenEval.fixtures.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";

const entityCase = getGoldenEvalFixtureById("entity-spain-market-delta");
const roundupCase = getGoldenEvalFixtureById("roundup-complete");

const kv = await readWcOutrightsFromKv();
const espKv = kv?.outrights?.ESP;
const norKv = kv?.outrights?.NOR;

/** @type {string[]} */
const failures = [];

if (espKv !== WC_GOLDEN_ESP_OUTRIGHT) {
  failures.push(`ESP KV (${espKv}) !== seed ref (${WC_GOLDEN_ESP_OUTRIGHT})`);
}
if (norKv !== WC_GOLDEN_NOR_OUTRIGHT) {
  failures.push(`NOR KV (${norKv}) !== seed ref (${WC_GOLDEN_NOR_OUTRIGHT})`);
}
if (!entityCase?.question.includes(WC_GOLDEN_ESP_OUTRIGHT)) {
  failures.push(`entity-spain question missing ${WC_GOLDEN_ESP_OUTRIGHT}`);
}

const entityCtx = await buildWorldCupUrTakeContext(entityCase.question, {
  wcIntent: classifyWcQuestionIntent(entityCase.question),
  requiredEntities: ["ESP"],
});
const entityBlock = String(entityCtx?.promptBlock || "");
if (!entityBlock.includes(WC_GOLDEN_ESP_OUTRIGHT)) {
  failures.push(`entity context prompt missing ${WC_GOLDEN_ESP_OUTRIGHT}`);
}

const roundupCtx = await buildWorldCupUrTakeContext(roundupCase.question, {
  wcIntent: classifyWcQuestionIntent(roundupCase.question),
});
const roundupBlock = String(roundupCtx?.promptBlock || "");
if (!roundupBlock.includes(WC_GOLDEN_ESP_OUTRIGHT)) {
  failures.push(`roundup context prompt missing ESP ${WC_GOLDEN_ESP_OUTRIGHT}`);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      kvSource: kv?.source,
      esp: { kv: espKv, seed: WC_GOLDEN_ESP_OUTRIGHT },
      nor: { kv: norKv, seed: WC_GOLDEN_NOR_OUTRIGHT },
      entityQuestion: entityCase?.question,
      failures,
    },
    null,
    2,
  ),
);

process.exit(failures.length ? 1 : 0);
