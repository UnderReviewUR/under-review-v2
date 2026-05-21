/**
 * EU/UK F1 + Tennis odds discovery (report-only).
 * Usage: node scripts/discover-eu-uk-odds-sources.mjs
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchProbe(label, url, opts = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json,text/html,*/*", "User-Agent": UA, ...opts.headers },
      signal: AbortSignal.timeout(25000),
      ...opts,
    });
    const ct = r.headers.get("content-type") || "";
    const text = await r.text();
    let json = null;
    if (ct.includes("json")) {
      try {
        json = JSON.parse(text);
      } catch {
        /* ignore */
      }
    }
    const nextMatch = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    let next = null;
    if (nextMatch) {
      try {
        next = JSON.parse(nextMatch[1]);
      } catch {
        /* ignore */
      }
    }
    const apiRe = /https?:\/\/[^\s"'<>]+/gi;
    const apiHits = [
      ...new Set(
        (text.match(apiRe) || []).filter((u) =>
          /api|graphql|skybet|skysports|oddschecker|bet365|williamhill|paddypower|flashscore|sofascore|smarkets|betfair|sb\./i.test(u),
        ),
      ),
    ].slice(0, 30);
    return {
      label,
      url,
      status: r.status,
      ms: Date.now() - t0,
      contentType: ct,
      length: text.length,
      rateLimit: {
        remaining: r.headers.get("x-ratelimit-remaining"),
        retryAfter: r.headers.get("retry-after"),
      },
      jsonTopKeys: json && typeof json === "object" ? Object.keys(json).slice(0, 15) : null,
      hasNextData: Boolean(next),
      nextDataKeys: next ? Object.keys(next).slice(0, 10) : null,
      apiUrlHints: apiHits,
      isCloudflare: /just a moment|cf-browser-verification|cloudflare/i.test(text.slice(0, 3000)),
      preview: text.slice(0, 250).replace(/\s+/g, " "),
    };
  } catch (e) {
    return { label, url, error: e?.message || "fetch_failed" };
  }
}

async function fetchJson(label, url, opts = {}) {
  const r = await fetchProbe(label, url, {
    headers: { Accept: "application/json", ...opts.headers },
    ...opts,
  });
  if (r.status === 200 && r.contentType?.includes("json")) {
    try {
      const full = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA, ...opts.headers },
        signal: AbortSignal.timeout(25000),
        ...opts,
      });
      r.parsed = await full.json();
    } catch {
      /* ignore */
    }
  }
  return r;
}

const report = { probedAt: new Date().toISOString(), f1: {}, tennis: {} };

// --- HTML pages ---
const htmlPages = [
  ["skysports-f1", "https://www.skysports.com/f1"],
  ["skysports-f1-odds", "https://www.skysports.com/f1/odds"],
  ["bbc-f1", "https://www.bbc.com/sport/formula1"],
  ["oddschecker-f1", "https://www.oddschecker.com/motor-racing/formula-1"],
  ["oddschecker-f1-winner", "https://www.oddschecker.com/motor-racing/formula-1/winner"],
  ["williamhill-motor", "https://sports.williamhill.com/betting/en-gb/motor-racing"],
  ["paddypower-motor", "https://www.paddypower.com/sport/motor-racing"],
  ["flashscore-f1", "https://www.flashscore.com/motorsport/formula-1/"],
  ["skysports-tennis-odds", "https://www.skysports.com/tennis/odds"],
  ["oddschecker-tennis", "https://www.oddschecker.com/tennis/french-open"],
  ["oddschecker-aces", "https://www.oddschecker.com/tennis/french-open/aces"],
  ["oddschecker-games-hcap", "https://www.oddschecker.com/tennis/french-open/games-handicap"],
  ["flashscore-tennis", "https://www.flashscore.com/tennis/"],
];

report.htmlProbes = [];
for (const [label, url] of htmlPages) {
  report.htmlProbes.push(await fetchProbe(label, url));
}

// --- Known API candidates ---
report.apiProbes = [];

