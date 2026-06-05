/** @file NBA matchup pool + grounding — extracted from handler.js */
import { extractNbaTeamAbbrevsFromQuestion } from "../../nba.js";
import { escapeRegExp, normalizeText } from "../prompt/normalize.js";

function nbaTeamSignals(team) {
  const out = new Set();
  const abbr = String(team?.abbr || "").toUpperCase();
  const name = String(team?.name || "").toLowerCase();
  if (abbr) out.add(abbr.toLowerCase());
  if (name) out.add(name);
  const cleaned = name.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned) {
    out.add(cleaned);
    const tokens = cleaned.split(" ").filter(Boolean);
    const last = tokens[tokens.length - 1];
    if (last && last.length >= 4) out.add(last);
  }
  return out;
}

export function resolveNbaMatchupFromQuestion(question, nbaContext) {
  const q = normalizeText(question);
  if (!q) return null;

  const abbrs = extractNbaTeamAbbrevsFromQuestion(question);
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];

  /** When today's slate has no game for the named teams, playoff bracket rows still identify the series. */
  const matchupFromPlayoffSeries = () => {
    if (abbrs.length < 2) return null;
    const seriesMatch = playoffSeries.find((row) => {
      const home = String(row?.home || "").toUpperCase();
      const away = String(row?.away || "").toUpperCase();
      if (!home || !away) return false;
      return abbrs.includes(home) && abbrs.includes(away);
    });
    if (!seriesMatch) return null;
    const awayAbbr = String(seriesMatch.away || "").toUpperCase();
    const homeAbbr = String(seriesMatch.home || "").toUpperCase();
    if (!awayAbbr || !homeAbbr) return null;
    return {
      awayAbbr,
      homeAbbr,
      label: `${awayAbbr} at ${homeAbbr}`,
      isSeriesOnly: true,
    };
  };

  if (games.length === 0) {
    return matchupFromPlayoffSeries();
  }

  if (abbrs.length >= 2) {
    const exact = games.find((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      return abbrs.includes(away) && abbrs.includes(home);
    });
    if (exact) {
      return {
        awayAbbr: String(exact?.awayTeam?.abbr || "").toUpperCase(),
        homeAbbr: String(exact?.homeTeam?.abbr || "").toUpperCase(),
        label: `${String(exact?.awayTeam?.abbr || "").toUpperCase()} at ${String(exact?.homeTeam?.abbr || "").toUpperCase()}`,
      };
    }
  }

  for (const g of games) {
    const awaySignals = nbaTeamSignals(g?.awayTeam);
    const homeSignals = nbaTeamSignals(g?.homeTeam);
    const awayHit = [...awaySignals].some((s) => q.includes(s));
    const homeHit = [...homeSignals].some((s) => q.includes(s));
    if (awayHit && homeHit) {
      const awayAbbr = String(g?.awayTeam?.abbr || "").toUpperCase();
      const homeAbbr = String(g?.homeTeam?.abbr || "").toUpperCase();
      if (!awayAbbr || !homeAbbr) continue;
      return {
        awayAbbr,
        homeAbbr,
        label: `${awayAbbr} at ${homeAbbr}`,
      };
    }
  }

  const fromSeries = matchupFromPlayoffSeries();
  if (fromSeries) return fromSeries;

  if (games.length === 1) {
    const g = games[0];
    const awayAbbr = String(g?.awayTeam?.abbr || "").toUpperCase();
    const homeAbbr = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (awayAbbr && homeAbbr) {
      return {
        awayAbbr,
        homeAbbr,
        label: `${awayAbbr} at ${homeAbbr}`,
      };
    }
  }

  return null;
}

export function buildAllowedMatchupPlayerPool(matchup, nbaContext) {
  const allowedTeams = matchup ? [matchup.awayAbbr, matchup.homeAbbr].filter(Boolean) : [];
  const teamSet = new Set(allowedTeams.map((t) => String(t || "").toUpperCase()));
  const playersByTeamAbbrev = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const byTeam = {};
  const playerToTeam = new Map();

  for (const team of teamSet) {
    byTeam[team] = [];
    for (const n of playersByTeamAbbrev?.[team] || []) {
      const name = String(n || "").trim();
      if (!name) continue;
      if (!byTeam[team].includes(name)) byTeam[team].push(name);
      if (!playerToTeam.has(name.toLowerCase())) playerToTeam.set(name.toLowerCase(), team);
    }
  }

  for (const row of nbaContext?.playerStats || []) {
    const team = String(row?.team || "").toUpperCase();
    const name = String(row?.name || "").trim();
    if (!teamSet.has(team) || !name) continue;
    if (!byTeam[team]) byTeam[team] = [];
    if (!byTeam[team].includes(name)) byTeam[team].push(name);
    if (!playerToTeam.has(name.toLowerCase())) playerToTeam.set(name.toLowerCase(), team);
  }

  const knownPlayerToTeam = new Map(playerToTeam);
  for (const row of nbaContext?.playerStats || []) {
    const name = String(row?.name || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (name && team && !knownPlayerToTeam.has(name.toLowerCase())) {
      knownPlayerToTeam.set(name.toLowerCase(), team);
    }
  }
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (name && team && !knownPlayerToTeam.has(name.toLowerCase())) {
      knownPlayerToTeam.set(name.toLowerCase(), team);
    }
  }

  for (const team of Object.keys(byTeam)) byTeam[team].sort();
  const allowedPlayers = [...playerToTeam.keys()].map((k) => {
    for (const [team, names] of Object.entries(byTeam)) {
      const found = names.find((n) => n.toLowerCase() === k);
      if (found) return found;
    }
    return k;
  });

  return {
    allowedTeams,
    allowedPlayers,
    byTeam,
    playerToTeam,
    knownPlayerToTeam,
  };
}

