# Under Review v2 — Full Repository & History Review

**Date:** April 2, 2026
**Scope:** Current `main` branch HEAD + last 5 commits (back to `549d804 Update App.jsx`)

---

## Executive Summary

**Under Review** is a Vite + React sports-betting intelligence SPA deployed on Vercel, covering **tennis** and **NFL**. Users ask questions via a chat interface ("UR TAKE"), and an Anthropic Claude backend generates betting analysis. The app fetches live match data from external APIs (api-tennis.com, The Odds API) and maintains large static player databases in code.

The last 5 commits represent a **significant refactor** that consolidated duplicated hooks, introduced a new `src/lib/tennis.js` utilities module, modernized `renderMessage`, and cleaned up `App.jsx`. The direction is solid, but several critical bugs and architectural issues remain.

---

## Last 5 Commits — Evolution Review

### Commit 1: `549d804` — Update App.jsx
Rewrote the root component from a monolithic state manager to a cleaner architecture:
- Introduced **per-screen input/message state** (`homeInput`, `askInput`, `tennisInput`, etc.) to fix a 1-character typing bug caused by shared state
- Moved from separate `submitAsk`/`submitTennis`/`submitAskFromText` calls to a unified `askUrTake()` pattern
- Added `dynamicQuestions` via `useMemo` for context-aware trending prompts
- Navigation and screen routing refactored with `useCallback` helpers

**Verdict:** Good refactor. The per-screen state isolation was the right call.

### Commit 2: `39a3779` — Update useTennisBoard.js
Rewrote the tennis data fetcher:
- Added **60-second polling** for live match updates
- Moved match normalization, deduplication, and sorting into the hook
- Added `fetchBoard()` as a reusable `useCallback`
- New `tennisLoading` state for UX feedback

**Verdict:** Major improvement. However, polling via `setContext(prev => { ... return prev })` is a side-effect inside a state setter — an anti-pattern that works but can cause subtle bugs.

### Commit 3: `1136d94` — Update useImagePaste.js
Simplified the image paste hook:
- Removed `URL.createObjectURL` / `URL.revokeObjectURL` in favor of direct `FileReader.readAsDataURL`
- Moved `fileInputRef` inside the hook (was previously passed in)
- Cleaner event handler with `e.preventDefault()`

**Verdict:** Good simplification. Minor concern: the old code used `createObjectURL` for preview (more memory-efficient for large images) while the new code uses the full data URL for preview. For typical screenshot sizes this is fine.

### Commit 4: `3bb0286` — Update useAskEngine.js
Major refactor from 204 lines to 56:
- Replaced 3 separate submit functions (`submitAsk`, `submitTennis`, `submitAskFromText`) with a single `askUrTake()` that takes `{ text, matchup, setMsgs, sportHint, pastedImage }`
- State management (`askInput`, `tennisMsgs`, refs) removed from the hook — now lives in `App.jsx`
- Added `buildNflContext()` and `sportHint` forwarding

**Verdict:** Excellent refactor. The hook went from owning state it shouldn't own to being a pure "fire request" utility. The API surface is much cleaner.

### Commit 5: `90ee295` — Create tennis.js
New utility module with 125 lines of helper functions:
- `normalizeTennisMatch()` — transforms raw API data into app format
- `preferredTournamentScore()` — ranks matches by active tournament relevance
- `getTournamentFetchParam()`, `getDaypartLabel()`, `isNflInSeason()`, `isNflRampMode()`
- Stat formatters: `formatServeStats()`, `formatReturnStats()`, `formatOverallStats()`

**Verdict:** Good extraction. However, **NFL season logic in a file called `tennis.js` is confusing**. Consider renaming to `sportUtils.js` or splitting into `tennis.js` + `nfl.js`.

### Commit 6 (bonus): `1c0ebe9` — Update renderMessage.js
Rewrote from `dangerouslySetInnerHTML` to JSX:
- Strips markdown bold (`**` and `*`)
- Detects bullet blocks and renders them as styled cards
- Returns proper React elements instead of raw HTML injection

**Verdict:** Significant security improvement (removed XSS vector). The bullet detection heuristic (`l.includes(" — ") && !l.endsWith(".")`) is fragile but acceptable for controlled AI output.

---

## Critical Bugs

### 1. Import Name Mismatches (will crash at runtime)
- **`api/odds.js`** imports `{ getQuery }` from `./_request-query.js`
- **`api/tennis-results.js`** imports `{ getQueryParams }` from `./_request-query.js`
- But `_request-query.js` only exports `getQueryParam` (singular, no "s")
- **Impact:** Both endpoints throw `TypeError` on every request

### 2. Duplicate Object Key in `api/nfl-defense.js`
- `"GB"` (Green Bay) is defined twice — the second definition silently overwrites the first
- **Impact:** First GB defense profile is lost; data is wrong

### 3. Identical Duplicate Files
- `api/nfl-players.js` and `api/nfl-qb.js` are byte-for-byte identical (381 lines)
- Both export `QBs`, empty `RBs`/`WRs`/`TEs`/`Coaches`, and a handler
- **Impact:** Confusing codebase, wasted bundle size, maintenance hazard

