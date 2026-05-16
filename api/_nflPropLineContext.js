// Static Vegas preseason prop O/Us — DraftKings-style, May 2026. No runtime fetches.

/** @typedef {{
 *  passYds?: number, passTds?: number, rushYds?: number,
 *  recYds?: number, recs?: number, recTds?: number,
 *  source: string, asOf: string, adpNote?: string
 * }} NflPropLine */

/** @type {Record<string, NflPropLine>} */
export const NFL_2026_PLAYER_PROP_OUS = {
  // ── QUARTERBACKS ──────────────────────────────────────────────
  "Matthew Stafford": {
    passYds: 3925.5,
    passTds: 30.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB15 ADP — 13-spot gap vs Vegas implied QB2 role",
  },
  "Joe Burrow": {
    passYds: 3925.5,
    passTds: 31.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB1 consensus — priced correctly",
  },
  "Josh Allen": {
    passYds: 3800.5,
    passTds: 28.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB1 consensus — rushing upside on top",
  },
  "Lamar Jackson": {
    passYds: 3650.5,
    passTds: 26.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB1 — rushing yards separate prop adds significant value",
  },
  "Patrick Mahomes": {
    passYds: 4050.5,
    passTds: 32.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB1 — volume props reflect elite scheme and weapons",
  },
  "Jalen Hurts": {
    passYds: 3525.5,
    passTds: 25.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB8 ADP — rush TDs not in yard line; passing volume below elite tier",
  },
  "CJ Stroud": {
    passYds: 3875.5,
    passTds: 27.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB6 — second-year leap baked into top-10 pass yard band",
  },
  "Dak Prescott": {
    passYds: 3975.5,
    passTds: 28.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB10 — Vegas still prices volume QB1 despite recent injury noise",
  },
  "Geno Smith": {
    passYds: 3125.5,
    passTds: 18.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB28 ADP — rebuild Jets line implies streaming tier only",
  },
  "Caleb Williams": {
    passYds: 3725.5,
    passTds: 26.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB12 — year-3 bump priced; still below Mahomes/Burrow elite band",
  },
  "Drake Maye": {
    passYds: 4125.5,
    passTds: 30.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB4 ADP — efficiency breakout fully in market; slight OVER bias on TDs",
  },
  "Sam Darnold": {
    passYds: 3625.5,
    passTds: 24.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB18 ADP — Jefferson boost lifts line above prior Jets/CAR bands",
  },
  "Jordan Love": {
    passYds: 3775.5,
    passTds: 26.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB14 — Packers weapons keep mid-QB1 yardage floor",
  },
  "Anthony Richardson": {
    passYds: 3225.5,
    passTds: 20.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB22 — dual-threat floor; passing volume capped by accuracy risk",
  },
  "Brock Purdy": {
    passYds: 3925.5,
    passTds: 27.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB9 — Shanahan efficiency keeps yardage in QB1 band without elite ADP",
  },
  "Tua Tagovailoa": {
    passYds: 3675.5,
    passTds: 25.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB16 — backup-priced ADP in some boards vs QB2 volume when starter",
  },
  "Kirk Cousins": {
    passYds: 3425.5,
    passTds: 22.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB20 — bridge starter tier; market fading age faster than props",
  },
  "Russell Wilson": {
    passYds: 3025.5,
    passTds: 18.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "QB26 — committee/streaming band; limited weekly ceiling",
  },

  // ── RUNNING BACKS ─────────────────────────────────────────────
  "Kyren Williams": {
    rushYds: 1000.5,
    recYds: 350.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB15 ADP — Vegas implies RB1 workload in McVay scheme",
  },
  "Derrick Henry": {
    rushYds: 1150.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB1 consensus — age discount in fantasy but Vegas respects volume",
  },
  "Saquon Barkley": {
    rushYds: 1200.5,
    recYds: 400.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB1 — dual threat props reflect elite usage",
  },
  "Breece Hall": {
    rushYds: 950.5,
    recYds: 425.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB8 — receiving line rivals workhorse; committee risk not fully priced",
  },
  "De'Von Achane": {
    rushYds: 925.5,
    recYds: 450.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB6 — explosive efficiency; rec yards O/U above rush for PPR edge",
  },
  "Bijan Robinson": {
    rushYds: 1175.5,
    recYds: 375.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB2 — workhorse band; ATL offense limits rec ceiling vs Saquon",
  },
  "James Cook": {
    rushYds: 875.5,
    recYds: 325.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB12 — featured back in BUF; TD equity separate from yard bands",
  },
  "Jahmyr Gibbs": {
    rushYds: 1050.5,
    recYds: 400.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB3 — dual-threat props match elite usage in Lions scheme",
  },
  "Jonathan Taylor": {
    rushYds: 1100.5,
    recYds: 225.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB7 — rush-first workhorse; health discount vs Vegas volume",
  },
  "Josh Jacobs": {
    rushYds: 1025.5,
    recYds: 275.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB10 — GB lean run; featured tier without elite receiving band",
  },
  "Tony Pollard": {
    rushYds: 900.5,
    recYds: 250.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB18 — featured back tier in TEN; market still prices committee risk",
  },
  "Rachaad White": {
    rushYds: 775.5,
    recYds: 375.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB20 — receiving O/U signals three-down role over pure rush rank",
  },
  "Brian Robinson": {
    rushYds: 850.5,
    recYds: 150.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB24 — featured but not workhorse; WAS run-heavy scripts",
  },
  "Najee Harris": {
    rushYds: 825.5,
    recYds: 200.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB22 — committee back band; LAC role share caps ceiling",
  },
  "Aaron Jones": {
    rushYds: 725.5,
    recYds: 325.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB25 — age fade in ADP; rec yards keep featured dual value",
  },
  "David Montgomery": {
    rushYds: 875.5,
    recYds: 175.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB28 — splits with Gibbs; standalone line is RB2 not workhorse",
  },
  "Rhamondre Stevenson": {
    rushYds: 775.5,
    recYds: 275.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB26 — committee tier; Maye upgrade helps but not workhorse props",
  },
  "Joe Mixon": {
    rushYds: 925.5,
    recYds: 225.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB14 — featured band; injury history creates ADP vs Vegas gap",
  },
  "Chuba Hubbard": {
    rushYds: 975.5,
    recYds: 200.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB16 — CAR bellcow pricing; market still undervalues volume vs ADP",
  },
  "Javonte Williams": {
    rushYds: 675.5,
    recYds: 250.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "RB30 — committee back; rec line above rush implies passing-down role",
  },

  // ── WIDE RECEIVERS ────────────────────────────────────────────
  "Garrett Wilson": {
    recYds: 1000.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "Mid-4th round ADP — Vegas implies WR2/WR1 upside with improved Jets QB",
  },
  "Parker Washington": {
    recYds: 775.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "2 rounds after BTJ in ADP — Vegas has him as clear WR1 in JAX",
  },
  "Khalil Shakir": {
    recYds: 700.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "11th round ADP — Vegas implies 95+ target slot role in BUF",
  },
  "Puka Nacua": {
    recYds: 1050.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR1 role in LAR — Stafford's primary target",
  },
  "CeeDee Lamb": {
    recYds: 1200.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR1 consensus — elite volume props reflect target share",
  },
  "Ja'Marr Chase": {
    recYds: 1150.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR1 — Burrow connection priced into top O/Us",
  },
  "Justin Jefferson": {
    recYds: 1250.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR1 — highest rec yard band; Darnold upgrade in price",
  },
  "Amon-Ra St. Brown": {
    recYds: 1100.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR4 — true WR1 usage in Lions passing funnel",
  },
  "Tyreek Hill": {
    recYds: 1050.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR6 — QB uncertainty caps ADP but Vegas keeps WR1 yard band",
  },
  "Davante Adams": {
    recYds: 950.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR10 — age/role questions; still WR2+ yard line with Stafford",
  },
  "Stefon Diggs": {
    recYds: 825.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR18 — WR2 band post-injury; market more skeptical than props",
  },
  "DeVonta Smith": {
    recYds: 900.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR14 — WR2 on PHI; AJB higher O/U defines target hierarchy",
  },
  "A.J. Brown": {
    recYds: 1050.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR8 — alpha WR1 band on Eagles; Smith 150-yard gap below",
  },
  "George Pickens": {
    recYds: 950.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR12 — WR2/WR1 hybrid line in DAL; target share leader pricing",
  },
  "Tee Higgins": {
    recYds: 900.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR16 — WR2 behind Chase; 250-yard gap reflects hierarchy",
  },
  "Brian Thomas Jr.": {
    recYds: 1000.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR9 — sophomore leap; Washington O/U still 225 yds below BTJ",
  },
  "Ricky Pearsall": {
    recYds: 650.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR32 — WR3 band; SF crowded room limits ceiling",
  },
  "Chris Godwin": {
    recYds: 800.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR20 — WR2 tier return from injury; Evans may lead team",
  },
  "DJ Moore": {
    recYds: 900.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR15 — WR2 band in BUF; Shakir slot vs Moore volume split",
  },
  "Keenan Allen": {
    recYds: 850.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR22 — veteran WR2 line; Herbert offense supports floor",
  },
  "Terry McLaurin": {
    recYds: 950.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR11 — WR2/WR1 hybrid; WAS passing volume dependent",
  },
  "Christian Kirk": {
    recYds: 750.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR28 — WR2 band in JAX; below Parker Washington leader line",
  },
  "Courtland Sutton": {
    recYds: 850.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR24 — WR2 role in DEN; Bo Nix growth in yard band",
  },
  "Rashee Rice": {
    recYds: 950.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR13 — WR2/WR1 band pending suspension; Vegas prices role not games",
  },
  "Zay Flowers": {
    recYds: 900.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR17 — WR2 in BAL; Lamar rush volume caps passing ceiling",
  },
  "Jaylen Waddle": {
    recYds: 950.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR19 — WR2 behind Hill when both healthy; Tyreek higher O/U",
  },
  "Cedric Tillman": {
    recYds: 700.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "WR35 — WR3 band breakout candidate; market lags Vegas role",
  },

  // ── TIGHT ENDS ────────────────────────────────────────────────
  "Travis Kelce": {
    recYds: 850.5,
    recTds: 8.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE1 — age discount in fantasy but Vegas still projects elite role",
  },
  "Sam LaPorta": {
    recYds: 700.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE1 emerging — Lions scheme creates volume",
  },
  "Mark Andrews": {
    recYds: 650.5,
    recTds: 7.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE6 — TE1 band when healthy; Lamar rush caps weekly ceiling",
  },
  "Trey McBride": {
    recYds: 800.5,
    recTds: 7.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE2 — elite TE1 usage; Kyler upgrade lifts yard band",
  },
  "Dalton Kincaid": {
    recYds: 600.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE10 — TE2 role in BUF; Shakir competes for middle-field targets",
  },
  "Pat Freiermuth": {
    recYds: 550.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE14 — TE2 band; PIT passing volume limits ceiling",
  },
  "David Njoku": {
    recYds: 600.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE12 — TE2 usage in CLE; QB uncertainty caps ADP",
  },
  "Jake Ferguson": {
    recYds: 550.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE15 — TE2 in DAL; Pickens/Lamb dominate target tree",
  },
  "Cole Kmet": {
    recYds: 500.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE18 — TE2 floor; CHI passing volume drives modest band",
  },
  "Evan Engram": {
    recYds: 650.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE8 — move TE; DEN target share leader among TEs",
  },
  "Juwan Johnson": {
    recYds: 500.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE20 — TE2 in NO; modest band reflects QB flux",
  },
  "Cade Otton": {
    recYds: 550.5,
    source: "DraftKings",
    asOf: "2026-05",
    adpNote: "TE16 — TE2 in TB; Baker offense supports short-area volume",
  },
};

