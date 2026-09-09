/**
 * Turn a filled NFL GOAT briefcase into football the model can reason over.
 * Suitcase health is a grade. This packet is the evidence.
 */

import { isNflOpenerWeek } from "./nflAskComposeRule.js";

/**
 * @param {string} name
 * @param {string} question
 */
export function nflNameHitsQuestion(name, question) {
  const n = String(name || "").trim();
  const q = String(question || "").toLowerCase();
  if (!n || !q) return false;
  const last = n.split(/\s+/).filter(Boolean).pop() || "";
  if (last.length >= 4 && q.includes(last.toLowerCase())) return true;
  const firstLast = n.toLowerCase();
  return firstLast.length >= 6 && q.includes(firstLast);
}

/**
 * Prefer players named in the ask, then remaining prop ids.
 * @param {Array<Record<string, unknown>>} propLines
 * @param {string} question
 * @param {number} [max]
 */
export function pickNflAskStatPlayerIds(propLines, question, max = 8) {
  const q = String(question || "");
  const ranked = (propLines || [])
    .map((row, i) => ({
      id: row?.playerId,
      player: String(row?.player || ""),
      hit: nflNameHitsQuestion(row?.player, q),
      i,
    }))
    .filter((r) => r.id != null && r.id !== "");
  ranked.sort((a, b) => Number(b.hit) - Number(a.hit) || a.i - b.i);
  const out = [];
  const seen = new Set();
  for (const r of ranked) {
    const key = String(r.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r.id);
    if (out.length >= max) break;
  }
  return out;
}

function compactNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 10) / 10);
}

function seasonLine(row) {
  const bits = [];
  if (row.games != null) bits.push(`${row.games}g`);
  if (row.passYds != null) bits.push(`${compactNum(row.passYds)} pass yds / ${compactNum(row.passTd) ?? "?"} TD`);
  if (row.rushYds != null) bits.push(`${compactNum(row.rushYds)} rush yds / ${compactNum(row.rushTd) ?? "?"} TD`);
  if (row.recYds != null || row.receptions != null) {
    bits.push(
      `${compactNum(row.receptions) ?? "?"} rec / ${compactNum(row.targets) ?? "?"} tgt / ${compactNum(row.recYds) ?? "?"} rec yds / ${compactNum(row.recTd) ?? "?"} TD`,
    );
  }
  return bits.length ? bits.join(" · ") : "logged";
}

function recentLine(row) {
  const bits = [];
  if (row.passYds != null) bits.push(`${compactNum(row.passYds)} pass`);
  if (row.rushYds != null) bits.push(`${compactNum(row.rushYds)} rush`);
  if (row.recYds != null) bits.push(`${compactNum(row.recYds)} rec yds`);
  if (row.receptions != null) bits.push(`${compactNum(row.receptions)} recs`);
  if (row.passTd != null && Number(row.passTd) > 0) bits.push(`${compactNum(row.passTd)} pass TD`);
  if (row.rushTd != null && Number(row.rushTd) > 0) bits.push(`${compactNum(row.rushTd)} rush TD`);
  if (row.recTd != null && Number(row.recTd) > 0) bits.push(`${compactNum(row.recTd)} rec TD`);
  const opp = row.opponent ? ` vs ${row.opponent}` : "";
  const wk = row.week != null ? `W${row.week}` : "game";
  return `${wk}${opp}: ${bits.length ? bits.join(", ") : "logged"}`;
}

const ADVANCED_KEEP = [
  "completion_percentage_over_expected",
  "cpoe",
  "passer_rating",
  "air_yards",
  "pressure_rate",
  "sack_rate",
  "yards_over_expected",
  "rush_yards_over_expected",
  "success_rate",
  "stuffed_rate",
  "yards_after_catch",
  "yac",
  "average_depth_of_target",
  "adot",
  "target_share",
  "catch_rate",
  "separation",
  "contested_catch_rate",
];

function advancedBits(row) {
  const m = row?.metrics && typeof row.metrics === "object" ? row.metrics : row;
  const bits = [];
  for (const key of ADVANCED_KEEP) {
    const v = m?.[key];
    if (v == null || v === "" || typeof v === "object") continue;
    bits.push(`${key.replace(/_/g, " ")} ${compactNum(v)}`);
    if (bits.length >= 5) break;
  }
  if (!bits.length) {
    for (const [k, v] of Object.entries(m || {})) {
      if (v == null || typeof v === "object") continue;
      if (/id|name|season|week|player/i.test(k)) continue;
      if (typeof v !== "number" && !/^\d/.test(String(v))) continue;
      bits.push(`${k.replace(/_/g, " ")} ${compactNum(v)}`);
      if (bits.length >= 4) break;
    }
  }
  return bits.join("; ");
}

