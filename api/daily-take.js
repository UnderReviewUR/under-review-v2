import { applyCors } from "./_cors.js";
import { sanitizeDailyTakePreviewPayload } from "./_dailyTakeSanitize.js";
import {
  generateDailyTakePreview,
  getEtDateKey,
  readStoredDailyTake,
} from "./_dailyTakePreview.js";

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
      const cached = await readStoredDailyTake(dateKey);
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