const TE_PLAYER_KEYS = new Set([
  "Travis Kelce",
  "Sam LaPorta",
  "Mark Andrews",
  "Trey McBride",
  "Dalton Kincaid",
  "Pat Freiermuth",
  "David Njoku",
  "Jake Ferguson",
  "Cole Kmet",
  "Evan Engram",
  "Juwan Johnson",
  "Cade Otton",
]);

/**
 * Position tier thresholds for implied role detection
 */
export const NFL_PROP_POSITION_THRESHOLDS = {
  QB: {
    passYds: { elite: 4000, qb1: 3700, qb2: 3300, streaming: 2900 },
    passTds: { elite: 30, qb1: 26, qb2: 22, streaming: 18 },
  },
  RB: {
    rushYds: { workhorse: 1200, featured: 900, committee: 650, handcuff: 400 },
    recYds: { receiver: 400, dual: 250, rusher: 100 },
  },
  WR: {
    recYds: { wr1: 1100, wr2: 850, wr3: 650, roleplayer: 450 },
  },
  TE: {
    recYds: { te1: 750, te2: 500, blocking: 300 },
  },
};

/**
 * League average prop lines for context
 * (used to identify outliers)
 */
export const NFL_PROP_LEAGUE_AVERAGES = {
  QB: { passYds: 3400, passTds: 24 },
  RB: { rushYds: 820, recYds: 280 },
  WR: { recYds: 780 },
  TE: { recYds: 480 },
};

