import { buildWorldCupUrTakeContext } from "../api/_wcUrTakeContext.js";

const question = "What's the best group-stage value bet right now — one pick, direct answer?";
const t0 = Date.now();
try {
  const ctx = await buildWorldCupUrTakeContext(question);
  console.log(
    JSON.stringify(
      {
        ok: true,
        ms: Date.now() - t0,
        phase: ctx?.phase,
        upcoming: ctx?.upcoming?.length,
        hasSim: Boolean(ctx?.tournamentSimBlock),
        simLen: ctx?.tournamentSimBlock?.length || 0,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error("FAIL", Date.now() - t0, e?.stack || e);
  process.exit(1);
}