function preferRows(rows, question, cap) {
  const list = Array.isArray(rows) ? rows : [];
  const hits = list.filter((r) => nflNameHitsQuestion(r?.player || r?.name, question));
  const rest = list.filter((r) => !nflNameHitsQuestion(r?.player || r?.name, question));
  return [...hits, ...rest].slice(0, cap);
}

function formatDefense(map, scope) {
  const entries = Object.entries(map || {}).filter(([abbr]) => {
    if (!scope?.size) return true;
    const a = String(abbr || "").toUpperCase();
    return [...scope].some((s) => String(s).toUpperCase() === a);
  });
  if (!entries.length) return "";
  return entries
    .slice(0, 4)
    .map(([abbr, d]) => {
      const src = d?.liveDeferred ? "thin live — prior held" : d?.source || "defense";
      return `${abbr} (${d?.tier || "?"}, ${src}): ${d?.overall?.ptsAllowed ?? "?"} pts/g allowed · pass rank ${d?.pass?.rank ?? "?"} (${compactNum(d?.pass?.ydsAllowed) ?? "?"} yds/g) · rush rank ${d?.rush?.rank ?? "?"} (${compactNum(d?.rush?.ydsAllowed) ?? "?"} yds/g)`;
    })
    .join("\n");
}

function formatStandings(rows, scope) {
  const list = (rows || []).filter((r) => {
    if (!scope?.size) return Boolean(r?.team);
    return [...scope].some((s) => String(s).toUpperCase() === String(r.team || "").toUpperCase());
  });
  if (!list.length) return "";
  return list
    .slice(0, 4)
    .map((r) => `${r.team}: ${r.wins ?? "?"}-${r.losses ?? "?"}${r.ties ? `-${r.ties}` : ""}`)
    .join(" · ");
}

function formatOdds(rows, opening) {
  const list = Array.isArray(rows) ? rows.slice(0, 4) : [];
  if (!list.length) return "";
  const tag = opening ? "OPENING" : "CURRENT";
  return list
    .map((o) => {
      const spread =
        o.spread?.displayLine ||
        (o.spread?.home != null ? `home ${o.spread.home}` : o.spread) ||
        null;
      const total = o.total?.line ?? o.total ?? null;
      const away = o.away || o.awayAbbr || "";
      const home = o.home || o.homeAbbr || "";
      return `${away} @ ${home}: spread ${spread ?? "—"} · total ${total ?? "—"}`;
    })
    .join("\n")
    .replace(/^/, `${tag} GAME LINES:\n`);
}

function formatFantasy(rows, question) {
  const list = preferRows(rows, question, 6);
  if (!list.length) return "";
  return list
    .map((r) => {
      const name =
        r.player ||
        r.player_name ||
        r?.player?.full_name ||
        [r?.player?.first_name, r?.player?.last_name].filter(Boolean).join(" ") ||
        "player";
      const pts = r.fantasy_points ?? r.projected_points ?? r.points ?? r.ppr ?? null;
      const rush = r.rushing_yards ?? r.rush_yds ?? null;
      const rec = r.receiving_yards ?? r.rec_yds ?? null;
      const pass = r.passing_yards ?? r.pass_yds ?? null;
      const bits = [
        pts != null ? `${compactNum(pts)} proj pts` : null,
        pass != null ? `${compactNum(pass)} pass` : null,
        rush != null ? `${compactNum(rush)} rush` : null,
        rec != null ? `${compactNum(rec)} rec` : null,
      ].filter(Boolean);
      return `- ${name}: ${bits.length ? bits.join(" · ") : "projection row present"}`;
    })
    .join("\n");
}

/**
 * @param {{
 *   briefcase?: Record<string, unknown>|null,
 *   question?: string,
 *   scopeAbbrs?: Set<string>|string[]|null,
 *   maxChars?: number,
 * }} [opts]
 */
