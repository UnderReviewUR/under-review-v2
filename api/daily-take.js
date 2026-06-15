import { applyCors } from "./_cors.js";
import { sanitizeDailyTakePreviewPayload } from "./_dailyTakeSanitize.js";
import {
  dailyTakeSeriesFingerprintStale,
  generateDailyTakePreview,
  getEtDateKey,
  readStoredDailyTake,
} from "./_dailyTakePreview.js";

const PREVIEW_TRIM_VERSION = 4;

/**
 * @param {Record<string, unknown> | null | undefined} cached
 */
function isDailyTakeCacheServable(cached) {
  if (!cached?.ok) return false;
  const trimVersion = Number(cached.previewTrimVersion || 0);
  return trimVersion >= PREVIEW_TRIM_VERSION;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;

  const dateKey = getEtDateKey();

  if (req.method === "GET") {
    const cronSecret = process.env.CRON_SECRET;
    const isCron =
      Boolean(cronSecret) && req.headers.authorization === `Bearer ${cronSecret}`;
    const wantsRefresh =
      String(req.query?.refresh ?? req.query?.warmup ?? "").trim() === "1";

    if (isCron && wantsRefresh) {
      try {
        await generateDailyTakePreview();
        return res.status(200).json({ ok: true, refreshed: true, dateKey });
      } catch (err) {
        console.error("[daily-take refresh]", err);
        return res.status(500).json({ ok: false, error: String(err?.message || err) });
      }
    }

    try {
      let cached = await readStoredDailyTake(dateKey);

      if (!isDailyTakeCacheServable(cached)) {
        const reason = !cached
          ? "miss"
          : cached.ok === false
            ? "error_cached"
            : "stale_trim";
        console.log(
          JSON.stringify({
            event: "daily_take_self_heal",
            dateKey,
            reason,
            previewTrimVersion: Number(cached?.previewTrimVersion || 0),
          }),
        );
        try {
          cached = await generateDailyTakePreview();
        } catch (genErr) {
          console.error("[daily-take self-heal]", genErr);
          if (cached && cached.ok === false) {
            res.setHeader("Cache-Control", "public, max-age=60");
            return res.status(404).json({ ok: false, error: cached.error || "not_ready" });
          }
          return res.status(500).json({ ok: false, error: "generation_failed" });
        }
      }

      if (cached?.ok && (await dailyTakeSeriesFingerprintStale(cached))) {
        console.log(
          JSON.stringify({
            event: "daily_take_series_refresh",
            dateKey,
            priorFingerprint: cached.seriesFingerprint ?? null,
          }),
        );
        try {
          cached = await generateDailyTakePreview();
        } catch (refreshErr) {
          console.error("[daily-take series refresh]", refreshErr);
        }
      }

      if (cached?.ok) {
        const safe = sanitizeDailyTakePreviewPayload(cached);
        if (!safe?.ok) {
          res.setHeader("Cache-Control", "public, max-age=60");
          return res.status(404).json({ ok: false, error: safe?.error || "preview_sanitized_empty" });
        }
        res.setHeader(
          "Cache-Control",
          "public, s-maxage=3600, stale-while-revalidate=86400",
        );
        return res.status(200).json(safe);
      }

      if (cached && cached.ok === false) {
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(404).json({ ok: false, error: cached.error || "not_ready" });
      }

      res.setHeader("Cache-Control", "public, max-age=30");
      return res.status(404).json({ ok: false, error: "not_ready" });
    } catch (err) {
      console.error("[daily-take GET]", err);
      return res.status(500).json({ ok: false, error: "internal" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
