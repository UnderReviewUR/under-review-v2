import {
  getActiveDraftBundle,
  getNflTeamAbbrFromName,
  getNflTeamNameFromAbbr,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";

const NEED_POSITION_MAP = {
  EDGE: ["EDGE"],
  IDL: ["DT", "IDL"],
  IOL: ["G", "C", "IOL"],
  CB: ["CB"],
  WR: ["WR"],
  QB: ["QB"],
  RB: ["RB"],
  LB: ["LB"],
  TE: ["TE"],
  S: ["SAF", "S"],
  OT: ["OT"],
};

export function parseProjectedRange(projectedRange) {
  const m = String(projectedRange || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return [1, 999];
  return [Number(m[1]), Number(m[2])];
}

/** Pick must fall within consensus window with controlled early reach / late slide slack. */
export function isProspectRealisticAtPick(candidate, pickOverall, chaosMode = false) {
  const [lo, hi] = parseProjectedRange(candidate.projectedRange);
  const lateCap = hi + (chaosMode ? 14 : 10);
  const earlyFloor = lo - (chaosMode ? 3 : 0);
  if (pickOverall > lateCap) return false;
  if (pickOverall < earlyFloor) return false;
  return true;
}

function placementStretchNote(candidate, pickOverall, chaosMode) {
  const [lo, hi] = parseProjectedRange(candidate.projectedRange);
  if (pickOverall < lo) {
    return ` Consensus typically slots ${candidate.name} closer to ${lo}-${hi}${chaosMode ? "" : " — taking him here is a reach"}; fit still urgent at ${pickOverall}.`;
  }
  if (pickOverall > hi) {
    return ` Board slide vs ${lo}-${hi} band — value at ${pickOverall}.`;
  }
  return "";
}

function toProspectRows(bundle) {
  return (bundle?.prospects || [])
    .map((p) => ({
      name: p.name,
      position: p.position,
      school: p.school,
      overallRank: Number(p.overallRank || 999),
      consensusRank: Number(p.consensusRank ?? p.overallRank ?? 999),
      positionalRank: Number(p.positionalRank || 999),
      projectedRange: p.projectedRange || "103-140",
      projectedRound: Number(p.projectedRound || 4),
    }))
    .sort((a, b) => a.consensusRank - b.consensusRank);
}

function availableAtPick(candidate, pickOverall, chaosMode) {
  return isProspectRealisticAtPick(candidate, pickOverall, chaosMode);
}

function candidatesAtPick(pool, pickOverall, chaosMode) {
  let c = pool.filter((p) => availableAtPick(p, pickOverall, chaosMode));
  if (!c.length) c = pool.filter((p) => availableAtPick(p, pickOverall, true));
  return c;
}

function bestForNeed(available, need) {
  const accepted = NEED_POSITION_MAP[need] || [need];
  const pool = available.filter((p) => accepted.includes(p.position));
  return pool[0] || null;
}

function bestOverall(available) {
  return available[0] || null;
}

function removeFromPool(pool, name) {
  const i = pool.findIndex((p) => p.name === name);
  if (i >= 0) pool.splice(i, 1);
}

function hashSeed(value) {
  let h = 0;
  for (const ch of String(value || "")) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function pickChaosEvent(teamAbbr, picks) {
  const seed = hashSeed(`${teamAbbr}:${picks.length}`);
  const options = [
    "trade_up_ahead",
    "medical_fall",
    "trade_back",
    "rival_qb_reach",
  ];
  return options[seed % options.length];
}

function applyChaosEvent({ chaosEvent, pick, pool, need, teamName }) {
  if (chaosEvent === "trade_up_ahead") {
    const stolen = bestForNeed(pool, need) || bestOverall(pool);
    if (!stolen) return null;
    removeFromPool(pool, stolen.name);
    return `${teamName}: a team jumps ahead of pick ${pick.overall} and takes ${stolen.name}, forcing a pivot.`;
  }
  if (chaosEvent === "medical_fall") {
    const faller = pool.find((p) => p.position === "EDGE" && p.overallRank <= 12) || bestOverall(pool);
    if (!faller) return null;
    return `${teamName}: a medical concern on ${faller.name} drops him into your range unexpectedly.`;
  }
  if (chaosEvent === "trade_back") {
    return `${teamName}: you trade back from ${pick.overall} into the late teens and add extra day-two capital while staying in your need lane.`;
  }
  if (chaosEvent === "rival_qb_reach") {
    const qb = pool.find((p) => p.position === "QB");
    if (!qb) return null;
    removeFromPool(pool, qb.name);
    return `${teamName}: a rival reaches for ${qb.name} earlier than expected, pushing value at your priority position down the board.`;
  }
  return null;
}

function chooseProspectForPick({ pool, pick, needs, chaosMode, chaosEvent, teamName }) {
  const primaryNeed = needs[0] || null;
  let chaosText = null;
  if (chaosMode && chaosEvent && pick.round === 1) {
    chaosText = applyChaosEvent({ chaosEvent, pick, pool, need: primaryNeed, teamName });
  }

  let refreshedAvailable = candidatesAtPick(pool, pick.overall, chaosMode);
  if (!refreshedAvailable.length) return null;

  const needPool = needs
    .map((need) => ({ need, candidate: bestForNeed(refreshedAvailable, need) }))
    .filter((r) => r.candidate);
  const selected = needPool[0]?.candidate || bestOverall(refreshedAvailable);
  if (!selected) return null;

  removeFromPool(pool, selected.name);
  const stretch = placementStretchNote(selected, pick.overall, chaosMode);
  return {
    round: pick.round,
    overall: pick.overall,
    player: selected.name,
    position: selected.position,
    school: selected.school,
    why: `${selected.position} fills ${needs.join("/")} lane at slot ${pick.overall}.${stretch}`,
    chaosText,
  };
}

export function resolveTeamAbbr(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  if (s.length <= 4) {
    const abbr = s.toUpperCase();
    return getNflTeamNameFromAbbr(abbr) ? abbr : null;
  }
  const fromQuestion = resolveNflTeamFromQuestion(s);
  if (!fromQuestion) return null;
  return getNflTeamAbbrFromName(fromQuestion);
}

export function simulateDraftRounds({ teamAbbr, rounds = 3, chaosMode = false }) {
  const bundle = getActiveDraftBundle();
  const normalizedAbbr = resolveTeamAbbr(teamAbbr);
  const team = normalizedAbbr ? bundle.teams?.[normalizedAbbr] : null;
  if (!team) return { error: `No draft state found for ${teamAbbr}` };

  const picks = (team.picks || []).filter((p) => p.round <= rounds).sort((a, b) => a.overall - b.overall);
  const needs = Array.isArray(team.needPriority) && team.needPriority.length ? team.needPriority : team.needs || [];
  const pool = toProspectRows(bundle);
  const chaosEvent = chaosMode ? pickChaosEvent(normalizedAbbr, picks) : null;

  const simulatedPicks = [];
  let chaosNarrative = null;
  for (const pick of picks) {
    const row = chooseProspectForPick({
      pool,
      pick,
      needs,
      chaosMode,
      chaosEvent,
      teamName: team.teamName || normalizedAbbr,
    });
    if (!row) continue;
    if (row.chaosText && !chaosNarrative) chaosNarrative = row.chaosText;
    simulatedPicks.push({
      round: row.round,
      overall: row.overall,
      player: row.player,
      position: row.position,
      school: row.school,
      why: row.why,
    });
  }

  const narrative = simulatedPicks.length
    ? `${team.teamName}: ${simulatedPicks.length} picks across rounds 1-${rounds} centered on ${needs.join(", ")}.`
    : `${team.teamName}: no picks available in rounds 1-${rounds} in current bundle.`;

  return {
    team: normalizedAbbr,
    teamName: team.teamName,
    picks: simulatedPicks,
    chaosEvent: chaosMode ? chaosNarrative || `${team.teamName}: board volatility shifted value unexpectedly.` : null,
    narrative,
  };
}
