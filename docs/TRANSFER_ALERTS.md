# Transfer alerts → iPhone

Bounce trusted football transfer wires (Ornstein / Romano / Di Marzio + Barça beat) to your phone.

## Best delivery path: ntfy

Email is fine; **ntfy** is the “bounce and it hits the lock screen” path.

1. Install **ntfy** on your iPhone ([App Store](https://apps.apple.com/app/ntfy/id1625396347)).
2. Create a private topic name (long random string), e.g. `ur-barca-transfers-x7k9m2…`.
3. In the app: **Subscribe to topic** → paste that exact string → enable notifications.
4. In Vercel → Environment Variables (Production):
   - `TRANSFER_ALERTS_NTFY_TOPIC` = that topic
   - Optional: `TRANSFER_ALERTS_EMAIL_TO` (defaults to ops email)
   - `CRON_SECRET` already required for other crons
5. Redeploy (or wait for this branch to land). Cron hits `/api/transfer-alerts` every 10 minutes.

Optional dry run (no push, still marks seen):  
`curl -H "Authorization: Bearer $CRON_SECRET" "https://www.under-review.app/api/transfer-alerts?dryRun=1"`

## What gets through

- **Tier-1 bylines:** Ornstein, Fabrizio Romano, Di Marzio  
- **Strong wires:** Jacobs, Matt Law, Whitwell, Stone, Marcotti, etc.  
- **Barça-heavy:** Benge, Marsden, Jonathan Johnson, Sid Lowe, Westwood + Barcelona transfer language  
- Rumors OK when the byline is on the allowlist; anonymous gossip without club/reporter is dropped

## Channels

| Channel | Env | Notes |
|--------|-----|--------|
| ntfy push | `TRANSFER_ALERTS_NTFY_TOPIC` | Primary iPhone lock-screen path |
| Resend email | `RESEND_API_KEY` + `AUTH_EMAIL_FROM` | Same stack as Pro magic links; disable with `TRANSFER_ALERTS_EMAIL=0` |

Deduping uses KV (`transfer_alerts:seen_v1`, 7-day TTL) when configured.