export function formatNflGoatAnalystPacket(opts = {}) {
  const briefcase = opts.briefcase;
  if (!briefcase || typeof briefcase !== "object") return "";
  const question = String(opts.question || "");
  const scope =
    opts.scopeAbbrs instanceof Set
      ? opts.scopeAbbrs
      : Array.isArray(opts.scopeAbbrs)
        ? new Set(opts.scopeAbbrs.map((x) => String(x || "").toUpperCase()))
        : null;
  const maxChars = Math.max(2000, Number(opts.maxChars) || 9000);

  const seasonStats = preferRows(briefcase.players?.seasonStats, question, 8).filter(
    (r) => r?.source && String(r.source).includes("balldontlie"),
  );
  const recent = preferRows(briefcase.players?.recentStats, question, 16);
  const passing = preferRows(briefcase.players?.advanced?.passing, question, 4);
  const rushing = preferRows(briefcase.players?.advanced?.rushing, question, 4);
  const receiving = preferRows(briefcase.players?.advanced?.receiving, question, 4);
  const injuries = (briefcase.league?.injuries || [])
    .filter((r) => {
      if (/^active$/i.test(String(r.status || ""))) return false;
      if (!scope?.size) return true;
      return [...scope].some((s) => String(s).toUpperCase() === String(r.team || "").toUpperCase());
    })
    .slice(0, 16);
  const defense = formatDefense(briefcase.league?.teamDefense, scope);
  const standings = formatStandings(briefcase.league?.standings, scope);
  const currentOdds = formatOdds(briefcase.slate?.odds, false);
  const openingOdds = formatOdds(briefcase.slate?.openingOdds, true);
  const fantasy = formatFantasy(briefcase.fantasy?.projections, question);

  const openerWeek = isNflOpenerWeek(briefcase.week);
  const blocks = [
    "NFL GOAT ANALYST PACKET (primary evidence — reason from this, then the posted line)",
    `Week ${briefcase.week ?? "?"} · ${briefcase.season ?? "?"} · source ${briefcase.primarySource || "unknown"}. Form a logical opinion on the asked market. Do not invent prices. If a pocket is empty, say so in one clause and still answer with what is here.`,
  ];
  if (openerWeek) {
    blocks.push(
      "OPENER WEEK: last-year defense ranks are a prior, not this year’s rank. Do not stamp ELITE/WORST as if 2026 has settled. Ticket still needs Over or Under. Conviction cap Speculative unless role/injury is the whole story.",
    );
  }

  if (currentOdds) blocks.push(currentOdds);
  if (openingOdds) blocks.push(openingOdds);

  if (seasonStats.length) {
    blocks.push(
      "SEASON STATS (live):\n" +
        seasonStats
          .map((r) => `- ${r.player} (${r.team || "?"}${r.position ? ` ${r.position}` : ""}): ${seasonLine(r)}`)
          .join("\n"),
    );
  }
  if (recent.length) {
    const byPlayer = new Map();
    for (const r of recent) {
      const key = r.player || "?";
      if (!byPlayer.has(key)) byPlayer.set(key, []);
      const arr = byPlayer.get(key);
      if (arr.length < 5) arr.push(r);
    }
    const lines = [];
    for (const [name, games] of byPlayer) {
      lines.push(`- ${name}: ${games.map(recentLine).join(" | ")}`);
    }
    blocks.push("RECENT GAME LOGS:\n" + lines.join("\n"));
  }
  const advLines = [];
  for (const r of passing) {
    const bits = advancedBits(r);
    if (bits) advLines.push(`- ${r.player} passing: ${bits}`);
  }
  for (const r of rushing) {
    const bits = advancedBits(r);
    if (bits) advLines.push(`- ${r.player} rushing: ${bits}`);
  }
  for (const r of receiving) {
    const bits = advancedBits(r);
    if (bits) advLines.push(`- ${r.player} receiving: ${bits}`);
  }
  if (advLines.length) blocks.push("ADVANCED (support, one clause max in the take):\n" + advLines.join("\n"));

  if (defense) {
    blocks.push(
      (openerWeek
        ? "TEAM DEFENSE (last-year prior until live ranks exist):\n"
        : "LIVE TEAM DEFENSE (opp allowed):\n") + defense,
    );
  }
  if (standings) blocks.push(`STANDINGS: ${standings}`);
  if (injuries.length) {
    blocks.push(
      "INJURIES (live):\n" +
        injuries
          .map(
            (i) =>
              `- ${i.player || i.name} (${i.team || "?"}${i.position ? ` ${i.position}` : ""}): ${i.status || "?"}${i.comment ? ` — ${i.comment}` : ""}`,
          )
          .join("\n"),
    );
  }
  if (fantasy) blocks.push("WEEKLY PROJECTIONS (usage prior, not the posted number):\n" + fantasy);

  const text = blocks.filter(Boolean).join("\n\n");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[analyst packet trimmed]`;
}
