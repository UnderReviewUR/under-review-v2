import { getDurableJson, setDurableJson } from "./_durableStore.js";

// TODO(post-deploy): Split DraftKings Puppeteer fallback into `api/_mlbOddsDkFallback.js`
// so this file stays focused on ESPN-primary parsing and cache orchestration.
const ESPN_MLB_SCOREBOARD_API =
  "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
const DK_MLB_ODDS_PAGE_URL = "https://sportsbook.draftkings.com/leagues/baseball/mlb";

const MLB_ODDS_CACHE_TTL_SECONDS = 30 * 60;
const MLB_ODDS_STALE_MS = 10 * 60 * 1000;
const memCache = new Map();

/**
 * Primary endpoint verification (2026-05-28):
 * ESPN scoreboard includes odds at:
 * event.competitions[0].odds[0].moneyline / pointSpread / total.
 * We use this JSON API as primary and reserve Puppeteer for DK fallback only.
 */
const DK_RESPONSE_URL_HINTS = [
  "sportsbook-nash.draftkings.com/api/sportscontent/",
  "/api/sportscontent/",
];

function mlbOddsCacheKey(gameId) {
  return `mlb_odds_${String(gameId)}_v1`;
}

/**
 * @param {string} gameId
 */
async function readCacheEntry(gameId) {
  const key = mlbOddsCacheKey(gameId);
  const mem = memCache.get(key);
  if (mem) return mem;
  return getDurableJson(key);
}

/**
 * @param {string} gameId
 * @param {{ payload: Record<string, unknown>, fetchedAtMs: number }} entry
 */
async function writeCacheEntry(gameId, entry) {
  const key = mlbOddsCacheKey(gameId);
  memCache.set(key, entry);
  try {
    await setDurableJson(key, entry, { ttlSeconds: MLB_ODDS_CACHE_TTL_SECONDS });
  } catch {
    /* KV optional locally */
  }
}

/**
 * @param {number} fetchedAtMs
 * @param {number} [nowMs]
 */
export function buildMlbOddsFreshness(fetchedAtMs, nowMs = Date.now()) {
  const ageMs = Math.max(0, nowMs - fetchedAtMs);
  const isStale = ageMs > MLB_ODDS_STALE_MS;
  return {
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    ageMinutes: Math.round(ageMs / 60000),
    isStale,
    staleWarning: isStale
      ? "MLB scraped odds are more than 10 minutes old — do not present these as live prices without caveat."
      : null,
  };
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} fetchedAtMs
 */
export function decorateMlbOddsWithFreshness(payload, fetchedAtMs) {
  const freshness = buildMlbOddsFreshness(fetchedAtMs);
  return {
    ...payload,
    fetchedAtMs,
    fetchedAt: freshness.fetchedAt,
    freshness,
  };
}

function firstText(values = []) {
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return null;
}

function parseNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function decimalToAmerican(decimalOdds) {
  const d = Number(decimalOdds);
  if (!Number.isFinite(d) || d <= 1) return null;
  if (d >= 2) return Math.round((d - 1) * 100);
  return Math.round(-100 / (d - 1));
}

