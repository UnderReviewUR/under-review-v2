/**
 * Normalize BallDontLie FIFA group_standings payloads into { A: [...teams], B: [...] }.
 * Handles nested group objects and flat per-team rows (GOAT API shape).
 */

/** @param {unknown} groupField */
function groupLetterFromField(groupField) {
  if (groupField && typeof groupField === "object") {
    const name = String(groupField.name || groupField.label || groupField.letter || "").trim();
    if (name) return name.toUpperCase().replace(/^GROUP\s*/i, "");
  }
  if (typeof groupField === "string" && groupField.trim()) {
    return groupField.trim().toUpperCase().replace(/^GROUP\s*/i, "");
  }
  return "";
}

/** @param {Record<string, unknown>} row */
function groupLetterFromRow(row) {
  const fromGroup = groupLetterFromField(row?.group);
  if (fromGroup) return fromGroup;
  return String(row?.name || row?.letter || "")
    .trim()
    .toUpperCase()
    .replace(/^GROUP\s*/i, "");
}

/** @param {unknown} teamField */
function teamAbbrevFromField(teamField) {
  if (teamField && typeof teamField === "object") {
    return String(
      teamField.abbreviation || teamField.abbr || teamField.code || teamField.name || "",
    ).trim();
  }
  return String(teamField || "").trim();
}

/** @param {Record<string, unknown>} t */
function mapTeamStandingRow(t) {
  return {
    team: teamAbbrevFromField(t?.team) || String(t.name || t.abbreviation || t.abbr || "").trim(),
    played: Number(t.played ?? t.mp ?? t.games_played ?? 0),
    won: Number(t.won ?? t.w ?? t.win ?? 0),
    drawn: Number(t.drawn ?? t.d ?? t.draw ?? 0),
    lost: Number(t.lost ?? t.l ?? t.loss ?? 0),
    gf: Number(t.gf ?? t.goals_for ?? t.for ?? 0),
    ga: Number(t.ga ?? t.goals_against ?? t.against ?? 0),
    gd: Number(t.gd ?? t.goal_difference ?? 0),
    points: Number(t.points ?? t.pts ?? 0),
  };
}

/** @param {unknown} row */
function isFlatBdlStandingRow(row) {
  if (!row || typeof row !== "object") return false;
  const nested =
    (Array.isArray(row.standings) && row.standings.length > 0) ||
    (Array.isArray(row.teams) && row.teams.length > 0);
  if (nested) return false;
  const hasGroup =
    (row.group && typeof row.group === "object") ||
    (typeof row.group === "string" && row.group.trim());
  const hasTeam =
    row.team != null ||
    row.name != null ||
    row.abbreviation != null ||
    row.abbr != null;
  return Boolean(hasGroup && hasTeam);
}

/**
 * @param {unknown} data — BDL JSON body or inner data array
 * @returns {Record<string, Array<{ team: string, played: number, won: number, drawn: number, lost: number, gf: number, ga: number, gd: number, points: number }>>}
 */
export function normalizeBdlGroupStandings(data) {
  const groups = {};
  const rawGroups =
    data?.groups ||
    data?.group_standings ||
    data?.data ||
    (Array.isArray(data) ? data : null);
  if (!rawGroups) return groups;

  const mapTeams = (teams) => (teams || []).map((t) => mapTeamStandingRow(t));

  if (Array.isArray(rawGroups)) {
    for (const g of rawGroups) {
      const nestedTeams = Array.isArray(g?.standings)
        ? g.standings
        : Array.isArray(g?.teams)
          ? g.teams
          : null;

      if (nestedTeams?.length) {
        const letter = groupLetterFromRow(g);
        if (!letter) continue;
        groups[letter] = mapTeams(nestedTeams);
        continue;
      }

      if (isFlatBdlStandingRow(g)) {
        const letter = groupLetterFromRow(g);
        if (!letter) continue;
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(mapTeamStandingRow(g));
      }
    }
    return groups;
  }

  if (typeof rawGroups === "object") {
    for (const [key, teams] of Object.entries(rawGroups)) {
      const letter = String(key).trim().toUpperCase().replace(/^GROUP\s*/i, "");
      if (!Array.isArray(teams)) continue;
      groups[letter] = mapTeams(teams);
    }
  }
  return groups;
}
