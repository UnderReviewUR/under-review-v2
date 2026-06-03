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

## 5. `WC_BREAKING` override

1. Set `WC_BREAKING=2026-06-02 | Smoke test — verify breaking block appears` in Vercel or `.env`
2. Redeploy / restart dev API
3. Ask any WC UR TAKE

- [ ] Take references or respects the breaking line in reasoning (prompt block at top)
4. Clear `WC_BREAKING` after test

## 6. Ramp polling (ops / logs)

During a friendly within **24h** of kickoff:

- [ ] Scrape scheduler targets that fixture (`selectWcMatchDetailTargets`)
- [ ] T-90 → kickoff: detail scrape interval ~**5 min** (see `getWcRampScrapeDelayMs` bands)

Optional: trigger `POST /api/scrape-scheduler` (if enabled in your env) and confirm `wc_match_detail:<eventId>` KV updates `lastUpdated`.

## 7. Regression tests (CI)

```bash
npm test
```

WC-related suites to watch:

- `api/_wcData.test.js`
- `api/_wcUrTakeContext.gating.test.js`
- `shared/wcDataConfidence.test.js`
- `shared/wcXiStatus.test.js`
- `shared/wcMatchDetailTargets.test.js`
- `shared/scrapeCadencePolicy.test.js`

## Sign-off

| Area | Owner | Date | Notes |
|------|-------|------|-------|
| API enrichment | | | |
| Match cards | | | |
| UR TAKE gating | | | |
| Caution + confidence cap | | | |
| WC_BREAKING | | | |
