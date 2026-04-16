export const DEFAULT_THEME = "epilogue";

export const THEMES = {
  epilogue: {
    id: "epilogue",
    name: "Authority",
    label: "Epilogue Dark",
    proOnly: false,
    appBg: "#070710",
    css: `
      /* ─────────────────────────────────────────────
         EPILOGUE — AUTHORITY THEME
      ───────────────────────────────────────────── */

      css: `
  .app.theme-epilogue,
  .app.theme-epilogue .screen,
  .app.theme-epilogue .docked-bar,
  .app.theme-epilogue .bottom-nav {
        background: #070710;
        color: #F5F7FB;
        font-family: 'Epilogue', sans-serif;
      }

      /* ── Logo ── */
      .theme-epilogue .logo-under { display: none !important; }

      .theme-epilogue .wordmark { gap: 0; }

      .theme-epilogue .logo-review {
        font-family: 'Epilogue', sans-serif;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -1px;
        line-height: 1;
        background: linear-gradient(90deg, #ffffff 0%, #ffffff 30%, #00F5E9 55%, #FF2D6B 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      /* ── Header ── */
      .theme-epilogue .hdr {
        background: rgba(7,7,16,.96);
        border-bottom: 1px solid rgba(255,255,255,.08);
        backdrop-filter: blur(12px);
      }

      /* ── Typography system ── */
      .theme-epilogue .hdr-tagline,
      .theme-epilogue .section-label,
      .theme-epilogue .matchup-league,
      .theme-epilogue .spotlight-sport,
      .theme-epilogue .docked-bar-label,
      .theme-epilogue .banner-sub,
      .theme-epilogue .ask-hint,
      .theme-epilogue .nav-btn {
        font-family: 'Geist Mono', monospace;
      }

      /* ── Ask Bar ── */
      .theme-epilogue .ask-col {
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
      }

      .theme-epilogue .ask-col:focus-within {
        border-color: rgba(255,45,107,.35);
        box-shadow: 0 0 0 1px rgba(255,45,107,.15);
      }

      .theme-epilogue .ask-bar {
        font-family: 'Epilogue', sans-serif;
        font-size: 15px;
        color: rgba(255,255,255,.92);
      }

      .theme-epilogue .ask-bar::placeholder {
        color: rgba(255,255,255,.28);
      }

      .theme-epilogue .send-btn {
        background: linear-gradient(135deg, #FF2D6B, #FF6B00);
        border-radius: 12px;
        font-weight: 900;
      }

      .theme-epilogue .attach-btn {
        background: rgba(255,255,255,.03);
        border-color: rgba(255,255,255,.10);
      }

      /* ── Cards / surfaces ── */
      .theme-epilogue .ask-card,
      .theme-epilogue .spotlight-card,
      .theme-epilogue .matchup-card,
      .theme-epilogue .player-card,
      .theme-epilogue .nfl-player-card,
      .theme-epilogue .nba-game-card,
      .theme-epilogue .mlb-game-card,
      .theme-epilogue .golf-leaderboard-card,
      .theme-epilogue .golf-odds-card,
      .theme-epilogue .ticker-card,
      .theme-epilogue .tour-banner,
      .theme-epilogue .nfl-banner,
      .theme-epilogue .f1-banner,
      .theme-epilogue .nba-banner,
      .theme-epilogue .mlb-banner,
      .theme-epilogue .golf-banner,
      .theme-epilogue .detail-card,
      .theme-epilogue .pro-feature {
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.07);
      }

      /* ── Headline text ── */
      .theme-epilogue .spotlight-title,
      .theme-epilogue .matchup-title,
      .theme-epilogue .player-name,
      .theme-epilogue .nba-player-name,
      .theme-epilogue .nfl-player-name,
      .theme-epilogue .banner-title,
      .theme-epilogue .hero-title {
        font-family: 'Epilogue', sans-serif;
        font-weight: 800;
        letter-spacing: -.4px;
        color: rgba(255,255,255,.92);
      }

      /* ── Secondary text ── */
      .theme-epilogue .spotlight-edge,
      .theme-epilogue .matchup-blurb,
      .theme-epilogue .matchup-meta,
      .theme-epilogue .banner-note,
      .theme-epilogue .hero-sub {
        color: rgba(255,255,255,.50);
      }

      /* ── Chat ── */
      .theme-epilogue .bubble.ai {
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.07);
        color: rgba(255,255,255,.9);
        line-height: 1.75;
      }

      .theme-epilogue .bubble.user {
        background: #1B2635;
        border: 1px solid rgba(255,255,255,.06);
      }

      /* ── Nav ── */
      .theme-epilogue .bottom-nav {
        border-top: 1px solid rgba(255,255,255,.08);
        background: rgba(7,7,16,.98);
        backdrop-filter: blur(12px);
      }

      .theme-epilogue .nav-btn {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: .5px;
        color: rgba(255,255,255,.38);
      }

      .theme-epilogue .nav-btn.active {
        color: #FF2D6B;
      }

      .theme-epilogue .nav-btn.pro-active {
        color: #F5C842;
      }
    `,
  },

  broadsheet: {
    id: "broadsheet",
    name: "Broadsheet Light",
    label: "Home E — Broadsheet Light",
    proOnly: true,
    appBg: "#EEE9DF",
    css: `
      /* (your existing broadsheet code unchanged) */
    `,
  },
};
