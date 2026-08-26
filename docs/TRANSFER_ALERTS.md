# Transfer alerts → iPhone

Bounce trusted football transfer wires (Ornstein / Romano / Di Marzio + Barça beat) to the **Under Review** home-screen app.

## How it pops up on your lock screen

```
Our cron  →  Web Push  →  Apple  →  Under Review banner (your icon)
```

Only **you** can subscribe. The public app never asks for notification permission. Friend/Pro codes cannot save a push endpoint.

1. Add Under Review to the home screen (you already have this).
2. Open it from the icon (not Safari).
3. Pro tab → owner banner → **Transfer alerts**, or go to `/transfers`.
4. Tap Enable → Allow. iOS only shows that prompt inside the home-screen app.

Server: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` in Vercel. Subscriptions live in KV (`transfer_alerts:webpush_v1`).

**iPhone settings:** Settings → Notifications → Under Review → Lock Screen + Banners + Sounds. Focus: allow Time Sensitive if you want priority-5 through.

### What the banner looks like

B/R-style: the **spoiler is the bold line**.

| Piece | Example | Controlled by |
|--------|---------|----------------|
| Title (bold) | `Chelsea Considering Emiliano Martinez` | `formatTransferSpoilerTitle` |
| Body | `Personal terms agreed (Ornstein)` | `formatTransferSpoilerBody` |
| Tap | Opens the article URL | payload `url` |

ntfy is off unless `TRANSFER_ALERTS_NTFY=1`. Email is off unless `TRANSFER_ALERTS_EMAIL=1`.

## Cron / channels

- Cron: `GET/POST /api/transfer-alerts` every 10m (`CRON_SECRET` bearer)
- Dry run: `?dryRun=1` (no push, still marks seen)
- Owner subscribe API: `/api/transfer-alerts-push` (owner token or owner code only)
- Ranking keeps two Barça wires in the send list so Premier League deadline noise cannot bury them

## What gets through

Copy rules: lock-screen titles stay under ~46 characters; tweet hashtags (`#CFC`) become club names; `@handles` are stripped. Duplicate wires (X + Telegram + Google) collapse to the highest-scoring copy of the same player.

- **Native X text (preferred):** FxTwitter public timelines for Ornstein / Romano / Di Marzio (full tweet, including fees) plus Telegram mirrors
- **Tier-1 Google News fallback:** Ornstein, Romano, Di Marzio  
- **Strong wires:** Jacobs, Matt Law, Whitwell, Stone, Marcotti, etc.  
- **Barça-heavy:** Benge, Marsden, Jonathan Johnson, Sid Lowe, Westwood + Barcelona transfer language  
- Rumors OK with allowlisted bylines; anonymous gossip without club/reporter is dropped