/**
 * @param {string} name
 * @returns {string}
 */
export function normalizePlayerMatchKey(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1].toLowerCase();
  const firstInitial = (parts[0][0] || "").toLowerCase();
  return `${last}${firstInitial}`;
}

/**
 * Resolve canonical prop-board key — exact name, else unique lastName+firstInitial match.
 * @param {string} playerName
 * @returns {string | null}
 */
export function resolvePropPlayerKey(playerName) {
  const normalized = String(playerName || "").trim();
  if (!normalized) return null;

  const exact = Object.keys(NFL_2026_PLAYER_PROP_OUS).find(
    (k) => k.toLowerCase() === normalized.toLowerCase(),
  );
  if (exact) return exact;

  const queryKey = normalizePlayerMatchKey(normalized);
  if (!queryKey || queryKey.length < 3) return null;

  const matches = Object.keys(NFL_2026_PLAYER_PROP_OUS).filter(
    (k) => normalizePlayerMatchKey(k) === queryKey,
  );
  if (matches.length === 1) return matches[0];
  return null;
}

/**
 * @param {string} playerKey
 * @param {NflPropLine} props
 */
function detectPositionFromProps(playerKey, props) {
  if (TE_PLAYER_KEYS.has(playerKey)) return "TE";
  if (props.passYds || props.passTds) return "QB";
  if (props.rushYds) return "RB";
  if (props.recYds) return "WR";
  return "UNKNOWN";
}

