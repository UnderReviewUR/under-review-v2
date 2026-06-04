# World Cup Player Markets — Data Pipeline (Phases A–D)

Permanent player intelligence for Golden Boot, top scorers, match props, and injuries. **No Odds API** for player markets.

## KV keys

| Key | Content | TTL | Cron / trigger |
|-----|---------|-----|----------------|
| `wc2026_players` | Tournament player registry | 24h | 12h cron |
| `wc2026_golden_boot` | Consensus Golden Boot odds | 6h | 4h cron |
| `wc2026_injuries` | Injury board + `starsOut` | 2h | 2h cron |
| `wc2026_match_player_props` | Per-event anytime/first goalscorer (`byEventId`) | 12h | `wc_match_bundle` ramp |
| `wc2026_player_markets_override` | Manual breaking + odds/injury patches | 7d | Admin POST |

Match bundles also incrementally upsert players/injuries into KV.

## Sources

1. **ESPN** — match `summary` (players, injuries), futures JSON (Golden Boot)
2. **Books** — US default on; UK + aggregators behind flags (median consensus)
3. **Seed** — `wc2026PlayerSeed.js`, `wc2026GoldenBootSeed.js`, `wc2026MatchPlayerPropsSeed.js`

Team outrights (`wc2026_outrights`) remain separate and may still use Odds API.

## Feature flags (default off for aggressive scrapes)

| Env | Default | Effect |
|-----|---------|--------|
| `WC_SCRAPE_DK` | on | DraftKings |
| `WC_SCRAPE_FD` | on | FanDuel |
| `WC_SCRAPE_MGM` | on | BetMGM |
| `WC_SCRAPE_UK` | **off** | Paddy Power, Bet365, William Hill |
| `WC_SCRAPE_AGG` | **off** | OddsChecker, Covers |
| `WC_SCRAPE_*_URL` | — | Override book page URL |
| `WC_SCRAPE_*_MATCH_URL_TEMPLATE` | — | Match props URL template (`{eventId}`, `{home}`, `{away}`) |
| `WC_BREAKING` | — | Env breaking line (KV override wins) |
| `CRON_SECRET` | — | Required bearer for manual override POST |

Rate policy: `WC_BOOK_SCRAPE_BASE_DELAY_MS` (450ms) between books, `WC_BOOK_SCRAPE_BACKOFF_MS` (1200ms) after errors, 1 retry per book.

## Observability

Structured logs (JSON):

| Event | When |
|-------|------|
| `wc_golden_boot_scrape_book` | Per-book Golden Boot scrape (ok, rowCount, latencyMs, region) |
| `wc_match_props_scrape_book` | Per-book match props scrape |
| `wc_golden_boot_cached` | KV write |
| `wc_match_props_cached` | Per-event KV write |
| `wc_player_markets_override_applied` | Admin override |

**Status dashboard** (alerts-ready fields):

```powershell
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=player_markets_status"
```

Returns `alerts.goldenBootStaleHours`, `alerts.playerRegistryCoverage`, `alerts.activeInjuriesCount`, `alerts.starsOutCount`, `alerts.matchPropsEventCount`, plus `scrapeFlags` and KV freshness.

## Debug API

```powershell
# Read KV
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=players"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=golden_boot"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=injuries"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=match_player_props&eventId=760416"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=player_markets_status"

# Force refresh
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=golden_boot&refresh=1"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=match_player_props&eventId=760416&refresh=1"
```

## Manual override (breaking + player patches)

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
$body = @{
  breakingLine = "2026-06-10 | Star striker ruled out — see injury board"
  goldenBootPatches = @(
    @{ name = "Kylian Mbappé"; americanOdds = "+450"; nationAbbr = "FRA" }
  )
  injuryPatches = @(
    @{ name = "Neymar"; teamAbbr = "BRA"; status = "OUT" }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod "http://localhost:3001/api/world-cup?view=player_markets_override" `
  -Method POST -Headers $headers -Body $body -ContentType "application/json"
```

GET `?view=player_markets_override` returns current override KV (no auth).

## Smoke / regression

```bash
# Golden Boot book scrape → KV
node scripts/scrape-wc-golden-boot-smoke.mjs

# Unit + sprint validation (tiers, match props, UK consensus, status)
node --test api/wcPlayerMarketsSprint.validation.test.js api/wcUrTakeRelevance.test.js shared/wcGoldenBootConsensus.test.js
```

Full package test script includes all WC player market tests.

## UR Take (Phases B–C)

- Player intents load tournament KV + optional match props when `wcEventId` is set.
- Tiers: `verified` → `market_only` → `squad` → `thin` (logged as `wcRelevance.playerMarketTier`).
- QA: `wc_player_missing_names`, `wc_player_odds_uncited`, `wc_player_question_team_lead`.

## Scheduler

During `isWcHomePromoWindow`: `wc_players`, `wc_golden_boot`, `wc_injuries` plus per-match `wc_match_bundle` (props scrape inside bundle when odds run).

## Production checklist

1. Set `CRON_SECRET` in Vercel for override POST + cron.
2. Enable `WC_SCRAPE_UK=1` / `WC_SCRAPE_AGG=1` only after smoke on target URLs.
3. Monitor `player_markets_status` for `goldenBootStaleHours` > 6 or `playerRegistryCoverage.playerCount` collapse.
4. Use override POST for same-day breaking news instead of redeploying for `WC_BREAKING`.
