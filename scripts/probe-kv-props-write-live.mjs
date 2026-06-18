/**
 * Live KV write probe — confirms POST-body SET succeeds for full match-28 props blob.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production.local") });

const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");
const { setDurableJson, getDurableJson } = await import("../api/_durableStore.js");
const { WC_MATCH_PLAYER_PROPS_KV_KEY } = await import("../shared/wc2026PlayerConstants.js");

const probeKey = `${WC_MATCH_PLAYER_PROPS_KV_KEY}:probe_write_test`;

const res = await bdlFifaFetch("/odds/player_props", { match_id: 28 });
const rows = Array.isArray(res.data?.data) ? res.data.data : [];
const lookup = await resolveBdlPlayerLookupForPropRows(rows, { homeTeam: "MEX", awayTeam: "KOR" });
const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);

const payload = {
  lastUpdated: Date.now(),
  byEventId: {
    28: {
      eventId: "28",
      homeTeam: "MEX",
      awayTeam: "KOR",
      markets,
      source: "balldontlie",
    },
  },
};

const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
let writeOk = false;
let readBackOk = false;
/** @type {string | null} */
let error = null;

try {
  await setDurableJson(probeKey, payload, { ttlSeconds: 120 });
  writeOk = true;
  const read = await getDurableJson(probeKey);
  readBackOk =
    read?.byEventId?.["28"]?.markets?.player_shots_ou?.length ===
    markets.player_shots_ou.length;
} catch (e) {
  error = e instanceof Error ? e.message : String(e);
}

console.log(
  JSON.stringify(
    {
      probeKey,
      payloadBytes: bytes,
      writeOk,
      readBackOk,
      shotsOu: markets.player_shots_ou.length,
      error,
    },
    null,
    2,
  ),
);

process.exit(writeOk && readBackOk ? 0 : 1);