### 4. Shedeur Sanders Data Conflict
- `api/ur-take.js` says Sanders was drafted #1 by Tennessee Titans
- `api/nfl-players.js` has him on the Cleveland Browns (#5 overall)
- **Impact:** AI will give contradictory answers depending on which data path is hit

### 5. `AskScreen.jsx` and `ProScreen.jsx` Are Empty Stubs
- `AskScreen` renders "Ask screen stub (R1 shell)" — but it's actively routable from `App.jsx`
- `ProScreen` renders "Pro screen stub" — also routable
- **Impact:** Users navigating to these tabs see non-functional placeholder text

---

## Security Concerns

### HIGH: No Authentication on `/api/ur-take`
- CORS is `Access-Control-Allow-Origin: *`
- No API key, session token, or rate limiting
- Anyone can POST to this endpoint and burn your Anthropic API credits
- Each request can trigger **two** Claude calls (correction loop)
- **Recommendation:** Add at minimum a simple API key header check or Vercel Edge middleware for rate limiting

### MEDIUM: No Auth on `/api/nfl-depth-update`
- POST endpoint that triggers web scraping — can be abused as a proxy
- **Recommendation:** Verify Vercel cron authorization header

### LOW: Wide-Open CORS on All Endpoints
- Every API handler sets `Access-Control-Allow-Origin: *`
- Fine for public read endpoints, problematic for write/paid endpoints

---

## Architecture Issues

### 1. Tennis Data Duplicated in 4+ Locations
The same player data exists in:
- `api/tennis-players.js` (served to client, 100K+ chars)
- `data/tennis/atp.js` + `data/tennis/wta.js`
- `src/lib/tennis/data/atp.js` (440K+ chars, includes rally profiles)
- `src/lib/tennis/data/wta.js` (only 2 players)

These files have **diverging contents** — rally profiles exist in some but not others, WTA data ranges from 2 players to 100+. There's no single source of truth.

### 2. Team Abbreviation Chaos
NFL team abbreviations are inconsistent across files:

| Team | `nfl-defense.js` | `nfl-rb.js` | `nfl-wr-te.js` | `nfl-players.js` |
|------|-----------------|-------------|-----------------|-------------------|
| Packers | `GB` | `GNB` | `GNB` | `GB` |
| Patriots | `NE` | `NWE` | `NWE` | `NE` |
| 49ers | `SF` | `SFO` | `SFO` | `SF` |
| Chiefs | `KC` | `KC` | `KAN` | `KC` |
| Saints | `NO` | — | `NOR` | — |
| Raiders | `LVR` | `LVR` | `LVR` | `LV` |
| Cardinals | `ARZ` | — | `ARI` | `ARI` |

Cross-referencing data between these files will silently fail.

### 3. Massive Data-as-Code Files
- `src/lib/tennis/data/atp.js` is **440K+ characters** — one of the largest source files I've seen
- `api/tennis-players.js` is 100K+
- `api/nfl-wr-te.js` and `api/nfl-rb.js` are each 30-50K+
- This data should live in a database, CDN, or at minimum be loaded lazily

### 4. In-Memory Caching on Serverless
- `api/nfl-depth-update.js` caches scrape results in module-level variables
- On Vercel serverless, each cold start resets this cache
- Cold starts are frequent, making the cache nearly useless
- **Recommendation:** Use Vercel KV, a database, or CDN caching

### 5. Vercel Cron Misconfiguration
- `vercel.json` schedules crons to hit `/api/nfl-depth-update`
- Vercel crons send GET requests, but the scrape logic runs on POST
- **Impact:** Cron jobs read stale/empty cache instead of triggering fresh scrapes

### 6. No Tests, No Linting, No CI
- Zero test files anywhere in the repo
- No ESLint, Prettier, or any code quality tooling
- No GitHub Actions or CI pipeline
- **Recommendation:** At minimum, add ESLint + a basic smoke test

---

## Code Quality Observations

### Good Patterns
- **Hook composition:** `App.jsx` cleanly composes `useTennisBoard`, `useImagePaste`, and `useAskEngine`
- **Per-screen state isolation:** Fixes the input-sharing bug elegantly
- **`renderMessage` rewrite:** Eliminates `dangerouslySetInnerHTML` XSS risk
- **`normalizeTennisMatch()`:** Solid normalization with blocked-name filtering and dedup logic
- **CSS variables:** Clean design token system in `index.css`

### Needs Improvement
- **Prop drilling:** Every screen receives 10+ props. A React context for image/ask state would simplify significantly
- **Duplicated screen components:** `TennisScreen`, `NflScreen`, `PlayerScreen`, `NflPlayerScreen` are nearly identical — a generic `ChatScreen` with config would eliminate ~80% of the code
- **Array index as React key:** `ChatThread.jsx` uses `key={i}` — will cause incorrect reconciliation if messages are reordered
- **`NavIcon.jsx`:** Missing `"nfl"` icon type (falls back to hamburger), tennis icon is a clock
- **Side-effect in state setter:** `useTennisBoard.js` runs `fetchBoard()` inside `setContext(prev => { ... return prev })` — works but is a React anti-pattern
- **Mixed styling:** Some components use CSS classes, others use inline styles — inconsistent

---

## Recommendations (Priority Order)

1. **Fix the import crashes** in `odds.js` and `tennis-results.js` — these endpoints are completely broken
2. **Add basic auth** to `/api/ur-take` — your Anthropic API bill is unprotected
3. **Fix the duplicate GB key** in `nfl-defense.js`
4. **Standardize team abbreviations** across all NFL data files
5. **Consolidate tennis data** into a single source of truth
6. **Implement the AskScreen and ProScreen** or remove them from navigation
7. **Rename `src/lib/tennis.js`** to something that reflects it also contains NFL utilities
8. **Fix the Vercel cron** to use the correct HTTP method
9. **Add ESLint** and a basic CI pipeline
10. **Consider a database** for the large player data files

---

*Review generated from full repository analysis at commit `1c0ebe9`*
