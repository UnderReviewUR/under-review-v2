// Compact Mike Clay format-strategy tips (Playbook Part 2, ESPN, Aug 2026).
// Inject only when the user asks about nonstandard fantasy formats.
// Not rankings, not roster truth, not live odds.

export const NFL_CLAY_FORMAT_TIPS_2026 = {
  meta: {
    source: "Mike Clay Playbook Part 2 — nontraditional format draft tips (ESPN)",
    updatedAt: "2026-08",
    url: "https://www.espn.com/fantasy/football/story/_/id/49377843/fantasy-football-draft-strategy-dynasty-rookie-keeper-superflex-best-ball-knockout",
  },
  formats: {
    dynasty: {
      label: "Dynasty",
      tips: [
        "Target 20–24-year-old players in startups; fade aging veterans outside true early-prime stars.",
        "Trade overvalued rookie picks for established weekly starters when your team is ready to win now.",
        "Best player available in rookie drafts; do not reach on Day-3 RBs over better Day-1/2 WR pedigree.",
      ],
    },
    rookie: {
      label: "Rookie draft",
      tips: [
        "Prioritize pedigree (Day 1–2 draft capital) over short-term snap opportunity.",
        "Avoid need-based reaches; take the best long-term fantasy asset on the board.",
      ],
    },
    keeper: {
      label: "Keeper",
      tips: [
        "With only 1–3 keepers, decide with ADP: keep the player who saves the most draft value, not just the best name.",
        "Example shape: prefer a mid/late-round keep with near-elite ADP over burning an early pick on a similar-tier star.",
      ],
    },
    idp: {
      label: "IDP",
      tips: [
        "In light IDP (about 1–6 starters), draft offense first; IDP is deep and easier to fill later/waivers.",
        "Travis Hunter scores both ways in IDP-enabled leagues and can be slotted as CB/DB — raise him there.",
      ],
    },
    superflex: {
      label: "Superflex / OP",
      tips: [
        "Plan to start two QBs every week; move QBs up the board and roster an extra QB.",
        "Prefer 1 star QB early, then an elite RB/WR; take QB2 later in the quiet stretch (roughly ranks 8–15).",
        "Strong 2026 QB2 targets include Herbert, Nix, Lawrence, Purdy; stash upside (Murray, Shough, Jones, Willis, Ward, Mendoza).",
      ],
    },
    bestBall: {
      label: "Best ball",
      tips: [
        "Draft more depth at every position — no waivers/trades.",
        "Typical 20-man shape: 2–3 QB, 5–6 RB, 7–8 WR, 2–3 TE (plus DST if used).",
        "In tournaments, stack QB+pass-catcher and weight championship-week (usually Week 17) matchups.",
      ],
    },
    knockout: {
      label: "Knockout (ESPN 2026)",
      tips: [
        "Optimize floor over ceiling — lowest score each week is eliminated.",
        "Manage bye weeks tightly; one soft week ends the season.",
        "2026 example: Eagles have an easier regular-season slate (useful in knockout) but a brutal fantasy-playoff stretch (risky in best-ball tournaments).",
        "Be aggressive on waivers/FAB as eliminated stars hit the wire weekly.",
      ],
    },
    sixPtPassTd: {
      label: "6-point passing TD",
      tips: [
        "QBs rise modestly; do not panic-reach the whole position.",
        "Boost high-volume passers (Stafford, Burrow, Dak, Goff); fade relative dual-threat volume (e.g. Dart, Daniels, Hurts) vs 4-pt scoring.",
      ],
    },
    tePremium: {
      label: "TE premium / 2TE",
      tips: [
        "Bump all TEs; elite options (Bowers, McBride) can go late first in 1.5+ PPR TE premium.",
        "Stash breakout/upside TEs (e.g. Sadiq, Likely, Ferguson, Helm).",
      ],
    },
  },
};

/** @typedef {keyof typeof NFL_CLAY_FORMAT_TIPS_2026.formats} ClayFormatKey */

/**
 * Detect nontraditional fantasy formats mentioned in a question.
 * @param {string} question
 * @returns {ClayFormatKey[]}
 */
export function detectNflClayFormats(question) {
  const q = String(question || "").toLowerCase();
  /** @type {ClayFormatKey[]} */
  const hits = [];
  if (/\bdynasty\b/.test(q)) hits.push("dynasty");
  if (/\brookie\s+draft|\bdynasty\s+rookie\b|\brookie\s+pick/.test(q)) hits.push("rookie");
  if (/\bkeeper\b/.test(q)) hits.push("keeper");
  if (/\bidp\b|individual\s+defensive|\bdefensive\s+player/.test(q)) hits.push("idp");
  if (/\bsuperflex\b|\bsuper[\s-]?flex\b|\bop\s+slot\b|\b2qb\b|\btwo[\s-]?qb\b/.test(q)) {
    hits.push("superflex");
  }
  if (/\bbest[\s-]?ball\b/.test(q)) hits.push("bestBall");
  if (/\bknockout\b|\belimination\s+league\b/.test(q)) hits.push("knockout");
  if (/\b6[\s-]?point\s+pass|\bsix[\s-]?point\s+pass|\b6pt\s+pass|\bpassing\s+td[s]?\s*=?\s*6\b/.test(q)) {
    hits.push("sixPtPassTd");
  }
  if (/\bte[\s-]?premium\b|\b1\.5\s*ppr.*\bte\b|\b2\.0\s*ppr.*\bte\b|\btwo[\s-]?te\b|\b2te\b|\bstart\s+two\s+te\b/.test(q)) {
    hits.push("tePremium");
  }
  // de-dupe while preserving order
  return [...new Set(hits)];
}

/**
 * @param {string} question
 * @returns {string}
 */
export function buildNflClayFormatTipsBlock(question) {
  const keys = detectNflClayFormats(question);
  if (!keys.length) return "";
  const lines = [
    `CLAY FORMAT STRATEGY TIPS (${NFL_CLAY_FORMAT_TIPS_2026.meta.source}, ${NFL_CLAY_FORMAT_TIPS_2026.meta.updatedAt}):`,
    "Use for draft/format framing only. Live ESPN ranks + roster/injury status still win on current value.",
  ];
  for (const key of keys) {
    const fmt = NFL_CLAY_FORMAT_TIPS_2026.formats[key];
    if (!fmt) continue;
    lines.push(`${fmt.label}:`);
    for (const tip of fmt.tips) lines.push(`  - ${tip}`);
  }
  return `\n\n${lines.join("\n")}`;
}
