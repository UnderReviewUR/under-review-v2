import {
  PGA_CHAMPIONSHIP_GRAPHQL_BASE,
  PGA_CHAMPIONSHIP_ODDS_IDS,
  PGA_CHAMPIONSHIP_PERSISTED_HASH,
} from "../shared/pgaChampionshipOddsConstants.js";
import {
  buildGolferNameMapFromStaticAssets,
  parsePgaChampionshipEventOddsRows,
} from "./_pgaChampionshipOddsParse.js";

function buildGraphqlUrl(operationName, variables, sha256Hash) {
  const params = new URLSearchParams({
    operationName,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({
      persistedQuery: { version: 1, sha256Hash },
    }),
  });
  return `${PGA_CHAMPIONSHIP_GRAPHQL_BASE}?${params.toString()}`;
}

async function fetchGraphql(operationName, variables, sha256Hash) {
  const url = buildGraphqlUrl(operationName, variables, sha256Hash);
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "UnderReview/1.0 (+https://under-review.app)",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`PGA Championship GraphQL ${operationName} HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * @returns {Promise<number>}
 */
export async function fetchPgaChampionshipOddsTimestamp() {
  const data = await fetchGraphql(
    "LastUpdate",
    { id: PGA_CHAMPIONSHIP_ODDS_IDS.eventOddsLastUpdate },
    PGA_CHAMPIONSHIP_PERSISTED_HASH.LastUpdate,
  );
  const ts = Number(data?.data?.lastUpdate?.timestamp);
  if (!Number.isFinite(ts) || ts <= 0) {
    throw new Error("PGA Championship odds LastUpdate missing timestamp");
  }
  return ts;
}

/**
 * @param {number} timestamp
 */
export async function fetchPgaChampionshipOddsViaGraphql(timestamp) {
  const assetsTs = timestamp - 3600_000;
  const [assetsData, oddsData] = await Promise.all([
    fetchGraphql(
      "StaticLeaderboardAssets",
      {
        id: PGA_CHAMPIONSHIP_ODDS_IDS.staticLeaderboardAssets,
        timestamp: assetsTs,
      },
      PGA_CHAMPIONSHIP_PERSISTED_HASH.StaticLeaderboardAssets,
    ),
    fetchGraphql(
      "EventOdds",
      {
        id: PGA_CHAMPIONSHIP_ODDS_IDS.eventOdds,
        timestamp,
      },
      PGA_CHAMPIONSHIP_PERSISTED_HASH.EventOdds,
    ),
  ]);

  const golfers = assetsData?.data?.staticLeaderboardAssets?.golfers || [];
  const nameMap = buildGolferNameMapFromStaticAssets(golfers);
  const rows = oddsData?.data?.eventOdds?.rows || [];
  const parsed = parsePgaChampionshipEventOddsRows(nameMap, rows);
  return {
    ...parsed,
    providerTimestamp: timestamp,
    scrapeMethod: "graphql",
  };
}

/**
 * Full refresh: resolve latest timestamp then pull odds + names.
 */
export async function scrapePgaChampionshipOddsGraphql() {
  const timestamp = await fetchPgaChampionshipOddsTimestamp();
  const payload = await fetchPgaChampionshipOddsViaGraphql(timestamp);
  return payload;
}
