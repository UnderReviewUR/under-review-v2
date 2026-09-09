/**
 * Grade an already-placed NFL slip ("I bet X, Y, Z — thoughts?").
 */
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import { buildNflStaticPlayerTeamIndex } from "../api/_nflMatchupPropHygiene.js";
import {
  buildNflPlayerTeamIndex,
  mergeNflPlayerTeamIndexesPreferLast,
  normalizePlayerKey,
  resolveNflPlayerTeamFromIndex,
} from "./nflAskPropTrim.js";

const TEAM_WIN_RE =
  /\b([a-z][a-z .']{2,18}?)\s+(?:to\s+)?win\b|\b([a-z]{2,3})\s+(?:ml|moneyline)\b/gi;
const OU_RE = /\b([a-z][a-z0-9.'\s-]{1,28}?)\s+(over|under)\s+(\d+(?:\.\d+)?)\b/gi;

/**
 * @param {string} question
 */
export function parseNflStatedTicketLegs(question) {
  const q = String(question || "");
  /** @type {Array<Record<string, unknown>>} */
  const legs = [];
  const seen = new Set();

  const winRe = new RegExp(TEAM_WIN_RE.source, "gi");
  let m;
  while ((m = winRe.exec(q))) {
    const raw = String(m[1] || m[2] || "").trim();
    if (!raw || /^(to|the|a)$/i.test(raw)) continue;
    const key = `win:${raw.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    legs.push({ kind: "win", raw, side: "ML" });
  }

  const ouRe = new RegExp(OU_RE.source, "gi");
  while ((m = ouRe.exec(q))) {
    const raw = String(m[1] || "").replace(/^(and|,)\s+/i, "").trim();
    const side = String(m[2] || "").toLowerCase() === "over" ? "Over" : "Under";
    const line = Number(m[3]);
    if (!raw || !Number.isFinite(line)) continue;
    if (/^(and|the|a|an|i)$/i.test(raw)) continue;
    const key = `ou:${raw.toLowerCase()}:${side}:${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    legs.push({ kind: "ou", raw, side, line });
  }

  return legs;
}

/**
 * @param {string} question
 */
export function isNflTicketReviewAsk(question) {
  const q = String(question || "").toLowerCase();
  const legs = parseNflStatedTicketLegs(q);
  if (legs.length < 2) return false;
  if (/\b(i\s+bet|i\s+took|i\s+have|i've\s+got|my\s+(?:bet|ticket|parlay|slip)|thoughts)\b/.test(q)) {
    return true;
  }
  return legs.filter((l) => l.kind === "ou").length >= 2;
}

function propBlob(row) {
  return `${row?.propRaw || ""} ${row?.prop || ""}`.toLowerCase();
}

function playerRows(propLines, rawName) {
  const want = normalizePlayerKey(rawName);
  if (!want) return [];
  const wantParts = want.split(" ").filter(Boolean);
  const wantLast = wantParts[wantParts.length - 1];
  const wantFirst = wantParts[0] || "";
  return (propLines || []).filter((p) => {
    const n = normalizePlayerKey(p?.player);
    if (!n) return false;
    if (n === want) return true;
    const nParts = n.split(" ").filter(Boolean);
    const nLast = nParts[nParts.length - 1];
    const nFirst = nParts[0] || "";
    if (wantParts.length === 1) return nLast === want;
    if (nLast !== wantLast) return false;
    if (nFirst === wantFirst) return true;
    const initials = nParts.slice(0, -1).map((part) => part[0]).join("");
    return wantFirst === initials;
  });
}

function pickRowForStatedLine(rows, stated, slipTeams = new Set()) {
  if (!rows.length) return null;
  const inGame =
    slipTeams && slipTeams.size
      ? rows.filter((r) => {
          const ts = gameTeamSet([], r.game);
          return [...ts].some((t) => slipTeams.has(t));
        })
      : rows;
  const pool = inGame.length ? inGame : rows;
  const n = Number(stated);
  const scored = pool
    .filter((r) => Number.isFinite(Number(r.line)))
    .map((r) => ({ r, d: Math.abs(Number(r.line) - n), blob: propBlob(r) }))
    .sort((a, b) => a.d - b.d);
  if (!scored.length) return null;

  const yards = scored.filter(
    (x) => /pass_yds|passing yards|rush_yds|rushing yards|rec_yds|receiving yards/.test(x.blob) && !/longest/.test(x.blob),
  );
  if (n >= 180 && yards.length) {
    const pass = yards.find((x) => /pass_yds|passing yards/.test(x.blob));
    return (pass || yards[0]).r;
  }
  if (n > 15 && yards.length) {
    const close = yards.filter((x) => x.d <= 40);
    return (close[0] || yards[0]).r;
  }
  if (n <= 20) {
    const rec = scored.find((x) => /rec_yds|receiving yards/.test(x.blob) && x.d <= 30);
    if (rec) return rec.r;
  }
  const headline = scored.find((x) => /pass_yds|passing yards|rec_yds|receiving yards|rush_yds/.test(x.blob));
  return (headline || scored[0]).r;
}

function gameTeamSet(games, liveGame) {
  const out = new Set();
  for (const row of games || []) {
    const home = String(row?.homeAbbr || "").toUpperCase();
    const away = String(row?.awayAbbr || "").toUpperCase();
    if (home) out.add(home);
    if (away) out.add(away);
  }
  const g = String(liveGame || "").toUpperCase();
  const m = g.match(/\b([A-Z]{2,3})\s*@\s*([A-Z]{2,3})\b/);
  if (m) {
    out.add(m[1]);
    out.add(m[2]);
  }
  return out;
}

function teamIndexFromBriefcase(briefcase) {
  const named =
    briefcase?.league?.playerTeamByName && typeof briefcase.league.playerTeamByName === "object"
      ? briefcase.league.playerTeamByName
      : {};
  const fromRosters = buildNflPlayerTeamIndex(
    Object.entries(briefcase?.league?.rostersByTeam || {}).flatMap(([team, rows]) =>
      (Array.isArray(rows) ? rows : []).map((r) => ({
        name: r?.name || r?.player,
        team,
      })),
    ),
  );
  return mergeNflPlayerTeamIndexesPreferLast(buildNflStaticPlayerTeamIndex(), fromRosters, named);
}

/**
 * @param {string} question
 * @param {Array<Record<string, unknown>>} games
 * @param {Array<Record<string, unknown>>} propLines
 * @param {Record<string, unknown>|null} [briefcase]
 */
export function gradeNflStatedTicket(question, games = [], propLines = [], briefcase = null) {
  const legs = parseNflStatedTicketLegs(question);
  const teamIndex = teamIndexFromBriefcase(briefcase);
  const notes = [];
  /** @type {Array<string>} */
  const wrongGame = [];
  /** @type {Array<Record<string, unknown>>} */
  const likes = [];

  for (const leg of legs) {
    if (leg.kind === "win") {
      const abbr = detectNflTeamHint(String(leg.raw));
      const g = (games || []).find((row) => {
        const home = String(row?.homeAbbr || "").toUpperCase();
        const away = String(row?.awayAbbr || "").toUpperCase();
        return abbr && (home === abbr || away === abbr);
      });
      const fav = String(g?.spread?.favoriteAbbr || "").toUpperCase();
      const chalk = Boolean(abbr && fav && fav === abbr);
      notes.push(
        chalk
          ? `${String(leg.raw)} ML — that's the favorite, not the edge. It also fights a Maye under if New England trails.`
          : `${String(leg.raw)} ML — I can live with the side if the rest of the ticket is clean.`,
      );
      continue;
    }

    const rows = playerRows(propLines, String(leg.raw));
    const slipTeams = gameTeamSet(games, "");
    const live = pickRowForStatedLine(rows, leg.line, slipTeams);
    const who = String(live?.player || leg.raw);
    const liveN = live ? Number(live.line) : null;
    const market = String(live?.prop || live?.propRaw || "prop").replace(/_/g, " ");
    const liveTeam = String(live?.team || live?.teamAbbr || "").toUpperCase();
    const team = resolveNflPlayerTeamFromIndex(who, teamIndex, liveTeam);

    if (!live) {
      notes.push(`${who} ${String(leg.side).toLowerCase()} ${leg.line} — I don't have a live row for that name/market.`);
      continue;
    }

    if (team && slipTeams.size && !slipTeams.has(team)) {
      wrongGame.push(`${who} (${team})`);
    }

    const delta = Number(leg.line) - liveN;
    let take = "fine";
    if (leg.side === "Under" && delta >= 8) take = "like";
    else if (leg.side === "Over" && delta <= -8) take = "like";
    else if (leg.side === "Under" && delta <= -8) take = "hate";
    else if (leg.side === "Over" && delta >= 8) take = "hate";

    if (take === "like") {
      likes.push({ who, side: leg.side, line: leg.line, live: liveN, market });
    }

    const how =
      take === "like"
        ? `I'd take it. Live ${market} is ${liveN}; yours is the better number.`
        : take === "hate"
          ? `I'd fade it. Live ${market} is ${liveN}; yours is the worse number.`
          : `Right side vs live ${market} ${liveN} — not a smash.`;
    notes.push(`${who} ${String(leg.side).toLowerCase()} ${leg.line} — ${how}`);
  }

  const qbLike = likes.find((x) => /pass|yds/i.test(String(x.market)) && Number(x.line) >= 180) || likes[0] || null;
  const opener = qbLike
    ? `Lean: Keep ${String(qbLike.who).split(" ").pop()} ${String(qbLike.side).toLowerCase()} ${qbLike.line}. Best number on this slip.`
    : "Lean: Don't treat this as one game if the roster says otherwise.";

  const extra = wrongGame.length
    ? `${[...new Set(wrongGame)].join(", ")} — not on this matchup's roster. Don't treat that as a same-game leg.`
    : "";

  const list = notes.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const callWho = qbLike ? String(qbLike.who).split(" ").pop() : "TICKET";
  const call = qbLike
    ? `${callWho.toUpperCase()} ${String(qbLike.side).toUpperCase()} ${qbLike.line}`
    : "TICKET REVIEW";

  return {
    opener,
    call,
    list,
    extra,
    whyNow: [
      qbLike
        ? `I'd sit with the QB unders if those are the real numbers.`
        : opener,
      "",
      list,
      extra,
      "",
      "Don't add more. Week 1. Speculative.",
    ]
      .filter(Boolean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    edge: "I'd take the unders. I would not stack this as one SEA game.",
  };
}

/**
 * @param {Record<string, unknown>} structured
 * @param {string} question
 * @param {Array<Record<string, unknown>>} games
 * @param {Array<Record<string, unknown>>} propLines
 */
export function applyNflTicketReviewToStructured(structured, question, games, propLines, briefcase = null) {
  const g = gradeNflStatedTicket(question, games, propLines, briefcase);
  let lean = g.opener;
  if (lean.length > 120) {
    lean = `${lean.slice(0, 119).replace(/\s+\S*$/, "")}.`;
  }
  structured.sport = "NFL";
  structured.call = g.call;
  structured.callType = "prop";
  structured.confidence = "Speculative";
  structured.lean = lean;
  structured.whyNow = g.whyNow;
  structured.edge = g.edge;
  const summary = g.extra || g.list;
  structured.analysis = {
    matchupAnalysis: String(summary || g.list).slice(0, 580),
    injuryContext: "Check inactives before you bet it.",
    marketContext: String(g.extra || "Grade each stated number against the live board.").slice(0, 380),
    lineMovement: "Stick to a posted number. Don't invent movement.",
    statisticalEdge: "First week — last year's D is a prior, not this year's rank.",
  };
  structured.caveats = [
    "First week — last year's D is a prior, not this year's rank.",
    "If a named player isn't on this matchup's roster, that's the problem — not the QB unders.",
  ];
  structured.timestamp = new Date().toISOString();
  return true;
}
