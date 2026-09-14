/**
 * Build Over/Under evidence from GOAT briefcase pockets we already hydrate
 * (season, recent logs, defense, injuries, fantasy) — used by side inference.
 */

/**
 * @param {string} name
 */
function playerKey(name) {
  const parts = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  /** @type {string[]} */
  const out = [];
  let i = 0;
  while (i < parts.length) {
    if (parts[i].length === 1) {
      let initials = "";
      while (i < parts.length && parts[i].length === 1) {
        initials += parts[i];
        i += 1;
      }
      out.push(initials);
      continue;
    }
    out.push(parts[i]);
    i += 1;
  }
  return out.join(" ");
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string|null}
 */
export function nflPropOpponentAbbr(row) {
  const team = String(row?.team || row?.teamAbbr || "").toUpperCase().trim();
  const game = String(row?.game || "").toUpperCase().trim();
  const pair = game.match(/^([A-Z]{2,4})\s*(?:@|VS\.?|V\.?|AT)\s*([A-Z]{2,4})$/);
  if (!pair || !team) return null;
  const away = pair[1];
  const home = pair[2];
  if (team === away) return home;
  if (team === home) return away;
  return null;
}

/**
 * @param {string} marketBase
 * @returns {string|null}
 */
export function nflPropPaceStatKey(marketBase) {
  const m = String(marketBase || "");
  if (m === "pass_yds") return "passYds";
  if (m === "rush_yds") return "rushYds";
  if (m === "rec_yds") return "recYds";
  if (m === "receptions") return "receptions";
  if (m === "pass_tds") return "passTd";
  if (m === "rush_tds") return "rushTd";
  if (m === "rec_tds") return "recTd";
  if (m === "rush_rec_yds") return "rushRecYds";
  if (m === "pass_rush_yds") return "passRushYds";
  return null;
}

/**
 * @param {string} marketBase
 * @param {number} line
 */
function paceGapThreshold(marketBase, line) {
  const m = String(marketBase || "");
  const n = Number(line);
  if (/tds$|_td/.test(m)) return 0.35;
  if (m === "receptions") return 0.55;
  if (/yds/.test(m)) {
    if (!Number.isFinite(n)) return 12;
    return Math.max(8, Math.min(22, n * 0.08));
  }
  return Math.max(1, Number.isFinite(n) ? n * 0.1 : 1);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} key
 */
function findPlayerRows(rows, key) {
  return (Array.isArray(rows) ? rows : []).filter(
    (r) => playerKey(r?.player || r?.player_name || r?.name) === key,
  );
}

/**
 * @param {number|null|undefined} total
 * @param {number|null|undefined} games
 */
function perGameFromSeason(total, games) {
  const t = Number(total);
  const g = Number(games);
  if (!Number.isFinite(t)) return null;
  if (Number.isFinite(g) && g >= 1) return t / g;
  return null;
}

/**
 * @param {Record<string, unknown>} seasonRow
 * @param {string} statKey
 */
function seasonStatValue(seasonRow, statKey) {
  if (statKey === "rushRecYds") {
    const r = Number(seasonRow?.rushYds);
    const c = Number(seasonRow?.recYds);
    if (!Number.isFinite(r) && !Number.isFinite(c)) return null;
    return (Number.isFinite(r) ? r : 0) + (Number.isFinite(c) ? c : 0);
  }
  if (statKey === "passRushYds") {
    const p = Number(seasonRow?.passYds);
    const r = Number(seasonRow?.rushYds);
    if (!Number.isFinite(p) && !Number.isFinite(r)) return null;
    return (Number.isFinite(p) ? p : 0) + (Number.isFinite(r) ? r : 0);
  }
  const v = Number(seasonRow?.[statKey]);
  return Number.isFinite(v) ? v : null;
}

/**
 * @param {Record<string, unknown>} gameRow
 * @param {string} statKey
 */
function recentStatValue(gameRow, statKey) {
  if (statKey === "rushRecYds") {
    const r = Number(gameRow?.rushYds);
    const c = Number(gameRow?.recYds);
    if (!Number.isFinite(r) && !Number.isFinite(c)) return null;
    return (Number.isFinite(r) ? r : 0) + (Number.isFinite(c) ? c : 0);
  }
  if (statKey === "passRushYds") {
    const p = Number(gameRow?.passYds);
    const r = Number(gameRow?.rushYds);
    if (!Number.isFinite(p) && !Number.isFinite(r)) return null;
    return (Number.isFinite(p) ? p : 0) + (Number.isFinite(r) ? r : 0);
  }
  const v = Number(gameRow?.[statKey]);
  return Number.isFinite(v) ? v : null;
}

