#!/usr/bin/env node
/**
 * Local smoke: populate wc2026_golden_boot + wc2026_players + wc2026_injuries KV.
 * Usage: node scripts/scrape-wc-golden-boot-smoke.mjs
 */

import { scrapeAndCacheWcGoldenBoot } from "../api/_wcGoldenBootOdds.js";
import { scrapeAndCacheWcInjuries } from "../api/_wcInjuriesData.js";
import { scrapeAndCacheWcPlayers } from "../api/_wcPlayersData.js";

const gb = await scrapeAndCacheWcGoldenBoot();
const players = await scrapeAndCacheWcPlayers();
const injuries = await scrapeAndCacheWcInjuries();

console.log(
  JSON.stringify(
    {
      goldenBoot: {
        ok: gb.ok,
        rowCount: gb.rows?.length ?? 0,
        source: gb.source,
        booksUsed: gb.booksUsed,
        servedStale: gb.servedStale,
      },
      players: {
        ok: players.ok,
        teamCount: players.teamCount,
        playerCount: players.playerCount,
      },
      injuries: {
        ok: injuries.ok,
        rowCount: injuries.rowCount,
        starsOut: injuries.starsOut,
      },
    },
    null,
    2,
  ),
);
