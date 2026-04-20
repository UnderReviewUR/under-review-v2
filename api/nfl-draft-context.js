/**
 * Static 2026 NFL Draft board for UR Take (until a live NFL API is wired).
 * Round 1 slot holders mirror the Wikipedia "2026 NFL draft" selections table
 * (team-on-the-clock column, trades reflected). Re-verify after late trades.
 *
 * After Round 1 is final: fill OFFICIAL_ROUND_ONE with { pick, team, player, pos }
 * so post-draft answers synthesize real selections — do not rely on the model to recall picks.
 */

export const NFL_DRAFT_EVENT = {
  label: "2026 NFL Draft",
  location: "Pittsburgh, PA",
  round1LocalDate: "2026-04-23",
  rounds234: "2026-04-24 — 2026-04-25",
};

/** UTC window covering Round 1 night through end of Day 3 (adjust if schedule slips). */
export const DRAFT_WINDOW_START_UTC = "2026-04-23T00:00:00.000Z";
export const DRAFT_WINDOW_END_UTC = "2026-04-26T08:00:00.000Z";

/** Who is on the clock at each Round 1 slot (32 picks). */
export const ROUND_ONE_SLOTS = [
  { pick: 1, team: "Las Vegas Raiders" },
  { pick: 2, team: "New York Jets" },
  { pick: 3, team: "Arizona Cardinals" },
  { pick: 4, team: "Tennessee Titans" },
  { pick: 5, team: "New York Giants" },
  { pick: 6, team: "Cleveland Browns" },
  { pick: 7, team: "Washington Commanders" },
  { pick: 8, team: "New Orleans Saints" },
  { pick: 9, team: "Kansas City Chiefs" },
  {
    pick: 10,
    team: "New York Giants",
    note: "Slot acquired from Cincinnati (pre-draft trade; Dexter Lawrence deal).",
  },
  { pick: 11, team: "Miami Dolphins" },
  { pick: 12, team: "Dallas Cowboys" },
  {
    pick: 13,
    team: "Los Angeles Rams",
    note: "Slot acquired from Atlanta (pre-draft trade).",
  },
  { pick: 14, team: "Baltimore Ravens" },
  { pick: 15, team: "Tampa Bay Buccaneers" },
  {
    pick: 16,
    team: "New York Jets",
    note: "Slot acquired from Indianapolis (pre-draft trade; Sauce Gardner deal).",
  },
  { pick: 17, team: "Detroit Lions" },
  { pick: 18, team: "Minnesota Vikings" },
  { pick: 19, team: "Carolina Panthers" },
  {
    pick: 20,
    team: "Dallas Cowboys",
    note: "Slot acquired from Green Bay (pre-draft trade; Micah Parsons deal).",
  },
  { pick: 21, team: "Pittsburgh Steelers" },
  { pick: 22, team: "Los Angeles Chargers" },
  { pick: 23, team: "Philadelphia Eagles" },
  {
    pick: 24,
    team: "Cleveland Browns",
    note: "Slot acquired from Jacksonville (pre-draft trade).",
  },
  { pick: 25, team: "Chicago Bears" },
  { pick: 26, team: "Buffalo Bills" },
  { pick: 27, team: "San Francisco 49ers" },
  { pick: 28, team: "Houston Texans" },
  {
    pick: 29,
    team: "Kansas City Chiefs",
    note: "Slot acquired from LA Rams (pre-draft trade; Trent McDuffie deal).",
  },
  {
    pick: 30,
    team: "Miami Dolphins",
    note: "Slot acquired from Denver (pre-draft trade; Jaylen Waddle deal).",
  },
  { pick: 31, team: "New England Patriots" },
  { pick: 32, team: "Seattle Seahawks" },
];

/**
 * Official Round 1 selections — populate after the draft for post-board synthesis.
 * Example row: { pick: 1, team: "Las Vegas Raiders", player: "Ashton Jeanty", pos: "RB" }
 */
export const OFFICIAL_ROUND_ONE = [];

/** ISO date string when OFFICIAL_ROUND_ONE was last checked against a primary source. */
export const OFFICIAL_ROUND_ONE_LAST_VERIFIED = null;

export const ROUND_ONE_BOARD_SOURCE =
  "Wikipedia 2026 NFL draft — Round 1 team order (pre–live draft; verify vs NFL.com if trades move).";

export function getNflDraftPhase(now = new Date()) {
  const t = now.getTime();
  const start = Date.parse(DRAFT_WINDOW_START_UTC);
  const end = Date.parse(DRAFT_WINDOW_END_UTC);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "pre_draft";
  if (t < start) return "pre_draft";
  if (t < end) return "during_draft";
  return "post_draft";
}

export function getNflDraftMeta(now = new Date()) {
  const phase = getNflDraftPhase(now);
  return {
    phase,
    event: NFL_DRAFT_EVENT,
    roundOneBoardSource: ROUND_ONE_BOARD_SOURCE,
    officialRoundOneCount: OFFICIAL_ROUND_ONE.length,
    officialRoundOneLastVerified: OFFICIAL_ROUND_ONE_LAST_VERIFIED,
    draftWindowUtc: { start: DRAFT_WINDOW_START_UTC, end: DRAFT_WINDOW_END_UTC },
  };
}

function formatRoundOneLines() {
  return ROUND_ONE_SLOTS.map((row) => {
    const note = row.note ? ` — ${row.note}` : "";
    return `${row.pick}. ${row.team}${note}`;
  }).join("\n");
}

function formatOfficialRoundOne() {
  if (!OFFICIAL_ROUND_ONE.length) return "";
  return OFFICIAL_ROUND_ONE.map((row) => {
    const p = row.player || "TBD";
    const pos = row.pos || "";
    return `${row.pick}. ${row.team} — ${p}${pos ? ` (${pos})` : ""}`;
  }).join("\n");
}

/** Human-readable block appended to NFL prompt context. */
export function buildNflDraftBoardBlock(meta = getNflDraftMeta()) {
  const phaseLabel =
    meta.phase === "pre_draft"
      ? "PRE-DRAFT (board is slot order before Round 1)"
      : meta.phase === "during_draft"
        ? "LIVE DRAFT WINDOW (slot order is fixed; selections finalize on the clock)"
        : "POST-DRAFT";

  const official = formatOfficialRoundOne();
  const officialSection = official
    ? `OFFICIAL ROUND 1 PICKS (synced into Under Review — use for grades/fit/value takes):\n${official}`
    : meta.phase === "post_draft"
      ? "OFFICIAL ROUND 1 PICKS: not yet loaded in this board. Do not invent selections; invite the user to paste their team's picks for a tailored GM-style grade."
      : "";

  return [
    "NFL DRAFT BOARD (verified static snapshot — not live API)",
    `Phase: ${phaseLabel}`,
    `Meta: ${JSON.stringify({
      event: meta.event,
      phase: meta.phase,
      roundOneBoardSource: meta.roundOneBoardSource,
      officialRoundOneCount: meta.officialRoundOneCount,
      officialRoundOneLastVerified: meta.officialRoundOneLastVerified,
    })}`,
    "ROUND 1 SLOT ORDER (who is on the clock — cite pick # and team exactly from here):",
    formatRoundOneLines(),
    officialSection,
  ]
    .filter(Boolean)
    .join("\n");
}
