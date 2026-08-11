# NFL freshness ops cadence

Goal: keep UnderReview NFL answers current without hammering feeds. Roster truth is ESPN (+ Ourlads depth). Clay / ESPN fantasy PDFs are projection/market layers only.

## Live refresh endpoints

| Endpoint | Cadence (vercel.json) | Notes |
| --- | --- | --- |
| `/api/nfl-roster-refresh` | Mon/Thu `0 14 * * 1,4` | Force ESPN roster + injury overlay into KV |
| `/api/nfl-roster-refresh?seasonal=1` | Sun `0 15 * * 0` | No-ops outside NFL months (Sep–Feb) |
| `/api/nfl-inactives-refresh?seasonal=1` | Sun hourly `0 13-22 * * 0` | ESPN game-day injury/status snapshot; skips offseason |
| `/api/nfl-depth-update` | Sun `0 13` + Tue `0 14` | Ourlads depth chart |
| `/api/health?nfl=1` | on demand | Roster/depth/game-day age, Clay/fantasy/stats counts, props fallback readiness |

Manual warm (prod, with cron secret if required):

```bash
curl -sS "$BASE/api/nfl-roster-refresh"
curl -sS "$BASE/api/nfl-inactives-refresh"
curl -sS "$BASE/api/health?nfl=1"
```

## Static / regen layers

| Layer | Module | Regen |
| --- | --- | --- |
| Clay 2026 projections | `api/data/nfl-clay-projections-2026.js` | `python3 scripts/gen-nfl-clay-projections-2026.py <Clay.pdf>` |
| ESPN fantasy market | `api/data/nfl-fantasy-market-2026.js` | Re-parse PPR300 + Superflex draft-kit PDFs when ESPN updates |
| nflverse 2025 baselines | `api/data/nfl-*-stats-2025.js`, `nfl-defense-allowed-2025.js` | Refresh after season from nflverse `stats_player` / `stats_team` |
| Static prop O/Us | `api/_nflPropLineContext.js` | Preseason baselines; board uses them only when live AN props are empty |

## Props source order

1. Action Network live board/props (primary)
2. Static 2026 player prop O/U baselines (`propsFallback.lines`) when AN returns zero posted lines
3. BallDontLie NFL GOAT (`NFL_BDL_PRIMARY=1`) — scaffold only until the key has NFL odds/props access

## Response discipline reminders

- Weather only when material outdoor factors apply, or the user asks. Domes: no weather block and do not say “no weather penalty.”
- Game venue = home / “X at Y” home team, not the player’s home stadium by default.
- Do not claim official 90-minute inactives unless the inactive feed row is present; use ESPN status as latest signal.

## Probe

```bash
node scripts/probe-nfl-context.mjs
```

Checks health, fantasy/Clay injection, venue weather gating, and board `propsFallback` when live lines are empty.
