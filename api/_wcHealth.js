/**
 * World Cup readiness slice for /api/health.
 */

import { getDurableJson } from "./_durableStore.js";
import { WC_GOLDEN_BOOT_KV_KEY } from "../shared/wc2026PlayerConstants.js";
import { WC_GOLDEN_BOOT_SOURCE_COUNT } from "../shared/wcGoldenBootSourceRegistry.js";
import { validateGoldenBootKvRows } from "../shared/wcGoldenBootWriteQA.js";
import { readWcOutrightsFromKv } from "./_wcData.js";

/**
 * @param {number} [nowMs]
 */
export async function buildWcHealthSnapshot(nowMs = Date.now()) {
  const [kvConfigured, goldenBootRaw, outrights] = await Promise.all([
    Promise.resolve(Boolean(process.env.KV_REST_API_URL || process.env.VERCEL_KV_REST_API_URL)),
    getDurableJson(WC_GOLDEN_BOOT_KV_KEY),
    readWcOutrightsFromKv(nowMs),
  ]);

  const gbQa = validateGoldenBootKvRows(goldenBootRaw?.rows || [], {
    source: goldenBootRaw?.source,
    booksUsed: goldenBootRaw?.booksUsed,
  });

  const outrightTier = String(outrights?.sourceTier || outrights?.source || "unknown");
  const outrightCount = outrights?.outrights ? Object.keys(outrights.outrights).length : 0;

  /** @type {string[]} */
  const alerts = [];
  if (!kvConfigured) alerts.push("wc_kv_not_configured");
  if (!gbQa.ok) alerts.push(...gbQa.issueCodes);
  if (outrightTier === "static_seed" || outrights?.stale) alerts.push("wc_outrights_stale_or_seed");
  if ((goldenBootRaw?.sourcesAttempted || 0) < 5) alerts.push("wc_golden_boot_few_sources_tried");

  return {
    kvConfigured,
    goldenBoot: {
      rowCount: gbQa.verifiedCount,
      sourcesRegistered: WC_GOLDEN_BOOT_SOURCE_COUNT,
      sourcesAttempted: goldenBootRaw?.sourcesAttempted ?? null,
      sourcesOk: goldenBootRaw?.sourcesOk ?? null,
      stale: Boolean(goldenBootRaw?.stale),
      qaOk: gbQa.ok,
    },
    outrights: {
      count: outrightCount,
      sourceTier: outrightTier,
      stale: Boolean(outrights?.stale),
    },
    alerts,
    ok: alerts.length === 0,
  };
}
