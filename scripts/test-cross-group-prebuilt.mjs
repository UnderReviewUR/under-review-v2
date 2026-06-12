import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";
import {
  shouldUseWcCrossGroupValuePrebuilt,
  buildWcCrossGroupValuePrebuiltStructured,
} from "../shared/wcGroupComposition.js";
import { resolveWcTournamentSimForPrompt } from "../api/_wcTournamentSimData.js";
import { readBdlLiveFuturesFromKv } from "../api/_wcBdlData.js";
import { buildWorldCupUrTakeContext } from "../api/_wcUrTakeContext.js";

const q =
  "What's the best group-stage value bet right now — one pick, direct answer?";
const wcIntent = classifyWcQuestionIntent(q);
console.log("intent", wcIntent);
console.log("shouldPrebuilt", shouldUseWcCrossGroupValuePrebuilt(q, wcIntent));

try {
  const sim = await resolveWcTournamentSimForPrompt({
    groups: {},
    matches: [],
    question: q,
    nowMs: Date.now(),
  });
  console.log("sim ok", Boolean(sim?.simResults?.teamStats));
  const bdl = await readBdlLiveFuturesFromKv(Date.now()).catch(() => null);
  const pre = buildWcCrossGroupValuePrebuiltStructured({
    teamStats: sim?.simResults?.teamStats,
    bdlFutures: bdl,
    question: q,
  });
  console.log("pre", pre?.lean);
} catch (e) {
  console.error("early path ERR", e?.stack || e);
}

try {
  const t0 = Date.now();
  const ctx = await buildWorldCupUrTakeContext(q, { wcIntent });
  console.log("full context ok", Date.now() - t0, ctx?.phase);
} catch (e) {
  console.error("full context ERR", e?.stack || e);
}
