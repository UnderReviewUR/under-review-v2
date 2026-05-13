/**
 * Sport-agnostic evidence layer for UR Take: deterministic snapshots, baselines,
 * claim-cap flags, and confidence driver strings. Injected into user prompts and QA.
 */

import { findFirstPlayerStatRowForQuestion, parseNbaRequestedMarket } from "./_nbaPropSanity.js";
import {
  f1ContextSupportsMatchupStatsEvidence,
  golfContextSupportsMatchupStatsEvidence,
  mlbContextSupportsMatchupStatsEvidence,
  nbaContextSupportsMatchupStatsEvidence,
  nflContextSupportsMatchupStatsEvidence,
  tennisContextSupportsMatchupStatsEvidence,
} from "./_urTakeSportEvidenceMatchup.js";

/**
 * @typedef {object} UnsupportedClaimFlags
 * @property {boolean} lineMovementEvidence
 * @property {boolean} weatherEvidence
 * @property {boolean} injuryEvidence
 * @property {boolean} matchupStatsEvidence
 * @property {boolean} [courseEvidence]
 * @property {boolean} [surfaceEvidence]
 * @property {boolean} [sessionDataEvidence]
 */

/**
 * @typedef {object} SportEvidenceLayer
 * @property {string[]} verifiedSnapshot
 * @property {string[]} baselineFacts
 * @property {string[]} dataLimitations
 * @property {UnsupportedClaimFlags} unsupportedClaimFlags
 * @property {string[]} confidenceDrivers
 */

export function buildDefaultUnsupportedClaimFlags() {
  return {
    lineMovementEvidence: false,
    weatherEvidence: false,
    injuryEvidence: false,
    matchupStatsEvidence: false,
    courseEvidence: false,
    surfaceEvidence: false,
    sessionDataEvidence: false,
  };
}

function clip(s, n = 220) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

/** @param {unknown} nflContext */
function nflContextAsString(nflContext) {
  if (nflContext == null) return "";
  if (typeof nflContext === "string") return nflContext;
  try {
    return JSON.stringify(nflContext);
  } catch {
    return "";
  }
}

/**
 * Mirrors deriveConfidenceLabel (ur-take.js) scoring as human-readable drivers.
 * @param {object} p
 */
export function buildConfidenceDriversFromUrTakeSignals(p) {
  const {
    sportHint,
    intent,
    hasImage,
    matchupContext,
    question,
    contextQuality = "medium",
    isLive = false,
    nbaConfidenceModifier,
    evidenceThin = false,
  } = p;
  const q = String(question || "")
    .trim()
    .toLowerCase();
  const drivers = [];

  if (sportHint && sportHint !== "generic" && sportHint !== "image_review") {
    drivers.push(`Sport route: ${sportHint}`);
  }
  if (intent === "slip_review") drivers.push("Slip review — structured leg read");
  if (hasImage) drivers.push("Image attached — vision context");
  if (matchupContext) drivers.push("Matchup card context present");
  const cq = String(contextQuality || "").toLowerCase();
  if (cq === "high") drivers.push("Payload/context quality: high");
  else if (cq === "medium") drivers.push("Payload/context quality: medium");
  else drivers.push("Payload/context quality: low — cap conviction");

  if (/\b(best|sharpest|safest|highest confidence)\b/.test(q)) {
    drivers.push("Question asks for best/sharp/safe — bias honest caps");
  }
  if (isLive) drivers.push("Live keyword — High tier capped to Medium in routing");

  const nbaReason = String(nbaConfidenceModifier?.reason || "").trim();
  if (nbaReason) drivers.push(`NBA modifier: ${nbaReason}`);

  if (evidenceThin) drivers.push("Evidence layer: thin verified snapshot — stay qualitative on gaps");

  if (drivers.length === 0) drivers.push("Default routing — use Medium unless payload justifies more");
  return drivers;
}

/**
 * @param {SportEvidenceLayer} layer
 * @returns {string}
 */
