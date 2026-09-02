/**
 * Thin MATCHUP CARD for NFL Ask —
 * baseline × defense × stadium × injury × live line × H2H note.
 */
import RBs from "./nfl-rb.js";
import WRsAndTEs from "./nfl-wr-te.js";
import { QBs } from "./nfl-players.js";
import { defenses } from "./nfl-defense.js";
import { NFL_STADIUM_META } from "./_nflStadiumMeta.js";
import { NFL_2026_PLAYER_PROP_OUS } from "./_nflPropLineContext.js";
import { lookupNflH2hNote } from "./_nflH2hNotes.js";
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import {
  getNflTeamAbbrFromName,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";
import { detectNflAskMarket } from "../shared/nflGoatExtractionContract.js";
import {
  buildNflH2hNoteFromRecentStats,
  inferNflOpponentFromSlate,
} from "../shared/nflBdlDefenseNormalize.js";
import {
  buildNflAskDisciplinePromptBlock,
  buildNflGameScriptLine,
  buildNflInjuryTimingNote,
  buildNflSeasonTypeWarning,
  buildNflWeatherDisciplineLine,
  detectNflAskPhase,
  isNflAltLineAsk,
  isNflSgpAsk,
  summarizeNflBookDisagreement,
} from "../shared/nflAskDiscipline.js";

/**
 * @returns {Array<{ name: string, pos: 'QB'|'RB'|'WR'|'TE', team: string, row: Record<string, unknown> }>}
 */
function nflPlayerPool() {
  /** @type {Array<{ name: string, pos: 'QB'|'RB'|'WR'|'TE', team: string, row: Record<string, unknown> }>} */
  const pool = [];
  for (const [name, row] of Object.entries(QBs || {})) {
    pool.push({ name, pos: "QB", team: String(row?.team || "").toUpperCase(), row });
  }
  for (const [name, row] of Object.entries(RBs || {})) {
    pool.push({ name, pos: "RB", team: String(row?.team || "").toUpperCase(), row });
  }
  for (const [name, row] of Object.entries(WRsAndTEs || {})) {
    const pos = String(row?.pos || "WR").toUpperCase() === "TE" ? "TE" : "WR";
    pool.push({ name, pos, team: String(row?.team || "").toUpperCase(), row });
  }
  return pool;
}

/**
 * Pool + QB backups (Anthony Richardson is IND backup, not an RB).
 * @returns {Array<{ name: string, pos: string, team: string, role: string, primary?: string, row: Record<string, unknown> }>}
 */
function nflIdentityPool() {
  const pool = nflPlayerPool().map((p) => ({ ...p, role: "pool" }));
  for (const [name, row] of Object.entries(QBs || {})) {
    const backup = String(row?.backup || "").trim();
    if (!backup || backup.length < 4) continue;
    if (pool.some((p) => p.name.toLowerCase() === backup.toLowerCase())) continue;
    pool.push({
      name: backup,
      pos: "QB",
      team: String(row?.team || "").toUpperCase(),
      role: "backup",
      primary: name,
      row: { ...row, tier: "BACKUP" },
    });
  }
  return pool;
}

/**
 * Every named athlete in the ask — full names and unique last names, including backups.
 * @param {string} question
 */
export function listNflIdentitiesInQuestion(question) {
  const q = String(question || "").toLowerCase();
  /** @type {Map<string, ReturnType<typeof nflIdentityPool>[number]>} */
  const hits = new Map();
  /** @type {string[]} */
  const ambiguous = [];
  if (!q.trim()) return { identities: [], ambiguous };

  const pool = nflIdentityPool();
  pool.sort((a, b) => b.name.length - a.name.length);
  for (const p of pool) {
    if (q.includes(p.name.toLowerCase())) hits.set(p.name, p);
  }

  /** @type {Map<string, typeof pool>} */
  const byLast = new Map();
  for (const p of pool) {
    const last = p.name.split(/\s+/).pop()?.toLowerCase() || "";
    if (last.length < 4) continue;
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last).push(p);
  }
  for (const [last, group] of byLast) {
    if (!new RegExp(`\\b${last}\\b`, "i").test(q)) continue;
    if ([...hits.keys()].some((n) => n.toLowerCase().endsWith(` ${last}`) || n.toLowerCase() === last)) {
      continue;
    }
    const uniq = [];
    const seen = new Set();
    for (const p of group) {
      const k = p.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(p);
    }
    if (uniq.length === 1) hits.set(uniq[0].name, uniq[0]);
    else ambiguous.push(uniq.map((p) => `${p.name} (${p.pos}, ${p.team})`).join(" / "));
  }

  return { identities: [...hits.values()], ambiguous };
}

