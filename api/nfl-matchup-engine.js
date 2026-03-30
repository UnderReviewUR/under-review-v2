// api/nfl-matchup-engine.js
// Matchup extraction + scoring engine for UR Take
//
// This engine is intentionally deterministic and lightweight.
// It does not call external services.
// It pulls from your local NFL data files and returns prompt-ready slices.

import NFL_QBS from "./nfl-qb.js";
import NFL_RBS from "./nfl-rb.js";
import wrte from "./nfl-wr-te.js";
import { NFL_DEFENSE, TEAM_ALIASES, normalizeDefenseTeamName, getDefenseByTeam } from "./nfl-defense.js";

const { wr: NFL_WRS = {}, te: NFL_TES = {} } = wrte || {};

export const ALL_OFFENSIVE_PLAYERS = {
  ...NFL_QBS,
  ...NFL_RBS,
  ...NFL_WRS,
  ...NFL_TES,
};

export const TEAM_TO_QB = Object.fromEntries(
  Object.entries(NFL_QBS).map(([name, data]) => [data.team, name])
);

export const TEAM_TO_SKILL_PLAYERS = Object.entries({
  ...NFL_RBS,
  ...NFL_WRS,
  ...NFL_TES,
}).reduce((acc, [name, data]) => {
  if (!acc[data.team]) acc[data.team] = [];
  acc[data.team].push({ name, ...data });
  return acc;
}, {});

export function normalizeTeam(input = "") {
  return normalizeDefenseTeamName(input);
}

export function detectMentionedTeams(question = "") {
  const q = question.toLowerCase();
  const found = new Set();

  Object.entries(TEAM_ALIASES).forEach(([alias, abbr]) => {
    if (q.includes(alias)) found.add(abbr);
  });

  Object.keys(NFL_DEFENSE).forEach((abbr) => {
    if (q.includes(abbr.toLowerCase())) found.add(abbr);
  });

  Object.values(ALL_OFFENSIVE_PLAYERS).forEach((p) => {
    if (p.team && q.includes(String(p.team).toLowerCase())) found.add(p.team);
  });

  return Array.from(found);
}

export function detectMentionedPlayers(question = "") {
  const q = question.toLowerCase();
  const found = {};

  for (const [name, data] of Object.entries(ALL_OFFENSIVE_PLAYERS)) {
    const parts = name.toLowerCase().split(" ");
    const matchedName = parts.some((part) => part.length > 3 && q.includes(part));
    const matchedFull = q.includes(name.toLowerCase());
    if (matchedName || matchedFull) {
      found[name] = data;
    }
  }

  return found;
}

export function inferPlayerTeamFromQuestion(question = "") {
  const mentionedPlayers = detectMentionedPlayers(question);
  const teamSet = new Set();

  Object.values(mentionedPlayers).forEach((p) => {
    if (p.team) teamSet.add(p.team);
  });

  return Array.from(teamSet);
}

export function getPlayersByTeam(team) {
  const abbr = normalizeTeam(team) || team;
  const qbName = TEAM_TO_QB[abbr];
  const qb = qbName ? { [qbName]: NFL_QBS[qbName] } : {};
  const skills = (TEAM_TO_SKILL_PLAYERS[abbr] || []).reduce((acc, p) => {
    acc[p.name] = p;
    return acc;
  }, {});
  return { ...qb, ...skills };
}

export function getRelevantOffense(question = "") {
  const mentionedPlayers = detectMentionedPlayers(question);
  if (Object.keys(mentionedPlayers).length > 0) return mentionedPlayers;

  const mentionedTeams = detectMentionedTeams(question);
  if (mentionedTeams.length > 0) {
    return mentionedTeams.reduce((acc, team) => {
      return { ...acc, ...getPlayersByTeam(team) };
    }, {});
  }

  return ALL_OFFENSIVE_PLAYERS;
}

export function getRelevantDefense(question = "") {
  const teams = detectMentionedTeams(question);
  if (teams.length === 0) return {};

  return teams.reduce((acc, team) => {
    const defense = getDefenseByTeam(team);
    if (defense) acc[team] = defense;
    return acc;
  }, {});
}

