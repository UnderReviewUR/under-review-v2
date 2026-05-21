// api/nfl-depth-update.js
// Auto-updates NFL QB depth chart from Ourlads every week
// Called by Vercel cron - do not call manually in production

export const config = {
  api: { bodyParser: false },
};

import { applyCors } from "./_cors.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { diagnoseOurladsHtml, parseOurladsQBs } from "./_nflOurladsDepthParse.js";

const KV_KEY = "nfl_depth_chart";
const CACHE_TTL_MS = 60 * 60 * 1000;
const PARSER_VERSION = "logo-thumb-v2";
const OURLADS_QB_URL = "https://www.ourlads.com/nfldepthcharts/depthchartpos/QB";
const HTML_LOG_PREVIEW_CHARS = 1200;

let cachedDepth = null;
let cacheTime = 0;

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const diagQuery =
    String(req.query?.diag || "").trim() === "1" ||
    String(req.query?.debug || "").trim() === "1";

  try {
    if (cachedDepth && Date.now() - cacheTime < CACHE_TTL_MS) {
      return res.status(200).json({
        source: "cache",
        parserVersion: PARSER_VERSION,
        updatedAt: new Date(cacheTime).toISOString(),
        depth: cachedDepth,
      });
    }

    const scrape = await scrapeOurladsQbDepth();
    if (scrape.depth) {
      cachedDepth = scrape.depth;
      cacheTime = Date.now();
      await persistDepth(scrape.depth);
      console.log(
        `[nfl-depth-update] Updated at ${new Date().toISOString()} - ${Object.keys(scrape.depth).length} teams (ourlads HTTP ${scrape.status})`,
      );
      return res.status(200).json({
        source: "fresh",
        parserVersion: PARSER_VERSION,
        updatedAt: new Date(cacheTime).toISOString(),
        ourladsStatus: scrape.status,
        depth: scrape.depth,
        ...(diagQuery ? { scrapeDiag: scrape.publicDiag } : {}),
      });
    }

    const stale = await loadPersistedDepth();
    if (stale?.depth && Object.keys(stale.depth).length > 0) {
      console.warn(
        `[nfl-depth-update] Fresh scrape failed (${scrape.phase}) — returning stale KV (${Object.keys(stale.depth).length} teams)`,
      );
      return res.status(200).json({
        source: "stale_kv",
        parserVersion: PARSER_VERSION,
        warning: "Fresh Ourlads scrape failed; serving last good depth chart",
        failurePhase: scrape.phase,
        ourladsStatus: scrape.status,
        updatedAt: stale.fetchedAt
          ? new Date(stale.fetchedAt).toISOString()
          : null,
        depth: stale.depth,
        ...(diagQuery ? { scrapeDiag: scrape.publicDiag } : {}),
      });
    }

    return res.status(500).json({
      error: "Failed to fetch depth charts",
      parserVersion: PARSER_VERSION,
      failurePhase: scrape.phase,
      ourladsStatus: scrape.status,
      detail: scrape.detail,
      ...(diagQuery ? { scrapeDiag: scrape.publicDiag } : {}),
    });
  } catch (err) {
    console.error("[nfl-depth-update] Handler error:", err?.message || err);
    const stale = await loadPersistedDepth().catch(() => null);
    if (stale?.depth && Object.keys(stale.depth).length > 0) {
      return res.status(200).json({
        source: "stale_kv",
        parserVersion: PARSER_VERSION,
        warning: "Handler error; serving last good depth chart",
        updatedAt: stale.fetchedAt
          ? new Date(stale.fetchedAt).toISOString()
          : null,
        depth: stale.depth,
      });
    }
    return res.status(500).json({
      error: "Failed to fetch depth charts",
      parserVersion: PARSER_VERSION,
      failurePhase: "handler_exception",
      detail: String(err?.message || err).slice(0, 200),
    });
  }
}

async function persistDepth(depth) {
  await setDurableJson(
    KV_KEY,
    { depth, fetchedAt: Date.now(), parserVersion: PARSER_VERSION },
    { ttlSeconds: 60 * 60 * 24 * 7 },
  );
}

