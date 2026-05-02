# UnderReview deployment

This fork-friendly layout pairs the OpenF1 **query API** with the UnderReview app’s serverless backend: UnderReview’s `/api/f1` handler calls your deployment’s **`/v1/*`** endpoints (same contract as `api.openf1.org`).

## What UnderReview calls

Server-side only (no browser CORS to OpenF1). Base URL should end with **`/v1`** on UnderReview, e.g. `https://openf1.yourdomain.com/v1`.

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/meetings?year=2026` | Calendar |
| `GET /v1/sessions?session_key=latest` | Live session |
| `GET /v1/sessions?meeting_key=…` | Sessions per weekend |
| `GET /v1/drivers?session_key=latest` | Standings join |
| `GET /v1/starting_grid?session_key=…` | Qualifying grid |

Optional: `GET /health` — returns `{ "status": "ok", "auth_required": bool }` for probes.

## Auth (recommended on the public internet)

1. On **this** OpenF1 API container, set **`OPENF1_QUERY_API_KEY`** (or comma-separated **`OPENF1_QUERY_API_KEYS`**) to the **exact** `Authorization` header value you expect (e.g. `Bearer <random-long-token>`).

2. On **Vercel** (UnderReview), set **`OPENF1_BASE_URL`** to `https://<your-host>/v1` and **`OPENF1_AUTHORIZATION`** to that **same string** as step 1.

UnderReview forwards `Authorization` unchanged on every OpenF1 request.

If **`OPENF1_QUERY_API_KEY`** is unset, the API stays **open** (original behavior).

## Rate limits

The query API defaults to **`30/10seconds`** per IP (slowapi). UnderReview issues bursts of parallel requests from one egress IP — raise the limit if you see HTTP 429:

```bash
OPENF1_RATE_LIMIT=120/1minute
```

(Rate limit strings follow [slowapi](https://github.com/laurentS/slowapi) / limits format.)

## Docker Compose

Use the stock `docker-compose.yml`. Minimum for UnderReview is **MongoDB + API + ingestors** as upstream documents. Example API-only env additions:

```yaml
environment:
  MONGO_CONNECTION_STRING: mongodb://mongo:27017
  ROLE: api
  OPENF1_BASE_URL: http://api:8000/
  # Optional — lock to UnderReview Vercel
  # OPENF1_QUERY_API_KEY: Bearer <same-as-vercel-OPENF1_AUTHORIZATION>
  # OPENF1_RATE_LIMIT: 120/1minute
```

Put Mongo + ingest + MQTT behind your cloud VPC; terminate TLS at your reverse proxy and expose **`https://host/v1`**.

## Repo layout

In this monorepo the stack lives under **`openf1/`** (alongside the Node/Vite app). CI builds the Docker image when **`openf1/**`** changes (workflow **`openf1-docker.yml`**).

## TLS (Caddy / nginx)

Sample configs are in **`openf1/deploy/`** — see **`deploy/README.md`**.

## Data path

Live timing needs **MQTT ingest** + **Mongo**. Historical backfill uses **`ingest-historical`**. Scraped extras (schedule/session/grid) use **`ROLE=scrape-latest`** per `docker-entrypoint`. Without ingestion, `/v1/*` returns empty arrays — UnderReview then falls back where implemented.
