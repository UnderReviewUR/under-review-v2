/**
 * On-demand BDL GOAT match odds for UR Take (prebuilt + full LLM context).
 */

import { bdlFifaFetch } from "./_wcBdlFifa.js";
import { pickBdlMatchOddsForMatch } from "./_wcBdlNormalize.js";
import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";

const BDL_MATCH_ODDS_FETCH_TIMEOUT_MS = 4000;
const BDL_MATCH_ODDS_FETCH_ATTEMPTS = 4;

/**
 * @param {string | number | null | undefined} bdlMatchId
 * @param {number} [nowMs]
 */
export async function fetchBdlMatchOddsForUrTake(bdlMatchId, nowMs = Date.now()) {
  void nowMs;
  if (!isWcGoatPrimaryEnabled()) return null;
  if (bdlMatchId == null) return null;
  for (let attempt = 0; attempt < BDL_MATCH_ODDS_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const res = await Promise.race([
        bdlFifaFetch("/odds", { "seasons[]": 2026, "match_ids[]": bdlMatchId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("bdl_match_odds_timeout")), BDL_MATCH_ODDS_FETCH_TIMEOUT_MS),
        ),
      ]);
      if (!res?.ok) continue;
      const odds = pickBdlMatchOddsForMatch(
        Array.isArray(res.data?.data) ? res.data.data : [],
        bdlMatchId,
      );
      if (odds) return odds;
    } catch {
      if (attempt < BDL_MATCH_ODDS_FETCH_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  return null;
}
