/**
 * Chance quality indexes from ESPN match detail (Phase 2 post-FT, Phase 4 live).
 * Not Opta xG — FBref removed advanced metrics Jan 2026.
 */

const WC_LIVE_STATUSES = new Set(["live", "in_progress", "1h", "2h", "ht"]);

/**
 * @param {string | null | undefined} status
 */
export function isWcLiveMatchStatus(status) {
  return WC_LIVE_STATUSES.has(String(status || "").toLowerCase());
}

/**
 * @param {number} n
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * @param {Record<string, unknown> | null | undefined} stats
 */
export function computeTeamChanceIndex(stats) {
  if (!stats || typeof stats !== "object") return null;
  const sot = Number(stats.shotsOnTarget) || 0;
  const shots = Number(stats.shots) || 0;
  const offTarget = Math.max(0, shots - sot);
  const poss = Number(stats.possessionPct) || 0;
  const corners = Number(stats.corners) || 0;
  const index = 0.1 * sot + 0.035 * offTarget + 0.003 * poss + 0.015 * corners;
  return index > 0 ? round2(index) : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} player
 */
export function computePlayerChanceIndex(player) {
  if (!player || typeof player !== "object") return null;
  const sot = Number(player.shotsOnTarget) || 0;
  const shots = Number(player.shots) || 0;
  const offTarget = Math.max(0, shots - sot);
  const kp = Number(player.keyPasses) || 0;
  const goals = Number(player.goals) || 0;
  const assists = Number(player.assists) || 0;
  const index = 0.12 * sot + 0.04 * offTarget + 0.03 * kp + 0.18 * goals + 0.08 * assists;
  return index > 0 ? round2(index) : null;
}

/**
 * @param {Record<string, unknown>} detail — normalized WcMatchDetail
 * @param {"post" | "live"} mode
 */
function buildChanceQualityPayloadFromDetail(detail, mode) {
  const homeAbbr = String(detail.homeTeam || "").toUpperCase().slice(0, 3);
  const awayAbbr = String(detail.awayTeam || "").toUpperCase().slice(0, 3);
  const homeTeam = computeTeamChanceIndex(detail.teamStats?.home);
  const awayTeam = computeTeamChanceIndex(detail.teamStats?.away);

  /** @type {Array<Record<string, unknown>>} */
  const players = [];
  for (const [side, abbr] of [
    ["home", homeAbbr],
    ["away", awayAbbr],
  ]) {
    for (const row of detail.players?.[side] || []) {
      const chanceIndex = computePlayerChanceIndex(row);
      if (chanceIndex == null) continue;
      players.push({
        name: String(row.name || "").trim(),
        nationAbbr: abbr,
        chanceIndex,
        shots: Number(row.shots) || 0,
        shotsOnTarget: Number(row.shotsOnTarget) || 0,
        keyPasses: Number(row.keyPasses) || 0,
        goals: Number(row.goals) || 0,
        assists: Number(row.assists) || 0,
      });
    }
  }

  players.sort((a, b) => Number(b.chanceIndex) - Number(a.chanceIndex));

  if (homeTeam == null && awayTeam == null && !players.length) return null;

  const isLive = mode === "live";
  return {
    eventId: String(detail.eventId || ""),
    homeTeam: homeAbbr,
    awayTeam: awayAbbr,
    homeScore: detail.homeScore ?? null,
    awayScore: detail.awayScore ?? null,
    phase: isLive ? "live" : "post",
    source: isLive ? "espn_live_chance_index" : "espn_chance_index",
    sourceLabel: isLive
      ? "Live chance index (ESPN-derived in-match estimate — not Opta xG)"
      : "Post-match chance quality (ESPN-derived estimate — not Opta xG; FBref advanced data unavailable 2026)",
    team: {
      home: homeTeam != null ? { chanceIndex: homeTeam, ...pickTeamInputs(detail.teamStats?.home) } : null,
      away: awayTeam != null ? { chanceIndex: awayTeam, ...pickTeamInputs(detail.teamStats?.away) } : null,
    },
    players: players.slice(0, 18),
  };
}

