/** @file NBA context slimming for model prompts — extracted from handler.js */
import { canonicalizeTeamAbbr, questionMentionsPlayer } from "../../nba.js";
import {
  slimNbaPlayerStatRowForUrTake,
  slimPlayoffSeriesForBoard,
} from "../../../shared/nbaUrTakeSlim.js";

function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played = (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played + 1;
}

function appendPlayoffEliminationSuffix(winsAwayF, winsHomeF, af, hf) {
  const a = Number(winsAwayF) || 0;
  const h = Number(winsHomeF) || 0;
  if (a <= 2 && h <= 2) return " — no team facing elimination yet.";
  if (a === 3 && h === 3) return " — next game eliminates the loser.";
  const hi = Math.max(a, h);
  const lo = Math.min(a, h);
  if (hi >= 3 && lo <= 2 && hi > lo) {
    const trailing = a < h ? af : h < a ? hf : "";
    if (trailing) return ` — ${trailing} facing elimination.`;
  }
  return "";
}

export function gameRowMatchesPropGame(plGame, g) {
  if (!plGame || !g) return false;
  const parts = String(plGame)
    .split("@")
    .map((s) => s.trim().toLowerCase());
  if (parts.length !== 2) return false;
  const [pa, ph] = parts;
  const ga = String(g.awayTeam?.name || "").toLowerCase();
  const gh = String(g.homeTeam?.name || "").toLowerCase();
  const rough = (a, b) =>
    Boolean(a && b && (a.includes(b) || b.includes(a) || a.split(/\s+/).pop() === b.split(/\s+/).pop()));
  return (
    (rough(pa, ga) && rough(ph, gh)) || (rough(pa, gh) && rough(ph, ga))
  );
}

function findGameTotalsKeyForGame(gameTotals, g) {
  if (!g || !gameTotals || typeof gameTotals !== "object") return null;
  for (const key of Object.keys(gameTotals)) {
    if (gameRowMatchesPropGame(key, g)) return key;
  }
  return null;
}

export function buildNbaGameTotalsPromptBlock(nbaContext, nbaMatchup) {
  const totals =
    nbaContext?.gameTotals && typeof nbaContext.gameTotals === "object" && !Array.isArray(nbaContext.gameTotals)
      ? nbaContext.gameTotals
      : {};
  const away = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const home = String(nbaMatchup?.homeAbbr || "").toUpperCase();
  let row = null;
  let label = null;
  for (const [k, v] of Object.entries(totals)) {
    const ku = String(k).toUpperCase();
    if (away && home && ku.includes(away) && ku.includes(home)) {
      row = v;
      label = k;
      break;
    }
  }
  if (!row && Object.keys(totals).length === 1) {
    label = Object.keys(totals)[0];
    row = totals[label];
  }
  if (row?.total != null && Number.isFinite(Number(row.total))) {
    const pace = row.pace || "NEUTRAL";
    const src = row.source ? ` source=${row.source}` : "";
    return `\nGAME TOTAL (posted): ${label} — ${Number(row.total)} (pace: ${pace}${src}). Cite this number verbatim for pace/total reads; do not invent a different total.\n`;
  }
  return `\nGAME TOTAL: No posted total in gameTotals for this matchup — discuss pace qualitatively; do not invent a total line.\n`;
}

/**
 * @param {Record<string, unknown> | null | undefined} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null | undefined} nbaMatchup
 */
/** Inline duplicate of shared/nbaPropsBoardDisplay.formatKeyPropsLinesForPrompt */
export function buildNbaKeyPropsLinesPromptBlock(nbaContextForModel, propsOdds) {
  const stale =
    Boolean(nbaContextForModel?.propsOddsStale) ||
    Boolean(propsOdds?.freshness?.isStale);
  const stats = Array.isArray(nbaContextForModel?.playerStats)
    ? nbaContextForModel.playerStats
    : [];
  const rows = stats
    .filter((p) => p?.consensusProps?.markets && Object.keys(p.consensusProps.markets).length > 0)
    .sort((a, b) => Number(b?.pts || 0) - Number(a?.pts || 0))
    .slice(0, 10);
  if (!rows.length) return "";
  const lines = rows.map((p) => {
    const m = p.consensusProps.markets || {};
    const parts = [];
    for (const [market, row] of Object.entries(m)) {
      if (!row?.line) continue;
      const o = row.overOdds != null ? `o${row.overOdds}` : "";
      const u = row.underOdds != null ? `u${row.underOdds}` : "";
      parts.push(`${market} ${row.line} (${o}/${u} ${row.book || ""})`.trim());
    }
    return `- ${p.name} (${p.team}): ${parts.join("; ") || "no lines"}`;
  });
  const header = stale
    ? "KEY POSTED PROP LINES (stale — do not cite as live; describe relatively only):"
    : "KEY POSTED PROP LINES (consensus — cite only when ODDS FRESHNESS allows):";
  return `\n${header}\n${lines.join("\n")}\n`;
}