/**
 * @param {Array<Record<string, unknown>>} recentRows
 * @param {string} statKey
 * @param {number} [maxGames]
 */
export function nflRecentPace(recentRows, statKey, maxGames = 5) {
  const vals = [];
  for (const g of recentRows || []) {
    const v = recentStatValue(g, statKey);
    if (v == null) continue;
    vals.push(v);
    if (vals.length >= maxGames) break;
  }
  if (vals.length < 2) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {string} marketBase from nflPropMarketKeyBase
 * @param {Record<string, unknown>|null|undefined} briefcase
 */
export function buildNflPropEdgeForRow(row, marketBase, briefcase) {
  const empty = {
    pace: null,
    paceSource: null,
    injuryHard: false,
    injuryStatus: null,
    injuryWhy: null,
    defenseTier: null,
    defenseSoft: false,
    defenseTough: false,
    defenseWhy: null,
    fantasyPace: null,
    fantasyWhy: null,
    opponent: null,
  };
  if (!row?.player || !briefcase || typeof briefcase !== "object") return empty;

  const key = playerKey(row.player);
  const statKey = nflPropPaceStatKey(marketBase);
  const last = String(row.player).trim().split(/\s+/).pop() || "Player";

  const seasonHits = findPlayerRows(briefcase.players?.seasonStats, key);
  const recentHits = findPlayerRows(briefcase.players?.recentStats, key);
  let pace = null;
  let paceSource = null;
  if (statKey) {
    const recent = nflRecentPace(recentHits, statKey, 5);
    if (recent != null) {
      pace = recent;
      paceSource = `L${Math.min(5, recentHits.filter((g) => recentStatValue(g, statKey) != null).length)}`;
    } else if (seasonHits[0]) {
      const total = seasonStatValue(seasonHits[0], statKey);
      const pg = perGameFromSeason(total, seasonHits[0].games);
      if (pg != null) {
        pace = pg;
        paceSource = "season";
      }
    }
  }

  const injuries = Array.isArray(briefcase.league?.injuries) ? briefcase.league.injuries : [];
  const inj = injuries.find((r) => playerKey(r?.player || r?.name) === key);
  const status = String(inj?.status || "").toLowerCase();
  let injuryHard = false;
  let injuryWhy = null;
  if (inj && /out|doubtful|ir\b|injured reserve|pup/.test(status)) {
    injuryHard = true;
    injuryWhy = `${last} is listed ${inj.status} — fading the over.`;
  }

  const opponent = nflPropOpponentAbbr(row);
  const defMap =
    briefcase.league?.teamDefense && typeof briefcase.league.teamDefense === "object"
      ? briefcase.league.teamDefense
      : {};
  const def = opponent ? defMap[opponent] || defMap[String(opponent).toUpperCase()] : null;
  const tier = String(def?.tier || "").toUpperCase();
  let defenseSoft = false;
  let defenseTough = false;
  let defenseWhy = null;
  if (def && tier) {
    const passRank = Number(def?.pass?.rank);
    const rushRank = Number(def?.rush?.rank);
    const m = String(marketBase || "");
    const usePass = /pass|rec/.test(m);
    const useRush = m === "rush_yds" || m === "rush_tds";
    const unitRank = usePass ? passRank : useRush ? rushRank : Number(def?.overall?.rank);
    const unitLabel = Number.isFinite(unitRank)
      ? unitRank <= 10
        ? "TOUGH"
        : unitRank >= 22
          ? "SOFT"
          : tier
      : tier;
    defenseTough =
      /\b(ELITE|STRONG|TOUGH|TOP|STOUT)\b/.test(unitLabel) ||
      (Number.isFinite(unitRank) && unitRank <= 10);
    defenseSoft =
      /\b(WEAK|BOTTOM|SOFT)\b/.test(unitLabel) || (Number.isFinite(unitRank) && unitRank >= 22);
    if (defenseSoft) defenseWhy = `${opponent} D looks soft for this market.`;
    if (defenseTough) defenseWhy = `${opponent} D looks tough for this market.`;
  }

  let fantasyPace = null;
  if (statKey) {
    const fantasyRows = Array.isArray(briefcase.fantasy?.projections)
      ? briefcase.fantasy.projections
      : [];
    const fHit = fantasyRows.find((r) => {
      const name =
        r.player ||
        r.player_name ||
        r?.player?.full_name ||
        [r?.player?.first_name, r?.player?.last_name].filter(Boolean).join(" ");
      return playerKey(name) === key;
    });
    if (fHit) {
      const map = {
        passYds: fHit.passing_yards ?? fHit.pass_yds,
        rushYds: fHit.rushing_yards ?? fHit.rush_yds,
        recYds: fHit.receiving_yards ?? fHit.rec_yds,
        receptions: fHit.receptions ?? fHit.recs,
        passTd: fHit.passing_touchdowns ?? fHit.pass_td,
        rushTd: fHit.rushing_touchdowns ?? fHit.rush_td,
        recTd: fHit.receiving_touchdowns ?? fHit.rec_td,
      };
      if (statKey === "rushRecYds") {
        const a = Number(map.rushYds);
        const b = Number(map.recYds);
        if (Number.isFinite(a) || Number.isFinite(b)) {
          fantasyPace = (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0);
        }
      } else if (statKey === "passRushYds") {
        const a = Number(map.passYds);
        const b = Number(map.rushYds);
        if (Number.isFinite(a) || Number.isFinite(b)) {
          fantasyPace = (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0);
        }
      } else {
        const v = Number(map[statKey]);
        if (Number.isFinite(v)) fantasyPace = v;
      }
    }
  }

  return {
    pace: pace != null ? Math.round(pace * 10) / 10 : null,
    paceSource,
    injuryHard,
    injuryStatus: inj ? String(inj.status) : null,
    injuryWhy,
    defenseTier: tier || null,
    defenseSoft,
    defenseTough,
    defenseWhy,
    fantasyPace: fantasyPace != null ? Math.round(fantasyPace * 10) / 10 : null,
    fantasyWhy: fantasyPace != null ? `Proj ~${Math.round(fantasyPace * 10) / 10}.` : null,
    opponent,
  };
}

/**
 * Vote Over/Under from pace / D / fantasy. Null if no clear evidence vote.
 * @param {Record<string, unknown>} row
 * @param {string} marketBase
 * @param {ReturnType<typeof buildNflPropEdgeForRow>|null|undefined} edge
 * @param {{ openerWeek?: boolean }} [opts]
 * @returns {{ side: "Over"|"Under", why: string }|null}
 */
export function voteNflPropEdgeSide(row, marketBase, edge, opts = {}) {
  if (!edge) return null;
  const openerWeek = Boolean(opts.openerWeek);
  const line = Number(row?.line);
  if (!Number.isFinite(line)) return null;
  const threshold = paceGapThreshold(marketBase, line);

  /** @type {Array<{ side: "Over"|"Under", weight: number, why: string }>} */
  const votes = [];

  if (edge.pace != null) {
    const gap = line - edge.pace;
    if (gap >= threshold) {
      votes.push({
        side: "Under",
        weight: 3,
        why: `Pace ~${edge.pace}${edge.paceSource ? ` (${edge.paceSource})` : ""} sits under ${line}.`,
      });
    } else if (gap <= -threshold) {
      votes.push({
        side: "Over",
        weight: 3,
        why: `Pace ~${edge.pace}${edge.paceSource ? ` (${edge.paceSource})` : ""} clears ${line}.`,
      });
    }
  }

  if (edge.fantasyPace != null) {
    const gap = line - edge.fantasyPace;
    const thr = threshold * 0.85;
    if (gap >= thr) {
      votes.push({
        side: "Under",
        weight: 2,
        why: `Projection ~${edge.fantasyPace} is under the number.`,
      });
    } else if (gap <= -thr) {
      votes.push({
        side: "Over",
        weight: 2,
        why: `Projection ~${edge.fantasyPace} clears the number.`,
      });
    }
  }

  if (!openerWeek) {
    if (edge.defenseSoft && !edge.defenseTough) {
      votes.push({
        side: "Over",
        weight: 2,
        why: edge.defenseWhy || "Soft defense matchup.",
      });
    } else if (edge.defenseTough && !edge.defenseSoft) {
      votes.push({
        side: "Under",
        weight: 2,
        why: edge.defenseWhy || "Tough defense matchup.",
      });
    }
  } else if ((edge.defenseSoft || edge.defenseTough) && (edge.pace != null || edge.fantasyPace != null)) {
    votes.push({
      side: edge.defenseSoft ? "Over" : "Under",
      weight: 1,
      why: `${edge.defenseWhy || "Defense prior"} (opener — prior only).`,
    });
  }

  if (!votes.length) return null;

  let over = 0;
  let under = 0;
  for (const v of votes) {
    if (v.side === "Over") over += v.weight;
    else under += v.weight;
  }
  if (over === under) return null;
  const side = over > under ? "Over" : "Under";
  const top = votes
    .filter((v) => v.side === side)
    .sort((a, b) => b.weight - a.weight)[0];
  return { side, why: top?.why || `${side} from live GOAT evidence.` };
}
