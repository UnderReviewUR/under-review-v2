/**
 * F1 + Tennis odds source discovery (report-only). No scrape modules.
 * Usage: node scripts/discover-f1-tennis-odds-sources.mjs
 */
import "dotenv/config";

const ODDS_KEY = process.env.ODDS_API_KEY || "";
const AN_BOOKS = "15,30,79";
const AN_BASE = "https://api.actionnetwork.com/web/v2";
const UA = "UnderReview/1.0 (+https://under-review.app)";

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA, ...headers },
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _preview: text.slice(0, 400) };
  }
  return { status: res.status, ok: res.ok, body, headers: Object.fromEntries(res.headers) };
}

function countPropsMarkets(playerProps) {
  if (!playerProps || typeof playerProps !== "object") return 0;
  return Object.keys(playerProps).filter((k) => {
    const rows = playerProps[k];
    return Array.isArray(rows) && rows.length > 0;
  }).length;
}

function samplePropRow(playerProps) {
  if (!playerProps) return null;
  for (const [mk, rows] of Object.entries(playerProps)) {
    if (!Array.isArray(rows) || !rows.length) continue;
    const row = rows[0];
    const books = row?.lines && typeof row.lines === "object" ? Object.keys(row.lines) : [];
    const b0 = books[0];
    const line = b0 && Array.isArray(row.lines[b0]) ? row.lines[b0][0] : null;
    return {
      marketKey: mk,
      player_abbr: row.player_abbr,
      player_id: row.player_id,
      line: line
        ? { side: line.side, value: line.value, odds: line.odds, type: line.type }
        : null,
    };
  }
  return null;
}

const report = { probedAt: new Date().toISOString() };

// --- The Odds API ---
report.oddsApi = { hasKey: Boolean(ODDS_KEY) };
if (ODDS_KEY) {
  const sportsRes = await fetchJson(`https://api.the-odds-api.com/v4/sports?apiKey=${ODDS_KEY}`);
  const sports = Array.isArray(sportsRes.body) ? sportsRes.body : [];
  report.oddsApi.requestsRemaining = sportsRes.headers["x-requests-remaining"] ?? null;

  const motor = sports.filter((s) => /formula|f1|motor|nascar|racing/i.test(`${s.key} ${s.title || ""}`));
  const tennis = sports.filter((s) => /tennis/i.test(`${s.key} ${s.title || ""}`));

  report.oddsApi.motorSportKeys = motor.map((s) => ({
    key: s.key,
    title: s.title,
    active: s.active,
    has_outrights: s.has_outrights,
  }));
  report.oddsApi.tennisSportKeys = tennis.map((s) => ({
    key: s.key,
    title: s.title,
    active: s.active,
    has_outrights: s.has_outrights,
  }));

  // F1 / motor outrights
  report.oddsApi.f1Outrights = [];
  for (const s of motor) {
    const url = `https://api.the-odds-api.com/v4/sports/${s.key}/odds/?apiKey=${ODDS_KEY}&regions=us&markets=outrights&oddsFormat=american`;
    const r = await fetchJson(url);
    const events = Array.isArray(r.body) ? r.body : [];
    let sample = null;
    if (events[0]?.bookmakers?.[0]) {
      const bm = events[0].bookmakers[0];
      const m = bm.markets?.[0];
      const o = m?.outcomes?.[0];
      sample = {
        event: events[0].sport_title || events[0].id,
        book: bm.key,
        market: m?.key,
        outcome: o ? { name: o.name, price: o.price } : null,
      };
    }
    report.oddsApi.f1Outrights.push({
      sportKey: s.key,
      status: r.status,
      ok: r.ok,
      eventCount: events.length,
      sample,
    });
  }

  // Tennis — h2h, spreads, totals, player_props where supported
  report.oddsApi.tennisMarkets = [];
  const tennisKeysToTry = tennis.map((s) => s.key);
  for (const sportKey of tennisKeysToTry) {
    for (const markets of [
      "h2h",
      "spreads,totals",
      "player_props",
      "h2h,spreads,totals,player_props",
    ]) {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
      const r = await fetchJson(url);
      const events = Array.isArray(r.body) ? r.body : [];
      const marketKeysFound = new Set();
      let sampleOutcome = null;
      for (const ev of events.slice(0, 3)) {
        for (const bm of ev.bookmakers || []) {
          for (const m of bm.markets || []) {
            marketKeysFound.add(m.key);
            if (!sampleOutcome && m.outcomes?.[0]) {
              sampleOutcome = {
                sportKey,
                market: m.key,
                book: bm.key,
                name: m.outcomes[0].name,
                price: m.outcomes[0].price,
                point: m.outcomes[0].point,
                description: m.outcomes[0].description,
              };
            }
          }
        }
      }
      if (r.ok && events.length > 0) {
        report.oddsApi.tennisMarkets.push({
          sportKey,
          marketsParam: markets,
          status: r.status,
          eventCount: events.length,
          marketKeysFound: [...marketKeysFound],
          sampleOutcome,
        });
      } else if (!r.ok && typeof r.body === "object" && r.body.message) {
        report.oddsApi.tennisMarkets.push({
          sportKey,
          marketsParam: markets,
          status: r.status,
          error: r.body.message || r.body,
        });
      }
    }
  }
} else {
  report.oddsApi.note = "ODDS_API_KEY not set — skipped live Odds API probes";
}

