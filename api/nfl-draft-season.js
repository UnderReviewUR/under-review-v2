/**
 * NFL draft season — year-aware bundle + full 257-pick order + team capital.
 *
 * Annual refresh:
 * 1. Add/regenerate api/data/nfl-draft-order-{YEAR}.json (see api/scripts/build-nfl-order-2026.mjs).
 * 2. Copy api/data/nfl-team-needs-2026.js → nfl-team-needs-{YEAR}.js and tune tags.
 * 3. Wire year in getActiveDraftBundle() and draftWindow* UTC for that class.
 * 4. Optional: NFL_DRAFT_CLASS_YEAR=2027 in env to pin the active class.
 */

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TEAM_NEEDS_2026 } from "./data/nfl-team-needs-2026.js";
import { NFL_PROSPECTS_2026 } from "./data/nfl-prospects-2026.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Maintainer: paste Round 1 official results after the draft (pick, team, player, pos). */
export const OFFICIAL_ROUND_ONE = [];

/** ISO date when OFFICIAL_ROUND_ONE was last verified against a primary source. */
export const OFFICIAL_ROUND_ONE_LAST_VERIFIED = null;

const ROUND_ONE_TRADE_NOTES = new Map([
  [10, "Giants — slot acquired from Cincinnati (pre-draft)."],
  [13, "Rams — slot acquired from Atlanta (pre-draft)."],
  [16, "Jets — slot acquired from Indianapolis (pre-draft)."],
  [20, "Cowboys — slot acquired from Green Bay (pre-draft)."],
  [24, "Browns — slot acquired from Jacksonville (pre-draft)."],
  [29, "Chiefs — slot acquired from LA Rams (pre-draft)."],
  [30, "Dolphins — slot acquired from Denver (pre-draft)."],
]);

const TRADE_DIGEST_2026 = [
  "R1: CIN→NYG (10), ATL→LAR (13), IND→NYJ (16), GB→DAL (20), JAX→CLE (24), LAR→KC (29), DEN→MIA (30).",
  "R2: WAS→HOU (38), DAL→NYJ (44), BUF→CHI (60).",
  "R3: NYJ→PHI (68), NYG→HOU (69), DAL→PIT (76), DET→JAX (81+100), PHI→MIA (87), HOU→MIA (90), SF→DAL (92), DEN→MIA (94).",
  "Treat trades as capital context; hypothetical new trades must be labeled as simulations.",
].join("\n");

let _order2026 = null;

function readOrder2026() {
  if (_order2026) return _order2026;
  const p = join(__dirname, "data", "nfl-draft-order-2026.json");
  _order2026 = JSON.parse(fs.readFileSync(p, "utf8"));
  return _order2026;
}

/** Active draft class year (April draft in calendar year Y = class Y until next cycle). */
export function inferActiveDraftClassYear(now = new Date()) {
  const env = process.env.NFL_DRAFT_CLASS_YEAR;
  if (env && /^\d{4}$/.test(String(env).trim())) return Number(String(env).trim());
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  if (m >= 6) return y + 1;
  return y;
}

function build2026Bundle({ inferredYear, bundleWarning }) {
  const order = readOrder2026();
  const orderProspectSet = new Set(
    order
      .map((row) => String(row?.player || "").trim())
      .filter(Boolean),
  );
  const anchoredProspects = NFL_PROSPECTS_2026.map((prospect) => ({
    ...prospect,
    boardStatus: orderProspectSet.has(prospect.name)
      ? "boarded"
      : "simulation_only",
  }));

  return {
    year: 2026,
    inferredYear,
    bundleWarning,
    draftWindowStartUtc: "2026-04-23T00:00:00.000Z",
    draftWindowEndUtc: "2026-04-26T08:00:00.000Z",
    event: {
      label: "2026 NFL Draft",
      location: "Pittsburgh, PA",
      round1LocalDate: "2026-04-23",
      rounds234: "2026-04-24 — 2026-04-25",
    },
    fullOrder: order,
    teamNeeds: TEAM_NEEDS_2026,
    prospects: anchoredProspects,
    boardSourceAttribution:
      "257-pick league slot order (pre–live draft). Regenerate JSON after NFL Operations / club transactions update slots.",
    tradeDigest: TRADE_DIGEST_2026,
    officialRoundOne: OFFICIAL_ROUND_ONE,
    officialRoundOneLastVerified: OFFICIAL_ROUND_ONE_LAST_VERIFIED,
  };
}

