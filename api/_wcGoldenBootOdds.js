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
import {
  attachGoldenBootFreshness,
  sortGoldenBootRows,
} from "../shared/wcPlayerOddsFreshness.js";
import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import {
  applyGoldenBootManualPatches,
  readWcPlayerMarketsOverrideKv,
} from "./_wcPlayerMarketsOverride.js";
import { enrichGoldenBootRowsWithNation } from "../shared/wcGoldenBootNationResolve.js";
import {
  filterGoldenBootScrapeRows,
  isVerifiedWcGoldenBootRow,
} from "../shared/wcGoldenBootRowGuard.js";
import {
  gateGoldenBootKvWrite,
  WC_GOLDEN_BOOT_MIN_VERIFIED_ROWS,
} from "../shared/wcGoldenBootWriteQA.js";
import { WC_GOLDEN_BOOT_SOURCE_COUNT } from "../shared/wcGoldenBootSourceRegistry.js";
import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";

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

  if (isWcGoatPrimaryEnabled()) {
    const { scrapeAndCacheWcBdlGoldenBoot } = await import("./_wcBdlData.js");
    const bdl = await scrapeAndCacheWcBdlGoldenBoot();
    if (bdl?.ok && bdl?.rows?.length) {
      return {
        ok: true,
        rows: bdl.rows,
        source: "balldontlie",
        booksUsed: ["balldontlie"],
        servedStale: false,
        error: null,
      };
    }
    console.log(
      JSON.stringify({
        event: "wc_golden_boot_bdl_exhausted",
        error: bdl?.error || "no_rows",
        marketTypes: bdl?.marketTypes || [],
      }),
    );
  }

  const [espn, bookResults] = await Promise.all([
    fetchEspnGoldenBootFutures(),
    scrapeAllEnabledGoldenBootBooks(),
  ]);

  const enrichedBooks = bookResults.map((r) => ({
    ...r,
    rows: enrichGoldenBootRowsWithNation(r.rows || []),
  }));
  const enrichedEspn = espn.ok ? enrichGoldenBootRowsWithNation(espn.rows || []) : [];
  const merged = mergeGoldenBootConsensus(enrichedBooks, enrichedEspn);
  let rows = merged.rows;
  let source = "consensus";
  const booksUsed = [...merged.booksUsed];

  const MIN_GOLDEN_BOOT_ROWS = 10;
  if (rows.length < MIN_GOLDEN_BOOT_ROWS) {
    rows = mergeGoldenBootWithSeed(rows, WC_GOLDEN_BOOT_SEED_ROWS);
    source = merged.rows.length ? "consensus+seed" : "seed";
    if (!booksUsed.includes("seed")) booksUsed.push("seed");
  }

  rows = sortGoldenBootRows(
    filterGoldenBootScrapeRows(rows).filter((r) => isVerifiedWcGoldenBootRow(r)),
    50,
  );

  const gate = gateGoldenBootKvWrite(rows, { source, booksUsed });
  rows = gate.rows;
  const sourcesAttempted = bookResults.length;
  const sourcesOk = bookResults.filter((b) => b.ok).map((b) => b.book);

  if (
    rows.length >= MIN_GOLDEN_BOOT_ROWS ||
    (gate.allowWrite && rows.length >= WC_GOLDEN_BOOT_MIN_VERIFIED_ROWS)
  ) {
    const payload = {
      lastUpdated: nowMs,
      market: merged.market || "golden_boot",
      source,
      booksUsed,
      rows,
      sourcesRegistered: WC_GOLDEN_BOOT_SOURCE_COUNT,
      sourcesAttempted,
      sourcesOk,
      writeQa: { issueCodes: gate.issueCodes, verifiedCount: gate.verifiedCount },
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
  const override = await readWcPlayerMarketsOverrideKv();
  let merged = cached;
  if (override?.goldenBootPatches?.length) {
    merged = applyGoldenBootManualPatches({
      ...cached,
      _manualPatches: override.goldenBootPatches,
    });
  }
  return attachGoldenBootFreshness(merged, nowMs);
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
