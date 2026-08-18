/**
 * Live NFL UR Take probe — real handler + Anthropic.
 * Usage: node scripts/_nfl-ask-live-probe.mjs
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
process.env.UR_TAKE_REQUIRE_AUTH = "false";

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error("ANTHROPIC_API_KEY missing");
  process.exit(1);
}

const { buildNflLiveBoard } = await import("../api/_nflBoard.js");
const { classifyNflGamePhase, formatNflGameStateLine } = await import("../shared/nflGameState.js");
const handler = (await import("../api/ur-take.js")).default;
const outPath = path.join(root, "scripts", "_nfl-ask-live-results.json");

async function invokeNflAsk(question) {
  /** @type {Record<string, unknown> | null} */
  let body = null;
  let statusCode = 200;
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": "0",
      "x-ur-take-structured": "1",
    },
    body: {
      question,
      sportHint: "nfl",
      structured: true,
      history: [],
    },
  };
  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      statusCode = code;
      this.statusCode = code;
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
  return { body, statusCode, elapsedMs: Date.now() - t0 };
}

function summarize(body) {
  const structured = body?.structured && typeof body.structured === "object" ? body.structured : null;
  return {
    sport: body?.sport ?? null,
    fallback: body?.fallback ?? false,
    fallbackReason: body?.fallbackReason ?? null,
    intent: body?.intent ?? null,
    nflMatchupThesis: body?.nflMatchupThesis ?? null,
    nflMatchup: body?.nflMatchup ?? null,
    response: String(body?.response || ""),
    structured: structured
      ? {
          callType: structured.callType ?? null,
          call: structured.call ?? null,
          lean: structured.lean ?? null,
          line: structured.line ?? null,
          edge: structured.edge ?? null,
          confidence: structured.confidence ?? null,
        }
      : null,
    error: body?.error ?? null,
  };
}

