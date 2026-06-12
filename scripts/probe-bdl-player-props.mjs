/**
 * BDL player props ingest probe — raw API vs normalized markets vs audit warnings.
 *
 * Usage:
 *   node scripts/probe-bdl-player-props.mjs [bdlMatchId] [homeTeam] [awayTeam]
 *   node scripts/probe-bdl-player-props.mjs 2 KOR CZE
 *
 * Requires BALLDONTLIE_API_KEY in env or .env.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const bdlMatchId = Number(process.argv[2] || 2);
const homeTeam = String(process.argv[3] || "KOR").toUpperCase();
const awayTeam = String(process.argv[4] || "CZE").toUpperCase();

const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");
const { auditBdlPlayerPropsIngest } = await import("../shared/wcBdlIngestAudit.js");

if (!process.env.BALLDONTLIE_API_KEY?.trim()) {
  console.error("Missing BALLDONTLIE_API_KEY");
  process.exit(1);
}

const res = await bdlFifaFetch("/odds/player_props", { match_id: bdlMatchId });
const rows = Array.isArray(res.data?.data) ? res.data.data : [];
const lookup = await resolveBdlPlayerLookupForPropRows(rows, { homeTeam, awayTeam });
const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);
const audit = auditBdlPlayerPropsIngest(rows, markets, lookup);

const sonRows = (markets.player_shots_ou || []).filter((r) => /son|heung/i.test(r.name));

console.log(
  JSON.stringify(
    {
      bdlMatchId,
      matchup: `${homeTeam} vs ${awayTeam}`,
      fetchOk: res.ok,
      fetchError: res.error || null,
      audit,
      marketCounts: {
        anytime_scorer: (markets.anytime_scorer || []).length,
        player_goal_or_assist: (markets.player_goal_or_assist || []).length,
        player_shots_ou: (markets.player_shots_ou || []).length,
        player_sot_ou: (markets.player_sot_ou || []).length,
        player_assists_ou: (markets.player_assists_ou || []).length,
        player_card: (markets.player_card || []).length,
      },
      sonShotsSample: sonRows.slice(0, 5),
      docs: "https://fifa.balldontlie.io/#player-props",
    },
    null,
    2,
  ),
);

process.exit(audit.healthy ? 0 : 1);