export function resolveNbaPropsOddsForPrompt(nbaContext, nbaMatchup) {
  const base = nbaContext?.propsOdds;
  if (!base || typeof base !== "object") return null;
  const away = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const home = String(nbaMatchup?.homeAbbr || "").toUpperCase();
  if (!away || !home) return base;

  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const focus = games.find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === away && h === home) || (a === home && h === away);
  });
  const gid = focus?.actionNetworkGameId ?? base?.gameId ?? nbaContext?.sourceMeta?.propsOddsGameId;
  if (gid != null && nbaContext?.propsOddsByGameId?.[String(gid)]) {
    return nbaContext.propsOddsByGameId[String(gid)];
  }
  return base;
}

/** Closing when markets / lines are missing — structural only; no hypothetical prices (aligns with STRUCTURAL ANALYSIS MODE). */
const NBA_STRUCTURAL_MARKET_CLOSING_RULE = `- Close with a direct structural call (THE CALL): name the edge and who benefits — grounded only in payload data. No hypothetical prices, no "if the line posts at X," no fabricated thresholds.`;

// Odds enhance but never gate a response. Availability is server-side only; the universal
// DATA AVAILABILITY RULE lives in composeRegisteredUrTakeSystemPrompt.

/** Deep-remove oddsAvailable so it never appears in model-facing JSON or prompts. */

function buildFocusedPlayoffSeriesSnapshot(awayF, homeF, playoffSeriesRows, todaysGames) {
  const af = String(awayF || "").toUpperCase();
  const hf = String(homeF || "").toUpperCase();
  const game = (todaysGames || []).find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === af && h === hf) || (a === hf && h === af);
  });
  if (!af || !hf) return null;
  const hasPlayoffRows = Array.isArray(playoffSeriesRows) && playoffSeriesRows.length > 0;
  const row = hasPlayoffRows
    ? (playoffSeriesRows.find((s) => {
        const sa = String(s?.away || "").toUpperCase();
        const sh = String(s?.home || "").toUpperCase();
        return (sa === af && sh === hf) || (sa === hf && sh === af);
      }) || null)
    : null;

  const gameSeriesSummary = String(game?.seriesSummary || "").trim();
  const gameSeriesLeader = String(game?.seriesLeader || "").toUpperCase();
  const gameSeriesWins = Number(game?.seriesWins);
  const gameSeriesDeficit = Number(game?.seriesDeficit);
  const hasGameSeries =
    gameSeriesSummary &&
    Number.isFinite(gameSeriesWins) &&
    Number.isFinite(gameSeriesDeficit) &&
    gameSeriesWins >= 0 &&
    gameSeriesDeficit >= 0;
  if (!hasGameSeries && !row) return null;

  const nextGameNum = hasGameSeries
    ? gameSeriesWins + gameSeriesDeficit + 1
    : getNbaSeriesGameNumberForGame(
        game || { awayTeam: { abbr: af }, homeTeam: { abbr: hf } },
        playoffSeriesRows,
      );

  let winsAwayF = 0;
  let winsHomeF = 0;
  if (hasGameSeries && (gameSeriesLeader === af || gameSeriesLeader === hf)) {
    if (gameSeriesLeader === af) {
      winsAwayF = gameSeriesWins;
      winsHomeF = gameSeriesDeficit;
    } else {
      winsAwayF = gameSeriesDeficit;
      winsHomeF = gameSeriesWins;
    }
  } else if (row) {
    const sa = String(row?.away || "").toUpperCase();
    const sh = String(row?.home || "").toUpperCase();
    if (sa === af && sh === hf) {
      winsAwayF = Number(row?.awayWins) || 0;
      winsHomeF = Number(row?.homeWins) || 0;
    } else if (sa === hf && sh === af) {
      winsAwayF = Number(row?.homeWins) || 0;
      winsHomeF = Number(row?.awayWins) || 0;
    }
  }

  const leader =
    winsAwayF > winsHomeF ? af : winsHomeF > winsAwayF ? hf : "tied";
  let serverSummaryOneLiner =
    leader === "tied"
      ? `${af} and ${hf} are tied ${winsAwayF}-${winsHomeF}${nextGameNum > 0 ? ` — Game ${nextGameNum} tonight` : ""}.`
      : `${leader} leads ${Math.max(winsAwayF, winsHomeF)}-${Math.min(winsAwayF, winsHomeF)}${nextGameNum > 0 ? ` — Game ${nextGameNum} tonight` : ""}.`;
  serverSummaryOneLiner += appendPlayoffEliminationSuffix(winsAwayF, winsHomeF, af, hf);

  const priorCount =
    typeof row?.completedGamesCombinedPointsCount === "number"
      ? row.completedGamesCombinedPointsCount
      : Array.isArray(row?.completedGamesCombinedPoints)
        ? row.completedGamesCombinedPoints.length
        : 0;
  const avgCombined = row?.completedGamesCombinedPointsAverage;
  let summaryWithAvg = serverSummaryOneLiner;
  if (priorCount > 0 && Number.isFinite(avgCombined)) {
    summaryWithAvg += ` Completed finals in fetch window (${priorCount}): combined avg ${avgCombined} pts/game.`;
  }

  return {
    awayAbbr: af,
    homeAbbr: hf,
    awayWinsInQuestionOrder: winsAwayF,
    homeWinsInQuestionOrder: winsHomeF,
    leaderAbbr: leader === "tied" ? null : leader,
    nextGameNumber: nextGameNum > 0 ? nextGameNum : null,
    round: row?.round || null,
    statusText: row?.status || gameSeriesSummary || null,
    completedGamesCombinedPointsCount: priorCount,
    completedGamesCombinedPointsAverage: Number.isFinite(avgCombined) ? avgCombined : null,
    serverSummaryOneLiner: summaryWithAvg,
  };
}