async function loadPersistedDepth() {
  const raw = await getDurableJson(KV_KEY);
  if (!raw || typeof raw !== "object") return null;
  const depth = raw.depth && typeof raw.depth === "object" ? raw.depth : null;
  if (!depth || Object.keys(depth).length === 0) return null;
  return {
    depth,
    fetchedAt: Number.isFinite(raw.fetchedAt) ? raw.fetchedAt : null,
  };
}

function ourladsBrowserHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.ourlads.com/nfldepthcharts/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

/**
 * Scrape Ourlads — always logs HTTP status before parse.
 * @returns {Promise<{ depth: object | null, phase: string, status: number | null, detail: string, publicDiag: object }>}
 */
async function scrapeOurladsQbDepth() {
  const baseDiag = { parserVersion: PARSER_VERSION, url: OURLADS_QB_URL };

  let response;
  try {
    response = await fetch(OURLADS_QB_URL, {
      headers: ourladsBrowserHeaders(),
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    const detail = `Ourlads fetch threw: ${String(err?.message || err).slice(0, 200)}`;
    console.error(`[nfl-depth-update] ${detail}`);
    return {
      depth: null,
      phase: "fetch_error",
      status: null,
      detail,
      publicDiag: { ...baseDiag, fetchError: detail },
    };
  }

  const status = response.status;
  const statusText = response.statusText || "";
  const contentType = response.headers.get("content-type") || "";

  console.log(
    `[nfl-depth-update] Ourlads HTTP ${status} ${statusText} content-type=${contentType}`,
  );

  let html = "";
  try {
    html = await response.text();
  } catch (err) {
    const detail = `Ourlads body read failed after HTTP ${status}: ${String(err?.message || err).slice(0, 120)}`;
    console.error(`[nfl-depth-update] ${detail}`);
    return {
      depth: null,
      phase: "body_read_error",
      status,
      detail,
      publicDiag: { ...baseDiag, status, contentType },
    };
  }

  const htmlPreview = html.slice(0, HTML_LOG_PREVIEW_CHARS);
  console.log(
    `[nfl-depth-update] Ourlads raw HTML preview (${html.length} chars total):\n${htmlPreview}`,
  );

  const parseProbe = diagnoseOurladsHtml(html);
  console.log("[nfl-depth-update] Ourlads parse probe:", JSON.stringify(parseProbe));

  const publicDiag = {
    ...baseDiag,
    status,
    statusText,
    contentType,
    htmlLength: html.length,
    htmlPreview,
    parseProbe,
  };

  if (!response.ok) {
    const detail = `Ourlads HTTP ${status} ${statusText} — not attempting parse`;
    console.error(`[nfl-depth-update] ${detail}`);
    return {
      depth: null,
      phase: status === 403 ? "http_403" : status === 429 ? "http_429" : "http_error",
      status,
      detail,
      publicDiag,
    };
  }

  if (parseProbe.looksLikeBlock) {
    const detail = "Ourlads HTML looks like a bot-block or challenge page";
    console.error(`[nfl-depth-update] ${detail}`);
    return {
      depth: null,
      phase: "bot_block_page",
      status,
      detail,
      publicDiag,
    };
  }

  const partial = parseOurladsQBs(html, { minTeams: 1 });
  const teamCountPartial = partial ? Object.keys(partial).length : 0;
  const depth = parseOurladsQBs(html);

  if (!depth) {
    const detail = `Ourlads HTTP ${status} OK but parse produced ${teamCountPartial} teams (need 28+)`;
    console.error(`[nfl-depth-update] ${detail}`);
    return {
      depth: null,
      phase: "parse_empty",
      status,
      detail,
      publicDiag: { ...publicDiag, teamCountPartial },
    };
  }

  return {
    depth,
    phase: "ok",
    status,
    detail: `parsed ${Object.keys(depth).length} teams`,
    publicDiag: { ...publicDiag, teamCount: Object.keys(depth).length },
  };
}
