/**

 * Manual WC player-markets overrides (breaking line, Golden Boot rows, injuries).

 * POST /api/world-cup?view=player_markets_override — requires CRON_SECRET bearer.

 */



import { getDurableJson, setDurableJson } from "./_durableStore.js";

import {

  WC_PLAYER_MARKETS_OVERRIDE_KV_KEY,

  WC_PLAYER_MARKETS_OVERRIDE_TTL_SECONDS,

  WC_GOLDEN_BOOT_KV_KEY,

  WC_GOLDEN_BOOT_TTL_SECONDS,

  WC_INJURIES_KV_KEY,

  WC_INJURIES_TTL_SECONDS,

} from "../shared/wc2026PlayerConstants.js";

import { normalizeWcPlayerName } from "../shared/wcPlayerRegistry.js";

import { playerConsensusKey } from "../shared/wcGoldenBootConsensus.js";



/**

 * @returns {Promise<Record<string, unknown> | null>}

 */

export async function readWcPlayerMarketsOverrideKv() {

  return getDurableJson(WC_PLAYER_MARKETS_OVERRIDE_KV_KEY);

}



/**

 * Breaking line for UR Take — KV override beats env WC_BREAKING.

 */

export async function getWcBreakingLineWithOverride() {

  const kv = await readWcPlayerMarketsOverrideKv();

  const line = String(kv?.breakingLine || "").trim();

  return line || null;

}



/**

 * @param {Record<string, unknown> | null | undefined} goldenBootKv

 */

export function applyGoldenBootManualPatches(goldenBootKv) {

  if (!goldenBootKv || typeof goldenBootKv !== "object") return goldenBootKv;

  const patches = goldenBootKv._manualPatches;

  if (!Array.isArray(patches) || !patches.length) return goldenBootKv;



  const rows = Array.isArray(goldenBootKv.rows) ? [...goldenBootKv.rows] : [];

  const byKey = new Map(

    rows.map((r) => [playerConsensusKey(String(r.name), r.nationAbbr), { ...r }]),

  );



  for (const p of patches) {

    const name = normalizeWcPlayerName(String(p.name || ""));

    const odds = String(p.americanOdds || "").trim();

    if (!name || !odds) continue;

    const key = playerConsensusKey(name, p.nationAbbr);

    const existing = byKey.get(key) || { name, nationAbbr: p.nationAbbr };

    byKey.set(key, {

      ...existing,

      name,

      americanOdds: odds,

      nationAbbr: p.nationAbbr || existing.nationAbbr,

      bookOdds: { ...(existing.bookOdds || {}), manual: odds },

    });

  }



  return {

    ...goldenBootKv,

    rows: [...byKey.values()],

    source: goldenBootKv.source ? `${goldenBootKv.source}+manual` : "manual",

  };

}



/**

 * @param {Record<string, unknown> | null | undefined} injuriesKv

 * @param {Record<string, unknown> | null | undefined} [overrideKv]

 */

export function applyInjuriesManualPatches(injuriesKv, overrideKv) {

  if (!injuriesKv || typeof injuriesKv !== "object") return injuriesKv;

  const patches =

    overrideKv?.injuryPatches ||

    injuriesKv._manualInjuryPatches ||

    overrideKv?.injuries;

  if (!Array.isArray(patches) || !patches.length) return injuriesKv;



  const rows = Array.isArray(injuriesKv.rows) ? [...injuriesKv.rows] : [];

  const byName = new Map(rows.map((r) => [normalizeWcPlayerName(String(r.name)), { ...r }]));



  for (const p of patches) {

    const name = normalizeWcPlayerName(String(p.name || ""));

    if (!name) continue;

    byName.set(name, {

      name,

      teamAbbr: p.teamAbbr || p.nationAbbr || byName.get(name)?.teamAbbr,

      status: p.status || p.injuryStatus || "OUT",

      impact: p.impact || "high",

      source: "manual_override",

    });

  }



  const mergedRows = [...byName.values()];

  const starsOut = mergedRows

    .filter((r) => /out|doubtful/i.test(String(r.status || "")))

    .map((r) => r.name)

    .slice(0, 20);



  return {

    ...injuriesKv,

    rows: mergedRows,

    starsOut: [...new Set([...(injuriesKv.starsOut || []), ...starsOut])],

    source: injuriesKv.source ? `${injuriesKv.source}+manual` : "manual",

  };

}



/**

 * Merge override KV into live Golden Boot / injuries stores when requested.

 * @param {object} body

 */

export async function applyWcPlayerMarketsOverride(body = {}) {

  const nowMs = Date.now();

  const prev = (await readWcPlayerMarketsOverrideKv()) || {};



  const next = {

    ...prev,

    lastUpdated: nowMs,

    breakingLine:

      body.breakingLine !== undefined ? String(body.breakingLine || "").trim() : prev.breakingLine,

    goldenBootPatches: Array.isArray(body.goldenBootPatches)

      ? body.goldenBootPatches

      : prev.goldenBootPatches || [],

    injuryPatches: Array.isArray(body.injuryPatches)

      ? body.injuryPatches

      : prev.injuryPatches || [],

    note: body.note ? String(body.note) : prev.note,

  };



  await setDurableJson(WC_PLAYER_MARKETS_OVERRIDE_KV_KEY, next, {

    ttlSeconds: WC_PLAYER_MARKETS_OVERRIDE_TTL_SECONDS,

  });



  let goldenBootPatched = false;

  let injuriesPatched = false;



  if (next.goldenBootPatches?.length) {

    const gb = (await getDurableJson(WC_GOLDEN_BOOT_KV_KEY)) || { rows: [] };

    const patched = applyGoldenBootManualPatches({

      ...gb,

      _manualPatches: next.goldenBootPatches,

    });

    await setDurableJson(WC_GOLDEN_BOOT_KV_KEY, patched, {

      ttlSeconds: WC_GOLDEN_BOOT_TTL_SECONDS,

    });

    goldenBootPatched = true;

  }



  if (next.injuryPatches?.length) {

    const inj = (await getDurableJson(WC_INJURIES_KV_KEY)) || { rows: [], starsOut: [] };

    const patched = applyInjuriesManualPatches(inj, next);

    await setDurableJson(WC_INJURIES_KV_KEY, patched, {

      ttlSeconds: WC_INJURIES_TTL_SECONDS,

    });

    injuriesPatched = true;

  }



  console.log(

    JSON.stringify({

      event: "wc_player_markets_override_applied",

      hasBreaking: Boolean(next.breakingLine),

      goldenBootPatchCount: next.goldenBootPatches?.length ?? 0,

      injuryPatchCount: next.injuryPatches?.length ?? 0,

      goldenBootPatched,

      injuriesPatched,

    }),

  );



  return {

    ok: true,

    override: next,

    goldenBootPatched,

    injuriesPatched,

  };

}



/**

 * @param {import("http").IncomingMessage} req

 */

export async function handleWcPlayerMarketsOverridePost(req) {
  const body = req?.body && typeof req.body === "object" ? req.body : {};
  return applyWcPlayerMarketsOverride(body);
}