/**
 * @param {string} pos
 * @param {NflPropLine} props
 */
function getImpliedTierLabel(pos, props) {
  const t = NFL_PROP_POSITION_THRESHOLDS;
  if (pos === "QB") {
    const yds = props.passYds || 0;
    if (yds >= t.QB.passYds.elite) return "ELITE QB1 volume";
    if (yds >= t.QB.passYds.qb1) return "QB1 volume";
    if (yds >= t.QB.passYds.qb2) return "QB2 volume";
    return "Streaming QB";
  }
  if (pos === "RB") {
    const rush = props.rushYds || 0;
    if (rush >= t.RB.rushYds.workhorse) return "Workhorse RB1";
    if (rush >= t.RB.rushYds.featured) return "Featured RB2";
    if (rush >= t.RB.rushYds.committee) return "Committee back";
    return "Handcuff/depth";
  }
  if (pos === "WR") {
    const rec = props.recYds || 0;
    if (rec >= t.WR.recYds.wr1) return "True WR1 usage";
    if (rec >= t.WR.recYds.wr2) return "WR2 role";
    if (rec >= t.WR.recYds.wr3) return "WR3 role";
    return "Role player";
  }
  if (pos === "TE") {
    const rec = props.recYds || 0;
    if (rec >= t.TE.recYds.te1) return "Elite TE1 usage";
    if (rec >= t.TE.recYds.te2) return "TE2 role";
    return "Blocking/depth TE";
  }
  return "Unknown role";
}

