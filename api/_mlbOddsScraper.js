import { getDurableJson, setDurableJson } from "./_durableStore.js";

const ESPN_MLB_ODDS_PAGE_URL = "https://www.espn.com/espn/betting/sport/_/name/mlb";
const DK_MLB_ODDS_PAGE_URL = "https://sportsbook.draftkings.com/leagues/baseball/mlb";

const MLB_ODDS_CACHE_TTL_SECONDS = 30 * 60;
const MLB_ODDS_STALE_MS = 10 * 60 * 1000;
const memCache = new Map();

/**
 * ESPN BET endpoint note (2026-05-28):
 * - This environment returns a 404 shell for the provided ESPN MLB URL.
 * - We could verify sportsbook host tokens in ESPN config (`espnsb.com`) but could not
 *   verify stable JSON path segments from live traffic in this environment.
 * - We therefore intercept JSON responses by host hint, and explicitly fall back to DK.
 */
const ESPN_RESPONSE_URL_HINTS = [
  "espnsb.com",
  "sports-betting",
  "/espn/betting/",
  "/betting/",
];

/**
 * DraftKings endpoint note (verified from live MLB page bootstrap on 2026-05-28):
 * - sportsbook-nash.draftkings.com/api/sportscontent/dkusva/
 * - sportsbook-nash.draftkings.com/api/sportscontent/views/dkusva/
 * We still rely on Puppeteer response interception (not DOM selectors).
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

/**
 * @param {Record<string, unknown>} ev
 * @param {{ homeTokens: string[], awayTokens: string[] }} hints
 */
function scoreEventMatch(ev, hints) {
  const home = normalizeToken(ev?.homeTeam || "");
  const away = normalizeToken(ev?.awayTeam || "");
  if (!home && !away) return -1;

  let score = 0;
  if (hints.homeTokens.length === 0 && hints.awayTokens.length === 0) return 1;

  for (const token of hints.homeTokens) {
    if (teamTokenMatches(home, token)) score += 4;
    else if (teamTokenMatches(away, token)) score += 1;
  }
  for (const token of hints.awayTokens) {
    if (teamTokenMatches(away, token)) score += 4;
    else if (teamTokenMatches(home, token)) score += 1;
  }
  return score;
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

  const homeFromObject = firstText([
    node?.homeTeamName,
    node?.homeTeam,
    node?.home?.name,
    node?.home?.teamName,
    node?.homeCompetitor?.name,
    node?.teamName2,
  ]);

  const awayFromObject = firstText([
    node?.awayTeamName,
    node?.awayTeam,
    node?.away?.name,
    node?.away?.teamName,
    node?.awayCompetitor?.name,
    node?.teamName1,
  ]);

  let homeTeam = homeFromObject;
  let awayTeam = awayFromObject;

  const participants = Array.isArray(node?.participants) ? node.participants : [];
  if ((!homeTeam || !awayTeam) && participants.length >= 2) {
    const homeParticipant = participants.find((p) => String(p?.homeAway || "").toLowerCase() === "home");
    const awayParticipant = participants.find((p) => String(p?.homeAway || "").toLowerCase() === "away");
    homeTeam = homeTeam || firstText([homeParticipant?.name, participants[1]?.name, participants[1]?.teamName]);
    awayTeam = awayTeam || firstText([awayParticipant?.name, participants[0]?.name, participants[0]?.teamName]);
  }

  if (!homeTeam || !awayTeam) return null;

  const eventId = firstText([
    node?.eventId != null ? String(node.eventId) : null,
    node?.id != null ? String(node.id) : null,
    node?.event?.id != null ? String(node.event.id) : null,
    node?.providerEventId != null ? String(node.providerEventId) : null,
  ]);

  const eventLabel = firstText([
    node?.name,
    node?.label,
    node?.eventName,
    `${awayTeam} @ ${homeTeam}`,
  ]);

  return {
    eventId: eventId || null,
    label: eventLabel || `${awayTeam} @ ${homeTeam}`,
    homeTeam,
    awayTeam,
    startTime: firstText([
      node?.startDate,
      node?.startTime,
      node?.commenceTime,
      node?.date,
      node?.eventDate,
    ]),
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
      outcome?.displayOdds?.american != null ? String(outcome.displayOdds.american) : null,
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
    .map((ev) => ({ ev, score: scoreEventMatch(ev, hints) }))
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
async function scrapeMlbOddsFromEspnBet(meta = {}) {
  const captures = await captureJsonResponsesViaPuppeteer(
    ESPN_MLB_ODDS_PAGE_URL,
    ESPN_RESPONSE_URL_HINTS,
  );
  const best = selectBestCapture(captures, "espn_bet_public", meta);
  if (!best) {
    throw new Error("No MLB odds payload captured from ESPN BET response stream");
  }
  return {
    ...best,
    scrapeMethod: "puppeteer_network_intercept",
  };
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
 * Cron / manual refresh — ESPN BET public page primary, DraftKings public page fallback.
 * @param {string | number} gameId
 * @param {Record<string, unknown>} [meta]
 */
export async function scrapeAndCacheMlbOdds(gameId, meta = {}) {
  const gid = String(gameId || "").trim();
  if (!gid) throw new Error("MLB scrape requires gameId");

  const nowMs = Date.now();
  let payload = null;

  try {
    payload = await scrapeMlbOddsFromEspnBet(meta);
  } catch (err) {
    console.warn("[mlbOddsScraper] ESPN BET capture failed:", err?.message || err);
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
    throw new Error("No MLB odds payload captured from ESPN BET or DraftKings");
  }

  const entry = {
    payload: {
      gameId: gid,
      source: payload.source,
      sourceEndpoint: payload.sourceEndpoint || null,
      scrapeMethod: payload.scrapeMethod || "puppeteer_network_intercept",
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
