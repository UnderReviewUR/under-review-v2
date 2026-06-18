/**
 * Measure WC match player props KV payload size vs URL-embedded SET limit.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production.local") });

const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");
const { WC_MATCH_PLAYER_PROPS_KV_KEY } = await import("../shared/wc2026PlayerConstants.js");

const res = await bdlFifaFetch("/odds/player_props", { match_id: 28 });
const rows = Array.isArray(res.data?.data) ? res.data.data : [];
const lookup = await resolveBdlPlayerLookupForPropRows(rows, { homeTeam: "MEX", awayTeam: "KOR" });
const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);

const cached = { lastUpdated: Date.now(), byEventId: {} };
cached.byEventId["28"] = {
  eventId: "28",
  homeTeam: "MEX",
  awayTeam: "KOR",
  lastUpdated: Date.now(),
  source: "balldontlie",
  booksUsed: ["balldontlie"],
  markets,
};

const json = JSON.stringify(cached);
const key = WC_MATCH_PLAYER_PROPS_KV_KEY;
const legacyUrlLen =
  `${process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "https://x.upstash.io"}/set/${encodeURIComponent(key)}/${encodeURIComponent(json)}`
    .length;

console.log(
  JSON.stringify(
    {
      key,
      payloadBytes: Buffer.byteLength(json, "utf8"),
      legacyGetUrlChars: legacyUrlLen,
      likely431: legacyUrlLen > 8000,
      normalizedShotsOu: (markets.player_shots_ou || []).length,
    },
    null,
    2,
  ),
);
