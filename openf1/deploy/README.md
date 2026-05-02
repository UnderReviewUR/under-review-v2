# Production edge (TLS)

The OpenF1 **query API** listens on **HTTP** port **8000** inside Docker (or uvicorn locally). On a public host you normally:

1. Run `docker compose up -d` from the `openf1/` directory (Mongo + MQTT + API + ingestors per upstream docs).
2. Put **Caddy** or **nginx** on the same machine (or load balancer) with HTTPS.
3. Set UnderReview **`OPENF1_BASE_URL`** to `https://<your-host>/v1` (must include the `/v1` suffix).

Examples in this folder:

| File | Purpose |
|------|---------|
| `Caddyfile` | Automatic HTTPS via Caddy |
| `nginx.conf.example` | TLS + reverse_proxy pattern for nginx |

Health check for probes: `GET https://<host>/health`
