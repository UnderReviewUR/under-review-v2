/**
 * Named-player prop parser battery + optional BDL raw sample for match 28.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.production.local") });

const { extractWcNamedPlayerPropLegsFromQuestion } = await import("../shared/wcUrTakePlayerMarket.js");

const battery = [
  {
    label: "each going (original bug)",
    q: "thoughts on Son, Jimenez, and Quinones each going over 2.5 shots attempted?",
    expectNames: ["Son", "Jimenez", "Quinones"],
    expectThreshold: "2.5",
  },
  {
    label: "Oxford comma shared threshold",
    q: "Son, Jimenez, and Quinones over 2.5 shots",
    expectNames: ["Son", "Jimenez", "Quinones"],
    expectThreshold: "2.5",
  },
  {
    label: "accents no Oxford comma",
    q: "Son, Jiménez and Quiñones over 2.5 shots",
    expectNames: ["Son", "Jiménez", "Quiñones"],
    expectThreshold: "2.5",
  },
  {
    label: "each have 2+",
    q: "Son and Jimenez to each have 2+ shots",
    expectNames: ["Son", "Jimenez"],
    expectThreshold: "2",
  },
  {
    label: "shots for four names",
    q: "shots for Son, Jimenez, Quinones, and Lee Kang-in over 2.5 shots",
    expectNames: ["Son", "Jimenez", "Quinones", "Lee Kang-in"],
    expectThreshold: "2.5",
  },
];

/** @type {Array<Record<string, unknown>>} */
const results = [];
for (const item of battery) {
  const legs = extractWcNamedPlayerPropLegsFromQuestion(item.q);
  const names = legs.map((l) => l.name);
  const ok =
    names.length === item.expectNames.length &&
    item.expectNames.every((n, i) => names[i] === n) &&
    (!item.expectThreshold || legs[0]?.threshold === item.expectThreshold);
  results.push({
    label: item.label,
    ok,
    names,
    threshold: legs[0]?.threshold || null,
    legCount: legs.length,
  });
}

/** @type {Record<string, unknown> | null} */
let bdlSample = null;
if (process.env.BALLDONTLIE_API_KEY?.trim()) {
  const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
  const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
  const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");
  const { auditBdlPlayerPropsIngest } = await import("../shared/wcBdlIngestAudit.js");

  const bdlMatchId = 28;
  const res = await bdlFifaFetch("/odds/player_props", { match_id: bdlMatchId });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const lookup = await resolveBdlPlayerLookupForPropRows(rows, { homeTeam: "MEX", awayTeam: "KOR" });
  const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);
  const audit = auditBdlPlayerPropsIngest(rows, markets, lookup);

  const rawShots = rows
    .filter((r) => r.prop_type === "shots")
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      match_id: r.match_id,
      player_id: r.player_id,
      prop_type: r.prop_type,
      line_value: r.line_value,
      vendor: r.vendor,
      playerName: lookup[String(r.player_id)]?.name || null,
      market: r.market,
    }));

  bdlSample = {
    endpoint: "GET /fifa/worldcup/v1/odds/player_props?match_id=28",
    rawRowCount: rows.length,
    audit,
    rawShotsSample: rawShots,
    normalizedShotsOu: (markets.player_shots_ou || []).length,
    dropExplanation:
      "mappedRowCount counts every mappable BDL row (incl. under sides + all vendors); normalizedCount dedupes by player|line|side and merges vendors into bookOdds — not silent loss.",
  };
}

console.log(JSON.stringify({ battery: results, allOk: results.every((r) => r.ok), bdlSample }, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