// --- Action Network tennis props sweep ---
const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const anSb = await fetchJson(`${AN_BASE}/scoreboard/tennis?date=${today}&bookIds=${AN_BOOKS}`);
const competitions = Array.isArray(anSb.body?.competitions) ? anSb.body.competitions : [];

const ranked = [...competitions].sort((a, b) => {
  const aMain = /roland|garros|french open|semifinal|quarterfinal|round of/i.test(
    `${a.meta?.title || ""} ${a.venue?.name || ""}`,
  );
  const bMain = /roland|garros|french open|semifinal|quarterfinal|round of/i.test(
    `${b.meta?.title || ""} ${b.venue?.name || ""}`,
  );
  if (aMain !== bMain) return bMain ? 1 : -1;
  return String(a.league_name).localeCompare(String(b.league_name));
});

const toProbe = ranked.slice(0, 12);
report.actionNetworkTennis = {
  scoreboardStatus: anSb.status,
  competitionCount: competitions.length,
  probed: [],
};

for (const c of toProbe) {
  const url = `${AN_BASE}/games/${c.id}/props?bookIds=${AN_BOOKS}`;
  const pr = await fetchJson(url);
  const ppCount = countPropsMarkets(pr.body?.player_props);
  const gpCount = pr.body?.game_props ? countPropsMarkets(pr.body.game_props) : 0;
  const embeddedMk = c.markets?.["15"]?.event
    ? Object.keys(c.markets["15"].event)
    : [];
  report.actionNetworkTennis.probed.push({
    id: c.id,
    league: c.league_name,
    title: c.meta?.title,
    venue: c.venue?.name,
    status: c.status,
    propsStatus: pr.status,
    playerPropsMarketCount: ppCount,
    gamePropsMarketCount: gpCount,
    embeddedMarketTypes: embeddedMk,
    samplePlayerProp: samplePropRow(pr.body?.player_props),
  });
}

const withPlayerProps = report.actionNetworkTennis.probed.filter((p) => p.playerPropsMarketCount > 0);

report.actionNetworkTennis.summary = {
  withNonEmptyPlayerProps: withPlayerProps.length,
  ids: withPlayerProps.map((p) => p.id),
};

// --- Action Network motor-sports HTML scrape for API URLs ---
const htmlRes = await fetch("https://www.actionnetwork.com/motor-sports", {
  headers: { "User-Agent": UA, Accept: "text/html" },
  signal: AbortSignal.timeout(25000),
});
const html = await htmlRes.text();
const apiUrls = [
  ...new Set(
    (html.match(/https?:\/\/[a-z0-9._/-]+api[^"'\s)]+/gi) || []).concat(
      html.match(/\/web\/v\d\/[a-z0-9/_-]+/gi) || [],
    ),
  ),
].slice(0, 40);
report.actionNetworkMotorSportsHtml = {
  status: htmlRes.status,
  length: html.length,
  apiLikeUrlsFound: apiUrls.filter((u) => /actionnetwork|api\./i.test(u)).slice(0, 25),
  hasNextData: html.includes("__NEXT_DATA__"),
};

// --- SportRadar ---
report.sportRadar = {
  hasKey: Boolean(process.env.SPORTRADAR_API_KEY || process.env.SPORT_RADAR_API_KEY),
  note: "No SPORTRADAR_API_KEY / SPORT_RADAR_API_KEY in .env — not probed live",
};

// --- ATP / WTA site probes ---
async function probeSite(label, url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const text = await r.text();
    const graphql = [
      ...new Set(text.match(/graphql[^"'\s]{0,80}/gi) || []),
    ].slice(0, 8);
    const apiPaths = [
      ...new Set(
        (text.match(/https?:\/\/[^"'\s]+(?:api|graphql|odds)[^"'\s]*/gi) || []).slice(0, 15),
      ),
    ];
    return {
      label,
      url,
      status: r.status,
      length: text.length,
      graphqlHints: graphql,
      apiUrls: apiPaths,
      hasNextData: text.includes("__NEXT_DATA__"),
    };
  } catch (e) {
    return { label, url, error: e?.message || "fetch_failed" };
  }
}

report.tourSites = await Promise.all([
  probeSite("atptour", "https://www.atptour.com/en/scores/current"),
  probeSite("wtatennis", "https://www.wtatennis.com/scores"),
]);

console.log(JSON.stringify(report, null, 2));