/**
 * Format a single player's prop line for prompt injection.
 * Returns empty string if player not found.
 * @param {string} playerName
 */
export function formatPlayerPropSlice(playerName) {
  const key = resolvePropPlayerKey(playerName);
  if (!key) return "";
  const props = NFL_2026_PLAYER_PROP_OUS[key];
  const pos = detectPositionFromProps(key, props);
  const tier = getImpliedTierLabel(pos, props);
  const lines = [`VEGAS 2026 PROP O/Us — ${key} (${props.source}, ${props.asOf}):`];
  if (props.passYds) lines.push(`  Pass yards O/U: ${props.passYds}`);
  if (props.passTds) lines.push(`  Pass TDs O/U: ${props.passTds}`);
  if (props.rushYds) lines.push(`  Rush yards O/U: ${props.rushYds}`);
  if (props.recYds) lines.push(`  Rec yards O/U: ${props.recYds}`);
  if (props.recTds) lines.push(`  Rec TDs O/U: ${props.recTds}`);
  lines.push(`  Vegas implied role: ${tier}`);
  if (props.adpNote) lines.push(`  Market gap: ${props.adpNote}`);
  lines.push(
    "  (Staleness: preseason 2026 props — directional only; in-season lines will sharpen)",
  );
  return lines.join("\n");
}

/**
 * Format multiple players' prop slices for a prompt.
 * @param {string[]} playerNames
 * @param {number} maxPlayers
 */
export function formatPropContextForPlayers(playerNames, maxPlayers = 4) {
  const seen = new Set();
  const slices = [];
  for (const raw of playerNames || []) {
    if (slices.length >= maxPlayers) break;
    const key = resolvePropPlayerKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const slice = formatPlayerPropSlice(raw);
    if (slice) slices.push(slice);
  }
  if (slices.length === 0) return "";
  return (
    "\n\nNFL PLAYER PROP LINES (Vegas 2026 preseason — use for role/value reasoning):\n" +
    slices.join("\n\n") +
    "\n\nPROP REASONING RULES:\n" +
    "- When Vegas O/U implies a higher tier than market perception, flag the gap explicitly.\n" +
    "- Use position thresholds to label implied role (Workhorse RB1, True WR1, etc).\n" +
    "- Same-team prop comparison: if Player B O/U > Player A O/U but A has higher ADP, " +
    "flag B as the value and A as potential fade.\n" +
    "- Always combine prop O/U with matchup engine tier adjustments when both are available.\n" +
    "- Label all prop data as preseason directional context, not live lines."
  );
}

/**
 * Compare two players on the same team — identify target share leader.
 * @param {string} playerA
 * @param {string} playerB
 */
export function compareSameTeamProps(playerA, playerB) {
  const keyA = resolvePropPlayerKey(playerA);
  const keyB = resolvePropPlayerKey(playerB);
  if (!keyA || !keyB) return "";
  const a = NFL_2026_PLAYER_PROP_OUS[keyA];
  const b = NFL_2026_PLAYER_PROP_OUS[keyB];
  const aRec = a.recYds || 0;
  const bRec = b.recYds || 0;
  if (!aRec || !bRec || aRec === bRec) return "";
  const leader = aRec > bRec ? keyA : keyB;
  const trailer = aRec > bRec ? keyB : keyA;
  const gap = Math.abs(aRec - bRec);
  return (
    `SAME-TEAM TARGET SHARE SIGNAL: Vegas prices ${leader} (${Math.max(aRec, bRec)} rec yds O/U) ` +
    `above ${trailer} (${Math.min(aRec, bRec)} rec yds O/U) by ${gap} yards. ` +
    `If ADP reverses this ordering, ${trailer} is a fade and ${leader} is the value.`
  );
}
