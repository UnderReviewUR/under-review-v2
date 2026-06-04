# World Cup 2026 — Quick Smoke Test Checklist

Use during international friendlies or before a match window to verify trust-layer behavior end-to-end. Run locally with `npm run dev:local` unless noted.

## Prerequisites

- [ ] `.env` has `ANTHROPIC_API_KEY` (for UR TAKE smoke)
- [ ] KV connected (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) or accept fallback/static slate with `xiStatus: unavailable` on cards
- [ ] Optional: `WC_BREAKING=` line in `.env` for override test (clear after)

## 1. API enrichment (`/api/world-cup`)

Base URL: `http://localhost:3001` (dev API) or production `/api/world-cup`.

| Check | Command / action | Pass criteria |
|-------|------------------|---------------|
| Matches enriched | `GET ?view=matches` | Each match has `lineupConfirmed`, `xiStatus`, `dataConfidence`; no `lineups` / starter arrays in JSON |
| Live enriched | `GET ?view=live` | Same fields on `live[]` |
| Upcoming enriched | `GET ?view=upcoming` | Same on `upcoming[]` (max 8) |
| Detail view | `GET ?view=detail&eventId=<ESPN_ID>` | `ok: true` with scores + meta; 404 + meta when no KV row |
| `xiStatus` semantics | Inspect a fixture with KV, unconfirmed XI | `xiStatus: "pending"`, `lineupConfirmed: false` |
| No KV row | Fixture never scraped | `xiStatus: "unavailable"` |
| Confirmed XI | After ESPN confirms starters in KV | `xiStatus: "confirmed"`, `lineupConfirmed: true`, `dataConfidence: "confirmed"` |

Example (PowerShell):

```powershell
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=matches" | Select-Object -ExpandProperty matches | Select-Object -First 1 id, xiStatus, lineupConfirmed, dataConfidence, lastUpdated
```

## 2. Match cards (UI)

Open **World Cup** tab → **Matches** (Live / Today / Upcoming / group fixtures).

- [ ] Every card shows an XI chip (green / amber / muted)
- [ ] **as of … ET** appears when `lastUpdated` is set
- [ ] Chip copy matches API: *Starting XI confirmed* / *XI pending* / *Lineup data pending*
- [ ] Live tab poll (~60s) still updates scores; chips refresh with enriched `view=live`
- [ ] **Ask UR Take** on a match card pins fixture context (`wcEventId` in request body — check network tab)

## 3. UR TAKE — prompt gating (server)

Ask a WC question on a fixture **without** confirmed lineups (friendlies pre-XI):

- [ ] Response does **not** name specific starters as fact
- [ ] Plain-text / logs: prompt includes `lineupConfirmed: no` or NOT CONFIRMED rules (inspect server log if needed)

Repeat after confirmed XI in KV:

- [ ] Starter-specific angles allowed when `lineupConfirmed: yes` in context

## 4. UR TAKE — caution banner & confidence cap (UI)

On a take where API returns `dataConfidence` ≠ `confirmed`:

- [ ] Amber banner under sport bar: lineup / XI not confirmed + no starter-specific plays
- [ ] Stat grid **Confidence** shows capped value (e.g. model `High` → **Medium** for `pre_match_estimate`, or **Speculative** for `limited_intel`)
- [ ] Small chip below card still shows tier label (*Pre-match estimate* / *Limited intel*) — optional duplicate, OK

When `dataConfidence: "confirmed"`:

- [ ] No caution banner
- [ ] Confidence displays uncapped (e.g. **High** stays **High**)

## 5. Player / Golden Boot question contract (Phase B)

With `?view=golden_boot` populated (Phase A):

- [ ] Ask: `who will score the most goals?` → **named players** (e.g. Mbappé, Kane) with cited odds — not France as the pick
- [ ] Ask: `Best golden boot value?` → Golden Boot ladder from VERIFIED CONTEXT
- [ ] Sport bar shows tier chip (**Market Odds**, **Early Contenders**, etc.)
- [ ] Logs: `wcRelevance.playerMarketTier` = `market_only` | `verified` | `squad` | `thin`
- [ ] Team question `Is Brazil mispriced…` still team-level (no regression)

