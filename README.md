# under-review-v2

Single-page app (Vite + React) and Vercel serverless API for **Under Review** — sports-betting “UR TAKE” answers, gating, and Pro checkout.

## Local development

```bash
npm install
cp .env.example .env
# Fill in at least ANTHROPIC_API_KEY for /api/ur-take; other keys enable more sports.
```

- **Frontend only:** `npm run dev` (Vite, default port 5173; proxies `/api` to 3001 if the API is up).
- **Full stack:** `npm run dev:local` — Vite + `dev-api-server.mjs` (Express) serving `api/*.js` on `API_PORT` (default 3001).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run build` | Production client build into `dist/`. |
| `npm run lint` | ESLint (`src`, `api`, `scripts`). |
| `npm run format` | Prettier write for `src`, `api`, `scripts`. |
| `npm run format:check` | Prettier check only (CI-friendly). |

Internal maintenance (only if you edit inlined blocks again — normally **do not run** blindly):

1. Restore full `baseCss` + PGA/NFL blobs inside `src/App.jsx` from git history if needed.
2. Run `node scripts/extract-app-blocks.mjs`, then adjust `scripts/apply-app-imports.mjs` + `App.jsx` manually, or restore from git.

## CI

GitHub Actions runs `npm ci`, `npm run build`, and `npm run lint` on pushes and PRs to `main` (`.github/workflows/ci.yml`).

## Operations

### Tennis breaking news

Inject same-day withdrawals or scheduling shocks so UR TAKE does not recommend inactive players:

1. **Fast (no deploy):** set env var `TENNIS_BREAKING` in Vercel to a dated line, e.g. `2026-04-17 | Player WD Tournament — board repricing`.
2. **Repo default:** edit `TENNIS_BREAKING` in `api/tennis-context.js` (keep empty string when nothing is active).

Clear the line after the event so stale news does not affect unrelated tournaments.

### Access codes

Configure `OWNER_CODE`, `FRIEND_CODES`, and `ACCESS_TOKEN_SECRET` in Vercel — never rely on demo defaults in production (`api/access.js`, `api/pro-status.js`).

## Environment variables

See **`.env.example`** for the full list. Production requires at minimum:

- **UR TAKE:** `ANTHROPIC_API_KEY`
- **Access / Pro tokens:** `ACCESS_TOKEN_SECRET`
- **Stripe (if using Pro):** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and for webhooks `STRIPE_WEBHOOK_SECRET`
- **KV (recommended on Vercel for durable gate + takes):** `KV_REST_API_URL`, `KV_REST_API_TOKEN`

## What running this costs (rough framework)

Costs are **usage-shaped**, not one fixed number. Use this to estimate:

| Category | What drives cost |
|----------|-------------------|
| **Vercel** | Hobby tier has generous limits for small apps; Pro (~$20/seat/month) adds commercial terms and higher limits. Serverless invocations scale with traffic. |
| **Anthropic (UR TAKE)** | Almost always the **dominant variable cost**. Each question hits `/api/ur-take` → Claude. Approximate monthly AI spend ≈ *(questions per month)* × *(average tokens in + out per question)* × *(price per million tokens for your chosen model)*. Check [Anthropic pricing](https://www.anthropic.com/pricing) and your model (`ANTHROPIC_MODEL`). Example: if average ~3k input + ~800 output tokens per ask and list pricing is on the order of **single‑digit dollars per million tokens**, light personal use is typically **tens of dollars/month**; heavy traffic or longer prompts can reach **hundreds+**. Use the Anthropic dashboard for ground truth. |
| **Stripe** | No monthly fee from Stripe itself for standard Checkout; you pay **fees as a percent + fixed fee** on successful subscription charges (plus dispute fees if any). |
| **Vercel KV** | Included or metered depending on plan; typically small versus AI at moderate scale. |
| **Third‑party sport APIs** | Ball Dont Lie ATP (`BALLDONTLIE_API_KEY`), Odds (`ODDS_API_KEY`), ESPN (no key), etc. — Tennis board WTA spots use built-in datasets + tournament calendar. |

**Bottom line:** For a modest user base, **hosted app + KV + miscellaneous APIs** are usually **noise** compared to **LLM inference** unless you aggressively cache or trim prompts. Instrument Anthropic usage first; everything else second.

## Project layout (high level)

- `src/App.jsx` — main UI shell (still large; base CSS lives in `src/styles/appBaseCss.js`, NFL embed table in `src/features/app/embedGolfNflData.js`).
- `api/` — Vercel handlers (`ur-take.js`, `gate.js`, sport feeds, Stripe, etc.).
- `data/tennis/` — ATP/WTA datasets for API + prompts.