function _parseNbaTonightGameAbbrs(tonightGame) {
  const s = String(tonightGame || "").trim();
  const m = s.match(/^([A-Z0-9]{2,4})\s*@\s*([A-Z0-9]{2,4})$/i);
  if (!m) return null;
  return { away: m[1].toUpperCase(), home: m[2].toUpperCase() };
}

function _collectTonightNbaSlateAbbrs(todaysGames) {
  const set = new Set();
  for (const g of todaysGames || []) {
    const aa = canonicalizeTeamAbbr(g?.awayTeam?.abbr);
    const ha = canonicalizeTeamAbbr(g?.homeTeam?.abbr);
    if (aa && aa !== "?" && aa !== "UNK") set.add(aa);
    if (ha && ha !== "?" && ha !== "UNK") set.add(ha);
  }
  return set;
}

function _filterBdlAvailabilityToTeams(avail, allowTeams) {
  if (!avail || typeof avail !== "object" || !allowTeams || allowTeams.size === 0) return {};
  const out = {};
  for (const [name, meta] of Object.entries(avail)) {
    const t = canonicalizeTeamAbbr(meta?.team);
    if (t && allowTeams.has(t)) out[name] = meta;
  }
  return out;
}

/** @param {unknown[]} injuries */
function _injuryRowsByNormalizedPlayerName(injuries) {
  const m = new Map();
  for (const r of injuries || []) {
    const k = String(r?.player || "").trim().toLowerCase();
    if (k && !m.has(k)) m.set(k, r);
  }
  return m;
}

/**
 * Slim stat rows use `name`; raw rows may use `player`.
 * Union with `filteredInjuries` so players who only appear as retained injury rows (e.g. named in the question but off the focused stat slice) still get a row.
 * @param {unknown[]} rows
 * @param {unknown[]} filteredInjuries
 */
function _collectBdlAvailabilityPlayerNames(rows, filteredInjuries) {
  /** @type {Map<string, string>} lower -> canonical display */
  const map = new Map();
  for (const row of rows || []) {
    const display = String(row?.name || row?.player || "").trim();
    if (!display) continue;
    const k = display.toLowerCase();
    if (!map.has(k)) map.set(k, display);
  }
  for (const inj of filteredInjuries || []) {
    const display = String(inj?.player || "").trim();
    if (!display) continue;
    const k = display.toLowerCase();
    if (!map.has(k)) map.set(k, display);
  }
  return map;
}

