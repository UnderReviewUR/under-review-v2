# Home surface data contract — status & risks

## Honest summary (current release)

- **Home trust contract is materially improved** — eligibility, NBA/MLB/tennis snapshots, and dedupe keys largely flow through `buildHomeEventPipeline` + shared validity helpers.
- **Tennis home ingestion is fixed upstream** via `intent=home` on `/api/tennis` — no reliance on stripping finals only in React.
- **Odds ATP fallback semantics are explicit** (`truth_layer`, `tennisTruthPolicy.js`, UI label on cards).
- **Remaining risks are documented and bounded** below — not erased.

## Two ordering layers (intentionally separate — not duplication)

These serve different UX jobs; only the **underlying event keys / eligibility** must stay consistent across them.

### 1) Live Snapshot strip (`TickerRail` / `liveSnapshotPlan.js`)

- **Role:** Compact **real-time strip** — live games, imminent starts (2h window), majors (NFL/F1 carve-outs), capped tile count (e.g. 5).
- **Ordering:** NBA-heavy bucketing → MLB → “others” within that strip’s constraints — tuned for glanceability, **not** the full home card hierarchy.
- **Intent:** Presentation for a horizontal ticker, **not** the same policy as scrolling spotlight cards.

### 2) `HOME_SURFACE_STACK_ORDER` (`presentationOrder.js`)

- **Role:** **Primary hierarchy for stacked Home spotlight cards** (NBA block → MLB → tracker/NFL emphasis → ATP → F1 → golf).
- **Intent:** Editorial / priority order for **vertical** reading — especially **NBA playoff context above tennis** when both exist.

Accidentally using one layer’s sort for the other would be wrong; they are **deliberately separate layers** tied together only by **shared canonical `event_id` keys** and **`homeDedupeOwnership.js`** rules so the same match does not “win” multiple surfaces.

## Cross-surface dedupe ownership

Priority is **Live Snapshot → Today’s Slate (visible rows) → spotlight cards**, implemented with `liveSnapshotKeys`, then `slateDisplayedEventKeys`, then `cardExcludeSet` in `App.jsx`. Pure mirror: **`shared/homeDedupeOwnership.js`** (+ integration test).

## What is centralized today (partial)

- **`buildHomeEventPipeline`** normalizes feeds for Home-rendered inputs (cards, ticker, Live Snapshot keys) using **`eventValidity.js`** and **`priority.js`** (playoff-weighted NBA scores among normalized events).
- **`/api/today-slate`** still uses its own bundle shaping — **not** the pipeline (see risks).

## NBA time — follow-up plan (believable-but-wrong times)

`isNbaTimeMismatch` today invalidates **missing or unparseable** `startTimeUtc` on pre games and triggers a cache-busting refetch (`useNbaData`). That does **not** catch timestamps that parse but lie.

**Planned hardening (next iterations):**

1. **Server slate consistency:** When building today’s slate in `api/nba.js`, attach `expected_et_date` / `primary_source` metadata; client treats pre-game rows as suspect if `startTimeUtc` falls outside the declared ET calendar window for “today’s” slate (timezone-normalized).
2. **Cross-source check (when Odds merge exists for the same game id):** Compare BDL `start_time` to Odds event `commence_time`; if delta exceeds a threshold (e.g. 2h), prefer BDL for display and flag internal observability — optional auto-bust refetch.
3. **Bounded sanity:** Reject pre-game times that imply tipoff in the past relative to `nowMs` while `state` is still `pre` (stale row) — overlaps `eventValidity` but adds an explicit NBA guard.
4. **Single display path:** Ensure all Home NBA clocks read from the same normalized field after refetch (already biased toward BDL `startTimeUtc` in the pipeline).

Until (1)–(3) exist, **wrong-but-parseable** times remain a bounded trust gap — not hand-waved away.

## Tennis identity — next steps (beyond pair+date merge)

Current **`mergeTennisNormalizedByPairDate`** collapses BDL vs Odds when sorted player names + calendar date align.

**Next-step plan:**

1. **Player alias table** — canonical slug per player (BDL id ↔ Odds name variants); normalize before pair-key generation.
2. **Date-boundary normalization** — interpret `event_date` and commence ISO in a single timezone policy (tournament local vs UTC) before forming the dedupe key.
3. **Stable venue/tournament keys** — when both feeds expose tournament ids, prefer id-based equality over string compare for same session.

## Still not fully solved

| Gap | Risk |
|-----|------|
| **`/api/today-slate`** | Own shaping vs pipeline — drift until unified bundle or shared post-normalize step. |
| **NBA parseable wrong times** | Until server cross-checks / slate windows land — see plan above. |
| **Tennis fuzzy identity** | Edge-case duplicates until alias + TZ normalization — see plan above. |
| **Odds ATP rows** | Market fallback remains non-authoritative for draw truth — see `tennisTruthPolicy.js`. |
| **Hydration / offline caches** | Client refetch path not exhaustively proven against stale bundles. |
| **Promo/profile modules** | May bypass pipeline if added without importing the home contract helpers. |

## Tennis truth layers

See **`shared/tennisTruthPolicy.js`** and API field **`truth_layer`** on `/api/tennis` rows (`bdl_fixture` vs `odds_market_fallback`).