function tryLoadOrder(year) {
  const p = join(__dirname, "data", `nfl-draft-order-${year}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Bundle for UR Take / nfl-context. Falls back to 2026 order with warning until new JSON lands. */
export function getActiveDraftBundle(now = new Date()) {
  const inferred = inferActiveDraftClassYear(now);
  if (inferred === 2026) {
    return build2026Bundle({ inferredYear: 2026, bundleWarning: null });
  }
  const order = tryLoadOrder(inferred);
  if (order?.length) {
    return {
      year: inferred,
      inferredYear: inferred,
      bundleWarning: null,
      draftWindowStartUtc: `${inferred}-04-22T04:00:00.000Z`,
      draftWindowEndUtc: `${inferred}-04-26T08:00:00.000Z`,
      event: {
        label: `${inferred} NFL Draft`,
        location: "TBD — update nfl-draft-season.js",
        round1LocalDate: `${inferred}-04-24`,
        rounds234: "—",
      },
      fullOrder: order,
      teamNeeds: TEAM_NEEDS_2026,
      prospects: NFL_PROSPECTS_2026.map((prospect) => ({
        ...prospect,
        boardStatus: "simulation_only",
      })),
      boardSourceAttribution: `Slot order file nfl-draft-order-${inferred}.json — refresh team needs file for ${inferred}.`,
      tradeDigest: "Update TRADE_DIGEST for this class in nfl-draft-season.js.",
      officialRoundOne: [],
      officialRoundOneLastVerified: null,
    };
  }
  return build2026Bundle({
    inferredYear: inferred,
    bundleWarning: `No api/data/nfl-draft-order-${inferred}.json yet — using 2026 slot order as provisional.`,
  });
}

function normalizeProspectName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isKnownDraftProspect(name, bundle = getActiveDraftBundle()) {
  const target = normalizeProspectName(name);
  if (!target) return false;
  const prospectList = Array.isArray(bundle?.prospects) ? bundle.prospects : [];
  return prospectList.some((p) => normalizeProspectName(p?.name) === target);
}

export function getNflDraftPhase(now = new Date(), bundle = getActiveDraftBundle(now)) {
  const t = now.getTime();
  const start = Date.parse(bundle.draftWindowStartUtc);
  const end = Date.parse(bundle.draftWindowEndUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "pre_draft";
  if (t < start) return "pre_draft";
  if (t < end) return "during_draft";
  return "post_draft";
}

export function getNflDraftMeta(now = new Date(), bundle = getActiveDraftBundle(now)) {
  const phase = getNflDraftPhase(now, bundle);
  return {
    phase,
    draftYear: bundle.inferredYear,
    event: bundle.event,
    roundOneBoardSource: bundle.boardSourceAttribution,
    officialRoundOneCount: bundle.officialRoundOne?.length ?? 0,
    officialRoundOneLastVerified: bundle.officialRoundOneLastVerified,
    draftWindowUtc: { start: bundle.draftWindowStartUtc, end: bundle.draftWindowEndUtc },
    bundleWarning: bundle.bundleWarning || null,
  };
}

function formatRoundOneFromBundle(bundle) {
  const r1 = bundle.fullOrder.filter((p) => p.round === 1).sort((a, b) => a.overall - b.overall);
  return r1
    .map((row) => {
      const note = ROUND_ONE_TRADE_NOTES.get(row.overall);
      const extra = row.slotNote ? ` — ${row.slotNote}` : "";
      const trade = note ? ` — ${note}` : "";
      return `${row.overall}. ${row.team}${trade}${extra}`;
    })
    .join("\n");
}

function formatOfficialRoundOne(bundle) {
  const rows = bundle.officialRoundOne || [];
  if (!rows.length) return "";
  return rows
    .map((row) => {
      const p = row.player || "TBD";
      const pos = row.pos || "";
      return `${row.pick}. ${row.team} — ${p}${pos ? ` (${pos})` : ""}`;
    })
    .join("\n");
}

export function buildNflDraftBoardBlock(meta = getNflDraftMeta(), bundle = getActiveDraftBundle()) {
  const phaseLabel =
    meta.phase === "pre_draft"
      ? "PRE-DRAFT (slot order before live selections)"
      : meta.phase === "during_draft"
        ? "LIVE DRAFT WINDOW"
        : "POST-DRAFT";

  const official = formatOfficialRoundOne(bundle);
  const officialSection = official
    ? `OFFICIAL ROUND 1 PICKS (synced — grades must use this list):\n${official}`
    : meta.phase === "post_draft"
      ? "OFFICIAL ROUND 1 PICKS: not loaded in this board — do not invent selections; invite user to paste picks."
      : "";

  const warn = meta.bundleWarning ? `BUNDLE WARNING: ${meta.bundleWarning}\n` : "";

  return [
    warn + "NFL DRAFT BOARD (Under Review bundle — not a live war room feed)",
    `Active draft class year: ${bundle.inferredYear} (data file year ${bundle.year})`,
    `Phase: ${phaseLabel}`,
    `Meta: ${JSON.stringify({
      event: meta.event,
      phase: meta.phase,
      roundOneBoardSource: meta.roundOneBoardSource,
      officialRoundOneCount: meta.officialRoundOneCount,
      officialRoundOneLastVerified: meta.officialRoundOneLastVerified,
      bundleWarning: meta.bundleWarning,
    })}`,
    "ROUND 1 SLOT ORDER (cite overall # + team exactly):",
    formatRoundOneFromBundle(bundle),
    `FULL DRAFT LENGTH: ${bundle.fullOrder.length} slots (Rounds 1–7 incl. comp/JC2A flags in JSON).`,
    "PRE-DRAFT TRADE DIGEST (capital levers — not future picks):",
    bundle.tradeDigest,
    officialSection,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Order matters: more specific / collision-prone pairs first (NYJ before NYG, LAC before LAR). */
const TEAM_RESOLVERS = [
  ["New York Jets", /\b(nyj|jets|new\s+york\s+jets|ny\s+jets)\b/i],
  ["New York Giants", /\b(nyg|new\s+york\s+giants|ny\s+giants)\b/i],
  ["Los Angeles Chargers", /\b(lac|los\s+angeles\s+chargers|la\s+chargers|chargers)\b/i],
  ["Los Angeles Rams", /\b(lar|los\s+angeles\s+rams|la\s+rams|rams)\b/i],
  ["San Francisco 49ers", /\b(sfo|san\s+francisco\s+49ers|forty\s+niners|niners|49ers)\b/i],
  ["Tampa Bay Buccaneers", /\b(tbb|tampa\s+bay|buccaneers|bucs)\b/i],
  ["New England Patriots", /\b(ne|new\s+england|patriots|pats)\b/i],
  ["Kansas City Chiefs", /\b(kc|kansas\s+city|chiefs)\b/i],
  ["Green Bay Packers", /\b(gb|green\s+bay|packers)\b/i],
  ["Las Vegas Raiders", /\b(lv|las\s+vegas|raiders)\b/i],
  ["Washington Commanders", /\b(washington|commanders)\b/i],
  ["Dallas Cowboys", /\b(dal|dallas|cowboys)\b/i],
  ["Philadelphia Eagles", /\b(phi|philadelphia|eagles)\b/i],
  ["Buffalo Bills", /\b(buf|buffalo|bills)\b/i],
  ["Miami Dolphins", /\b(mia|miami|dolphins)\b/i],
  ["Baltimore Ravens", /\b(bal|baltimore|ravens)\b/i],
  ["Pittsburgh Steelers", /\b(pit|pittsburgh|steelers)\b/i],
  ["Cleveland Browns", /\b(cle|cleveland|browns)\b/i],
  ["Cincinnati Bengals", /\b(cin|cincinnati|bengals)\b/i],
  ["Detroit Lions", /\b(det|detroit|lions)\b/i],
  ["Chicago Bears", /\b(chi|chicago|bears)\b/i],
  ["Minnesota Vikings", /\b(min|minnesota|vikings)\b/i],
  ["Seattle Seahawks", /\b(seattle|seahawks)\b/i],
  ["Arizona Cardinals", /\b(ari|arizona|cardinals)\b/i],
  ["Atlanta Falcons", /\b(atl|atlanta|falcons)\b/i],
  ["Carolina Panthers", /\b(car|carolina|panthers)\b/i],
  ["New Orleans Saints", /\b(new\s+orleans|saints)\b/i],
  ["Tennessee Titans", /\b(ten|tennessee|titans)\b/i],
  ["Houston Texans", /\b(hou|houston|texans)\b/i],
  ["Indianapolis Colts", /\b(ind|indianapolis|colts)\b/i],
  ["Jacksonville Jaguars", /\b(jax|jacksonville|jaguars)\b/i],
  ["Denver Broncos", /\b(den|denver|broncos)\b/i],
];

export function resolveNflTeamFromQuestion(question) {
  const q = String(question || "");
  for (const [team, re] of TEAM_RESOLVERS) {
    if (re.test(q)) return team;
  }
  return null;
}

export function buildTeamDraftFocusBlock(team, bundle = getActiveDraftBundle()) {
  if (!team) return "";
  const picks = bundle.fullOrder.filter((p) => p.team === team).sort((a, b) => a.overall - b.overall);
  if (!picks.length) return "";
  const needs = bundle.teamNeeds?.[team];
  const lines = picks.map((p) => {
    const flag = p.slotNote ? ` [${p.slotNote}]` : "";
    return `Round ${p.round} pick ${p.pickInRound} — Overall ${p.overall}${flag}`;
  });
  return [
    `TEAM DRAFT CAPITAL — ${team} (${bundle.inferredYear} class)`,
    `Needs snapshot: ${needs?.headline || "— (add in nfl-team-needs-" + bundle.year + ".js)"}`,
    `Need tags: ${(needs?.tags || []).join(", ") || "—"}`,
    `Total picks in bundle: ${picks.length}`,
    "EXACT SLOTS (model must list predictions against these rows, one block per pick when user asks pick-by-pick):",
    lines.join("\n"),
  ].join("\n");
}
