/**
 * Step-1 discovery probe for Action Network MLB / Tennis / F1.
 * Usage: node scripts/probe-action-network-sports.mjs
 */

const BASE = "https://api.actionnetwork.com/web/v2";
const BOOK_IDS = "15,30,79";
const UA = "UnderReview/1.0 (+https://under-review.app)";

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _parseError: true, preview: text.slice(0, 300) };
  }
  return { status: res.status, ok: res.ok, body };
}

function findGameLikeIds(obj, path = "", out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    for (let i = 0; i < Math.min(obj.length, 5); i++) {
      findGameLikeIds(obj[i], `${path}[${i}]`, out);
    }
    return out;
  }
  if (obj.id != null && Number.isFinite(Number(obj.id))) {
    if (/game|event|match|tournament/i.test(path) || obj.start_time || obj.status) {
      out.push({
        path,
        id: obj.id,
        status: obj.status,
        real_status: obj.real_status,
        start_time: obj.start_time,
        league_name: obj.league_name,
      });
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === "lines" || k === "bet_info") continue;
    findGameLikeIds(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function summarizeProps(body) {
  if (!body || typeof body !== "object") return null;
  const pp = body.player_props;
  const gp = body.game_props;
  const sampleMk = (o) => (o && typeof o === "object" ? Object.keys(o) : []);
  let sampleRow = null;
  let sampleMkName = null;
  if (pp && typeof pp === "object") {
    for (const mk of Object.keys(pp)) {
      const rows = pp[mk];
      if (Array.isArray(rows) && rows.length) {
        sampleMkName = mk;
        const row = rows[0];
        const books = row?.lines && typeof row.lines === "object" ? Object.keys(row.lines) : [];
        const firstBook = books[0];
        const line = firstBook && Array.isArray(row.lines[firstBook]) ? row.lines[firstBook][0] : null;
        sampleRow = {
          marketKey: mk,
          rowKeys: Object.keys(row || {}),
          lineKeys: line ? Object.keys(line) : [],
          line: line
            ? {
                side: line.side,
                value: line.value,
                odds: line.odds,
                player_id: line.player_id,
                player_abbr: row.player_abbr,
                type: line.type,
              }
            : null,
        };
        break;
      }
    }
  }
  return {
    topKeys: Object.keys(body),
    playerPropsMarkets: sampleMk(pp).slice(0, 40),
    playerPropsMarketCount: sampleMk(pp).length,
    gamePropsMarkets: sampleMk(gp).slice(0, 20),
    gamePropsMarketCount: sampleMk(gp).length,
    sampleRow,
    sampleMarketKey: sampleMkName,
  };
}

async function probeScoreboard(sport, extraQs = "") {
  const url = `${BASE}/scoreboard/${sport}?bookIds=${BOOK_IDS}${extraQs}`;
  const res = await fetchJson(url);
  const body = res.body;
  const games = Array.isArray(body?.games) ? body.games : [];
  return {
    sport,
    url,
    status: res.status,
    ok: res.ok,
    topKeys: body && typeof body === "object" ? Object.keys(body) : [],
    gamesCount: games.length,
    scheduled: games.filter((g) => /sched/i.test(String(g.status || g.real_status || ""))).length,
    sampleGame: games[0]
      ? {
          id: games[0].id,
          status: games[0].status,
          real_status: games[0].real_status,
          start_time: games[0].start_time,
          league_name: games[0].league_name,
          teams: Array.isArray(games[0].teams)
            ? games[0].teams.map((t) => t.abbr || t.display_name)
            : null,
        }
      : null,
    idCandidates: res.ok ? findGameLikeIds(body).slice(0, 8) : [],
  };
}

async function probeGameProps(gameId, label) {
  const url = `${BASE}/games/${gameId}/props?bookIds=${BOOK_IDS}`;
  const res = await fetchJson(url);
  return {
    label,
    gameId,
    url,
    status: res.status,
    ok: res.ok,
    ...(res.ok ? summarizeProps(res.body) : { error: res.body }),
  };
}

const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

const report = { probedAt: new Date().toISOString(), todayYmd: today, sports: {} };

// MLB
const mlbSb = await probeScoreboard("mlb");
report.sports.mlb = { scoreboard: mlbSb };
const mlbSbFull = await fetchJson(mlbSb.url);
const mlbGames = Array.isArray(mlbSbFull.body?.games) ? mlbSbFull.body.games : [];
const mlbPick =
  mlbGames.find((g) => /sched/i.test(String(g.status || g.real_status || ""))) || mlbGames[0];
if (mlbPick?.id) {
  report.sports.mlb.props = await probeGameProps(mlbPick.id, "scheduled_or_first");
}
report.sports.mlb.marketsEndpoint = await fetchJson(
  `${BASE}/scoreboard/mlb/markets?customPickTypes=core_bet_type_36_hits,core_bet_type_37_strikeouts&date=${today}&bookIds=${BOOK_IDS}`,
);

// Tennis
const tennisSb = await probeScoreboard("tennis", `&date=${today}`);
report.sports.tennis = { scoreboard: tennisSb };
const tennisFull = await fetchJson(tennisSb.url);
let tennisGameId = null;
const tg = Array.isArray(tennisFull.body?.games) ? tennisFull.body.games : [];
if (tg[0]?.id) tennisGameId = tg[0].id;
if (!tennisGameId) {
  const cands = findGameLikeIds(tennisFull.body);
  tennisGameId = cands[0]?.id ?? null;
  report.sports.tennis.idCandidates = cands.slice(0, 12);
}
if (tennisGameId) {
  report.sports.tennis.props = await probeGameProps(tennisGameId, "from_scoreboard");
} else {
  report.sports.tennis.props = { skipped: true, reason: "no_game_id_in_scoreboard" };
}

// F1 and alternates
for (const sport of ["f1", "formula1", "formula-1", "nascar", "motorsports", "racing"]) {
  const sb = await probeScoreboard(sport);
  report.sports[sport] = { scoreboard: sb };
  if (sb.sampleGame?.id) {
    report.sports[sport].props = await probeGameProps(sb.sampleGame.id, "first_game");
  }
}

// NBA — first scheduled/live game from today's scoreboard
const nbaSb = await probeScoreboard("nba", `&date=${today}`);
report.sports.nba = { scoreboard: nbaSb };
const nbaFull = await fetchJson(nbaSb.url);
const nbaGames = Array.isArray(nbaFull.body?.games) ? nbaFull.body.games : [];
const nbaPick =
  nbaGames.find((g) => /sched|live/i.test(String(g.status || g.real_status || ""))) || nbaGames[0];
if (nbaPick?.id) {
  report.sports.nba.props = await probeGameProps(nbaPick.id, "scoreboard_pick");
}

console.log(JSON.stringify(report, null, 2));
