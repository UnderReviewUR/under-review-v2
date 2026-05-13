/**
 * Server-only: whether context JSON contains deterministic matchup / trend / split
 * anchors sufficient to allow matchupStatsEvidence=true (never model-inferred).
 */

/** @param {unknown} obj */
function jsonLower(obj) {
  try {
    return JSON.stringify(obj ?? {}).toLowerCase();
  } catch {
    return "";
  }
}

/** @param {unknown} ctx */
export function nbaContextSupportsMatchupStatsEvidence(ctx) {
  if (!ctx || typeof ctx !== "object") return false;
  const j = jsonLower(ctx);
  if (
    /\b(last5|last_5|last10|l5|game_log|gamelog|recentgame|rolling|last\s*5|last\s*10)\b/.test(j)
  ) {
    return true;
  }
  if (
    /\b(def_rating|defrating|d_rtg|defrtg|defensive_rating|net_rating|nrtg|opponent|matchup|on_off|onoff|raptor|draptor|pace_factor|pacefactor)\b/.test(
      j,
    )
  ) {
    return true;
  }
  const stats = Array.isArray(ctx.playerStats) ? ctx.playerStats : [];
  for (const row of stats) {
    if (!row || typeof row !== "object") continue;
    if (row.last5 != null || row.last_5 != null || row.last10 != null || row.games != null)
      return true;
    if (Object.keys(row).some((k) => /^last5/i.test(k) || /^l5[^a-z]?/i.test(k))) return true;
    if (
      row.defRating != null ||
      row.def_rating != null ||
      row.netRating != null ||
      row.opponentDefense != null
    ) {
      return true;
    }
  }
  return false;
}

/** @param {unknown} ctx */
export function mlbContextSupportsMatchupStatsEvidence(ctx) {
  if (!ctx || typeof ctx !== "object") return false;
  const j = jsonLower(ctx);
  if (
    /\b(vs_lhp|vs_rhp|split|platoon|battervs|pitchervs|parkfactor|park_factor|xwoba|xba|barrel|handedness|lineupslot|battingorder)\b/.test(
      j,
    )
  ) {
    return true;
  }
  if (ctx.lineups && typeof ctx.lineups === "object" && Object.keys(ctx.lineups).length > 0)
    return true;
  const games = Array.isArray(ctx.games) ? ctx.games : [];
  for (const g of games) {
    if (!g || typeof g !== "object") continue;
    if (g.homeBattingOrder || g.awayBattingOrder || g.battingOrder) return true;
    if (g.probablePitcher || g.confirmedStarter || g.listedPitcher) return true;
  }
  return false;
}

/** @param {unknown} golfContext */
export function golfContextSupportsMatchupStatsEvidence(golfContext) {
  if (!golfContext || typeof golfContext !== "object") return false;
  const ev = golfContext.currentEvent;
  const courseStats = ev?.courseStats || golfContext.courseStats || golfContext.courseProfile;
  if (courseStats && typeof courseStats === "object" && Object.keys(courseStats).length > 0)
    return true;
  const j = jsonLower(golfContext);
  if (/\b(sg_putt|sg_app|sg_ott|sg_arg|strokes\s+gained|course_history|tee\s*time)\b/.test(j))
    return true;
  const lb = Array.isArray(ev?.leaderboard) ? ev.leaderboard : [];
  for (const row of lb) {
    if (!row || typeof row !== "object") continue;
    if (row.sg_total != null || row.sg_putt != null || row.sg_app != null || row.sg_ott != null)
      return true;
  }
  return false;
}

/**
 * @param {object} p
 * @param {unknown} p.context
 * @param {unknown} p.players
 * @param {unknown} p.liveMatches
 */
export function tennisContextSupportsMatchupStatsEvidence({ context, players, liveMatches }) {
  const j = jsonLower({ context, players, liveMatches });
  if (/\b(h2h|headtohead|head_to_head|last52|servestats|returnstats|rallyprofile|breakpct|holdpct)\b/.test(j))
    return true;
  return false;
}

/** @param {unknown} f1Context */
export function f1ContextSupportsMatchupStatsEvidence(f1Context) {
  if (!f1Context || typeof f1Context !== "object") return false;
  const sessions = f1Context.sessions || f1Context.sessionResults || f1Context.timing;
  const hasSession =
    (Array.isArray(sessions) && sessions.length > 0) ||
    (sessions && typeof sessions === "object" && Object.keys(sessions).length > 0) ||
    (f1Context.practice && typeof f1Context.practice === "object") ||
    (f1Context.qualifying && typeof f1Context.qualifying === "object");
  if (hasSession) return true;
  if (f1Context.weather || f1Context.forecast) return true;
  const j = jsonLower(f1Context);
  if (/\b(qualifyingresults|practice_results|laptime|sector\s*time|sessiontimes)\b/.test(j)) return true;
  return false;
}

/** @param {string} blob */
function nflBlobSupportsMatchupStatsEvidence(blob) {
  const b = String(blob || "");
  if (
    /\b(snap\s*%|snap\s+share|target\s+share|route\s*%|red\s*[- ]?zone\s+touches?|goal\s*[- ]?line|usage\s+rate|carry\s+share)\b/i.test(
      b,
    )
  ) {
    return true;
  }
  if (
    /\b(dvoa|pass\s+rush\s+win|coverage\s+grade|defensive\s+grade|yards\s+allowed|ypg\s+allowed|pressures?\s+per)\b/i.test(
      b,
    )
  ) {
    return true;
  }
  if (/\b(defense|defensive)\b/i.test(b) && /\b(tier|rank|grade|rankings?)\b/i.test(b)) return true;
  return false;
}

/** @param {unknown} nflContext */
export function nflContextSupportsMatchupStatsEvidence(nflContext) {
  let blob = "";
  if (nflContext == null) return false;
  if (typeof nflContext === "string") blob = nflContext;
  else {
    try {
      blob = JSON.stringify(nflContext);
    } catch {
      return false;
    }
  }
  return nflBlobSupportsMatchupStatsEvidence(blob);
}
