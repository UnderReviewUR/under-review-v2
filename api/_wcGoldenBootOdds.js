/**
 * World Cup Golden Boot — ESPN futures + book scrape consensus → KV (no Odds API).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { fetchEspnGoldenBootFutures } from "./_wcEspnPlayerFutures.js";
import { scrapeAllEnabledGoldenBootBooks } from "./_wcScrapeGoldenBootBooks.js";
import {
  WC_GOLDEN_BOOT_KV_KEY,
  WC_GOLDEN_BOOT_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import {
  mergeGoldenBootConsensus,
  mergeGoldenBootWithSeed,
} from "../shared/wcGoldenBootConsensus.js";
import { attachGoldenBootFreshness } from "../shared/wcPlayerOddsFreshness.js";
import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";

/**
 * @param {Record<string, unknown>} payload
 */
async function writeGoldenBootKv(payload) {
  await setDurableJson(WC_GOLDEN_BOOT_KV_KEY, payload, {
    ttlSeconds: WC_GOLDEN_BOOT_TTL_SECONDS,
  });
  console.log(
    JSON.stringify({
      event: "wc_golden_boot_cached",
      rowCount: Array.isArray(payload.rows) ? payload.rows.length : 0,
      source: payload.source,
      booksUsed: payload.booksUsed,
    }),
  );
}

/**
 * Cron: ESPN + book scrapes → consensus → KV. Serves stale KV on total failure.
 */
export async function scrapeAndCacheWcGoldenBoot() {
  const nowMs = Date.now();
  const cached = await getDurableJson(WC_GOLDEN_BOOT_KV_KEY);

  const [espn, bookResults] = await Promise.all([
    fetchEspnGoldenBootFutures(),
    scrapeAllEnabledGoldenBootBooks(),
  ]);

  const merged = mergeGoldenBootConsensus(bookResults, espn.ok ? espn.rows : []);
  let rows = merged.rows;
  let source = "consensus";
  const booksUsed = [...merged.booksUsed];

  const MIN_GOLDEN_BOOT_ROWS = 10;
  if (rows.length < MIN_GOLDEN_BOOT_ROWS) {
    rows = mergeGoldenBootWithSeed(rows, WC_GOLDEN_BOOT_SEED_ROWS);
    source = merged.rows.length ? "consensus+seed" : "seed";
    if (!booksUsed.includes("seed")) booksUsed.push("seed");
  }

  if (rows.length >= MIN_GOLDEN_BOOT_ROWS) {
    const payload = {
      lastUpdated: nowMs,
      market: merged.market || "golden_boot",
      source,
      booksUsed,
      rows,
    };
    await writeGoldenBootKv(payload);
    return {
      ok: true,
      rows,
      source,
      booksUsed,
      servedStale: false,
      error: null,
    };
  }

  const reasons = [
    espn.error,
    ...bookResults.map((b) => (b.ok ? null : `${b.book}:${b.error}`)),
  ]
    .filter(Boolean)
    .join("; ");

  if (cached?.rows?.length) {
    return {
      ok: false,
      rows: cached.rows,
      source: cached.source,
      booksUsed: cached.booksUsed,
      servedStale: true,
      error: reasons || "all_sources_empty",
    };
  }

  const seedOnly = mergeGoldenBootWithSeed([], WC_GOLDEN_BOOT_SEED_ROWS);
  const payload = {
    lastUpdated: nowMs,
    market: "golden_boot",
    source: "seed",
    booksUsed: ["seed"],
    rows: seedOnly,
  };
  await writeGoldenBootKv(payload);

  return {
    ok: true,
    rows: seedOnly,
    source: "seed",
    booksUsed: ["seed"],
    servedStale: false,
    error: reasons || null,
  };
}

/**
 * @param {number} [nowMs]
 */
export async function readWcGoldenBootFromKv(nowMs = Date.now()) {
  const cached = await getDurableJson(WC_GOLDEN_BOOT_KV_KEY);
  return attachGoldenBootFreshness(cached, nowMs);
}

/**
 * API debug payload.
 * @param {number} [nowMs]
 */
export async function getWcGoldenBootPayload(nowMs = Date.now()) {
  const kv = await readWcGoldenBootFromKv(nowMs);
  return {
    ok: Boolean(kv?.rows?.length),
    goldenBoot: kv,
    rowCount: Array.isArray(kv?.rows) ? kv.rows.length : 0,
    booksUsed: kv?.booksUsed || [],
    source: kv?.source || null,
    stale: Boolean(kv?.stale),
  };
}
