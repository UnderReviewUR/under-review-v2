#!/usr/bin/env node
/**
 * Offline WC Card Contract voice audit — no LLM.
 * Validates compact delivery + voice scorer on exemplar arguing payloads per intent.
 */
import assert from "node:assert/strict";
import { WC_CARD_CONTRACT_GOLDEN_CASES } from "../shared/wcCardContractGolden.fixture.js";
import { scoreWcCardContractCase } from "../shared/wcCardContractScorer.js";
import { wcCardHeadlineAnnouncesOnly } from "../shared/wcCardContractVoice.js";
import { buildWcCompactStructured } from "../shared/wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

/** @type {Record<string, { summary: string, deep: string, wcIntent: string }>} */
const EXEMPLARS = {
  ENTITY_PRICING: {
    wcIntent: WC_INTENT.ENTITY_PRICING,
    summary:
      "Brazil +450 is fair — books price Group I chaos. Market +450 · UR ~+480.",
    deep:
      "Group I depth caps knockout upside. Pass at +450 — no outright edge. Watch for Vinícius injury news.",
  },
  MATCHUP: {
    wcIntent: WC_INTENT.MATCHUP,
    summary:
      "France advances — Norway's run ends early. Market FRA -140 · UR agrees.",
    deep:
      "France is group Favorite with cleaner bracket. Lean France to advance. Watch for Norway's defensive form.",
  },
  STRUCTURAL: {
    wcIntent: WC_INTENT.STRUCTURAL,
    summary:
      "USA mispriced to win Group D. Market USA -180 · UR -220.",
    deep:
      "Favorite path is clean if USA wins opener. Lean USA Group D at -180. Watch Paraguay low-block variance.",
  },
  GENERAL: {
    wcIntent: WC_INTENT.GENERAL,
    summary:
      "USMNT path opens with Group D win. Sims say QF, not just R16.",
    deep:
      "Group D winner draws a Contender in R16. Lean USA deep run if they top group. Watch Paraguay upset risk.",
  },
  GOLDEN_BOOT: {
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    summary:
      "Market has Mbappé's name — France's path is what books underprice. Market +600 · UR path ~+318.",
    deep:
      "France projects six knockout games with Mbappé as primary scorer. Pass at +600 — fair favorite. Watch for lineup confirmation and shorter French run.",
  },
};

let pass = 0;
let fail = 0;

for (const row of WC_CARD_CONTRACT_GOLDEN_CASES.filter((c) => c.cardVoice === "argue")) {
  const ex = EXEMPLARS[row.expectedIntent] || EXEMPLARS.GENERAL;
  const structured = buildWcCompactStructured({
    wcIntent: ex.wcIntent,
    summary: ex.summary,
    deep: ex.deep,
  });
  const scored = scoreWcCardContractCase({
    question: row.question,
    expectedIntent: row.expectedIntent,
    structured,
    wcIntent: ex.wcIntent,
  });
  const announce = wcCardHeadlineAnnouncesOnly(structured.call);
  const voiceOnly = scored.issueCodes.filter(
    (c) =>
      c.startsWith("wc_card_") &&
      c !== "wc_card_missing_delta",
  );
  const ok = !announce && voiceOnly.length === 0;
  if (ok) pass += 1;
  else fail += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${row.id.padEnd(24)} announce=${announce}  ${ok ? "" : scored.issueCodes.join(", ")}`,
  );
  if (!ok) {
    console.log(`       call: ${structured.call?.slice(0, 90)}`);
    console.log(`       lean: ${structured.lean?.slice(0, 90)}`);
  }
}

console.log(`\n${pass}/${pass + fail} offline argue cases passed`);
process.exitCode = fail === 0 ? 0 : 1;