Ask `which team will score the most goals?` (team-level):

- [ ] Still routes to structural/team answer — **not** forced player pass

Logs (`ur_take_complete`):

- [ ] `wcRelevance.playerPropDetected: true`
- [ ] `wcRelevance.qaPlayerMatch: "pass"` on pass template
- [ ] Event `ur_take_wc_player_market_pass` when LLM skipped

## 6. UX layout + dock (Phase 1)

With at least one UR Take message on World Cup:

- [ ] Chat thread appears **above** groups/matches browse content (no scroll past 12 groups to read latest answer)
- [ ] Bottom dock: full-width ask bar + **World Cup · Ask another** label
- [ ] Placeholder / kicker: team & tournament angles; player props when lineups confirmed
- [ ] Follow-up chips visible in dock strip; tapping one submits and scrolls thread

## 7. `WC_BREAKING` override

1. Set `WC_BREAKING=2026-06-02 | Smoke test — verify breaking block appears` in Vercel or `.env`
2. Redeploy / restart dev API
3. Ask any WC UR TAKE

- [ ] Take references or respects the breaking line in reasoning (prompt block at top)
4. Clear `WC_BREAKING` after test

## 8. Ramp polling (ops / logs)

During a friendly within **24h** of kickoff:

- [ ] Scrape scheduler targets that fixture (`selectWcMatchDetailTargets`)
- [ ] T-90 → kickoff: detail scrape interval ~**5 min** (see `getWcRampScrapeDelayMs` bands)

Optional: trigger `POST /api/scrape-scheduler` (if enabled in your env) and confirm `wc_match_detail:<eventId>` KV updates `lastUpdated`.

## 9. Regression tests (CI)

```bash
npm test
```

WC-related suites to watch:

- `api/_wcData.test.js`
- `api/_wcUrTakeContext.gating.test.js`
- `api/_wcUrTakeContext.matchDetail.test.js`
- `api/wcUrTakeRelevance.test.js`
- `shared/wcUrTakeIntent.test.js`
- `shared/wcUrTakePlayerMarket.test.js`
- `shared/wcUrTakeVerdict.test.js`
- `shared/wcDataConfidence.test.js`
- `shared/wcXiStatus.test.js`
- `shared/wcMatchDetailTargets.test.js`
- `shared/scrapeCadencePolicy.test.js`
- `api/_sanitizeUrTakeBody.test.js` (wcEventId allowlist)

## 6. Player markets KV (Phase A — data pipeline)

See `docs/WC_PLAYER_MARKETS.md`.

| Check | Command | Pass criteria |
|-------|---------|---------------|
| Players KV | `GET ?view=players` | `ok: true`, `playerCount` ≥ 20, teams with ≥2 players |
| Golden Boot KV | `GET ?view=golden_boot` | `rowCount` ≥ 10, each row has `name` + `americanOdds` |
| Injuries KV | `GET ?view=injuries` | `ok: true`; `rows` array present |
| Force refresh | `GET ?view=golden_boot&refresh=1` | `source` is `consensus`, `consensus+seed`, or `seed`; no Odds API in logs |
| Smoke script | `node scripts/scrape-wc-golden-boot-smoke.mjs` | Prints row counts without throw |

```powershell
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=golden_boot&refresh=1" | Select-Object rowCount, booksUsed, source
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=players" | Select-Object playerCount, teamCount
```

## Sign-off

| Area | Owner | Date | Notes |
|------|-------|------|-------|
| API enrichment | | | |
| Match cards + wcEventId | | | Match-card Ask sends `wcEventId` in `/api/ur-take` body |
| UR TAKE gating | | | |
| Player markets KV (Phase A) | | | players / golden_boot / injuries views |
| Player / Golden Boot contract (Phase B) | | | UR Take tiers — after KV green |
| UX layout + bottom dock | | | Chat-first; full-width dock |
| Caution + confidence cap | | | |
| WC_BREAKING | | | |
