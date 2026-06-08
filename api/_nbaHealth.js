/**
 * NBA readiness slice for /api/health.
 */

import { getEnv } from "./_env.js";
import { getDurableJson } from "./_durableStore.js";
import { buildGameSpreadKey } from "../shared/gameLineSpread.js";
import { buildGameOddsKvKey } from "../shared/gameOddsSchedule.js";
import { nbaPropsCacheKey } from "../shared/nbaPropsConstants.js";
import { readNbaFinalsMvpFromKv, readNbaFinalsSeriesFromKv } from "./_nbaOutrightsData.js";
import { getOddsApiCircuitState } from "../shared/oddsApiCircuitBreaker.js";
import { resolveActionNetworkGameIdForBoardGame } from "./_nbaPropsGameId.js";

/**
 * @param {number} [nowMs]
 */
export async function buildNbaHealthSnapshot(nowMs = Date.now()) {
  const kvConfigured = Boolean(process.env.KV_REST_API_URL || process.env.VERCEL_KV_REST_API_URL);
  const bdlKeyPresent = Boolean(getEnv("BALLDONTLIE_API_KEY"));
  const oddsCircuit = getOddsApiCircuitState();

  const [seriesKv, mvpKv] = await Promise.all([
    readNbaFinalsSeriesFromKv(nowMs),
    readNbaFinalsMvpFromKv(nowMs),
  ]);

  /** @type {string[]} */
  const alerts = [];
  if (!kvConfigured) alerts.push("nba_kv_not_configured");
  if (!bdlKeyPresent) alerts.push("nba_bdl_key_missing");
  if (oddsCircuit.disabled) alerts.push("nba_odds_api_circuit_open");

  const seriesCount = Object.keys(seriesKv?.outrights || {}).length;
  const mvpCount = Object.keys(mvpKv?.outrights || {}).length;
  if (seriesCount === 0) alerts.push("nba_series_outrights_empty");
  if (mvpCount === 0) alerts.push("nba_mvp_outrights_empty");
  if (seriesKv?.stale) alerts.push("nba_series_outrights_stale");
  if (mvpKv?.stale) alerts.push("nba_mvp_outrights_stale");

  const slateGame = {
    awayTeam: { abbr: "SAS" },
    homeTeam: { abbr: "NYK" },
    startTimeUtc: "2026-06-09T00:30:00Z",
    actionNetworkGameId: 291580,
  };
  const gameKey = buildGameSpreadKey("SAS", "NYK");
  const oddsKvKey = buildGameOddsKvKey("nba", gameKey, slateGame.startTimeUtc);
  const spreadKv = await getDurableJson(oddsKvKey);
  const spreadLine = spreadKv?.current?.displayLine || null;
  if (!spreadLine) alerts.push("nba_spread_kv_empty");

  const anId = resolveActionNetworkGameIdForBoardGame(slateGame);
  const propsKv = anId ? await getDurableJson(nbaPropsCacheKey(anId)) : null;
  const propsPayload = propsKv?.payload;
  const propsPlayerCount = propsPayload?.playerCount ?? propsPayload?.players?.length ?? 0;
  if (!propsPlayerCount) alerts.push("nba_props_kv_empty");

  return {
    kvConfigured,
    bdlKeyPresent,
    oddsApiCircuit: oddsCircuit,
    outrights: {
      seriesCount,
      mvpCount,
      seriesStale: Boolean(seriesKv?.stale),
      mvpStale: Boolean(mvpKv?.stale),
      mvpSource: mvpKv?.source || "none",
    },
    lines: {
      spreadLine,
      spreadSnapshots: Array.isArray(spreadKv?.snapshots) ? spreadKv.snapshots.length : 0,
      propsPlayerCount,
      propsPosted: Boolean(propsPayload?.hasPostedLines),
      propsFetchedAt: propsKv?.fetchedAtMs ? new Date(propsKv.fetchedAtMs).toISOString() : null,
    },
    alerts,
    ok: alerts.filter((a) => !a.startsWith("nba_odds_api_circuit")).length === 0,
  };
}
