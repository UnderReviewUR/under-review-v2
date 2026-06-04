# World Cup Player Markets — Data Pipeline (Phase A)

Permanent player intelligence for Golden Boot, top scorers, and injuries. **No Odds API** for player markets.

## KV keys

| Key | Content | TTL | Cron interval |
|-----|---------|-----|---------------|
| `wc2026_players` | Tournament player registry | 24h | 12h |
| `wc2026_golden_boot` | Consensus Golden Boot odds | 6h | 4h |
| `wc2026_injuries` | Injury board + `starsOut` | 2h | 2h |

Match bundles also incrementally upsert players/injuries into KV.

## Sources

1. **ESPN** — match `summary` (players, injuries), futures JSON (Golden Boot)
2. **Books** — DraftKings, FanDuel, BetMGM (default on); UK + aggregators behind flags
3. **Seed** — `src/data/wc2026PlayerSeed.js`, `wc2026GoldenBootSeed.js` when live feeds thin

Team outrights (`wc2026_outrights`) remain separate and may still use Odds API.

## Feature flags

| Env | Effect |
|-----|--------|
| `WC_SCRAPE_DK=1` | DraftKings Golden Boot scrape (default on) |
| `WC_SCRAPE_FD=1` | FanDuel (default on) |
| `WC_SCRAPE_MGM=1` | BetMGM (default on) |
| `WC_SCRAPE_UK=1` | Paddy Power, Bet365, William Hill |
| `WC_SCRAPE_AGG=1` | OddsChecker, Covers |
| `WC_SCRAPE_*_URL` | Override book page URL |

## Debug API

```powershell
# Read KV
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=players"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=golden_boot"
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=injuries"

# Force refresh (runs scrape + returns payload)
Invoke-RestMethod "http://localhost:3001/api/world-cup?view=golden_boot&refresh=1"
```

## Smoke script

```bash
node scripts/scrape-wc-golden-boot-smoke.mjs
```

## Scheduler

During `isWcHomePromoWindow` (Jun 1 – Jul 19 ET): `wc_players`, `wc_golden_boot`, `wc_injuries` targets are collected alongside tournament-window match bundles.

## Phase B (not started)

UR Take tiered answers + prompt blocks — do not enable until Phase A KV smoke is green.