function flagsFor(rec) {
  const text = `${rec.response || ""} ${rec.structured?.lean || ""} ${rec.structured?.call || ""}`;
  const low = text.toLowerCase();
  /** @type {string[]} */
  const flags = [];
  if (rec.sport !== "nfl") flags.push(`sport=${rec.sport}`);
  if (rec.fallback) flags.push("fallback");
  if (!rec.structured) flags.push("no-structured");
  if (/\bnba-only|nba context|76ers\b/i.test(text) && rec.sport !== "nfl") flags.push("nba-hijack-copy");
  if (
    /\brudolph\b/i.test(text) &&
    !/unsettled|unconfirmed|placeholder|not (?:a |the )?locked/i.test(text)
  ) {
    flags.push("rudolph-as-starter");
  }
  if (/javonte williams is the assumed/i.test(text)) flags.push("assumed-williams");
  if (/what's your play here|if you want to:/i.test(text)) flags.push("bossy-menu");
  if (/buf favored at -1\.5/i.test(low) && /phi|eagles/i.test(low) && /cook|rush/i.test(low)) {
    flags.push("wrong-slate-script");
  }
  const askedPre =
    /preseason|one series|sit(?:ting|s)?|yanked|dressing|backup|3rd string|third string|roster.?bubble/i.test(
      rec.question || "",
    );
  if (
    askedPre &&
    !/preseason|limited snaps?|one series|sit(?:ting)?|backup|unsettled|not dressing|inactive|rest/i.test(text)
  ) {
    flags.push("ignored-preseason");
  }
  const phase = rec.gamePhase || rec.phaseHint || "";
  if (phase === "pregame") {
    if (/\b(halftime|already (?:live|underway|playing)|in progress|the score is)\b/i.test(text)) {
      flags.push("live-tense-on-pregame");
    }
  }
  if (phase === "live") {
    if (/\b(kickoff (?:is|at)|before kick|who(?:'s| is) dressing tonight)\b/i.test(text) && !/\blive\b/i.test(text)) {
      flags.push("pregame-tense-on-live");
    }
  }
  return flags;
}

const board = await buildNflLiveBoard({ includeProps: true, maxPropGames: 2 });
const games = Array.isArray(board?.games) ? board.games : [];
const g0 = games[0];
const g1 = games[1];
const g2 = games.find((g) => g?.awayAbbr === "DET" || g?.homeAbbr === "CIN") || games[2];

const regression = [
  {
    phase: "regression",
    id: "cook_prop_phi",
    label: "Cook vs PHI (was NBA hijack)",
    question: "James Cook rush yards vs PHI — over or under 72.5?",
  },
  {
    phase: "regression",
    id: "cook_prop_eagles",
    label: "Cook vs Eagles (slate-gap check)",
    question: "James Cook rush yards vs Eagles — over or under 72.5?",
  },
  {
    phase: "regression",
    id: "live_spread",
    label: g0 ? `Live: ${g0.awayAbbr} @ ${g0.homeAbbr}` : "Live spread fallback",
    question: g0
      ? `${g0.awayAbbr} @ ${g0.homeAbbr} — ${g0.spread?.displayLine || "spread"}${g0.total?.line != null ? ` · total ${g0.total.line}` : ""}. Side or total?`
      : "What's the sharpest preseason spread lean tonight?",
  },
  {
    phase: "regression",
    id: "ambiguous_williams",
    label: "Ambiguous last name",
    question: "Williams over 70 receiving",
  },
  {
    phase: "regression",
    id: "draft_cowboys",
    label: "Draft sim post-draft",
    question: "simulate the cowboys draft",
  },
  {
    phase: "regression",
    id: "futures_kc",
    label: "Chiefs win total",
    question: "Chiefs season win total — over or under?",
  },
];

const deep = [
  {
    phase: "deep",
    id: "live_g1",
    label: g1 ? `Live: ${g1.awayAbbr} @ ${g1.homeAbbr}` : "second slate game",
    question: g1
      ? `${g1.awayAbbr} @ ${g1.homeAbbr} — ${g1.spread?.displayLine || "spread"}${g1.total?.line != null ? ` · total ${g1.total.line}` : ""}. Side or total?`
      : "Best total on the preseason slate?",
  },
  {
    phase: "deep",
    id: "live_det_cin",
    label: g2 ? `Shared-abbrev: ${g2.awayAbbr} @ ${g2.homeAbbr}` : "DET/CIN style",
    question: g2
      ? `${g2.awayAbbr} @ ${g2.homeAbbr} — ${g2.spread?.displayLine || "spread"}. Don't route this to NBA.`
      : "DET @ CIN spread tonight?",
  },
  {
    phase: "deep",
    id: "allen_pass",
    label: "Josh Allen pass yards",
    question: "Josh Allen over 250.5 passing yards",
  },
  {
    phase: "deep",
    id: "sgp",
    label: "SGP Mahomes + Kelce",
    question: "SGP Mahomes pass yards and Kelce receiving yards",
  },
  {
    phase: "deep",
    id: "pit_qb",
    label: "PIT starter / Rudolph trap",
    question: "GB @ PIT — is the Steelers passing attack fadeable tonight?",
  },
  {
    phase: "deep",
    id: "alt_cook",
    label: "Alt vs main",
    question: "Cook alt rushing yards 95.5",
  },
  {
    phase: "deep",
    id: "anytime_td",
    label: "Anytime TD",
    question: "Saquon Barkley anytime TD this week?",
  },
  {
    phase: "deep",
    id: "best_slate",
    label: "Slate-wide lean",
    question: "What's the sharpest lean on tonight's NFL slate — one play?",
  },
];

function etDay(ms = Date.now()) {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function isTonightKick(g) {
  const phase = classifyNflGamePhase(g);
  if (phase === "live") return true;
  if (phase === "final") return false;
  const t = Number(g?.tipoffMs);
  if (!Number.isFinite(t)) return false;
  return etDay(t) === etDay();
}

const tonightGames = games.filter(isTonightKick).slice(0, 6);
const tonightBoard = tonightGames.map((g, i) => {
  const away = g.awayAbbr || "?";
  const home = g.homeAbbr || "?";
  const spread = g.spread?.displayLine || "spread";
  const total = g.total?.line != null ? String(g.total.line) : null;
  const phase = classifyNflGamePhase(g);
  return {
    phase: "tonight-board",
    id: `board_${away}_${home}`.toLowerCase(),
    label: `${away} @ ${home} · ${formatNflGameStateLine(g)}`,
    question: `${away} @ ${home} is ${formatNflGameStateLine(g)}. Posted ${spread}${total ? ` · total ${total}` : ""}. Side, total, or pass? Don't talk like this is live if it's still pregame.`,
    gamePhase: phase,
    postedSpread: spread,
    postedTotal: total,
  };
});

const denAtl = tonightGames.find((g) => g.awayAbbr === "DEN" && g.homeAbbr === "ATL");
const miaWas = tonightGames.find((g) => g.awayAbbr === "MIA" && g.homeAbbr === "WAS");
const tbNyj = tonightGames.find((g) => g.awayAbbr === "TB" && g.homeAbbr === "NYJ");
const firstTonight = tonightGames[0];
const firstSpread = firstTonight?.spread?.displayLine || "the posted spread";
const firstTotal = firstTonight?.total?.line != null ? String(firstTonight.total.line) : null;
const firstMatch = firstTonight
  ? `${firstTonight.awayAbbr} @ ${firstTonight.homeAbbr}`
  : "tonight's opener";

const tonightFan = [
  denAtl
    ? {
        phase: "tonight",
        id: "den_atl_starters",
        label: "DEN-ATL starters",
        question: `Broncos at Falcons tonight — posted ${denAtl.spread?.displayLine || "DEN -4.5"}. Are Nix and Penix even dressing, or is this backup football?`,
        gamePhase: classifyNflGamePhase(denAtl),
      }
    : null,
  miaWas
    ? {
        phase: "tonight",
        id: "mia_was_total",
        label: "MIA-WAS total",
        question: `Dolphins at Commanders tonight — total ${miaWas.total?.line ?? 36.5}. If Tua sits after a series, is the under the only number that makes sense?`,
        gamePhase: classifyNflGamePhase(miaWas),
      }
    : null,
  tbNyj
    ? {
        phase: "tonight",
        id: "tb_nyj_spread",
        label: "TB-NYJ spread",
        question: `Bucs at Jets tonight — posted ${tbNyj.spread?.displayLine || "NYJ -5.5"}. Is that just the Jets playing the backups into the second half?`,
        gamePhase: classifyNflGamePhase(tbNyj),
      }
    : null,
  {
    phase: "tonight",
    id: "starters_dress",
    label: "Are starters dressing",
    question: firstTonight
      ? `${firstMatch} is ${formatNflGameStateLine(firstTonight)}. Are the starters even dressing, or is ${firstSpread} just backup football?`
      : "Are any starters even dressing on tonight's preseason slate?",
    gamePhase: firstTonight ? classifyNflGamePhase(firstTonight) : "pregame",
  },
  {
    phase: "tonight",
    id: "one_series_under",
    label: "One series → under",
    question: firstTotal
      ? `If the starting QBs only play one series in ${firstMatch}, is the under ${firstTotal} the only number that makes sense?`
      : `If the starting QBs only play one series tonight, is the under the only number that makes sense?`,
    gamePhase: firstTonight ? classifyNflGamePhase(firstTonight) : "pregame",
  },
  {
    phase: "tonight",
    id: "bubble_td",
    label: "Roster-bubble ATD",
    question:
      "Any roster-bubble skill guy on tonight's games you'd actually take for an anytime TD if the starters sit?",
    gamePhase: "pregame",
  },
  {
    phase: "tonight",
    id: "wk1_sharp",
    label: "Is there a real side",
    question:
      "Preseason Week 1 tonight — is there a real side on this slate or is it just don't bet until the backups are in?",
    gamePhase: "pregame",
  },
].filter(Boolean);

const tonight = [...tonightBoard, ...tonightFan];

const argv = process.argv.slice(2);
const tonightOnly = argv.includes("--tonight");
const only = new Set(argv.filter((a) => !a.startsWith("-")));
const cases = [...regression, ...deep, ...tonight].filter((c) => {
  if (tonightOnly && !String(c.phase || "").startsWith("tonight")) return false;
  if (only.size && !only.has(c.id)) return false;
  return true;
});

console.log(
  JSON.stringify(
    {
      asOf: new Date().toISOString(),
      board: {
        ok: board.ok,
        source: board.source,
        seasonType: board.seasonType,
        week: board.week,
        gameCount: board.gameCount,
        propLineCount: board.propLineCount,
      },
      caseCount: cases.length,
      tonightGames: tonightGames.map((g) => ({
        match: `${g.awayAbbr} @ ${g.homeAbbr}`,
        state: formatNflGameStateLine(g),
        spread: g.spread?.displayLine || null,
        total: g.total?.line ?? null,
      })),
    },
    null,
    2,
  ),
);

/** @type {Array<Record<string, unknown>>} */
const results = [];

for (const row of cases) {
  console.log(`\n── ${row.phase}/${row.id} ──\nQ: ${row.question}`);
  try {
    const { body, statusCode, elapsedMs } = await invokeNflAsk(row.question);
    const rec = {
      ...row,
      statusCode,
      elapsedMs,
      ...summarize(body),
    };
    rec.flags = flagsFor(rec);
    results.push(rec);
    console.log(
      JSON.stringify(
        {
          id: row.id,
          sport: rec.sport,
          elapsedMs,
          structured: Boolean(rec.structured),
          call: rec.structured?.call || null,
          flags: rec.flags,
          head: rec.response.slice(0, 220),
        },
        null,
        2,
      ),
    );
  } catch (err) {
    results.push({
      ...row,
      statusCode: 0,
      elapsedMs: 0,
      error: err?.message || String(err),
      response: "",
      flags: ["threw"],
    });
    console.error("FAILED", row.id, err?.message || err);
  }
}

const payload = {
  asOf: new Date().toISOString(),
  bdlPrimary: String(process.env.NFL_BDL_PRIMARY || "") === "1",
  board: {
    source: board.source,
    seasonType: board.seasonType,
    week: board.week,
    gameCount: board.gameCount,
    propLineCount: board.propLineCount,
  },
  results,
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(
  JSON.stringify(
    {
      nfl: results.filter((r) => r.sport === "nfl").length,
      structured: results.filter((r) => r.structured).length,
      flagged: results.filter((r) => (r.flags || []).length).map((r) => ({ id: r.id, flags: r.flags })),
    },
    null,
    2,
  ),
);