function parseAmericanOdds(value) {
  if (value == null) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) >= 100 && Math.abs(value) <= 100000) return Math.trunc(value);
    if (value > 1 && value < 100) return decimalToAmerican(value);
    return null;
  }

  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  if (raw === "EVEN" || raw === "EV") return 100;

  const signed = raw.match(/^[+-]?\d+$/);
  if (signed) {
    const n = Number(raw);
    if (Math.abs(n) >= 100 && Math.abs(n) <= 100000) return n;
  }

  const decimalLike = Number(raw);
  if (Number.isFinite(decimalLike) && decimalLike > 1 && decimalLike < 100) {
    return decimalToAmerican(decimalLike);
  }

  return null;
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeToken(value)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseDateFromGameId(gameId) {
  const m = String(gameId || "").match(/_(\d{4})_(\d{2})_(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function toEtYmd(value) {
  const ms = Date.parse(String(value || ""));
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function toEspnDateParam(ymd) {
  const v = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v.replace(/-/g, "");
}

/**
 * @param {Record<string, unknown>} meta
 */
function collectTeamHints(meta = {}) {
  const game = meta?.game && typeof meta.game === "object" ? meta.game : {};
  const home = [
    meta.homeTeam,
    meta.homeTeamName,
    meta.homeAbbr,
    game?.homeTeam?.name,
    game?.homeTeam?.abbr,
  ];
  const away = [
    meta.awayTeam,
    meta.awayTeamName,
    meta.awayAbbr,
    game?.awayTeam?.name,
    game?.awayTeam?.abbr,
  ];

  return {
    homeTokens: [...new Set(home.map(normalizeToken).filter(Boolean))],
    awayTokens: [...new Set(away.map(normalizeToken).filter(Boolean))],
  };
}

function teamTokenMatches(text, token) {
  if (!text || !token) return false;
  if (text === token) return true;
  if (text.includes(token)) return true;
  const tParts = tokenize(text);
  const qParts = tokenize(token);
  return qParts.every((part) => tParts.includes(part));
}

function parseScoreboardTotalLine(lineText) {
  const s = String(lineText || "");
  const m = s.match(/([+-]?\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

/**
 * @param {Record<string, unknown>} event
 */
function parseEspnEventOdds(event) {
  const comp = Array.isArray(event?.competitions) ? event.competitions[0] : null;
  if (!comp || typeof comp !== "object") return null;

  const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
  const homeComp = competitors.find((c) => String(c?.homeAway || "").toLowerCase() === "home");
  const awayComp = competitors.find((c) => String(c?.homeAway || "").toLowerCase() === "away");

  const homeAbbr = String(homeComp?.team?.abbreviation || "").trim();
  const awayAbbr = String(awayComp?.team?.abbreviation || "").trim();
  const homeName = String(homeComp?.team?.displayName || homeComp?.team?.name || "").trim();
  const awayName = String(awayComp?.team?.displayName || awayComp?.team?.name || "").trim();

  const odds = Array.isArray(comp?.odds) ? comp.odds : [];
  const row = odds[0];
  if (!row || typeof row !== "object") return null;

  const markets = {
    moneyline: [],
    runLine: [],
    totalRuns: [],
  };

  const mlHome = parseAmericanOdds(row?.moneyline?.home?.close?.odds);
  const mlAway = parseAmericanOdds(row?.moneyline?.away?.close?.odds);
  if (mlHome != null) {
    markets.moneyline.push({
      team: homeAbbr || homeName || "HOME",
      americanOdds: mlHome,
      market: row?.moneyline?.displayName || "Moneyline",
    });
  }
  if (mlAway != null) {
    markets.moneyline.push({
      team: awayAbbr || awayName || "AWAY",
      americanOdds: mlAway,
      market: row?.moneyline?.displayName || "Moneyline",
    });
  }

  const rlHomeLine = parseNumber(row?.pointSpread?.home?.close?.line);
  const rlAwayLine = parseNumber(row?.pointSpread?.away?.close?.line);
  const rlHomeOdds = parseAmericanOdds(row?.pointSpread?.home?.close?.odds);
  const rlAwayOdds = parseAmericanOdds(row?.pointSpread?.away?.close?.odds);

  if (rlHomeOdds != null && rlHomeLine != null) {
    markets.runLine.push({
      team: homeAbbr || homeName || "HOME",
      line: rlHomeLine,
      americanOdds: rlHomeOdds,
      market: row?.pointSpread?.displayName || "Runline",
    });
  }
  if (rlAwayOdds != null && rlAwayLine != null) {
    markets.runLine.push({
      team: awayAbbr || awayName || "AWAY",
      line: rlAwayLine,
      americanOdds: rlAwayOdds,
      market: row?.pointSpread?.displayName || "Runline",
    });
  }

  const overOdds = parseAmericanOdds(row?.total?.over?.close?.odds);
  const underOdds = parseAmericanOdds(row?.total?.under?.close?.odds);
  const overLine = parseScoreboardTotalLine(row?.total?.over?.close?.line);
  const underLine = parseScoreboardTotalLine(row?.total?.under?.close?.line);
  const totalLine = overLine ?? underLine ?? parseNumber(row?.overUnder);

  if (overOdds != null && totalLine != null) {
    markets.totalRuns.push({
      side: "over",
      line: totalLine,
      americanOdds: overOdds,
      market: row?.total?.displayName || "Total Runs",
    });
  }
  if (underOdds != null && totalLine != null) {
    markets.totalRuns.push({
      side: "under",
      line: totalLine,
      americanOdds: underOdds,
      market: row?.total?.displayName || "Total Runs",
    });
  }

  const count =
    (markets.moneyline?.length || 0) +
    (markets.runLine?.length || 0) +
    (markets.totalRuns?.length || 0);

  return {
    source: "espn_scoreboard_api",
    sourceEndpoint: ESPN_MLB_SCOREBOARD_API,
    matchedEvent: {
      eventId: String(event?.id || ""),
      label: `${awayAbbr || awayName} @ ${homeAbbr || homeName}`,
      homeTeam: homeName,
      awayTeam: awayName,
      homeAbbr,
      awayAbbr,
      startTime: event?.date || null,
    },
    markets,
    hasPostedLines: count > 0,
  };
}

/**
 * @param {Record<string, unknown>} ev
 * @param {{ homeTokens: string[], awayTokens: string[] }} hints
 * @param {string | null} dateYmdHint
 * @param {Record<string, unknown>} meta
 */
function scoreEspnEvent(ev, hints, dateYmdHint, meta) {
  const home = normalizeToken(`${ev?.matchedEvent?.homeAbbr || ""} ${ev?.matchedEvent?.homeTeam || ""}`);
  const away = normalizeToken(`${ev?.matchedEvent?.awayAbbr || ""} ${ev?.matchedEvent?.awayTeam || ""}`);

  let score = 0;
  for (const token of hints.homeTokens) {
    if (teamTokenMatches(home, token)) score += 4;
    else if (teamTokenMatches(away, token)) score += 1;
  }
  for (const token of hints.awayTokens) {
    if (teamTokenMatches(away, token)) score += 4;
    else if (teamTokenMatches(home, token)) score += 1;
  }

  const gameId = String(meta?.game?.id || "").trim();
  if (gameId && String(ev?.matchedEvent?.eventId || "") === gameId) score += 100;

  if (dateYmdHint) {
    const evEt = toEtYmd(ev?.matchedEvent?.startTime);
    if (evEt && evEt === dateYmdHint) score += 2;
  }

  return score;
}

/**
 * @param {string} gameId
 * @param {Record<string, unknown>} meta
 */
function resolveEspnDateCandidates(gameId, meta = {}) {
  const dates = new Set();
  const fromGameId = parseDateFromGameId(gameId);
  if (fromGameId) dates.add(fromGameId);

  const fromMeta = [
    meta?.startTimeUtc,
    meta?.game?.startTimeUtc,
    meta?.game?.date,
    meta?.game?.startTime,
  ];
  for (const v of fromMeta) {
    const ymd = toEtYmd(v);
    if (ymd) dates.add(ymd);
  }

  const now = Date.now();
  dates.add(new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
  dates.add(new Date(now + 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" }));

  return [...dates].slice(0, 4);
}

/**
 * @param {string} gameId
 * @param {Record<string, unknown>} meta
 */
async function scrapeMlbOddsFromEspnScoreboard(gameId, meta = {}) {
  const hints = collectTeamHints(meta);
  const dateHint = parseDateFromGameId(gameId) || toEtYmd(meta?.startTimeUtc) || toEtYmd(meta?.game?.startTimeUtc);
  const dateCandidates = resolveEspnDateCandidates(gameId, meta);

  const candidates = [];
  for (const ymd of dateCandidates) {
    const dateParam = toEspnDateParam(ymd);
    if (!dateParam) continue;

    const url = `${ESPN_MLB_SCOREBOARD_API}?dates=${encodeURIComponent(dateParam)}`;
    let body = null;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "UnderReview/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      body = await res.json();
    } catch {
      continue;
    }

    const events = Array.isArray(body?.events) ? body.events : [];
    for (const event of events) {
      const parsed = parseEspnEventOdds(event);
      if (!parsed?.hasPostedLines) continue;
      parsed.sourceEndpoint = url;
      const score = scoreEspnEvent(parsed, hints, dateHint, meta);
      candidates.push({
        parsed,
        score,
        count:
          (parsed.markets?.moneyline?.length || 0) +
          (parsed.markets?.runLine?.length || 0) +
          (parsed.markets?.totalRuns?.length || 0),
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.count - a.count;
  });

  const best = candidates[0]?.parsed || null;
  if (!best) {
    throw new Error("No MLB odds found in ESPN scoreboard API");
  }
  return {
    ...best,
    scrapeMethod: "espn_scoreboard_api",
  };
}

/**
 * @param {unknown} root
 * @param {number} [maxNodes]
 */
function collectObjects(root, maxNodes = 25000) {
  const out = [];
  const stack = [root];
  let seen = 0;

  while (stack.length && seen < maxNodes) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    seen += 1;
    out.push(cur);

    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
      continue;
    }

    for (const v of Object.values(cur)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }

  return out;
}

/**
 * @param {Record<string, unknown>} node
 */
function parseEventCandidate(node) {
  if (!node || typeof node !== "object") return null;

  const homeTeam = firstText([
    node?.homeTeamName,
    node?.homeTeam,
    node?.home?.name,
    node?.home?.teamName,
    node?.homeCompetitor?.name,
    node?.teamName2,
  ]);

  const awayTeam = firstText([
    node?.awayTeamName,
    node?.awayTeam,
    node?.away?.name,
    node?.away?.teamName,
    node?.awayCompetitor?.name,
    node?.teamName1,
  ]);

  if (!homeTeam || !awayTeam) return null;

  const eventId = firstText([
    node?.eventId != null ? String(node.eventId) : null,
    node?.id != null ? String(node.id) : null,
    node?.event?.id != null ? String(node.event.id) : null,
  ]);

  return {
    eventId: eventId || null,
    label: `${awayTeam} @ ${homeTeam}`,
    homeTeam,
    awayTeam,
    startTime: firstText([node?.startDate, node?.startTime, node?.commenceTime, node?.date]),
  };
}

function flattenOutcomes(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out = [];
  const stack = [...raw];
  while (stack.length) {
    const cur = stack.pop();
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
    } else if (cur && typeof cur === "object") {
      out.push(cur);
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} outcome
 */
function parseOutcomeCandidate(outcome) {
  const name = firstText([
    outcome?.label,
    outcome?.name,
    outcome?.outcomeName,
    outcome?.selectionName,
    outcome?.runnerName,
    outcome?.participant,
    outcome?.teamName,
    outcome?.side,
  ]);

  const americanOdds = parseAmericanOdds(
    firstText([
      outcome?.americanOdds != null ? String(outcome.americanOdds) : null,
      outcome?.oddsAmerican != null ? String(outcome.oddsAmerican) : null,
      outcome?.priceAmerican != null ? String(outcome.priceAmerican) : null,
      outcome?.odds != null ? String(outcome.odds) : null,
      outcome?.price != null ? String(outcome.price) : null,
    ]),
  );

  const line = parseNumber(
    firstText([
      outcome?.line != null ? String(outcome.line) : null,
      outcome?.point != null ? String(outcome.point) : null,
      outcome?.handicap != null ? String(outcome.handicap) : null,
      outcome?.total != null ? String(outcome.total) : null,
      outcome?.value != null ? String(outcome.value) : null,
    ]),
  );

  if (americanOdds == null && line == null) return null;
  return { name: name || "", americanOdds, line };
}

/**
 * @param {Record<string, unknown>} node
 */
function parseMarketCandidate(node) {
  const marketName = firstText([
    node?.marketName,
    node?.name,
    node?.label,
    node?.offerLabel,
    node?.criterionName,
  ]);
  if (!marketName) return null;

  const outcomes = [
    ...flattenOutcomes(node?.outcomes),
    ...flattenOutcomes(node?.selections),
    ...flattenOutcomes(node?.runners),
    ...flattenOutcomes(node?.options),
    ...flattenOutcomes(node?.offer?.outcomes),
    ...flattenOutcomes(node?.offer?.selections),
  ]
    .map(parseOutcomeCandidate)
    .filter(Boolean);

  if (!outcomes.length) return null;

  const eventId = firstText([
    node?.eventId != null ? String(node.eventId) : null,
    node?.event?.id != null ? String(node.event.id) : null,
    node?.event?.eventId != null ? String(node.event.eventId) : null,
    node?.gameId != null ? String(node.gameId) : null,
    node?.fixtureId != null ? String(node.fixtureId) : null,
  ]);

  return {
    eventId: eventId || null,
    marketName,
    outcomes,
  };
}

function shouldIgnoreMarketName(name) {
  return /(player|pitcher|batter|strikeout|hits|home runs|rbis|total bases|stolen base)/i.test(name);
}

function inferMarketBucket(name) {
  const n = String(name || "").toLowerCase();
  if (!n || shouldIgnoreMarketName(n)) return null;
  if (/run\s*line|spread/.test(n)) return "runLine";
  if (/total/.test(n) && (/runs?/.test(n) || /over\/under/.test(n) || /o\/u/.test(n))) return "totalRuns";
  if (/moneyline|h2h|to win|winner|match winner/.test(n)) return "moneyline";
  return null;
}

/**
 * @param {Record<string, unknown>} markets
 */
function marketEntryCount(markets) {
  const ml = Array.isArray(markets?.moneyline) ? markets.moneyline.length : 0;
  const rl = Array.isArray(markets?.runLine) ? markets.runLine.length : 0;
  const tr = Array.isArray(markets?.totalRuns) ? markets.totalRuns.length : 0;
  return ml + rl + tr;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {Record<string, unknown>} meta
 */
function extractMlbOddsFromPayload(payload, meta = {}) {
  const nodes = collectObjects(payload);
  const events = [];
  const markets = [];

  for (const node of nodes) {
    const ev = parseEventCandidate(node);
    if (ev) events.push(ev);

    const mk = parseMarketCandidate(node);
    if (mk) markets.push(mk);
  }

  const hints = collectTeamHints(meta);
  const scoredEvents = events
    .map((ev) => ({
      ev,
      score: (() => {
        const home = normalizeToken(ev?.homeTeam || "");
        const away = normalizeToken(ev?.awayTeam || "");
        let s = 0;
        for (const token of hints.homeTokens) {
          if (teamTokenMatches(home, token)) s += 4;
          else if (teamTokenMatches(away, token)) s += 1;
        }
        for (const token of hints.awayTokens) {
          if (teamTokenMatches(away, token)) s += 4;
          else if (teamTokenMatches(home, token)) s += 1;
        }
        return s;
      })(),
    }))
    .sort((a, b) => b.score - a.score);

  const targetEvent = scoredEvents[0]?.ev || null;

  const out = {
    moneyline: [],
    runLine: [],
    totalRuns: [],
  };
  const dedupe = new Set();

  for (const mk of markets) {
    if (targetEvent?.eventId && mk.eventId && String(mk.eventId) !== String(targetEvent.eventId)) {
      continue;
    }

    const bucket = inferMarketBucket(mk.marketName);
    if (!bucket) continue;

    for (const outcome of mk.outcomes) {
      if (outcome.americanOdds == null) continue;

      if (bucket === "totalRuns") {
        const sideRaw = String(outcome.name || "").toLowerCase();
        const side = sideRaw.includes("over")
          ? "over"
          : sideRaw.includes("under")
          ? "under"
          : "";
        if (!side) continue;
        const key = `totalRuns|${side}|${outcome.line}|${outcome.americanOdds}`;
        if (dedupe.has(key)) continue;
        dedupe.add(key);
        out.totalRuns.push({
          side,
          line: outcome.line,
          americanOdds: outcome.americanOdds,
          market: mk.marketName,
        });
        continue;
      }

      if (bucket === "moneyline") {
        const team = String(outcome.name || "").trim();
        if (!team) continue;
        const key = `moneyline|${team}|${outcome.americanOdds}`;
        if (dedupe.has(key)) continue;
        dedupe.add(key);
        out.moneyline.push({
          team,
          americanOdds: outcome.americanOdds,
          market: mk.marketName,
        });
        continue;
      }

      if (bucket === "runLine") {
        const team = String(outcome.name || "").trim();
        if (!team) continue;
        const key = `runLine|${team}|${outcome.line}|${outcome.americanOdds}`;
        if (dedupe.has(key)) continue;
        dedupe.add(key);
        out.runLine.push({
          team,
          line: outcome.line,
          americanOdds: outcome.americanOdds,
          market: mk.marketName,
        });
      }
    }
  }

  return {
    event: targetEvent,
    markets: out,
    hasPostedLines: marketEntryCount(out) > 0,
  };
}

/**
 * @param {string} pageUrl
 * @param {string[]} urlHints
 */
async function captureJsonResponsesViaPuppeteer(pageUrl, urlHints) {
  let chromium;
  let puppeteer;
  try {
    chromium = await import("@sparticuz/chromium");
    puppeteer = await import("puppeteer-core");
  } catch (err) {
    throw new Error(
      `Puppeteer dependencies missing (install puppeteer-core and @sparticuz/chromium): ${err?.message || err}`,
    );
  }

  const browser = await puppeteer.launch({
    args: chromium.default.args,
    defaultViewport: chromium.default.defaultViewport,
    executablePath: await chromium.default.executablePath(),
    headless: chromium.default.headless,
  });

  try {
    const page = await browser.newPage();
    const captures = [];

    page.on("response", async (response) => {
      try {
        const url = String(response.url() || "");
        const urlLc = url.toLowerCase();
        if (!urlHints.some((h) => urlLc.includes(String(h).toLowerCase()))) return;
        if (response.status() < 200 || response.status() >= 400) return;

        const requestType = response.request()?.resourceType?.() || "";
        if (requestType && requestType !== "xhr" && requestType !== "fetch" && requestType !== "document") {
          return;
        }

        const contentType = String(response.headers()?.["content-type"] || "").toLowerCase();
        const jsonish =
          contentType.includes("json") ||
          urlLc.includes("/api/") ||
          urlLc.includes("graphql");
        if (!jsonish) return;

        const body = await response.json();
        if (!body || typeof body !== "object") return;
        captures.push({ url, body });
      } catch {
        /* ignore non-JSON or transient parse failures */
      }
    });

    await page.goto(pageUrl, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    await new Promise((resolve) => setTimeout(resolve, 2500));
    return captures;
  } finally {
    await browser.close();
  }
}

/**
 * @param {Array<{ url: string, body: Record<string, unknown> }>} captures
 * @param {string} source
 * @param {Record<string, unknown>} meta
 */
function selectBestCapture(captures, source, meta = {}) {
  const candidates = [];

  for (const cap of captures) {
    const extracted = extractMlbOddsFromPayload(cap.body, meta);
    if (!extracted?.markets) continue;
    const count = marketEntryCount(extracted.markets);
    if (count === 0) continue;

    candidates.push({
      source,
      sourceEndpoint: cap.url,
      matchedEvent: extracted.event,
      markets: extracted.markets,
      hasPostedLines: extracted.hasPostedLines,
      count,
    });
  }

  candidates.sort((a, b) => b.count - a.count);
  return candidates[0] || null;
}

/**
 * @param {Record<string, unknown>} meta
 */
async function scrapeMlbOddsFromDraftKings(meta = {}) {
  const captures = await captureJsonResponsesViaPuppeteer(
    DK_MLB_ODDS_PAGE_URL,
    DK_RESPONSE_URL_HINTS,
  );
  const best = selectBestCapture(captures, "dk_public", meta);
  if (!best) {
    throw new Error("No MLB odds payload captured from DraftKings response stream");
  }
  return {
    ...best,
    scrapeMethod: "puppeteer_network_intercept",
  };
}

/**
 * Cron / manual refresh — ESPN scoreboard JSON primary, DraftKings public page fallback.
 * @param {string | number} gameId
 * @param {Record<string, unknown>} [meta]
 */
export async function scrapeAndCacheMlbOdds(gameId, meta = {}) {
  const gid = String(gameId || "").trim();
  if (!gid) throw new Error("MLB scrape requires gameId");

  const nowMs = Date.now();
  let payload = null;

  try {
    payload = await scrapeMlbOddsFromEspnScoreboard(gid, meta);
  } catch (err) {
    console.warn("[mlbOddsScraper] ESPN scoreboard scrape failed:", err?.message || err);
  }

  if (!payload || !payload.hasPostedLines) {
    const hadPrimary = Boolean(payload);
    try {
      payload = await scrapeMlbOddsFromDraftKings(meta);
    } catch (err) {
      console.warn("[mlbOddsScraper] DraftKings capture failed:", err?.message || err);
      if (!hadPrimary) throw err;
    }
  }

  if (!payload) {
    throw new Error("No MLB odds payload captured from ESPN scoreboard or DraftKings");
  }

  const entry = {
    payload: {
      gameId: gid,
      source: payload.source,
      sourceEndpoint: payload.sourceEndpoint || null,
      scrapeMethod: payload.scrapeMethod || "espn_scoreboard_api",
      matchedEvent: payload.matchedEvent || null,
      markets: payload.markets || { moneyline: [], runLine: [], totalRuns: [] },
      hasPostedLines: Boolean(payload.hasPostedLines),
    },
    fetchedAtMs: nowMs,
  };

  await writeCacheEntry(gid, entry);

  console.log(
    JSON.stringify({
      event: "mlb_odds_cached",
      gameId: gid,
      source: entry.payload.source,
      posted: entry.payload.hasPostedLines,
      moneylineCount: entry.payload.markets?.moneyline?.length || 0,
      runLineCount: entry.payload.markets?.runLine?.length || 0,
      totalRunsCount: entry.payload.markets?.totalRuns?.length || 0,
    }),
  );

  return decorateMlbOddsWithFreshness(entry.payload, nowMs);
}

/**
 * Self-healing read: fresh cache hit, else live scrape; on scrape failure, return stale cache if present.
 * @param {string | number} gameId
 * @param {Record<string, unknown>} [meta]
 */
export async function getMlbOddsForBoard(gameId, meta = {}) {
  const gid = String(gameId || "").trim();
  if (!gid) return null;

  const nowMs = Date.now();
  const cached = await readCacheEntry(gid);
  const stale =
    !cached?.payload ||
    nowMs - Number(cached.fetchedAtMs || 0) >= MLB_ODDS_STALE_MS;

  if (cached?.payload && !stale) {
    return decorateMlbOddsWithFreshness(cached.payload, cached.fetchedAtMs);
  }

  try {
    const live = await scrapeAndCacheMlbOdds(gid, meta);
    console.log(
      JSON.stringify({
        event: "mlb_odds_self_heal",
        gameId: gid,
        hadCache: Boolean(cached?.payload),
        source: live?.source,
        posted: live?.hasPostedLines,
      }),
    );
    return live;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "mlb_odds_self_heal_failed",
        gameId: gid,
        error: err?.message || String(err),
      }),
    );
    if (cached?.payload) {
      return decorateMlbOddsWithFreshness(cached.payload, cached.fetchedAtMs);
    }
    return null;
  }
}
