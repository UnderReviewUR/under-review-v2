/**
 * POST/GET /api/bdl-goat-warm — refresh GOAT boards after trial ends (paid 600 req/min).
 * Cron: Sept 3 2026 16:00 UTC (11:00 AM CT) + daily 16:00 UTC during NFL season.
 * Auth: Authorization Bearer CRON_SECRET
 */
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import {
  isBdlGoatTrialPaceActive,
  bdlGoatTrialEndsAtIso,
} from "../shared/bdlGoatTrialPolicy.js";
import { buildNflGoatBriefcase, isNflBdlPrimaryEnabled } from "./_nflBdl.js";
import { buildLaligaLiveBoard } from "./_laligaBdl.js";

export const config = { maxDuration: 120 };

function verifyCron(req) {
  const secret = String(getEnv("CRON_SECRET") || "").trim();
  if (String(req.headers["x-vercel-cron"] || "") === "1") return true;
  if (!secret) return true;
  const auth = String(req.headers.authorization || "").trim();
  return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!verifyCron(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const trialPace = isBdlGoatTrialPaceActive();
  if (trialPace) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "trial_pace_active",
      trialEndsAt: bdlGoatTrialEndsAtIso(),
      hint: "Re-run after paid GOAT is live (auto after Sept 3 2026 11am CT)",
    });
  }

  /** @type {Record<string, unknown>} */
  const warmed = {};

  try {
    if (isNflBdlPrimaryEnabled()) {
      const briefcase = await buildNflGoatBriefcase({
        week: 1,
        season: 2026,
        hydrateDefense: true,
        hydrateInjuries: true,
        hydrateStats: true,
        hydrateDfs: true,
        hydrateFantasy: true,
      });
      warmed.nfl = {
        games: briefcase.slate?.games?.length ?? 0,
        odds: briefcase.slate?.odds?.length ?? 0,
        props: briefcase.slate?.playerProps?.length ?? 0,
        dfsSlates: briefcase.dfs?.slates?.length ?? 0,
        fantasyProjections: briefcase.fantasy?.projections?.length ?? 0,
        endpoints: briefcase.coverage?.endpoints,
      };
    } else {
      warmed.nfl = { skipped: true, reason: "NFL_BDL_PRIMARY off" };
    }
  } catch (err) {
    warmed.nfl = { ok: false, error: err?.message || String(err) };
  }

  try {
    const laliga = await buildLaligaLiveBoard({ includeProps: true, maxPropMatches: 6 });
    warmed.laliga = {
      matches: laliga.matches?.length ?? 0,
      odds: laliga.odds?.length ?? 0,
      props: laliga.propLines?.length ?? 0,
    };
  } catch (err) {
    warmed.laliga = { ok: false, error: err?.message || String(err) };
  }

  console.log(JSON.stringify({ event: "bdl_goat_warm_done", trialPace: false, warmed }));

  return res.status(200).json({
    ok: true,
    trialPace: false,
    trialEndsAt: bdlGoatTrialEndsAtIso(),
    warmed,
    asOf: new Date().toISOString(),
  });
}