// Smarkets F1 + tennis
for (const [label, url] of [
  ["smarkets-tennis-upcoming", "https://api.smarkets.com/v3/events/?type_domain=tennis&type_scope=single_event&state=upcoming"],
  ["smarkets-f1", "https://api.smarkets.com/v3/events/?type_domain=motor_sport&type_scope=single_event&state=upcoming"],
  ["smarkets-motor", "https://api.smarkets.com/v3/events/?type_domain=motor&type_scope=single_event&state=upcoming"],
]) {
  const p = await fetchProbe(label, url);
  if (p.status === 200) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
      const body = await r.json();
      const events = body.events || body.results || [];
      p.eventCount = events.length;
      p.sampleEvent = events[0] || null;
      if (events[0]?.id) {
        const mid = `https://api.smarkets.com/v3/markets/?event_id=${events[0].id}`;
        const mr = await fetch(mid, { headers: { Accept: "application/json", "User-Agent": UA } });
        const mb = await mr.json();
        const markets = mb.markets || mb.results || [];
        p.marketsStatus = mr.status;
        p.marketCount = markets.length;
        p.sampleMarkets = markets.slice(0, 5).map((m) => ({
          id: m.id,
          name: m.name,
          market_type: m.market_type?.name || m.market_type,
          state: m.state,
        }));
      }
    } catch (e) {
      p.parseError = e.message;
    }
  }
  report.apiProbes.push(p);
}

// Sofascore
for (const [label, url] of [
  ["sofascore-tennis-live", "https://api.sofascore.com/api/v1/sport/tennis/events/live"],
  ["sofascore-tennis-scheduled", "https://www.sofascore.com/api/v1/sport/tennis/scheduled-events/2026-05-21"],
  ["sofascore-f1", "https://api.sofascore.com/api/v1/sport/motorsport/category/40/events/last/0"],
]) {
  const p = await fetchProbe(label, url);
  report.apiProbes.push(p);
}

// Oddschecker API guesses
for (const [label, url] of [
  ["oc-api-guess-1", "https://api.oddschecker.com/v1/odds/motor-racing/formula-1/winner"],
  ["oc-api-guess-2", "https://www.oddschecker.com/api/odds/motor-racing/formula-1/winner"],
  ["oc-api-guess-3", "https://www.oddschecker.com/api/markets/motor-racing/formula-1"],
]) {
  report.apiProbes.push(await fetchProbe(label, url));
}

// Paddy Power buildyourbet
report.apiProbes.push(
  await fetchProbe(
    "paddypower-buildyourbet",
    "https://buildyourbetapi.paddypower.com/sportsbook/v1/sports",
  ),
);

// Sky Bet / sb.skysports guesses
for (const [label, url] of [
  ["skybet-sb", "https://sb.skysports.com/football"],
  ["api-skysports", "https://api.skysports.com/graphql"],
]) {
  report.apiProbes.push(await fetchProbe(label, url));
}

// Betfair
report.apiProbes.push(
  await fetchProbe("betfair-listEvents", "https://api.betfair.com/exchange/betting/rest/v1.0/listEvents/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Application": "discovery-probe" },
    body: JSON.stringify({ filter: { eventTypeIds: ["2"] } }),
  }),
);

// Oddschecker API host probes
report.oddscheckerApi = [];
for (const [label, url] of [
  ["oc-root", "https://api.oddschecker.com/"],
  ["oc-v1-markets", "https://api.oddschecker.com/v1/markets"],
  ["oc-v1-odds", "https://api.oddschecker.com/v1/odds"],
]) {
  report.oddscheckerApi.push(await fetchProbe(label, url));
}

// Smarkets markets sample (correct path)
try {
  const eid = "45080832";
  const mr = await fetchJson(`https://api.smarkets.com/v3/events/${eid}/markets/`);
  const markets = Array.isArray(mr.body?.markets) ? mr.body.markets : [];
  report.smarketsMarketsSample = {
    eventId: eid,
    status: mr.status,
    marketCount: markets.length,
    markets: markets.slice(0, 6).map((m) => ({
      id: m.id,
      name: m.name,
      type: m.market_type?.name,
      category: m.category,
    })),
  };
} catch (e) {
  report.smarketsMarketsSample = { error: e?.message };
}

console.log(JSON.stringify(report, null, 2));