export function detectStatIntent(question = "") {
  const q = question.toLowerCase();

  const passingSignals = [
    "passing",
    "pass",
    "qb",
    "quarterback",
    "air yards",
    "completions",
    "attempts",
    "interceptions",
    "passing yards",
    "passing td",
    "pass tds",
  ];

  const rushingSignals = [
    "rushing",
    "rush",
    "rb",
    "running back",
    "ypc",
    "carries",
    "rush yards",
    "rushing yards",
    "td scorer",
    "touchdown",
  ];

  const receivingSignals = [
    "receiving",
    "receiver",
    "wr",
    "te",
    "tight end",
    "targets",
    "catches",
    "receptions",
    "receiving yards",
  ];

  const defenseSignals = [
    "defense",
    "pass defense",
    "run defense",
    "secondary",
    "front seven",
    "pressure",
    "blitz",
    "sacks",
    "takeaways",
    "interceptions",
  ];

  return {
    wantsPassing: passingSignals.some((s) => q.includes(s)),
    wantsRushing: rushingSignals.some((s) => q.includes(s)),
    wantsReceiving: receivingSignals.some((s) => q.includes(s)),
    wantsDefense: defenseSignals.some((s) => q.includes(s)),
  };
}

export function buildPositionSummary(playerName, playerData, opposingDefense = null) {
  const pos = playerData.pos || "QB";

  if (!opposingDefense) {
    return {
      player: playerName,
      team: playerData.team,
      pos,
      matchupTag: "No direct defense context",
      keys: [],
    };
  }

  if (pos === "RB") {
    const keys = [
      `Opp rush yds allowed/g: ${opposingDefense.runDefense.rushYdsAllowedPg ?? "n/a"}`,
      `Opp YPC allowed: ${opposingDefense.runDefense.ypcAllowed ?? "n/a"}`,
      `Opp rush TD allowed: ${opposingDefense.runDefense.rushTdAllowed ?? "n/a"}`,
      `Opp stuff rate: ${opposingDefense.runDefense.stuffRate ?? "n/a"}%`,
    ];
    return {
      player: playerName,
      team: playerData.team,
      pos,
      matchupTag: "RB vs run defense",
      keys,
    };
  }

  if (pos === "WR" || pos === "TE") {
    const volumeSplit =
      pos === "TE"
        ? opposingDefense.splits.vsTERecYdsAllowedPg
        : opposingDefense.splits.vsWRRecYdsAllowedPg;

    const keys = [
      `Opp pass yds allowed/g: ${opposingDefense.passDefense.passYdsAllowedPg ?? "n/a"}`,
      `Opp QB rating allowed: ${opposingDefense.passDefense.qbRatingAllowed ?? "n/a"}`,
      `Opp pressure rate: ${opposingDefense.pressure.pressureRate ?? "n/a"}%`,
      `Opp vs ${pos} rec yds/g: ${volumeSplit ?? "n/a"}`,
    ];

    return {
      player: playerName,
      team: playerData.team,
      pos,
      matchupTag: `${pos} vs pass defense`,
      keys,
    };
  }

  const keys = [
    `Opp pass yds allowed/g: ${opposingDefense.passDefense.passYdsAllowedPg ?? "n/a"}`,
    `Opp YPA allowed: ${opposingDefense.passDefense.ypaAllowed ?? "n/a"}`,
    `Opp sack rate: ${opposingDefense.passDefense.sackRate ?? "n/a"}%`,
    `Opp pressure rate: ${opposingDefense.pressure.pressureRate ?? "n/a"}%`,
    `Opp INT forced: ${opposingDefense.passDefense.intForced ?? "n/a"}`,
  ];

  return {
    player: playerName,
    team: playerData.team,
    pos,
    matchupTag: "QB vs pass defense",
    keys,
  };
}

