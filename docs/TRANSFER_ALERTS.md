# Transfer alerts → iPhone

Bounce trusted football transfer wires (Ornstein / Romano / Di Marzio + Barça beat) to your phone.

## How it pops up on your lock screen

```
Our cron  →  POST ntfy.sh/<your-topic>  →  Apple Push (APNs)  →  ntfy app banner
```

1. Install **ntfy** ([App Store](https://apps.apple.com/app/ntfy/id1625396347)).
2. Subscribe to a private topic (long random string). Allow notifications when iOS asks.
3. Set `TRANSFER_ALERTS_NTFY_TOPIC` in Vercel to that exact topic → redeploy.
4. When a wire scores high enough, you get a normal iOS banner from **ntfy** — same as Messages/Slack style, not a custom Under Review app icon.

**iPhone settings that matter:** Settings → Notifications → ntfy → Lock Screen + Banners + Sounds on. For Focus modes, allow ntfy (or Time Sensitive) so Barça/Ornstein priority-5 alerts still break through.

### What the banner looks like

B/R-style: the **spoiler is the bold line**. No emoji stack, no `Breaking · ornstein`.

| Piece | Example | Controlled by |
|--------|---------|----------------|
| Title (bold) | `Chelsea Considering Emiliano Martinez` | `formatTransferSpoilerTitle` |
| Body | `Personal terms agreed (Ornstein)` | `formatTransferSpoilerBody` |
| Urgency | Priority 4–5 = louder / time-sensitive | Our `Priority` header |
| Tap | Opens the article URL | Our `Click` header |

Suggested topic: `ur-transfers-ae9b2f296c465b5fa2033c36`

### Customize the look

**On the phone (you):**
- iOS notification style / sound / Lock Screen for the **ntfy** app
- Per-topic mute in the ntfy app if a feed gets noisy
- Focus → allow Time Sensitive so priority 5 still alerts

**In code / env (us):**
- Spoiler title + body — `shared/transferAlerts/formatSpoiler.js`
- Priority rules (Barça + tier-1 → 5) — `shared/transferAlerts/scoreAlert.js`

Test a fake push after subscribe:
```bash
curl -H "Title: Chelsea Considering Emiliano Martinez" -H "Priority: 5" \
  -d "Following contact (Ornstein)" \
  ntfy.sh/ur-transfers-ae9b2f296c465b5fa2033c36
```

## Cron / channels

- Cron: `GET/POST /api/transfer-alerts` every 10m (`CRON_SECRET` bearer)
- Dry run: `?dryRun=1` (no push, still marks seen)
- Email backup via Resend (`TRANSFER_ALERTS_EMAIL=0` to disable)

## What gets through

Copy rules: lock-screen titles stay under ~46 characters; tweet hashtags (`#CFC`) become club names; `@handles` are stripped. Duplicate wires (X + Telegram + Google) collapse to the highest-scoring copy of the same player.

- **Native X text (preferred):** FxTwitter public timelines for Ornstein / Romano / Di Marzio (full tweet, including fees) plus Telegram mirrors
- **Tier-1 Google News fallback:** Ornstein, Romano, Di Marzio  
- **Strong wires:** Jacobs, Matt Law, Whitwell, Stone, Marcotti, etc.  
- **Barça-heavy:** Benge, Marsden, Jonathan Johnson, Sid Lowe, Westwood + Barcelona transfer language  
- Rumors OK with allowlisted bylines; anonymous gossip without club/reporter is dropped