export function injectMatchupGroundingBlock(matchup, pool) {
  if (!matchup || !pool || pool.allowedTeams.length !== 2) return "";
  const awayPlayers = pool.byTeam[matchup.awayAbbr] || [];
  const homePlayers = pool.byTeam[matchup.homeAbbr] || [];
  const matchupQuality =
    awayPlayers.length >= 4 && homePlayers.length >= 4
      ? "full"
      : awayPlayers.length > 0 && homePlayers.length > 0
        ? "partial"
        : "thin";
  const awayList = awayPlayers.join(", ") || "(none grounded)";
  const homeList = homePlayers.join(", ") || "(none grounded)";
  return `VALID MATCHUP
- ${matchup.label}
VALID PLAYER POOL
- ${matchup.awayAbbr}: ${awayList}
- ${matchup.homeAbbr}: ${homeList}
- Focused matchup roster quality: ${matchupQuality}

MATCHUP ENFORCEMENT
- If you mention any player-specific prop or take, player must be from ${matchup.awayAbbr} or ${matchup.homeAbbr}.
- Do not mention players from other games/teams.
- If focused matchup roster quality is thin, use team-level analysis and do NOT guess player names. If it is full, use the authorized player names above normally.`;
}

export function buildOffMatchupPromptAcknowledgement(question, matchup, pool) {
  if (!matchup || !pool || pool.allowedTeams.length !== 2) return "";
  const knownMap = pool.knownPlayerToTeam;
  if (!knownMap || knownMap.size === 0) return "";
  const allowedTeamSet = new Set(pool.allowedTeams.map((t) => String(t || "").toUpperCase()));
  const mentioned = extractMentionedPlayersFromOutput(question, knownMap);
  if (!mentioned.length) return "";
  const offMatchup = mentioned
    .map((key) => {
      const team = String(knownMap.get(key) || "").toUpperCase();
      if (!team || allowedTeamSet.has(team)) return null;
      return key
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    })
    .filter(Boolean);
  if (!offMatchup.length) return "";
  const teamLabel = `${matchup.awayAbbr}/${matchup.homeAbbr}`;
  if (offMatchup.length === 1) {
    return `Limiting to ${teamLabel} players — ${offMatchup[0]} is not part of this matchup.`;
  }
  return `Limiting to ${teamLabel} players — ${offMatchup.join(", ")} are not part of this matchup.`;
}

export function extractMentionedPlayersFromOutput(output, knownPlayerToTeam) {
  const text = String(output || "");
  if (!text || !knownPlayerToTeam || knownPlayerToTeam.size === 0) return [];
  const names = [...knownPlayerToTeam.keys()]
    .map((k) => {
      const pretty = k
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      return { key: k, pretty };
    })
    .sort((a, b) => b.pretty.length - a.pretty.length);
  const hits = [];
  for (const n of names) {
    const re = new RegExp(`\\b${escapeRegExp(n.pretty)}\\b`, "i");
    if (re.test(text)) hits.push(n.key);
  }
  return [...new Set(hits)];
}

export function validatePlayersAgainstMatchup(mentionedPlayers, allowedTeamSet, playerToTeamMap) {
  const invalid = [];
  for (const p of mentionedPlayers || []) {
    const team = String(playerToTeamMap?.get(p) || "").toUpperCase();
    if (!team) continue;
    if (!allowedTeamSet.has(team)) {
      invalid.push({
        player: p
          .split(" ")
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join(" "),
        team,
      });
    }
  }
  return invalid;
}

export function repairOrRegenerateInvalidMatchupOutput({ matchup, pool, invalidPlayers }) {
  const away = matchup?.awayAbbr || "AWAY";
  const home = matchup?.homeAbbr || "HOME";
  const awayPlayers = (pool?.byTeam?.[away] || []).slice(0, 5).join(", ") || "(none grounded)";
  const homePlayers = (pool?.byTeam?.[home] || []).slice(0, 5).join(", ") || "(none grounded)";
  const invalidLine = (invalidPlayers || []).map((x) => `${x.player} (${x.team})`).join(", ");
  return `MATCHUP GROUNDING\nValid matchup: ${away} at ${home}.\nCross-game player mentions were removed: ${invalidLine}.\n\nVALID PLAYER POOL\n${away}: ${awayPlayers}\n${home}: ${homePlayers}\n\nNEXT ACTION\nUse only players from ${away} or ${home}. If you want player props, pick names from the valid pool above.`;
}