/**
 * One row per player in the slimmed stat bundle — explicit healthy vs injured for the model.
 * @param {Map<string, string>} displayNamesByLower
 * @param {Map<string, object>} injuriesByLower
 */
function _buildBdlAvailabilityModelArray(displayNamesByLower, injuriesByLower) {
  const out = [];
  for (const displayName of displayNamesByLower.values()) {
    const k = displayName.toLowerCase();
    const inj = injuriesByLower.get(k);
    if (inj) {
      const parts = [
        inj.status != null && String(inj.status).trim(),
        inj.detail != null && String(inj.detail).trim(),
        inj.returnDate != null && String(inj.returnDate).trim(),
      ].filter(Boolean);
      out.push({
        player: displayName,
        status: "INJURED",
        detail: parts.join(" — ") || String(inj.status || "").trim() || "Listed on BDL injury feed",
      });
    } else {
      out.push({
        player: displayName,
        status: "NOT LISTED / ACTIVE per BDL",
      });
    }
  }
  out.sort((a, b) => String(a.player).localeCompare(String(b.player)));
  return out;
}

function _buildNbaSlateRowDigest(game) {
  const a = String(game?.awayTeam?.abbr || "").toUpperCase();
  const h = String(game?.homeTeam?.abbr || "").toUpperCase();
  const at = String(game?.awayTeam?.name || "").trim();
  const ht = String(game?.homeTeam?.name || "").trim();
  const tLabel = game?.startTimeUtc
    ? new Date(game.startTimeUtc).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : "";
  const when = tLabel ? `${tLabel} ET` : "time TBD";
  return `${a} vs ${h} — ${at || a} at ${ht || h} — ${when}`;
}

function formatNbaLabelNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  const x = Math.round(n * 2) / 2;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

/**
 * Pre-computed score strings for the model JSON (format-only; uses existing todaysGames + gameTotals only).
 */
function buildNbaLiveScoreInterpretationLabels(todaysGames, gameTotals) {
  const lines = [];
  if (!Array.isArray(todaysGames) || todaysGames.length === 0) return lines;
  const gt =
    gameTotals && typeof gameTotals === "object" && !Array.isArray(gameTotals) ? gameTotals : null;

  for (const g of todaysGames) {
    if (!g || typeof g !== "object") continue;
    const awayAbbr = String(g?.awayTeam?.abbr ?? "").trim() || "AWAY";
    const homeAbbr = String(g?.homeTeam?.abbr ?? "").trim() || "HOME";
    const awayScore = g?.awayTeam?.score;
    const homeScore = g?.homeTeam?.score;
    if (!Number.isFinite(Number(awayScore)) || !Number.isFinite(Number(homeScore))) continue;

    const a = Number(awayScore);
    const h = Number(homeScore);
    const combined = a + h;

    const period = Number(g?.period);
    const qNum = Number.isFinite(period) && period > 0 ? period : null;
    const qLabel = qNum != null ? `Q${qNum}` : "Q?";

    lines.push(`${awayAbbr} has scored: ${formatNbaLabelNumber(a)} points`);
    lines.push(`${homeAbbr} has scored: ${formatNbaLabelNumber(h)} points`);
    lines.push(
      `Combined total through ${qLabel}: ${formatNbaLabelNumber(a)}+${formatNbaLabelNumber(h)}`,
    );

    if (gt) {
      const key = findGameTotalsKeyForGame(gt, g);
      if (key) {
        const totalLine = Number(gt[key]?.total);
        if (Number.isFinite(totalLine)) {
          const delta = totalLine - combined;
          const dStr = formatNbaLabelNumber(delta);
          const lStr = formatNbaLabelNumber(totalLine);
          lines.push(`To hit over ${lStr}: need ${dStr} more combined points`);
          lines.push(`To cash under ${lStr}: must stay under ${dStr} combined remaining`);
        }
      }
    }
  }
  return lines;
}

