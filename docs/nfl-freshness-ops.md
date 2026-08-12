# NFL freshness ops cadence

Goal: keep UnderReview NFL answers current without hammering feeds. Roster truth is ESPN (+ Ourlads depth). Clay PDFs are projection layers only. Fantasy ranks and deep week stats hydrate live into KV.

## Live refresh endpoints

| Endpoint | Cadence (vercel.json) | Notes |
| --- | --- | --- |
| `/api/nfl-roster-refresh` | Mon/Thu `0 14 * * 1,4` | Force ESPN roster + injury overlay into KV |
| `/api/nfl-roster-refresh?seasonal=1` | Sun `0 15 * * 0` | No-ops outside NFL months (Sep–Feb) |
| `/api/nfl-inactives-refresh?seasonal=1` | Sun hourly `0 13-22 * * 0` | ESPN game-day injury/status snapshot; skips offseason |
| `/api/nfl-depth-update` | Sun `0 13` + Tue `0 14` | Ourlads depth chart |
| `/api/nfl-fantasy-rankings-refresh` | Mon/Wed/Fri `0 14 * * 1,3,5` | ESPN Fantasy PPR/Superflex ranks + ownership → KV |
| `/api/nfl-stats-refresh` | Tue `0 15 * * 2` | nflverse week aggregates (season / last-3 / last-1) |
| `/api/nfl-stats-refresh?seasonal=1` | Mon/Thu `0 16 * * 1,4` | Same hydrate; skips outside Sep–Feb |
| `/api/health?nfl=1` | on demand | Roster/depth/game-day/ranks/stats age + stale SLAs |

Manual warm:

```bash
curl -sS "$BASE/api/nfl-roster-refresh"
curl -sS "$BASE/api/nfl-fantasy-rankings-refresh"
curl -sS "$BASE/api/nfl-stats-refresh"
curl -sS "$BASE/api/nfl-inactives-refresh"
curl -sS "$BASE/api/health?nfl=1"
```

## Freshness priority in answers

1. ESPN roster / injury / game-day status (can he play, where is he?)
2. Live ESPN Fantasy ranks from KV (overrides static draft-kit seed)
3. nflverse live week windows (last 1 / last 3 / season) when present
4. Clay projections (ship-time / slower market layer)
5. Static 2025 nflverse modules (durable prior-season baseline)
6. Live Action Network props; static O/Us only if books posted nothing

## SLAs (health)

| Layer | Stale when |
| --- | --- |
| Fantasy rankings | age > 72 hours |
| Live nflverse stats | in-season and age > 8 days |
| Roster | monitor `ageHours`; cron target ≤ ~3 days |

Offseason note: if the current season week CSV is unpublished (e.g. Aug 2026 before Week 1), stats refresh falls back to the prior season and labels it explicitly.

## Static / regen layers

| Layer | Module | Regen |
| --- | --- | --- |
| Clay 2026 projections | `api/data/nfl-clay-projections-2026.js` | `python3 scripts/gen-nfl-clay-projections-2026.py <Clay.pdf>` |
| Clay format strategy tips | `api/data/nfl-clay-format-tips-2026.js` | Injected only for dynasty/keeper/superflex/best ball/knockout/TE premium/etc. questions |
| ESPN fantasy market seed | `api/data/nfl-fantasy-market-2026.js` | Fallback only when live ranks KV empty |
| nflverse 2025 baselines | `api/data/nfl-*-stats-2025.js` | Ship-time; live week hydrate supersedes for form |
| Static prop O/Us | `api/_nflPropLineContext.js` | Preseason baselines |

## Props source order

1. Action Network live board/props (primary)
2. Static 2026 player prop O/U baselines (`propsFallback.lines`) when AN returns zero posted lines
3. BallDontLie NFL GOAT (`NFL_BDL_PRIMARY=1`) — scaffold until GOAT access is live

## Response discipline reminders

- Weather only when material outdoor factors apply, or the user asks. Domes: no weather block and do not say “no weather penalty.”
- Game venue = home / “X at Y” home team, not the player’s home stadium by default.
- Do not claim official 90-minute inactives unless the inactive feed row is present; use ESPN status as the latest signal.

## Probe

```bash
node scripts/probe-nfl-context.mjs
```