/**
 * @param {Record<string, unknown>} detail — normalized WcMatchDetail
 */
export function buildMatchChanceQualityFromDetail(detail) {
  const status = String(detail?.status || "").toUpperCase();
  const finalized = detail?.finalized === true || detail?.phase === "post";
  if (status !== "FT" || !finalized) return null;
  return buildChanceQualityPayloadFromDetail(detail, "post");
}

/**
 * @param {Record<string, unknown>} detail — normalized WcMatchDetail
 */
export function buildLiveMatchChanceQualityFromDetail(detail) {
  if (!isWcLiveMatchStatus(detail?.status)) return null;
  return buildChanceQualityPayloadFromDetail(detail, "live");
}

/**
 * @param {Record<string, unknown> | null | undefined} stats
 */
function pickTeamInputs(stats) {
  return {
    shots: Number(stats?.shots) || 0,
    shotsOnTarget: Number(stats?.shotsOnTarget) || 0,
    possessionPct: stats?.possessionPct != null ? Number(stats.possessionPct) : null,
    corners: Number(stats?.corners) || 0,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 * @param {{ live?: boolean }} [opts]
 */
function formatChanceQualityPromptLines(payload, opts = {}) {
  if (!payload?.team && !payload?.players?.length) return [];

  const live = opts.live === true || payload.phase === "live";
  const lines = live
    ? [
        "LIVE CHANCE INDEX (in-match estimate — NOT Opta xG):",
        `  ${payload.sourceLabel || "ESPN-derived in-match estimate — not Opta xG"}`,
        "  Use for who-is-creating-chances / deserved-score live asks. Cite index + SOT/shots from MATCH INTEL.",
        "  Never call these values xG or Opta xG. Post-FT binding chance quality arrives after full time.",
      ]
    : [
        "POST-MATCH CHANCE QUALITY (supplementary — binding after FT only):",
        `  ${payload.sourceLabel || "ESPN-derived estimate — not Opta xG"}`,
        "  Use for deserved-win / chance-volume questions after full time. Never call these values Opta xG.",
      ];

  const home = payload.team?.home;
  const away = payload.team?.away;
  if (home?.chanceIndex != null || away?.chanceIndex != null) {
    const homeAbbr = payload.homeTeam || "HOME";
    const awayAbbr = payload.awayTeam || "AWAY";
    const homeBit =
      home?.chanceIndex != null
        ? `${homeAbbr} ${home.chanceIndex} (${home.shotsOnTarget || 0} SOT, ${home.shots || 0} shots)`
        : `${homeAbbr} n/a`;
    const awayBit =
      away?.chanceIndex != null
        ? `${awayAbbr} ${away.chanceIndex} (${away.shotsOnTarget || 0} SOT, ${away.shots || 0} shots)`
        : `${awayAbbr} n/a`;
    lines.push(`  Team chance index: ${homeBit} · ${awayBit}`);
  }

  const top = (payload.players || []).slice(0, 8);
  if (top.length) {
    lines.push("  Player chance index (top creators):");
    for (const p of top) {
      const bits = [];
      if (p.shots) bits.push(`${p.shots} shots`);
      if (p.shotsOnTarget) bits.push(`${p.shotsOnTarget} SOT`);
      if (p.keyPasses) bits.push(`${p.keyPasses} key passes`);
      if (p.goals) bits.push(`${p.goals}G`);
      if (p.assists) bits.push(`${p.assists}A`);
      lines.push(
        `    ${p.name} (${p.nationAbbr}) — index ${p.chanceIndex}${bits.length ? ` · ${bits.join(", ")}` : ""}`,
      );
    }
  }

  return lines;
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 */
export function formatMatchChanceQualityPromptBlock(payload) {
  const lines = formatChanceQualityPromptLines(payload, { live: false });
  return lines.length ? lines.join("\n") : "";
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 */
export function formatLiveMatchChanceQualityPromptBlock(payload) {
  const lines = formatChanceQualityPromptLines(payload, { live: true });
  return lines.length ? lines.join("\n") : "";
}