function formatNflNamedIdBlock(identities) {
  if (!identities.length) return "";
  const bits = identities.map((p) => {
    if (p.role === "backup" && p.primary) {
      return `${p.name} (${p.pos}, ${p.team} backup to ${p.primary} — not an RB/WR)`;
    }
    return `${p.name} (${p.pos}, ${p.team})`;
  });
  return `NAMED ID: ${bits.join(". ")}. Do not recast a listed QB as a skill-position player.`;
}

/**
 * @param {string} question
 * @returns {{
 *   player: { name: string, pos: 'QB'|'RB'|'WR'|'TE', team: string, row: Record<string, unknown> } | null,
 *   ambiguous: boolean,
 *   candidates: string[],
 * }}
 */
export function resolveNflPoolPlayerInQuestion(question) {
  const q = String(question || "").toLowerCase();
  if (!q.trim()) return { player: null, ambiguous: false, candidates: [] };

  const pool = nflPlayerPool();
  pool.sort((a, b) => b.name.length - a.name.length);
  for (const p of pool) {
    if (q.includes(p.name.toLowerCase())) {
      return { player: p, ambiguous: false, candidates: [p.name] };
    }
  }

  /** @type {Map<string, typeof pool>} */
  const byLast = new Map();
  for (const p of pool) {
    const last = p.name.split(/\s+/).pop()?.toLowerCase() || "";
    if (last.length < 4) continue;
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last).push(p);
  }
  for (const [last, hits] of byLast) {
    if (!new RegExp(`\\b${last}\\b`, "i").test(q)) continue;
    if (hits.length === 1) {
      return { player: hits[0], ambiguous: false, candidates: [hits[0].name] };
    }
    return {
      player: null,
      ambiguous: true,
      candidates: hits.map((h) => `${h.name} (${h.team})`),
    };
  }
  return { player: null, ambiguous: false, candidates: [] };
}

/**
 * @param {string} question
 * @returns {{ name: string, pos: 'QB'|'RB'|'WR'|'TE', team: string, row: Record<string, unknown> } | null}
 */
export function findNflPoolPlayerInQuestion(question) {
  return resolveNflPoolPlayerInQuestion(question).player;
}

/**
 * @param {string} playerTeam
 * @param {Set<string>|string[]} [scopeTeams]
 * @param {string} [question]
 */
