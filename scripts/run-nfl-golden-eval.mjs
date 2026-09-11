/**
 * NFL golden eval — groundedness gate for Ask line/prop questions.
 *
 *   node scripts/run-nfl-golden-eval.mjs                 # offline gate (default)
 *   node scripts/run-nfl-golden-eval.mjs --case ticket-five-leg-lowercase
 *   node scripts/run-nfl-golden-eval.mjs --verbose
 *   node scripts/run-nfl-golden-eval.mjs --live [--games 3]   # real GOAT soak
 *
 * Offline is deterministic and needs no key: it replays GOAT-shaped boards
 * through the real market-detect → scope → hygiene → trim → guard chain and
 * fails if a named leg never reached a live number.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const argv = process.argv.slice(2);
const args = new Set(argv);
const modeLive = args.has("--live");
const verbose = args.has("--verbose");
const flag = (name, fallback) => {
  const idx = argv.indexOf(name);
  return idx >= 0 ? String(argv[idx + 1] || "").trim() : fallback;
};
const caseFilter = flag("--case", "");
const gameLimit = Math.max(1, Number(flag("--games", "3")) || 3);

const { runNflGoldenEvalCase, summarizeNflGoldenEvalResults } = await import(
  "../shared/nflGoldenEval.js"
);
const { NFL_GOLDEN_BOARDS, nflGoldenEvalCases } = await import(
  "../shared/nflGoldenEval.fixtures.js"
);
const { resolveNflScopeTeamAbbrevSet } = await import("../api/_nflContext.js");
const { scrubNflMatchupPropLines } = await import("../api/_nflMatchupPropHygiene.js");

const deps = {
  resolveScope: (question, ctx) => resolveNflScopeTeamAbbrevSet(question, ctx),
  scrub: (props, opts) => scrubNflMatchupPropLines(props, opts),
};

function runOffline() {
  const cases = nflGoldenEvalCases(caseFilter);
  if (!cases.length) {
    console.error(caseFilter ? `No NFL golden case: ${caseFilter}` : "No NFL golden cases loaded");
    process.exit(1);
  }
  return cases.map((row) => {
    const board = NFL_GOLDEN_BOARDS[row.board];
    if (!board) {
      return { id: row.id, passed: false, issueCodes: [`missing_board:${row.board}`] };
    }
    return { mode: "offline", why: row.why || "", ...runNflGoldenEvalCase(row, board, deps) };
  });
}

/** Derive live cases from tonight's real GOAT board. */
async function runLive() {
  const { buildCanonicalNflContext } = await import("../api/_nflContext.js");
  const { getNflOddsBoard } = await import("../api/_nflOddsBoard.js").catch(() => ({}));

  let slate = [];
  try {
    const probe = await buildCanonicalNflContext({ question: "nfl slate tonight", forceFull: true });
    slate = Array.isArray(probe?.games) ? probe.games : [];
  } catch (err) {
    console.error(`live slate fetch failed: ${err?.message || err}`);
    process.exit(1);
  }
  if (!slate.length && typeof getNflOddsBoard === "function") {
    try {
      const board = await getNflOddsBoard();
      slate = Array.isArray(board?.games) ? board.games : [];
    } catch {
      /* ignore */
    }
  }
  if (!slate.length) {
    console.error("no live NFL games on the board — nothing to soak");
    process.exit(1);
  }

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];

  for (const game of slate.slice(0, gameLimit)) {
    const away = String(game?.awayAbbr || "").toUpperCase();
    const home = String(game?.homeAbbr || "").toUpperCase();
    if (!away || !home) continue;

    const question = `best player props for ${away} @ ${home} tonight?`;
    const ctx = await buildCanonicalNflContext({ question, forceFull: true });
    const board = {
      games: Array.isArray(ctx?.games) ? ctx.games : [],
      propLines: Array.isArray(ctx?.propLines) ? ctx.propLines : [],
      briefcase: ctx?.briefcase || {},
    };

    if (!board.propLines.length) {
      rows.push({
        id: `live-${away}-${home}-board`,
        mode: "live",
        passed: false,
        issueCodes: ["live_board_empty"],
        scope: [away, home],
        boardRows: 0,
      });
      continue;
    }

    const players = [...new Set(board.propLines.map((r) => String(r?.player || "")).filter(Boolean))];

    rows.push({
      mode: "live",
      ...runNflGoldenEvalCase(
        {
          id: `live-${away}-${home}-board`,
          question,
          board: "live",
          scope: [away, home],
          evidence: players.slice(0, 3),
        },
        board,
        deps,
      ),
    });

    for (const player of players.slice(0, 3)) {
      rows.push({
        mode: "live",
        ...runNflGoldenEvalCase(
          {
            id: `live-${away}-${home}-${player.replace(/\s+/g, "-").toLowerCase()}`,
            question: `${player} props tonight?`,
            board: "live",
            evidence: [player],
          },
          board,
          deps,
        ),
      });
    }
  }

  return rows;
}

const results = modeLive ? await runLive() : runOffline();
const summary = summarizeNflGoldenEvalResults(results);
const failed = results.filter((r) => !r.passed && !r.knownGap);
const knownGaps = results.filter((r) => !r.passed && r.knownGap);

console.log(
  JSON.stringify(
    {
      mode: modeLive ? "live" : "offline",
      pass: summary.pass,
      total: summary.total,
      knownGaps: knownGaps.map((r) => ({ id: r.id, issueCodes: r.issueCodes, why: r.why })),
      byCode: summary.byCode,
      failed: failed.map((r) => ({
        id: r.id,
        issueCodes: r.issueCodes,
        scope: r.scope,
        marketId: r.marketId,
        boardRows: r.boardRows,
        ...(verbose ? { call: r.call, why: r.why, text: r.text } : {}),
      })),
    },
    null,
    2,
  ),
);

process.exit(failed.length ? 1 : 0);
