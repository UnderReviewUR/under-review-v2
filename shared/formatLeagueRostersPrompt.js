/**
 * Compact roster blocks for Ask prompts — sourced from live BDL / ESPN pockets.
 */

const NFL_SKILL = new Set(["QB", "RB", "WR", "TE", "FB"]);

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {number} max
 */
function pickNflRosterNames(rows, max = 28) {
  const list = Array.isArray(rows) ? rows : [];
  const skill = [];
  const rest = [];
  for (const r of list) {
    const name = String(r?.name || "").trim();
    if (!name) continue;
    const pos = String(r?.position || r?.role || "")
      .toUpperCase()
      .replace(/[0-9]/g, "");
    if (NFL_SKILL.has(pos) || /^QB|RB|WR|TE/.test(pos)) skill.push(name);
    else rest.push(name);
  }
  return [...skill, ...rest].slice(0, max);
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} rostersByTeam
 * @param {{ scopeAbbrs?: Set<string>|string[], maxTeams?: number, maxPlayersPerTeam?: number, label?: string }} [opts]
 */
export function formatNflRostersPromptBlock(rostersByTeam, opts = {}) {
  const map = rostersByTeam && typeof rostersByTeam === "object" ? rostersByTeam : {};
  let teams = Object.keys(map).sort();
  const scope = opts.scopeAbbrs;
  if (scope instanceof Set && scope.size > 0) {
    teams = teams.filter((t) => scope.has(String(t).toUpperCase()));
  } else if (Array.isArray(scope) && scope.length > 0) {
    const s = new Set(scope.map((x) => String(x).toUpperCase()));
    teams = teams.filter((t) => s.has(String(t).toUpperCase()));
  }
  const maxTeams = Math.max(1, Number(opts.maxTeams) || (teams.length <= 2 ? teams.length : 4));
  const maxPlayers = Math.max(8, Number(opts.maxPlayersPerTeam) || 28);
  const slice = teams.slice(0, maxTeams);
  if (!slice.length) return "";

  const lines = slice.map((team) => {
    const names = pickNflRosterNames(map[team], maxPlayers);
    return `${team}: ${names.length ? names.join(", ") : "(empty)"}`;
  });
  const label = opts.label || "NFL VERIFIED ROSTERS (BDL + ESPN)";
  const more = teams.length > slice.length ? `\n(${teams.length - slice.length} more teams in payload)` : "";
  return `${label}:\n${lines.join("\n")}${more}`;
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} rostersByTeam
 * @param {{ maxTeams?: number, maxPlayersPerTeam?: number, label?: string }} [opts]
 */
export function formatLaligaRostersPromptBlock(rostersByTeam, opts = {}) {
  const map = rostersByTeam && typeof rostersByTeam === "object" ? rostersByTeam : {};
  const teams = Object.keys(map).sort();
  const maxTeams = Math.max(1, Number(opts.maxTeams) || Math.min(teams.length, 20));
  const maxPlayers = Math.max(6, Number(opts.maxPlayersPerTeam) || 22);
  const slice = teams.slice(0, maxTeams);
  if (!slice.length) return "";

  const lines = slice.map((team) => {
    const names = (map[team] || [])
      .map((r) => String(r?.name || "").trim())
      .filter(Boolean)
      .slice(0, maxPlayers);
    return `${team}: ${names.length ? names.join(", ") : "(empty)"}`;
  });
  const label = opts.label || "LA LIGA VERIFIED SQUADS (BDL)";
  const more = teams.length > slice.length ? `\n(${teams.length - slice.length} more clubs in payload)` : "";
  return `${label}:\n${lines.join("\n")}${more}`;
}
