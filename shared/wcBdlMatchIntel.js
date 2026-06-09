/**
 * BDL GOAT match depth — shots, momentum, best players, avg positions, team form.
 */

function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, string>} [playerNameById]
 */
export function summarizeBdlMatchShots(rows, playerNameById = {}) {
  const shots = rows || [];
  if (!shots.length) return null;

  /** @type {{ home: { count: number, xg: number, sot: number, goals: number }, away: { count: number, xg: number, sot: number, goals: number } }} */
  const bySide = {
    home: { count: 0, xg: 0, sot: 0, goals: 0 },
    away: { count: 0, xg: 0, sot: 0, goals: 0 },
  };

  /** @type {Array<Record<string, unknown>>} */
  const highlights = [];

  for (const s of shots) {
    const side = s.is_home === true ? "home" : "away";
    const bucket = bySide[side];
    bucket.count += 1;
    const xg = Number(s.xg);
    if (Number.isFinite(xg)) bucket.xg += xg;
    const type = String(s.shot_type || "").toLowerCase();
    if (type === "goal") bucket.goals += 1;
    if (["goal", "save"].includes(type)) bucket.sot += 1;

    if (["goal", "save"].includes(type) && highlights.length < 8) {
      const pid = s.player_id != null ? String(s.player_id) : "";
      highlights.push({
        minute: s.time_minute != null ? Number(s.time_minute) : null,
        side,
        type,
        xg: Number.isFinite(xg) ? round3(xg) : null,
        xgot: s.xgot != null && Number.isFinite(Number(s.xgot)) ? round3(Number(s.xgot)) : null,
        player: playerNameById[pid] || (pid ? `player ${pid}` : null),
      });
    }
  }

  return {
    total: shots.length,
    home: { ...bySide.home, xg: round3(bySide.home.xg) },
    away: { ...bySide.away, xg: round3(bySide.away.xg) },
    highlights,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function summarizeBdlMatchMomentum(rows) {
  const points = (rows || [])
    .map((r) => ({
      minute: Number(r.minute),
      value: Number(r.value),
    }))
    .filter((p) => Number.isFinite(p.minute) && Number.isFinite(p.value))
    .sort((a, b) => a.minute - b.minute);

  if (!points.length) return null;

  const latest = points[points.length - 1];
  const tail = points.filter((p) => p.minute >= latest.minute - 15);
  const tailAvg =
    tail.length > 0 ? tail.reduce((s, p) => s + p.value, 0) / tail.length : null;
  const peak = points.reduce(
    (best, p) => (Math.abs(p.value) > Math.abs(best.value) ? p : best),
    points[0],
  );

  return {
    pointCount: points.length,
    latestMinute: latest.minute,
    latestValue: round3(latest.value),
    last15Avg: tailAvg != null ? round3(tailAvg) : null,
    peakMinute: peak.minute,
    peakValue: round3(peak.value),
    lean:
      latest.value > 0.05 ? "home" : latest.value < -0.05 ? "away" : "neutral",
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, string>} [playerNameById]
 */
export function summarizeBdlBestPlayers(rows, playerNameById = {}) {
  const entries = (rows || []).map((r) => {
    const pid = r.player_id != null ? String(r.player_id) : "";
    return {
      playerId: pid,
      name: playerNameById[pid] || (r.player?.name ? String(r.player.name) : pid ? `player ${pid}` : "unknown"),
      isHome: r.is_home === true,
      sideRank: r.side_rank != null ? Number(r.side_rank) : null,
      manOfMatch: Boolean(r.is_man_of_match),
      rating: r.rating != null && Number.isFinite(Number(r.rating)) ? round3(Number(r.rating)) : null,
      reason: r.reason ? String(r.reason).trim() : null,
    };
  });

  if (!entries.length) return null;

  const motm = entries.find((e) => e.manOfMatch) || null;
  const home = entries.filter((e) => e.isHome).sort((a, b) => (a.sideRank || 99) - (b.sideRank || 99));
  const away = entries.filter((e) => !e.isHome).sort((a, b) => (a.sideRank || 99) - (b.sideRank || 99));

  return { manOfMatch: motm, homeTop: home.slice(0, 5), awayTop: away.slice(0, 5) };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, string>} [playerNameById]
 */
export function summarizeBdlAvgPositions(rows, playerNameById = {}) {
  const mapped = (rows || [])
    .map((r) => {
      const pid = r.player_id != null ? String(r.player_id) : "";
      return {
        name: playerNameById[pid] || (pid ? `player ${pid}` : "unknown"),
        isHome: r.is_home === true,
        avgX: Number(r.avg_x),
        avgY: Number(r.avg_y),
      };
    })
    .filter((r) => Number.isFinite(r.avgX) && Number.isFinite(r.avgY));

  if (!mapped.length) return null;

  const home = mapped.filter((r) => r.isHome).slice(0, 11);
  const away = mapped.filter((r) => !r.isHome).slice(0, 11);

  return {
    count: mapped.length,
    home,
    away,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} homeTeam
 * @param {string} awayTeam
 */
export function summarizeBdlTeamForm(rows, homeTeam, awayTeam) {
  const entries = rows || [];
  if (!entries.length) return null;

  /** @type {Record<string, unknown> | null} */
  let home = null;
  /** @type {Record<string, unknown> | null} */
  let away = null;

  for (const r of entries) {
    const row = {
      avgRating: r.avg_rating != null ? round3(Number(r.avg_rating)) : null,
      position: r.position != null ? Number(r.position) : null,
      formValue: r.value != null ? String(r.value) : null,
    };
    if (r.is_home === true) home = row;
    else away = row;
  }

  if (!home && !away) return null;
  return { homeTeam, awayTeam, home, away };
}

/**
 * @param {{ shots?: Array<Record<string, unknown>>, momentum?: Array<Record<string, unknown>>, bestPlayers?: Array<Record<string, unknown>>, avgPositions?: Array<Record<string, unknown>>, teamForm?: Array<Record<string, unknown>>, playerStats?: Array<Record<string, unknown>>, lineups?: Array<Record<string, unknown>> }} bundle
 * @param {{ homeTeam: string, awayTeam: string }} teams
 */
export function buildBdlGoatMatchIntel(bundle, teams) {
  /** @type {Record<string, string>} */
  const playerNameById = {};
  for (const row of bundle.lineups || []) {
    const p = row.player || {};
    if (p.id != null && p.name) playerNameById[String(p.id)] = String(p.name);
  }
  for (const row of bundle.playerStats || []) {
    const pid = row.player_id != null ? String(row.player_id) : null;
    const name = row.player?.name ? String(row.player.name) : null;
    if (pid && name) playerNameById[pid] = name;
  }
  for (const row of bundle.bestPlayers || []) {
    const pid = row.player_id != null ? String(row.player_id) : null;
    const name = row.player?.name ? String(row.player.name) : null;
    if (pid && name) playerNameById[pid] = name;
  }

  const shots = summarizeBdlMatchShots(bundle.shots, playerNameById);
  const momentum = summarizeBdlMatchMomentum(bundle.momentum);
  const bestPlayers = summarizeBdlBestPlayers(bundle.bestPlayers, playerNameById);
  const avgPositions = summarizeBdlAvgPositions(bundle.avgPositions, playerNameById);
  const teamForm = summarizeBdlTeamForm(bundle.teamForm, teams.homeTeam, teams.awayTeam);

  const hasAny = shots || momentum || bestPlayers || avgPositions || teamForm;
  if (!hasAny) return null;

  return {
    source: "balldontlie_goat",
    shots,
    momentum,
    bestPlayers,
    avgPositions,
    teamForm,
    xgSummary: shots
      ? {
          home: shots.home.xg,
          away: shots.away.xg,
          homeShots: shots.home.count,
          awayShots: shots.away.count,
        }
      : null,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} bdlGoat
 * @param {string} homeTeam
 * @param {string} awayTeam
 */
export function formatBdlGoatMatchIntelPromptBlock(bdlGoat, homeTeam, awayTeam) {
  if (!bdlGoat) return null;
  const lines = [
    "BDL GOAT MATCH INTEL (BallDontLie — shots, momentum, form, top performers):",
    "  Use these BDL-verified metrics for xG, momentum, and pre-match form. Do not invent Opta.",
  ];

  const form = bdlGoat.teamForm;
  if (form?.home || form?.away) {
    lines.push("  Pre-match team form:");
    if (form.home) {
      lines.push(
        `    ${homeTeam}: avg rating ${form.home.avgRating ?? "—"}, table pos ${form.home.position ?? "—"}, form ${form.home.formValue ?? "—"}`,
      );
    }
    if (form.away) {
      lines.push(
        `    ${awayTeam}: avg rating ${form.away.avgRating ?? "—"}, table pos ${form.away.position ?? "—"}, form ${form.away.formValue ?? "—"}`,
      );
    }
  }

  const xg = bdlGoat.xgSummary;
  if (xg) {
    lines.push(
      `  Shot-map xG: ${homeTeam} ${xg.home} (${xg.homeShots} shots) · ${awayTeam} ${xg.away} (${xg.awayShots} shots)`,
    );
  }

  const shots = bdlGoat.shots;
  if (shots?.highlights?.length) {
    lines.push(
      `  Key chances: ${shots.highlights
        .map(
          (h) =>
            `${h.minute != null ? `${h.minute}'` : "?"} ${h.side === "home" ? homeTeam : awayTeam} ${h.type}${h.xg != null ? ` xG ${h.xg}` : ""}${h.player ? ` (${h.player})` : ""}`,
        )
        .join(" · ")}`,
    );
  }

  const mom = bdlGoat.momentum;
  if (mom) {
    lines.push(
      `  Attack momentum: latest ${mom.latestValue} at ${mom.latestMinute}' (${mom.lean} lean) · last 15' avg ${mom.last15Avg ?? "—"}`,
    );
  }

  const best = bdlGoat.bestPlayers;
  if (best?.manOfMatch) {
    lines.push(
      `  Man of the match: ${best.manOfMatch.name}${best.manOfMatch.rating != null ? ` (${best.manOfMatch.rating})` : ""}`,
    );
  }
  if (best?.homeTop?.length || best?.awayTop?.length) {
    const fmtTop = (rows) =>
      rows
        .slice(0, 3)
        .map((r) => `${r.name}${r.rating != null ? ` ${r.rating}` : ""}`)
        .join(", ");
    if (best.homeTop?.length) lines.push(`  ${homeTeam} top rated: ${fmtTop(best.homeTop)}`);
    if (best.awayTop?.length) lines.push(`  ${awayTeam} top rated: ${fmtTop(best.awayTop)}`);
  }

  const avg = bdlGoat.avgPositions;
  if (avg?.count) {
    lines.push(
      `  Average positions tracked for ${avg.count} players (heatmap centroids on file — cite BDL avg x/y if discussing shape).`,
    );
  }

  return lines.join("\n");
}

/**
 * Build advanced-stats-compatible payload from BDL shot xG.
 * @param {Record<string, unknown>} detail
 */
export function buildBdlChanceQualityFromDetail(detail) {
  const xg = detail?.bdlGoat?.xgSummary;
  if (!xg || detail.status !== "FT") return null;

  return {
    source: "balldontlie_xg",
    method: "shot_map_xg_sum",
    team: {
      home: { xg: xg.home, shots: xg.homeShots },
      away: { xg: xg.away, shots: xg.awayShots },
    },
    disclaimer: "BDL shot-map xG sum — not ESPN chance index.",
  };
}