function safeNumber(v) {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

function addScore(score, delta) {
  if (!Number.isFinite(delta)) return score;
  return score + delta;
}

export function scoreQbVsDefense(qb, defense) {
  if (!qb || !defense) return null;

  let score = 50;

  const qbr = safeNumber(qb.passing?.qbr);
  const ypa = safeNumber(qb.passing?.ypa);
  const intRate = safeNumber(qb.passing?.int) && safeNumber(qb.passing?.gs)
    ? qb.passing.int / qb.passing.gs
    : null;
  const rushYdsPg = safeNumber(qb.rushing?.ydsPg);

  const passYdsAllowedPg = safeNumber(defense.passDefense?.passYdsAllowedPg);
  const ypaAllowed = safeNumber(defense.passDefense?.ypaAllowed);
  const pressureRate = safeNumber(defense.pressure?.pressureRate);
  const sackRate = safeNumber(defense.passDefense?.sackRate);
  const intForced = safeNumber(defense.passDefense?.intForced);

  if (qbr !== null) score = addScore(score, (qbr - 55) * 0.35);
  if (ypa !== null) score = addScore(score, (ypa - 7.0) * 4.5);
  if (rushYdsPg !== null) score = addScore(score, Math.min(rushYdsPg, 45) * 0.22);

  if (passYdsAllowedPg !== null) score = addScore(score, (passYdsAllowedPg - 215) * 0.08);
  if (ypaAllowed !== null) score = addScore(score, (ypaAllowed - 6.5) * 5.0);
  if (pressureRate !== null) score = addScore(score, (22 - pressureRate) * 0.8);
  if (sackRate !== null) score = addScore(score, (7 - sackRate) * 1.2);
  if (intForced !== null) score = addScore(score, (12 - intForced) * 0.45);

  if (intRate !== null) score = addScore(score, (0.8 - intRate) * 7);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreRbVsDefense(rb, defense) {
  if (!rb || !defense) return null;

  let score = 50;

  const ydsPg =
    safeNumber(rb.rush2025?.ydsPg) ??
    safeNumber(rb.rec2025?.ydsPg) ??
    safeNumber(rb.ydsPg);

  const tdRate = safeNumber(rb.props?.td?.pg);
  const rushAllowed = safeNumber(defense.runDefense?.rushYdsAllowedPg);
  const ypcAllowed = safeNumber(defense.runDefense?.ypcAllowed);
  const rushTdAllowed = safeNumber(defense.runDefense?.rushTdAllowed);
  const stuffRate = safeNumber(defense.runDefense?.stuffRate);

  if (ydsPg !== null) score = addScore(score, (ydsPg - 65) * 0.22);
  if (tdRate !== null) score = addScore(score, tdRate * 11);

  if (rushAllowed !== null) score = addScore(score, (rushAllowed - 105) * 0.12);
  if (ypcAllowed !== null) score = addScore(score, (ypcAllowed - 4.2) * 7);
  if (rushTdAllowed !== null) score = addScore(score, (rushTdAllowed - 11) * 0.8);
  if (stuffRate !== null) score = addScore(score, (20 - stuffRate) * 0.7);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreReceiverVsDefense(receiver, defense) {
  if (!receiver || !defense) return null;

  let score = 50;

  const ydsPg = safeNumber(receiver.rec2025?.ydsPg) ?? safeNumber(receiver.ydsPg);
  const recPg = safeNumber(receiver.rec2025?.recPg);
  const tdRate = safeNumber(receiver.props?.td?.pg);

  const passYdsAllowedPg = safeNumber(defense.passDefense?.passYdsAllowedPg);
  const pressureRate = safeNumber(defense.pressure?.pressureRate);
  const vsWR = safeNumber(defense.splits?.vsWRRecYdsAllowedPg);
  const vsTE = safeNumber(defense.splits?.vsTERecYdsAllowedPg);

  const isTE = receiver.pos === "TE";
  const split = isTE ? vsTE : vsWR;

  if (ydsPg !== null) score = addScore(score, (ydsPg - 55) * 0.24);
  if (recPg !== null) score = addScore(score, (recPg - 4.5) * 2.1);
  if (tdRate !== null) score = addScore(score, tdRate * 8.5);

  if (passYdsAllowedPg !== null) score = addScore(score, (passYdsAllowedPg - 215) * 0.08);
  if (pressureRate !== null) score = addScore(score, (22 - pressureRate) * 0.85);
  if (split !== null) score = addScore(score, (split - (isTE ? 44 : 138)) * 0.1);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scorePlayerVsDefense(playerName, playerData, defense) {
  if (!playerData || !defense) return null;

  const pos = playerData.pos || "QB";

  if (pos === "RB") return scoreRbVsDefense(playerData, defense);
  if (pos === "WR" || pos === "TE") return scoreReceiverVsDefense(playerData, defense);
  return scoreQbVsDefense(playerData, defense);
}

export function classifyMatchup(score) {
  if (score === null || score === undefined) return "NO EDGE";
  if (score >= 72) return "SMASH";
  if (score >= 61) return "LEAN OVER / FAVORABLE";
  if (score >= 48) return "NEUTRAL";
  if (score >= 38) return "LEAN UNDER / TOUGH";
  return "FADE / BAD MATCHUP";
}

export function buildPlayerMatchupCard(playerName, playerData, defense) {
  const score = scorePlayerVsDefense(playerName, playerData, defense);
  const classification = classifyMatchup(score);
  const summary = buildPositionSummary(playerName, playerData, defense);

  return {
    player: playerName,
    team: playerData.team,
    position: playerData.pos || "QB",
    defense: defense?.team || null,
    matchupScore: score,
    classification,
    summary,
  };
}

export function inferOpponentDefense(question = "", explicitDefenseTeam = null) {
  if (explicitDefenseTeam) return getDefenseByTeam(explicitDefenseTeam);

  const teams = detectMentionedTeams(question);
  if (teams.length === 0) return null;

  // If user mentions one team and one player from another team, use the mentioned team as the defense.
  const players = detectMentionedPlayers(question);
  const playerTeams = new Set(Object.values(players).map((p) => p.team).filter(Boolean));

  for (const team of teams) {
    if (!playerTeams.has(team)) {
      return getDefenseByTeam(team);
    }
  }

  // Fallback: first mentioned team
  return getDefenseByTeam(teams[0]);
}

export function getRelevantPromptContext(question = "") {
  const players = getRelevantOffense(question);
  const defenses = getRelevantDefense(question);

  return {
    players,
    defenses,
    intents: detectStatIntent(question),
  };
}

export function buildPromptContextBlock(question = "") {
  const { players, defenses, intents } = getRelevantPromptContext(question);

  return {
    intents,
    players,
    defenses,
    playersJson: JSON.stringify(players, null, 0).slice(0, 14000),
    defensesJson: JSON.stringify(defenses, null, 0).slice(0, 12000),
  };
}

export function buildSingleQuestionMatchupView(question = "") {
  const mentionedPlayers = detectMentionedPlayers(question);
  const defense = inferOpponentDefense(question);

  const cards = Object.entries(mentionedPlayers).map(([name, data]) =>
    buildPlayerMatchupCard(name, data, defense)
  );

  return {
    mentionedPlayers,
    defense,
    cards,
  };
}

export function buildTeamOffenseVsDefenseSnapshot(offenseTeam, defenseTeam) {
  const offense = getPlayersByTeam(offenseTeam);
  const defense = getDefenseByTeam(defenseTeam);

  if (!defense) {
    return {
      offenseTeam,
      defenseTeam,
      error: "Defense not found",
    };
  }

  const cards = Object.entries(offense).map(([name, data]) =>
    buildPlayerMatchupCard(name, data, defense)
  );

  return {
    offenseTeam,
    defenseTeam,
    defense,
    cards,
  };
}

export function buildUrTakeNflContext(question = "") {
  const promptContext = buildPromptContextBlock(question);
  const matchupView = buildSingleQuestionMatchupView(question);

  return {
    intents: promptContext.intents,
    relevantPlayers: promptContext.players,
    relevantDefenses: promptContext.defenses,
    matchupView,
    playersJson: promptContext.playersJson,
    defensesJson: promptContext.defensesJson,
  };
}

export default {
  normalizeTeam,
  detectMentionedTeams,
  detectMentionedPlayers,
  inferPlayerTeamFromQuestion,
  getPlayersByTeam,
  getRelevantOffense,
  getRelevantDefense,
  detectStatIntent,
  buildPositionSummary,
  scoreQbVsDefense,
  scoreRbVsDefense,
  scoreReceiverVsDefense,
  scorePlayerVsDefense,
  classifyMatchup,
  buildPlayerMatchupCard,
  inferOpponentDefense,
  getRelevantPromptContext,
  buildPromptContextBlock,
  buildSingleQuestionMatchupView,
  buildTeamOffenseVsDefenseSnapshot,
  buildUrTakeNflContext,
};
