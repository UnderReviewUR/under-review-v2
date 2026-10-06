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

iOS home-screen Web Push always draws a title row. We send a zero-width title so that row is a thin empty bar; Apple still prefixes the body with **from Under Review**. The news is one complete sentence in the body.

| Piece | Example | Controlled by |
|--------|---------|----------------|
| Title (bold) | hidden (zero-width space) | payload `\u200B` so iOS does not reprint the app name |
| Body | `Omar Marmoush: Tottenham loan from Man City; obligation to buy £50m (Ornstein)` | `formatTransferLockScreenLine` |
| Tap | Opens the article URL | payload `url` |

ntfy is off unless `TRANSFER_ALERTS_NTFY=1`. Email is off unless `TRANSFER_ALERTS_EMAIL=1`.

## Cron / channels

- Cron: `GET/POST /api/transfer-alerts` every 10m (`CRON_SECRET` bearer)
- Dry run: `?dryRun=1` (no push, still marks seen)
- Owner subscribe API: `/api/transfer-alerts-push` (owner token or owner code only)
- Ranking keeps two La Liga / Barça wires in the send list so Premier League deadline noise cannot bury them
- Serie A, Bundesliga, Ligue 1, and UCL-club transfers can get through as top wires; they are not reserved
- Same player does not ping twice unless the club, fee, or Here We Go / signed status actually changed

## What gets through

Copy rules: one complete sentence in the body (no 46-character headline clip); tweet hashtags (`#CFC`) become club names; `@handles` are stripped. Duplicate wires (X + Telegram + Google) collapse to the highest-scoring copy of the same player.

- **Native X text (preferred):** FxTwitter public timelines for Ornstein / Romano / Di Marzio (full tweet, including fees) plus Telegram mirrors
- **Tier-1 Google News fallback:** Ornstein, Romano, Di Marzio  
- **Strong wires:** Jacobs, Matt Law, Whitwell, Stone, Marcotti, etc.  
- **Barça-heavy (high-signal only):** Benge, Marsden, Jonathan Johnson, Sid Lowe, Westwood / Ballús + strong transfer language  
- Rumors OK with allowlisted bylines; anonymous gossip without club/reporter is dropped

### Barça high-signal filter (anti-inundation)

Reserved Barça slots and the send list only keep items that pass `passesBarcaHighSignalGate`:

| Keep | Drop |
|------|------|
| Tier-1/2 byline (Ornstein, Romano, Benge, Marsden, …) | Soft “linked with / interested in / eyeing” without a trusted byline |
| Strong transfer verbs + high score from a legit outlet rewrite | Barcelona B / Juvenil / Femeni / academy |
| Tier-3 Spanish beat **only** with strong transfer language + score ≥ 8 | Match previews / line-ups / live scores |
| | Aggregate Google pings that fail the gate (`low_signal_barca`) |

Barça without a byline now needs score ≥ 9.5 (was 7.5). Soft-only Barça without a reporter is dropped before ranking.

Owner phone setup: Enable push → pick teams + interests on `/transfers`. See Project doc `docs/owner-breaking-alerts.md`. Auto transfer bounce is gated by those prefs (team match + transfers/rumors interest).