export function buildNbaContextForModel(nbaContext, nbaMatchup, question = "") {
  if (!nbaContext || typeof nbaContext !== "object") return nbaContext;
  const todays = Array.isArray(nbaContext.todaysGames) ? nbaContext.todaysGames : [];
  const tonight = _collectTonightNbaSlateAbbrs(todays);
  const awayF = nbaMatchup ? String(nbaMatchup.awayAbbr || "").toUpperCase() : "";
  const homeF = nbaMatchup ? String(nbaMatchup.homeAbbr || "").toUpperCase() : "";
  /** Two-team matchup scope — stats + rosterGrounding.playersByTeamAbbrev use this when set. */
  const matchupTeamSet = awayF && homeF ? new Set([awayF, homeF]) : null;
  /** Broader slate scope when no matchup resolved (multi-game boards). */
  const relevantTeams = matchupTeamSet || (tonight.size > 0 ? tonight : null);

  let raw;
  try {
    raw = JSON.parse(JSON.stringify(nbaContext));
  } catch {
    return nbaContext;
  }

  if (tonight.size > 0) {
    raw.bdlAvailability = _filterBdlAvailabilityToTeams(raw.bdlAvailability, tonight);
    if (raw.bdlGrounding && typeof raw.bdlGrounding === "object") {
      raw.bdlGrounding = { ...raw.bdlGrounding };
      raw.bdlGrounding.bdlAvailability = _filterBdlAvailabilityToTeams(
        raw.bdlGrounding.bdlAvailability,
        tonight,
      );
      if (raw.bdlGrounding.bdlGroundedPlayers) {
        const gP = {};
        for (const [k, v] of Object.entries(raw.bdlGrounding.bdlGroundedPlayers)) {
          const t = canonicalizeTeamAbbr(v?.team);
          if (t && tonight.has(t)) gP[k] = v;
        }
        raw.bdlGrounding.bdlGroundedPlayers = gP;
      }
    }
  }

  /** BallDontLie injury rows after slate/question filtering — same source as INJURED rows in `bdlAvailability`. */
  let filteredInjuries = Array.isArray(raw.injuries) ? raw.injuries.slice() : [];
  if (tonight.size > 0 && Array.isArray(raw.injuries)) {
    const q = String(question || "");
    filteredInjuries = raw.injuries.filter((r) => {
      const t = canonicalizeTeamAbbr(r?.team);
      if (t && tonight.has(t)) return true;
      const playerLc = String(r?.player || "").toLowerCase();
      return Boolean(q && playerLc && questionMentionsPlayer(q, playerLc));
    });
    raw.injuries = filteredInjuries;
  }

  if (Array.isArray(raw.playerStats)) {
    if (relevantTeams && relevantTeams.size > 0) {
      raw.playerStats = raw.playerStats.filter((row) => {
        const t = String(row?.team || "").toUpperCase();
        if (relevantTeams.has(t)) return true;
        if (matchupTeamSet) {
          const tg = _parseNbaTonightGameAbbrs(row?.tonightGame);
          if (tg) {
            const a = [tg.away, tg.home].sort().join();
            const b = [awayF, homeF].sort().join();
            if (a && b && a === b) return true;
          }
        }
        return false;
      });
    } else {
      raw.playerStats = raw.playerStats.slice(0, 72);
    }
    if (!matchupTeamSet && Array.isArray(raw.playerStats) && raw.playerStats.length > 96) {
      raw.playerStats = raw.playerStats.slice(0, 96);
    }
  }

  if (raw.rosterGrounding && raw.rosterGrounding.playersByTeamAbbrev) {
    const rosterAbbrScope = matchupTeamSet || relevantTeams;
    const pbt = {};
    if (rosterAbbrScope && rosterAbbrScope.size > 0) {
      for (const ab of rosterAbbrScope) {
        if (raw.rosterGrounding.playersByTeamAbbrev[ab]) {
          pbt[ab] = raw.rosterGrounding.playersByTeamAbbrev[ab];
        }
      }
    }
    raw.rosterGrounding = { ...raw.rosterGrounding, playersByTeamAbbrev: pbt };
    if (raw.rosterGrounding.qualityByTeam) {
      const q = {};
      const qScope = matchupTeamSet || relevantTeams;
      if (qScope && qScope.size > 0) {
        for (const ab of qScope) {
          if (raw.rosterGrounding.qualityByTeam[ab] != null) {
            q[ab] = raw.rosterGrounding.qualityByTeam[ab];
          }
        }
      }
      raw.rosterGrounding.qualityByTeam = q;
    }
  }

  if (matchupTeamSet && Array.isArray(raw.propLines)) {
    const fa = awayF;
    const fh = homeF;
    raw.propLines = raw.propLines.filter((pl) => {
      const g = String(pl?.game || "");
      if (!g) return true;
      const gup = g.toUpperCase();
      return gup.includes(fa) && gup.includes(fh);
    });
  }

  const focusedPropsOdds = resolveNbaPropsOddsForPrompt(nbaContext, nbaMatchup);
  if (focusedPropsOdds && typeof focusedPropsOdds === "object") {
    raw.propsOdds = focusedPropsOdds;
  } else {
    delete raw.propsOdds;
  }
  raw.propsOddsStale = Boolean(
    nbaContext?.propsOddsStale ?? focusedPropsOdds?.freshness?.isStale,
  );
  delete raw.propsOddsByGameId;
  delete raw.propsOddsMeta;

  if (matchupTeamSet && todays.length > 0) {
    raw.todaysGames = todays.map((g) => {
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      const isFocus = (a === awayF && h === homeF) || (a === homeF && h === awayF);
      if (isFocus) return g;
      return {
        _slimSlate: true,
        awayTeam: { abbr: g?.awayTeam?.abbr, name: g?.awayTeam?.name, score: g?.awayTeam?.score },
        homeTeam: { abbr: g?.homeTeam?.abbr, name: g?.homeTeam?.name, score: g?.homeTeam?.score },
        startTimeUtc: g?.startTimeUtc,
        startTimeSource: g?.startTimeSource,
        state: g?.state,
        status: g?.status,
        period: g?.period,
        clock: g?.clock,
        seriesContext: g?.seriesContext,
        digest: _buildNbaSlateRowDigest(g),
      };
    });
  }

  if (matchupTeamSet && raw.gameTotals && typeof raw.gameTotals === "object" && !Array.isArray(raw.gameTotals)) {
    const o = {};
    for (const [k, v] of Object.entries(raw.gameTotals)) {
      const ku = k.toUpperCase();
      if (ku.includes(awayF) && ku.includes(homeF)) o[k] = v;
    }
    if (Object.keys(o).length > 0) raw.gameTotals = o;
  }

  if (matchupTeamSet && raw.spreads && typeof raw.spreads === "object" && !Array.isArray(raw.spreads)) {
    const o = {};
    for (const [k, v] of Object.entries(raw.spreads)) {
      const ku = k.toUpperCase();
      if (ku.includes(awayF) && ku.includes(homeF)) o[k] = v;
    }
    if (Object.keys(o).length > 0) raw.spreads = o;
  }

  // Same filter for slate-resolved and playoffSeries-only matchups (isSeriesOnly): awayF/homeF scope the model.
  if (matchupTeamSet && Array.isArray(raw.playoffSeries)) {
    raw.playoffSeries = raw.playoffSeries.filter((row) => {
      const s = JSON.stringify(row || "").toUpperCase();
      return s.includes(awayF) && s.includes(homeF);
    });
    raw.focusedSeriesSnapshot = buildFocusedPlayoffSeriesSnapshot(awayF, homeF, raw.playoffSeries, todays);
  }

  raw.liveScoreLabels = buildNbaLiveScoreInterpretationLabels(
    Array.isArray(raw.todaysGames) ? raw.todaysGames : [],
    raw.gameTotals && typeof raw.gameTotals === "object" && !Array.isArray(raw.gameTotals)
      ? raw.gameTotals
      : null,
  );

  if (Array.isArray(raw.playerStats)) {
    raw.playerStats = raw.playerStats.map((row) => slimNbaPlayerStatRowForUrTake(row));
  }
  raw.playoffSeries = slimPlayoffSeriesForBoard(raw.playoffSeries || []);

  {
    const injuryByNorm = _injuryRowsByNormalizedPlayerName(filteredInjuries);
    const namesMap = _collectBdlAvailabilityPlayerNames(raw.playerStats, filteredInjuries);
    raw.bdlAvailability = _buildBdlAvailabilityModelArray(namesMap, injuryByNorm);
  }

  delete raw.urTakeParsing;
  delete raw.propFeedMeta;
  delete raw.fetchedAt;
  delete raw.playoffFocusMeta;
  delete raw._rosterDiag;
  delete raw.liveEdgeAlerts;
  delete raw.playoffPathGrounding;
  delete raw.oddsAvailable;
  delete raw.spreadMovementByGame;

  return raw;
}
