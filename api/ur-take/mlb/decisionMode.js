/** @file MLB server decision mode — extracted from handler.js */
import { escapeRegExp, normalizeText } from "../prompt/normalize.js";

function extractMlbMarketHints(qRaw) {
  const q = String(qRaw || "").toLowerCase();
  const hints = new Set();
  if (/\b(strikeout|strikeouts|\bk\b|\bks\b|\bso\b|punchies)\b/i.test(q)) hints.add("strikeouts");
  if (/\b(total\s+bases|\btb\b)\b/i.test(q)) hints.add("total_bases");
  if (/\b(home\s*run|homer|\bhr\b|\bhrs\b)\b/i.test(q)) hints.add("home_runs");
  if (/\bhits\b/i.test(q)) hints.add("hits");
  if (/\brbi(s)?\b/i.test(q)) hints.add("rbis");
  if (
    /\b(game\s+total|team\s+total|runs\s+total|total\s+runs|over[/\s-]+under|ou\s*\d)/i.test(q)
  ) {
    hints.add("game_total");
  }
  return hints;
}

function mlbPropMatchesMarketHints(pl, hints) {
  if (!hints || hints.size === 0) return true;
  const raw = `${pl?.propRaw || ""} ${pl?.prop || ""}`.toLowerCase();
  for (const h of hints) {
    if (h === "game_total") continue;
    if (
      h === "strikeouts" &&
      (raw.includes("strikeout") || raw.includes("pitcher_strikeout"))
    )
      return true;
    if (h === "total_bases" && (raw.includes("total_base") || raw.includes("total bases")))
      return true;
    if (h === "home_runs" && raw.includes("home_run")) return true;
    if (h === "hits" && raw.includes("batter_hits")) return true;
    if (h === "rbis" && raw.includes("batter_rbis")) return true;
  }
  return false;
}