export function resolveNflOpponentAbbr(playerTeam, scopeTeams = [], question = "") {
  const own = String(playerTeam || "").toUpperCase();
  const scope = scopeTeams instanceof Set ? [...scopeTeams] : [...(scopeTeams || [])];
  const others = scope.map((t) => String(t).toUpperCase()).filter((t) => t && t !== own);
  if (others.length === 1) return others[0];

  const q = String(question || "");
  const vs = q.match(/\b(?:vs\.?|v\.?|@|at)\s+([A-Za-z .']{2,30})\b/i);
  if (vs) {
    const raw = vs[1].trim();
    const asAbbr = raw.toUpperCase();
    if (/^[A-Z]{2,4}$/.test(asAbbr) && asAbbr !== own && defenses[asAbbr]) return asAbbr;
    const fromHint = detectNflTeamHint(raw) || detectNflTeamHint(`vs ${raw}`);
    if (fromHint && String(fromHint).toUpperCase() !== own) return String(fromHint).toUpperCase();
    const fromName = getNflTeamAbbrFromName(raw);
    if (fromName && fromName !== own) return fromName;
    const resolved = resolveNflTeamFromQuestion(raw);
    const ab = resolved ? getNflTeamAbbrFromName(resolved) : null;
    if (ab && ab !== own) return ab;
  }

  try {
    const hint = detectNflTeamHint(q);
    if (hint && String(hint).toUpperCase() !== own) return String(hint).toUpperCase();
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Home team from slate game involving player team (+ optional opponent).
 * @param {Array<Record<string, unknown>>} games
 * @param {string} playerTeam
 * @param {string|null} opponent
 * @returns {{ homeAbbr: string|null, awayAbbr: string|null, game: Record<string, unknown>|null }}
 */
export function resolveHomeFromSlate(games, playerTeam, opponent = null) {
  const own = String(playerTeam || "").toUpperCase();
  const opp = opponent ? String(opponent).toUpperCase() : null;
  const list = Array.isArray(games) ? games : [];

  const involving = list.filter((g) => {
    const home = String(g?.homeAbbr || "").toUpperCase();
    const away = String(g?.awayAbbr || "").toUpperCase();
    return home === own || away === own;
  });

  let hit =
    (opp &&
      involving.find((g) => {
        const home = String(g.homeAbbr || "").toUpperCase();
        const away = String(g.awayAbbr || "").toUpperCase();
        return home === opp || away === opp;
      })) ||
    (!opp ? involving[0] : null) ||
    null;

  if (!hit && opp) {
    hit =
      list.find((g) => {
        const home = String(g?.homeAbbr || "").toUpperCase();
        const away = String(g?.awayAbbr || "").toUpperCase();
        return (home === own && away === opp) || (home === opp && away === own);
      }) || null;
  }

  if (!hit) return { homeAbbr: null, awayAbbr: null, game: null };
  return {
    homeAbbr: String(hit.homeAbbr || "").toUpperCase() || null,
    awayAbbr: String(hit.awayAbbr || "").toUpperCase() || null,
    game: hit,
  };
}

/**
 * @param {'QB'|'RB'|'WR'|'TE'} pos
 */
function propImpactKey(pos) {
  if (pos === "QB") return "qb";
  if (pos === "RB") return "rb";
  if (pos === "TE") return "te";
  return "wr";
}

/**
 * Market hints → propRaw fragments on board rows.
 * @param {string} marketId
 * @param {string} pos
 */
function propRawHintsForMarket(marketId, pos) {
  const m = String(marketId || "");
  if (m === "pass_yds") return ["pass_yds", "passing_yards"];
  if (m === "pass_tds") return ["pass_tds", "passing_tds"];
  if (m === "rush_yds") return ["rush_yds", "rushing_yards"];
  if (m === "rush_tds") return ["rush_tds", "rushing_tds"];
  if (m === "rec_yds") return ["rec_yds", "receiving_yards"];
  if (m === "rec_tds") return ["rec_tds", "receiving_tds"];
  if (m === "receptions") return ["receptions"];
  if (m === "anytime_td") return ["anytime_td"];
  if (m === "first_td") return ["first_td"];
  if (m === "sacks") return ["sacks"];
  if (m === "tackles") return ["tackles", "solo_tackles"];
  if (m === "targets") return ["targets"];
  if (m === "pass_ints") return ["pass_ints", "interceptions"];
  if (m === "completions_attempts") return ["passing_completions", "passing_attempts", "completions", "attempts"];
  // Position defaults when market is general
  if (pos === "QB") return ["pass_yds", "passing_yards"];
  if (pos === "RB") return ["rush_yds", "rushing_yards"];
  return ["rec_yds", "receiving_yards", "receptions"];
}

/**
 * @param {Array<Record<string, unknown>>} propLines
 * @param {string} playerName
 * @param {string[]} hints
 */
export function pickLivePropLine(propLines, playerName, hints) {
  const name = String(playerName || "").toLowerCase();
  const rows = (Array.isArray(propLines) ? propLines : []).filter((r) =>
    String(r?.player || "")
      .toLowerCase()
      .includes(name.split(" ").pop() || name),
  );
  if (!rows.length) return null;
  const want = (hints || []).map((h) => String(h).toLowerCase());
  const ranked = [...rows].sort((a, b) => {
    const ar = String(a.propRaw || a.prop || "").toLowerCase();
    const br = String(b.propRaw || b.prop || "").toLowerCase();
    const as = want.some((h) => ar.includes(h)) ? 0 : 1;
    const bs = want.some((h) => br.includes(h)) ? 0 : 1;
    return as - bs;
  });
  const best = ranked[0];
  if (!best) return null;
  const raw = String(best.propRaw || best.prop || "").toLowerCase();
  // Priced prop ask with no matching market → do not show a wrong prop (e.g. yards for TDs).
  if (want.length && !want.some((h) => raw.includes(h))) {
    return null;
  }
  return best;
}

/**
 * @param {{ name: string, pos: string, team: string, row: Record<string, unknown> }} player
 */
function baselineLine(player) {
  const row = player.row || {};
  if (player.pos === "QB") {
    const s25 = row.stats2025 || null;
    const s24 = row.stats2024 || {};
    const market = NFL_2026_PLAYER_PROP_OUS[player.name];
    const parts = [];
    if (s25 && s25.yds != null) {
      const g = Math.max(1, Number(s25.games) || 17);
      const ypg = Math.round((Number(s25.yds) / g) * 10) / 10;
      parts.push(`2025 sample: ${ypg} pass yds/g, ${s25.td ?? "?"} TD`);
    } else if (s24.yds != null) {
      const g = Math.max(1, Number(s24.games) || 17);
      const ypg = Math.round((Number(s24.yds) / g) * 10) / 10;
      parts.push(`2024 prior: ${ypg} pass yds/g, ${s24.td ?? "?"} TD, ${s24.int ?? "?"} INT`);
    }
    if (market?.passYds != null) {
      const pace = Math.round((Number(market.passYds) / 17) * 10) / 10;
      parts.push(
        `2026 market pace: ~${pace} pass yds/g (season O/U ${market.passYds}${market.passTds != null ? `, ${market.passTds} pass TD` : ""})`,
      );
    }
    const style = Array.isArray(row.style) ? row.style.slice(0, 3).join(", ") : "";
    return `Baseline: ${parts.join(" · ") || "n/a"}${style ? ` | style: ${style}` : ""}. Prefer market pace + matchup over stale box scores.`;
  }
  if (player.pos === "RB") {
    const r = row.rush2025 || {};
    const prior = row.rush2024?.ydsPg;
    const trend = row.trend?.note ? ` Trend: ${row.trend.note}` : "";
    return `Baseline (2025): ${r.ydsPg ?? "?"} rush yds/g on ${r.attPg ?? "?"} att/g, ${r.td ?? "?"} TD${prior != null ? ` | 2024: ${prior} yds/g` : ""}.${trend}`;
  }
  const rec = row.rec2025 || {};
  const prior = row.rec2024?.ydsPg;
  return `Baseline (2025): ${rec.ydsPg ?? "?"} rec yds/g, ${rec.recPg ?? "?"} rec/g, ${rec.td ?? "?"} TD${prior != null ? ` | prior: ${prior} yds/g` : ""}.`;
}

/**
 * @param {string | null} homeAbbr
 */
function stadiumLine(homeAbbr) {
  const ab = String(homeAbbr || "").toUpperCase();
  const meta = NFL_STADIUM_META[ab];
  if (!meta) return null;
  if (meta.domed) return `Stadium: ${meta.stadium} (${ab}) — dome / controlled. Weather not a factor.`;
  return `Stadium: ${meta.stadium} (${ab}) — outdoor. Factor wind/cold/rain only when weather is in payload.`;
}

/**
 * @param {Array<Record<string, unknown>>} injuries
 * @param {{ name: string, team: string }} player
 * @param {unknown} depth
 */
export function buildInjuryOverrideLine(injuries, player, depth = null) {
  const rows = Array.isArray(injuries) ? injuries : [];
  const name = String(player?.name || "").toLowerCase();
  const team = String(player?.team || "").toUpperCase();
  const bad = new Set(["out", "doubtful", "ir", "pup", "suspended"]);

  const self = rows.find((r) => {
    const n = String(r.player || r.name || "").toLowerCase();
    return n && (n === name || name.includes(n) || n.includes(name.split(" ").pop() || ""));
  });
  if (self) {
    const st = String(self.status || self.injuryStatus || "").toLowerCase();
    if ([...bad].some((b) => st.includes(b)) || st.includes("questionable")) {
      return `INJURY OVERRIDE: ${self.player || self.name} is ${self.status || self.injuryStatus} — flip or pass the lean until status clears; do not treat baseline as live.`;
    }
  }

  const qb1 =
    depth && typeof depth === "object"
      ? String(depth[team]?.qb1 || depth[team]?.QB1 || "").trim()
      : "";
  if (qb1 && player) {
    const qbRow = rows.find((r) =>
      String(r.player || r.name || "")
        .toLowerCase()
        .includes(qb1.toLowerCase().split(" ").pop() || ""),
    );
    if (qbRow) {
      const st = String(qbRow.status || qbRow.injuryStatus || "").toLowerCase();
      if ([...bad].some((b) => st.includes(b))) {
        return `INJURY OVERRIDE: ${team} QB1 ${qb1} is ${qbRow.status || qbRow.injuryStatus} — compress pass-catcher/QB baselines; re-price roles before locking a side.`;
      }
    }
  }
  return null;
}

/**
 * One-line UI thesis.
 */
export function buildNflMatchupThesis({
  player,
  opponent,
  defenseTier,
  liveLine,
  injuryLine,
  homeAbbr,
}) {
  if (!player) return "";
  const bits = [`${player.name}`];
  if (opponent) bits.push(`vs ${opponent}${defenseTier ? ` (${defenseTier} D)` : ""}`);
  if (homeAbbr) bits.push(`@ ${homeAbbr}`);
  if (liveLine?.line != null) {
    bits.push(
      `live ${liveLine.prop || liveLine.propRaw || "prop"} ${liveLine.line}${liveLine.overOdds != null ? ` (${liveLine.book || "book"})` : ""}`,
    );
  } else {
    bits.push("no live line");
  }
  if (injuryLine) bits.push("injury flag");
  return bits.join(" · ");
}

/**
 * @param {{
 *   question?: string,
 *   scopeTeams?: Set<string>|string[],
 *   homeAbbr?: string|null,
 *   games?: Array<Record<string, unknown>>,
 *   propLines?: Array<Record<string, unknown>>,
 *   injuries?: Array<Record<string, unknown>>,
 *   depth?: unknown,
 *   injuryMeta?: { fetchedAt?: number|string|null, asOf?: string|null },
 *   maxAngles?: number,
 *   defenseByTeam?: Record<string, Record<string, unknown>>|null,
 *   recentStats?: Array<Record<string, unknown>>,
 * }} [opts]
 */
export function buildNflMatchupCard(opts = {}) {
  const question = String(opts.question || "");
  const resolved = resolveNflPoolPlayerInQuestion(question);
  const named = listNflIdentitiesInQuestion(question);
  const namedIdBlock = formatNflNamedIdBlock(named.identities);
  const player = resolved.player;
  const defensePool =
    opts.defenseByTeam && typeof opts.defenseByTeam === "object" && Object.keys(opts.defenseByTeam).length
      ? opts.defenseByTeam
      : defenses;

  if (!player) {
    const disciplineBlock = buildNflAskDisciplinePromptBlock({
      question,
      ambiguousPlayer: resolved.ambiguous ? resolved.candidates.join(" / ") : null,
      namedIdBlock,
      seasonTypeWarning: buildNflSeasonTypeWarning(opts.games || []),
    });
    const idLine = namedIdBlock ? `${namedIdBlock}\n` : "";
    const cardBlock =
      resolved.ambiguous && resolved.candidates.length
        ? `${idLine}NFL PLAYER ID AMBIGUOUS\nCandidates: ${resolved.candidates.join(", ")}.\nAsk which player (or use full name) — do not invent a lean for the wrong athlete.`
        : idLine.trim();
    return {
      cardBlock,
      promptBlock: cardBlock ? `${cardBlock}\n\n${disciplineBlock}` : disciplineBlock,
      disciplineBlock,
      player: null,
      opponent: null,
      thesis: resolved.ambiguous ? `Ambiguous player — ${resolved.candidates.join(" / ")}` : "",
      liveLine: null,
      homeAbbr: null,
      ambiguous: resolved.ambiguous,
      candidates: resolved.candidates,
      namedIdentities: named.identities.map((p) => ({
        name: p.name,
        pos: p.pos,
        team: p.team,
        role: p.role,
      })),
    };
  }

  let opponent = resolveNflOpponentAbbr(player.team, opts.scopeTeams, question);
  if (!opponent) {
    opponent = inferNflOpponentFromSlate(opts.games || [], player.team);
  }
  const slateHome = resolveHomeFromSlate(opts.games || [], player.team, opponent);
  if (!opponent && slateHome.game) {
    const home = slateHome.homeAbbr;
    const away = slateHome.awayAbbr;
    opponent = home === player.team ? away : home;
  }

  const def = opponent ? defensePool[opponent] || defenses[opponent] || null : null;
  const impactKey = propImpactKey(player.pos);
  const impact = def?.propImpact?.[impactKey] || null;

  const slateMatchesOpponent =
    Boolean(slateHome.game) &&
    (!opponent ||
      slateHome.homeAbbr === opponent ||
      slateHome.awayAbbr === opponent);
  const homeAbbr = slateMatchesOpponent
    ? slateHome.homeAbbr
    : opponent && /(?:@|\bat\b)/i.test(question)
      ? opponent
      : null;

  const stadium = stadiumLine(homeAbbr);
  const stadiumMeta = NFL_STADIUM_META[String(homeAbbr || "").toUpperCase()];
  const weatherLine = buildNflWeatherDisciplineLine(stadium, Boolean(stadiumMeta && !stadiumMeta.domed));
  const curatedH2h = lookupNflH2hNote(player.name, player.pos, opponent);
  const liveH2h = !curatedH2h
    ? buildNflH2hNoteFromRecentStats(player.name, opponent, opts.recentStats || [])
    : null;
  const h2h = curatedH2h || liveH2h;
  const injuryRaw = buildInjuryOverrideLine(opts.injuries || [], player, opts.depth);
  const injuryLine = buildNflInjuryTimingNote(injuryRaw, opts.injuryMeta || {});
  const scriptLine = slateMatchesOpponent
    ? buildNflGameScriptLine(slateHome.game, player.team)
    : null;
  const seasonTypeWarning = buildNflSeasonTypeWarning(opts.games || []);
  const slateGap =
    opponent && !slateMatchesOpponent
      ? `SLATE GAP: ${player.team} vs ${opponent} is not on this week's live board. Do not invent a spread, home, or game script from another ${player.team} game. Defense tier is a structural prior only.`
      : null;

  const market = detectNflAskMarket(question);
  const hints = propRawHintsForMarket(market.marketId, player.pos);
  const liveLine = pickLivePropLine(opts.propLines || [], player.name, hints);
  const bookDisagree = summarizeNflBookDisagreement(opts.propLines || [], player.name, hints);
  const phase = detectNflAskPhase(question);
  const isAlt = isNflAltLineAsk(question);

  const angles = [];
  if (Array.isArray(player.row?.bettingAngles)) {
    angles.push(...player.row.bettingAngles.slice(0, 2));
  }
  if (def && Array.isArray(def.bettingAngles)) {
    angles.push(...def.bettingAngles.slice(0, 1));
  }
  const maxAngles = Math.max(1, Math.min(Number(opts.maxAngles) || 3, 4));

  const lines = [
    "NFL MATCHUP CARD (order: injury → baseline → script → defense → stadium/weather → H2H → price)",
    `Player: ${player.name} (${player.pos}, ${player.team}${player.row?.tier ? `, ${player.row.tier}` : ""})`,
  ];

  if (injuryLine) lines.push(injuryLine);
  lines.push(baselineLine(player));
  if (slateGap) lines.push(slateGap);
  if (scriptLine) lines.push(scriptLine);
  if (seasonTypeWarning) lines.push(seasonTypeWarning);

  if (opponent && def) {
    lines.push(
      `Opponent D: ${opponent} — ${def.tier || "?"} (pts/g allowed ${def.overall?.ptsAllowed ?? "?"}).`,
    );
    if (impact) lines.push(`Prop impact (${impactKey.toUpperCase()}): ${impact}`);
    else lines.push(`Prop impact: no position note for ${player.pos} vs ${opponent} — use tier + structure.`);
  } else if (opponent) {
    lines.push(`Opponent: ${opponent} — no defense row in pool; use structural read only.`);
  } else {
    lines.push("Opponent: not resolved — give role/baseline take; add matchup once opponent is clear.");
  }

  if (slateMatchesOpponent && slateHome.homeAbbr && slateHome.awayAbbr) {
    lines.push(`Slate: ${slateHome.awayAbbr} @ ${slateHome.homeAbbr} (home stadium rules apply).`);
  }
  if (weatherLine) lines.push(weatherLine);
  else if (stadium) lines.push(stadium);
  if (h2h) lines.push(`H2H note: ${h2h}`);

  const askedNumberRaw = (question.match(/\b(\d+\.5|\d+)\b/) || [])[1];
  const askedNumber = askedNumberRaw != null ? Number(askedNumberRaw) : NaN;

  if (liveLine && liveLine.line != null) {
    lines.push(
      `Live MAIN line: ${liveLine.player} ${liveLine.prop || liveLine.propRaw} ${liveLine.line} (O ${liveLine.overOdds ?? "—"} / U ${liveLine.underOdds ?? "—"}, ${liveLine.book || "book"}). Prefer board over season O/Us.`,
    );
  } else {
    lines.push("Live line: not in payload — structural lean only; say so in one short clause.");
  }
  if (bookDisagree.disagree) {
    lines.push(
      `Book range: ${bookDisagree.min}–${bookDisagree.max} across ${bookDisagree.books.join("/") || "books"} — shop; do not invent a single consensus.`,
    );
  }
  if (isAlt) {
    if (Number.isFinite(askedNumber) && liveLine?.line != null && askedNumber !== Number(liveLine.line)) {
      lines.push(
        `ALT ASK: user number ${askedNumber} ≠ main board ${liveLine.line}. Analyze the ALT vs the main — do not treat ${liveLine.line} as the bet price.`,
      );
    } else {
      lines.push(
        "ALT ASK: compare juiced alt to the main line — do not analyze alt as if it were consensus.",
      );
    }
  }

  // Multi-leg / SGP: surface every pool player named so UR does not collapse to one leg.
  if (phase === "weekly_props" || market.marketId === "sgp" || isNflSgpAsk(question)) {
    const qLow = question.toLowerCase();
    /** @type {Map<string, string>} */
    const namedMap = new Map();
    for (const p of nflPlayerPool()) {
      if (qLow.includes(p.name.toLowerCase())) {
        namedMap.set(p.name, `${p.name} (${p.pos}, ${p.team})`);
        continue;
      }
      const last = p.name.split(/\s+/).pop()?.toLowerCase() || "";
      if (last.length >= 4 && new RegExp(`\\b${last}\\b`, "i").test(qLow)) {
        // Only auto-add unique last-name hits to avoid Williams-style fan-out.
        const sameLast = nflPlayerPool().filter(
          (x) => (x.name.split(/\s+/).pop() || "").toLowerCase() === last,
        );
        if (sameLast.length === 1) {
          namedMap.set(p.name, `${p.name} (${p.pos}, ${p.team})`);
        }
      }
    }
    const named = [...namedMap.values()];
    if (named.length > 1) {
      lines.push(
        `Multi-leg players in ask: ${named.join(" · ")}. Address each leg; do not ignore secondary names.`,
      );
    }
  }

  if (angles.length) {
    lines.push(`Angles: ${angles.slice(0, maxAngles).join(" | ")}`);
  }

  lines.push(
    "Relay rule: one sharp paragraph for the PRIMARY market only. Do not dump raw stats. Injury override wins if present. End with the NEXT step from discipline.",
  );

  const disciplineBlock = buildNflAskDisciplinePromptBlock({
    question,
    marketId: market.marketId,
    phase,
    hasLiveLine: liveLine?.line != null,
    injuryFlag: Boolean(injuryLine),
    isAlt,
    bookDisagree,
    seasonTypeWarning,
    namedIdBlock,
  });
  if (namedIdBlock) lines.push(namedIdBlock);

  const thesis = buildNflMatchupThesis({
    player: { name: player.name, pos: player.pos, team: player.team },
    opponent,
    defenseTier: def?.tier || null,
    liveLine,
    injuryLine,
    homeAbbr,
  });

  const cardBlock = lines.join("\n");
  return {
    /** Card body only — context appends discipline last so budget trim cannot drop it. */
    cardBlock,
    promptBlock: `${cardBlock}\n\n${disciplineBlock}`,
    disciplineBlock,
    player: { name: player.name, pos: player.pos, team: player.team },
    opponent,
    defenseTier: def?.tier || null,
    homeAbbr,
    liveLine,
    injuryLine,
    h2h,
    thesis,
    phase,
    marketId: market.marketId,
    bookDisagree,
    ambiguous: false,
    candidates: [player.name],
    namedIdentities: named.identities.map((p) => ({
      name: p.name,
      pos: p.pos,
      team: p.team,
      role: p.role,
    })),
  };
}