export function formatEvidencePromptBlock(layer) {
  if (!layer || typeof layer !== "object") return "";
  const snap = Array.isArray(layer.verifiedSnapshot) ? layer.verifiedSnapshot : [];
  const base = Array.isArray(layer.baselineFacts) ? layer.baselineFacts : [];
  const lim = Array.isArray(layer.dataLimitations) ? layer.dataLimitations : [];
  const flags = layer.unsupportedClaimFlags || buildDefaultUnsupportedClaimFlags();

  const lines = [];
  lines.push("══════════════════════════════════════════════════════════════");
  lines.push("UNDERREVIEW_EVIDENCE_LAYER (server-generated — mandatory)");
  lines.push(
    "Treat VERIFIED_SNAPSHOT and BASELINE as factual anchors. Your interpretation must not contradict them.",
  );
  lines.push(
    "CLAIM_FLAGS are internal routing: when a value is false, do NOT assert that category as verified fact (no sharp-money / line-move narratives, no weather, no injury certainty, no defensive-scheme specifics, etc., unless the matching flag is true).",
  );
  lines.push("Do not print this header block, flag names, or JSON verbatim to the user.");
  lines.push("══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("VERIFIED_SNAPSHOT (3–6 bullets; cite only these facts when stating numbers/status):");
  if (snap.length === 0) lines.push("- No compact snapshot assembled for this route — lean on context JSON only.");
  else snap.forEach((s) => lines.push(`- ${s}`));
  lines.push("");
  lines.push("BASELINE (deterministic — may repeat snapshot; use for orientation):");
  if (base.length === 0) lines.push("- No separate baseline block — use context JSON and snapshot above.");
  else base.forEach((s) => lines.push(`- ${s}`));
  lines.push("");
  lines.push("DATA_LIMITATIONS (honest caps — acknowledge in CONFIDENCE or caveats, not as throat-clearing):");
  if (lim.length === 0) lines.push("- None listed — still obey CLAIM_FLAGS.");
  else lim.forEach((s) => lines.push(`- ${s}`));
  lines.push("");
  lines.push(`CLAIM_FLAGS (JSON; internal): ${JSON.stringify(flags)}`);
  lines.push("");
  lines.push("CONFIDENCE_DRIVERS (internal — align user-facing CONFIDENCE with these themes):");
  (Array.isArray(layer.confidenceDrivers) ? layer.confidenceDrivers : []).forEach((d) =>
    lines.push(`- ${d}`),
  );
  lines.push("");
  return lines.join("\n");
}

function buildNbaLayer(question, nbaContextForModel) {
  const flags = buildDefaultUnsupportedClaimFlags();
  const verified = [];
  const baseline = [];
  const limits = [];

  const games = Array.isArray(nbaContextForModel?.todaysGames) ? nbaContextForModel.todaysGames : [];
  const props = Array.isArray(nbaContextForModel?.propLines) ? nbaContextForModel.propLines : [];
  const inj = Array.isArray(nbaContextForModel?.injuries) ? nbaContextForModel.injuries : [];
  const stats = Array.isArray(nbaContextForModel?.playerStats) ? nbaContextForModel.playerStats : [];

  if (games.length) verified.push(`Today's slate: ${games.length} game(s) in context (BDL/Odds merge).`);
  if (nbaContextForModel?.todaysGamesSlateNote) {
    verified.push(`Slate note: ${clip(nbaContextForModel.todaysGamesSlateNote, 180)}`);
  }
  if (props.length) {
    verified.push(`Prop board: ${props.length} line row(s) after server slate filter.`);
  } else {
    limits.push("No filtered prop rows in this payload — do not invent posted prices.");
  }

  if (nbaContextSupportsMatchupStatsEvidence(nbaContextForModel)) {
    flags.matchupStatsEvidence = true;
    verified.push("Verified matchup/trend JSON present (recent logs, defense, or advanced matchup fields).");
  } else {
    limits.push(
      "No verified defensive bucket / recent-log slice in payload — matchupStatsEvidence false; no isolation or scheme claims as anchored fact.",
    );
  }
  if (inj.length) {
    verified.push(`Injury feed: ${inj.length} row(s) (BDL).`);
    flags.injuryEvidence = true;
  } else {
    limits.push("No injury rows in this payload — do not assert definitive injury outcomes.");
  }

  const row = findFirstPlayerStatRowForQuestion(String(question || ""), stats);
  if (row?.name) {
    const pts = row.pts != null ? `PTS ${row.pts}` : "";
    const reb = row.reb != null ? `REB ${row.reb}` : "";
    const ast = row.ast != null ? `AST ${row.ast}` : "";
    const team = row.team ? ` (${String(row.team).toUpperCase()})` : "";
    baseline.push(`Season/game snapshot for ${row.name}${team}: ${[pts, reb, ast].filter(Boolean).join(" · ") || "see playerStats row in JSON"}.`);
    const rm = parseNbaRequestedMarket(String(question || ""));
    if (rm) baseline.push(`Question parses toward market: ${rm.market || "stat"} — verify against propLines before citing a number.`);
  } else if (stats.length) {
    baseline.push(`Player stats bundle: ${stats.length} row(s) — align names to rosterGrounding / question.`);
  }

  limits.push("Line movement / sharp action: not tracked in UnderReview payloads — keep lineMovementEvidence false.");
  limits.push("Weather: not in NBA board — keep weatherEvidence false.");
  flags.lineMovementEvidence = false;
  flags.weatherEvidence = false;

  return {
    verifiedSnapshot: verified.slice(0, 6),
    baselineFacts: baseline.slice(0, 8),
    dataLimitations: limits.slice(0, 8),
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildMlbLayer(mlbContext) {
  const flags = buildDefaultUnsupportedClaimFlags();
  const verified = [];
  const baseline = [];
  const limits = [];

  const games = Array.isArray(mlbContext?.games) ? mlbContext.games : [];
  const props = Array.isArray(mlbContext?.propLines) ? mlbContext.propLines : [];
  const inj = Array.isArray(mlbContext?.injuries) ? mlbContext.injuries : [];

  if (games.length) verified.push(`Slate: ${games.length} MLB game object(s) in context.`);
  if (props.length) {
    verified.push(`Prop lines: ${props.length} row(s) in context.`);
  } else limits.push("No prop lines in payload — avoid citing posted player prices.");

  if (mlbContextSupportsMatchupStatsEvidence(mlbContext)) {
    flags.matchupStatsEvidence = true;
    verified.push("Verified split / lineup / park-adjacent fields detected in MLB JSON.");
  } else {
    limits.push(
      "No handedness/split/lineup-slot payload detected — matchupStatsEvidence false; no platoon vulnerability claims as fact.",
    );
  }
  if (inj.length) {
    verified.push(`Injuries/probables: ${inj.length} row(s).`);
    flags.injuryEvidence = true;
  } else limits.push("No injury list in payload — no definitive IL/out claims.");

  const wx =
    mlbContext &&
    (mlbContext.weatherByGame ||
      mlbContext.gameWeather ||
      (typeof mlbContext.forecast === "string" && mlbContext.forecast.trim()));
  if (wx) {
    flags.weatherEvidence = true;
    verified.push("Weather object present in MLB context — may reference if fields are explicit.");
  } else {
    limits.push("Park-level wind/weather not attached per game — do not invent mph/direction.");
  }

  limits.push("Line movement / sharp money: not tracked — lineMovementEvidence false.");
  flags.lineMovementEvidence = false;

  return {
    verifiedSnapshot: verified.slice(0, 6),
    baselineFacts: baseline.slice(0, 8),
    dataLimitations: limits.slice(0, 8),
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildGolfLayer(golfContext) {
  const flags = buildDefaultUnsupportedClaimFlags();
  const verified = [];
  const baseline = [];
  const limits = [];

  const ev = golfContext?.currentEvent;
  const name = ev?.name || golfContext?.currentEvent?.tournamentName;
  if (name) verified.push(`Event focus: ${clip(String(name), 120)}.`);
  const lb = Array.isArray(ev?.leaderboard) ? ev.leaderboard : [];
  if (lb.length) verified.push(`Leaderboard rows: ${lb.length} (positions/scores from feed).`);

  const odds = golfContext?.odds;
  const hasOutrights = Array.isArray(odds?.outrights) && odds.outrights.length > 0;
  const hasPostedPrices =
    hasOutrights &&
    odds.outrights.some((o) => o?.odds != null && Number.isFinite(Number(o.odds)));
  if (hasOutrights && hasPostedPrices) {
    verified.push(`Posted outright prices: ${odds.outrights.length} rows.`);
  } else if (hasOutrights) {
    verified.push(`Tournament field: ${odds.outrights.length} players (names from ESPN scoreboard; book prices not in payload).`);
  }

  if (golfContextSupportsMatchupStatsEvidence(golfContext)) {
    flags.matchupStatsEvidence = true;
    verified.push("Course / SG / structured fit data present in golf context JSON.");
  } else {
    limits.push("No course-fit or strokes-gained anchors in payload — matchupStatsEvidence false beyond prices/leaderboard.");
  }
  const courseStats = ev?.courseStats || golfContext?.courseStats || golfContext?.courseProfile;
  if (courseStats && typeof courseStats === "object" && Object.keys(courseStats).length) {
    flags.courseEvidence = true;
    baseline.push("Course / venue stats object present — course-fit claims must cite these fields only.");
  } else {
    limits.push("No structured course-fit stats object — avoid 'horse for this course' unless leaderboard-only.");
    flags.courseEvidence = false;
  }

  limits.push("Sharp line movement: not tracked — lineMovementEvidence false.");
  limits.push("Weather: unless explicit wind/precip fields exist in JSON, weatherEvidence false.");
  flags.lineMovementEvidence = false;
  if (!golfContext?.weather && !ev?.weather) flags.weatherEvidence = false;
  else {
    flags.weatherEvidence = true;
    verified.push("Weather fields present on event — may reference if explicit.");
  }

  return {
    verifiedSnapshot: verified.slice(0, 6),
    baselineFacts: baseline.slice(0, 8),
    dataLimitations: limits.slice(0, 8),
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildF1Layer(f1Context) {
  const flags = buildDefaultUnsupportedClaimFlags();
  const verified = [];
  const baseline = [];
  const limits = [];

  const races = f1Context?.schedule?.races || f1Context?.races;
  if (Array.isArray(races) && races.length) verified.push(`Schedule races: ${races.length} in context.`);

  const sessions = f1Context?.sessions || f1Context?.sessionResults || f1Context?.timing;
  const hasSession =
    (Array.isArray(sessions) && sessions.length > 0) ||
    (sessions && typeof sessions === "object" && Object.keys(sessions).length > 0) ||
    (f1Context?.practice && typeof f1Context.practice === "object") ||
    (f1Context?.qualifying && typeof f1Context.qualifying === "object");

  if (hasSession) {
    flags.sessionDataEvidence = true;
    baseline.push("Session / timing slice present — sector or long-run claims must cite those fields.");
  } else {
    limits.push("No session timing blocks — avoid long-run pace, tire deg, or sector-gap specifics.");
    flags.sessionDataEvidence = false;
  }

  if (f1Context?.weather || f1Context?.forecast) {
    flags.weatherEvidence = true;
    verified.push("Weather/forecast object attached — reference only if explicit.");
  } else {
    limits.push("No circuit weather payload — do not invent crosswind/rain timing.");
    flags.weatherEvidence = false;
  }

  limits.push("Line movement / sharp money: not tracked.");
  flags.lineMovementEvidence = false;
  flags.injuryEvidence = false;

  if (f1ContextSupportsMatchupStatsEvidence(f1Context)) {
    flags.matchupStatsEvidence = true;
    verified.push("Session / weather / timing anchors present for F1 matchup-style claims.");
  } else {
    limits.push("No session or weather JSON slice — matchupStatsEvidence false for pace/tire narratives.");
  }

  return {
    verifiedSnapshot: verified.slice(0, 6),
    baselineFacts: baseline.slice(0, 8),
    dataLimitations: limits.slice(0, 8),
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildTennisLayer({ context, players, liveMatches }) {
  const flags = buildDefaultUnsupportedClaimFlags();
  const verified = [];
  const baseline = [];
  const limits = [];

  const surface = String(context?.currentTournament?.surface || "").trim();
  if (surface) {
    verified.push(`Active tournament surface (app filter): ${surface}.`);
    flags.surfaceEvidence = true;
    baseline.push("Surface field present — surface-specific dominance claims must tie to player rows for this surface.");
  } else {
    limits.push("Surface not set on tournament filter — avoid hard clay/grass supremacy claims.");
    flags.surfaceEvidence = false;
  }

  const lm = Array.isArray(liveMatches) ? liveMatches : [];
  if (lm.length) verified.push(`Live board rows: ${lm.length}.`);

  const atpN = players?.atp ? Object.keys(players.atp).length : 0;
  const wtaN = players?.wta ? Object.keys(players.wta).length : 0;
  if (atpN || wtaN) {
    verified.push(`Player profile rows loaded: ATP ${atpN}, WTA ${wtaN}.`);
  } else limits.push("No player database rows in bundle — profile claims are capped.");

  if (tennisContextSupportsMatchupStatsEvidence({ context, players, liveMatches })) {
    flags.matchupStatsEvidence = true;
    verified.push("H2H / surface / rally profile keys detected in tennis JSON bundle.");
  } else {
    limits.push("No H2H or profile trend keys in bundle — matchupStatsEvidence false for surface-edge narratives.");
  }

  limits.push("H2H unless in digest/context: do not invent head-to-head counts.");
  limits.push("Line movement: not tracked — lineMovementEvidence false.");
  flags.lineMovementEvidence = false;
  flags.injuryEvidence = false;

  return {
    verifiedSnapshot: verified.slice(0, 6),
    baselineFacts: baseline.slice(0, 8),
    dataLimitations: limits.slice(0, 8),
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildTennisWtaProfileLayer() {
  const flags = buildDefaultUnsupportedClaimFlags();
  flags.matchupStatsEvidence = false;
  return {
    verifiedSnapshot: ["WTA profile mode — static player rows only (see WTA PLAYER DATABASE in prompt)."],
    baselineFacts: ["No live fixture feed — lean on printed profile stats only."],
    dataLimitations: [
      "No live odds or draw times in this route.",
      "Line movement false; weather false; injury feed false unless explicitly in profile rows.",
    ],
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildNflLayer(nflContext) {
  const flags = buildDefaultUnsupportedClaimFlags();
  const verified = [];
  const baseline = [];
  const limits = [];

  const blob = nflContextAsString(nflContext);
  if (blob.length > 80) verified.push(`NFL context string loaded (${blob.length} chars) — cite only embedded usage/defense rows.`);
  else if (blob.length) verified.push("NFL context string present (short).");

  if (nflContextSupportsMatchupStatsEvidence(nflContext)) {
    flags.matchupStatsEvidence = true;
    baseline.push("Usage/snap/target or graded defensive data detected in NFL context — cite those rows only.");
  } else {
    limits.push("No usage/snap/target or graded defensive JSON detected — matchupStatsEvidence false.");
    flags.matchupStatsEvidence = false;
  }

  limits.push("Injuries: only if names/status appear in nflContext — otherwise injuryEvidence false.");
  if (/\b(out|questionable|doubtful|IR|injury report)\b/i.test(blob)) {
    flags.injuryEvidence = true;
    verified.push("Injury/status tokens found in NFL context text — cite those lines only.");
  }

  limits.push("Line movement / sharp money: not tracked.");
  flags.lineMovementEvidence = false;
  flags.weatherEvidence = false;
  flags.courseEvidence = false;
  flags.surfaceEvidence = false;
  flags.sessionDataEvidence = false;

  return {
    verifiedSnapshot: verified.slice(0, 6),
    baselineFacts: baseline.slice(0, 8),
    dataLimitations: limits.slice(0, 8),
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildDerbyLayer() {
  const flags = buildDefaultUnsupportedClaimFlags();
  return {
    verifiedSnapshot: [
      "Derby / racing route — runner list, post positions, and prices must come only from the attached context JSON.",
    ],
    baselineFacts: [
      "Treat scratches and program changes as authoritative only when the same wording appears in the context payload.",
    ],
    dataLimitations: [
      "No syndicate or tote steam feed in UnderReview — lineMovementEvidence false.",
      "Track condition and weather claims require explicit condition fields in JSON — else weatherEvidence false.",
      "No NFL-style injury bundle — scratch status must be quoted from racing context only — injuryEvidence false unless payload shows it.",
    ],
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

function buildGenericLayer(sportHint) {
  const flags = buildDefaultUnsupportedClaimFlags();
  return {
    verifiedSnapshot: [`Route: ${sportHint || "generic"} — verify only from user prompt JSON.`],
    baselineFacts: ["Anchor to explicit fields in Available context JSON."],
    dataLimitations: [
      "No sport-specific board — line movement, weather, injuries, and scheme claims are capped unless JSON proves them.",
    ],
    unsupportedClaimFlags: flags,
    confidenceDrivers: [],
  };
}

/**
 * @param {object} opts
 * @returns {SportEvidenceLayer}
 */
export function buildSportEvidenceLayer(opts) {
  const {
    sportHint,
    question,
    nbaContextForModel,
    mlbContext,
    golfContext,
    f1Context,
    nflContext,
    context,
    players,
    liveMatches,
  } = opts;
  const sh = String(sportHint || "").toLowerCase();

  let layer;
  if (sh === "nba") layer = buildNbaLayer(question, nbaContextForModel);
  else if (sh === "mlb") layer = buildMlbLayer(mlbContext || {});
  else if (sh === "golf") layer = buildGolfLayer(golfContext || {});
  else if (sh === "f1") layer = buildF1Layer(f1Context || {});
  else if (sh === "tennis_wta_profile") layer = buildTennisWtaProfileLayer();
  else if (sh === "tennis") layer = buildTennisLayer({ context, players, liveMatches });
  else if (sh === "nfl") layer = buildNflLayer(nflContext);
  else if (sh === "derby" || sh === "horse_racing") layer = buildDerbyLayer();
  else layer = buildGenericLayer(sh);

  const drivers = Array.isArray(opts.confidenceDrivers) ? opts.confidenceDrivers : [];
  layer.confidenceDrivers = [...drivers, ...(layer.confidenceDrivers || [])];

  const thin = (layer.verifiedSnapshot?.length || 0) + (layer.baselineFacts?.length || 0) < 2;
  const thinMsg = "Thin deterministic snapshot — prefer process + watch-hooks over faux precision.";
  if (thin && !layer.dataLimitations.some((x) => String(x).includes("Thin deterministic snapshot"))) {
    layer.dataLimitations.push(thinMsg);
  }

  return layer;
}