function collectMlbRosterNames(mlbContext) {
  const names = [];
  const seen = new Set();
  for (const pl of mlbContext?.propLines || []) {
    const n = String(pl?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  for (const g of mlbContext?.games || []) {
    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      const n = String(pit || "").trim();
      if (!n || /^tbd$/i.test(n) || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  for (const inj of mlbContext?.injuries || []) {
    const n = String(inj?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  return names;
}

function findMlbPlayerReference(question, mlbContext) {
  const q = normalizeText(question);
  if (!q) return { matched: false };
  const candidates = [];
  for (const fullName of collectMlbRosterNames(mlbContext)) {
    const lower = fullName.toLowerCase();
    const parts = lower.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (q.includes(lower)) {
      candidates.push({ fullName, score: 100 });
      continue;
    }
    if (last && last.length >= 4 && new RegExp(`\\b${escapeRegExp(last)}\\b`, "i").test(q)) {
      candidates.push({ fullName, score: last.length });
    }
  }
  if (candidates.length === 0) return { matched: false };
  candidates.sort((a, b) => b.score - a.score);
  const topScore = candidates[0].score;
  const tied = candidates.filter((c) => c.score === topScore);
  if (tied.length > 1) return { matched: false, ambiguous: true };
  return { matched: true, canonicalName: tied[0].fullName };
}

function playerNamesAlign(a, b) {
  const na = String(a || "")
    .trim()
    .toLowerCase();
  const nb = String(b || "")
    .trim()
    .toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = na.split(/\s+/).pop();
  const lb = nb.split(/\s+/).pop();
  return Boolean(la && lb && la === lb && la.length >= 4);
}

function scoreMlbGameMatch(question, g) {
  const ql = normalizeText(question);
  let s = 0;
  for (const t of [g?.awayTeam, g?.homeTeam]) {
    const ab = String(t?.abbr || "").toLowerCase();
    const nm = String(t?.name || "");
    const nml = nm.toLowerCase();
    if (ab && ql.includes(ab)) s += 3;
    if (nm.length > 4 && ql.includes(nml)) s += 4;
    const last = nm.split(" ").pop();
    if (last && last.length >= 4 && ql.includes(last.toLowerCase())) s += 2;
    if (nml.includes("red sox") && ql.includes("red sox")) s += 4;
    if (nml.includes("white sox") && ql.includes("white sox")) s += 4;
  }
  return s;
}

function findMlbGameReference(question, games) {
  if (!Array.isArray(games) || games.length === 0) return { matched: false };
  const scored = games
    .map((g) => ({ g, s: scoreMlbGameMatch(question, g) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length === 0) return { matched: false };
  if (scored[0].s >= 4) return { matched: true, game: scored[0].g };
  if (scored[0].s >= 3 && (scored.length === 1 || scored[0].s > scored[1].s)) {
    return { matched: true, game: scored[0].g };
  }
  if (scored[0].s >= 2 && scored.length === 1) return { matched: true, game: scored[0].g };
  return { matched: false };
}

function gameRowMatchesPropGame(plGame, g) {
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

/**
 * MLB server decision mode (MLB only — aligns conditional analysis with missing-market guardrails).
 * - actionable: posted data in propLines/gameTotals matches this question's player/game/market scope.
 * - structural_only: everything else (thin slate, no listed market for the ask, empty bundle) — still full LLM take.
 *
 * Known limitations (baseline — keep question-aware routing lean; refine deliberately):
 * - Player detection uses names from propLines plus probable/listed pitchers on games[] only — not full batting rosters.
 * - Game/prop/totals matching can fall back to structural_only when ESPN vs Odds API team strings diverge.
 * - If the question implies a player but extractMlbMarketHints finds no market keywords, any prop row for that player still qualifies as actionable (narrow by prompts later if needed).
 */
export function resolveMlbDecisionMode(mlbContext = {}, question = "") {
  const games = Array.isArray(mlbContext?.games) ? mlbContext.games : [];
  const propLines = Array.isArray(mlbContext?.propLines) ? mlbContext.propLines : [];
  const gameTotals =
    mlbContext?.gameTotals &&
    typeof mlbContext.gameTotals === "object" &&
    !Array.isArray(mlbContext.gameTotals)
      ? mlbContext.gameTotals
      : {};

  const hasGames = games.length > 0;
  const hasProps = propLines.length > 0;
  const hasTotals = Object.keys(gameTotals).length > 0;

  if (!hasGames && !hasProps && !hasTotals) {
    return "structural_only";
  }

  const marketHints = extractMlbMarketHints(question);
  const wantsGameTotal = marketHints.has("game_total");
  const playerRef = findMlbPlayerReference(question, mlbContext);
  const gameRef = findMlbGameReference(question, games);

  const propsForPlayer = playerRef.matched
    ? propLines.filter((pl) => playerNamesAlign(pl?.player, playerRef.canonicalName))
    : [];

  if (playerRef.matched) {
    if (propsForPlayer.length === 0) return "structural_only";
    const hintsNoTotal = new Set(marketHints);
    hintsNoTotal.delete("game_total");
    if (hintsNoTotal.size === 0) {
      return "actionable";
    }
    const ok = propsForPlayer.some((pl) => mlbPropMatchesMarketHints(pl, hintsNoTotal));
    return ok ? "actionable" : "structural_only";
  }

  if (gameRef.matched) {
    const forGame = propLines.filter((pl) => gameRowMatchesPropGame(pl.game, gameRef.game));
    const totalsKey = findGameTotalsKeyForGame(gameTotals, gameRef.game);
    if (wantsGameTotal) {
      if (totalsKey) return "actionable";
      return forGame.length > 0 ? "actionable" : "structural_only";
    }
    const hintsNoTotal = new Set(marketHints);
    hintsNoTotal.delete("game_total");
    if (hintsNoTotal.size === 0) {
      return forGame.length > 0 ? "actionable" : "structural_only";
    }
    const ok = forGame.some((pl) => mlbPropMatchesMarketHints(pl, hintsNoTotal));
    return ok ? "actionable" : "structural_only";
  }

  return "structural_only";
}
