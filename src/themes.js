export const DEFAULT_THEME = "epilogue";

export const THEMES = {
  epilogue: {
    id: "epilogue",
    name: "Authority",
    label: "Epilogue Dark",
    proOnly: false,
    appBg: "#070710",
    css: `
      .theme-epilogue,
      .theme-epilogue .app,
      .theme-epilogue .screen,
      .theme-epilogue .docked-bar,
      .theme-epilogue .bottom-nav {
        background: #070710;
        color: #F5F7FB;
        font-family: 'Epilogue', sans-serif;
      }

      .theme-epilogue .logo-under {
        display: none !important;
      }

      .theme-epilogue .wordmark {
        gap: 0;
      }

      .theme-epilogue .logo-review {
        font-family: 'Epilogue', sans-serif;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -1px;
        line-height: 1;
        display: block;
        background: linear-gradient(90deg, #ffffff 0%, #ffffff 32%, #00F5E9 55%, #FF2D6B 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .theme-epilogue .hdr {
        background: rgba(7, 7, 16, 0.96);
        border-bottom: 1px solid rgba(255,255,255,.08);
        backdrop-filter: blur(12px);
      }

      .theme-epilogue .theme-pro-badge {
        font-size: 11px !important;
        padding: 5px 11px !important;
        letter-spacing: 1.5px !important;
        font-weight: 700 !important;
        border-radius: 999px !important;
      }

      .theme-epilogue .hdr-tagline,
      .theme-epilogue .section-label,
      .theme-epilogue .matchup-league,
      .theme-epilogue .spotlight-sport,
      .theme-epilogue .docked-bar-label,
      .theme-epilogue .banner-sub,
      .theme-epilogue .logo-under,
      .theme-epilogue .ask-hint,
      .theme-epilogue .nav-btn {
        font-family: 'Geist Mono', monospace;
      }

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
        color: rgba(255,255,255,.92);
        font-size: 15px;
      }

      .theme-epilogue .ask-bar::placeholder {
        color: rgba(255,255,255,.28);
      }

      .theme-epilogue .send-btn {
        background: linear-gradient(135deg, #FF2D6B, #FF6B00);
        color: #fff;
        border-radius: 12px;
      }

      .theme-epilogue .send-btn:hover {
        opacity: .92;
      }

      .theme-epilogue .attach-btn {
        border-color: rgba(255,255,255,.10);
        background: rgba(255,255,255,.03);
      }

      .theme-epilogue .sport-pill,
      .theme-epilogue .sport-chip,
      .theme-epilogue .pos-tab,
      .theme-epilogue .quick-btn {
        font-family: 'Epilogue', sans-serif;
      }

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
        box-shadow: 0 0 0 1px rgba(255,255,255,.01) inset;
      }

      .theme-epilogue .spotlight-title,
      .theme-epilogue .matchup-title,
      .theme-epilogue .player-name,
      .theme-epilogue .nfl-player-name,
      .theme-epilogue .nba-player-name,
      .theme-epilogue .hero-title,
      .theme-epilogue .banner-title {
        font-family: 'Epilogue', sans-serif;
        font-weight: 800;
        letter-spacing: -.4px;
      }

      .theme-epilogue .spotlight-edge,
      .theme-epilogue .matchup-blurb,
      .theme-epilogue .matchup-meta,
      .theme-epilogue .hero-sub,
      .theme-epilogue .banner-note {
        color: rgba(255,255,255,.50);
      }

      .theme-epilogue .bubble.ai {
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.07);
        color: rgba(255,255,255,.90);
        font-family: 'Epilogue', sans-serif;
        line-height: 1.75;
      }

      .theme-epilogue .bubble.user {
        background: #1B2635;
        border: 1px solid rgba(255,255,255,.06);
        color: #F5F7FB;
        font-family: 'Epilogue', sans-serif;
      }

      .theme-epilogue .bottom-nav {
        border-top: 1px solid rgba(255,255,255,.08);
        background: rgba(7, 7, 16, 0.98);
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
      .theme-broadsheet,
      .theme-broadsheet .app,
      .theme-broadsheet .screen,
      .theme-broadsheet .docked-bar,
      .theme-broadsheet .bottom-nav {
        background: #EEE9DF;
        color: #1A1714;
        font-family: 'Epilogue', sans-serif;
      }

      .theme-broadsheet .logo-under {
        display: none !important;
      }

      .theme-broadsheet .logo-review {
        font-family: 'Epilogue', sans-serif;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -1px;
        line-height: 1;
        display: block;
        color: #15120E;
        background: none;
        -webkit-text-fill-color: #15120E;
      }

      .theme-broadsheet .hdr {
        background: rgba(238,233,223,.96);
        border-bottom: 2px solid rgba(26,23,20,.12);
        backdrop-filter: blur(10px);
      }

      .theme-broadsheet .theme-pro-badge {
        font-size: 11px !important;
        padding: 5px 11px !important;
        letter-spacing: 1.5px !important;
        font-weight: 700 !important;
        border-radius: 999px !important;
        color: #7A5200 !important;
        border-color: rgba(122,82,0,.28) !important;
        background: rgba(245,200,66,.14) !important;
      }

      .theme-broadsheet .hdr-tagline,
      .theme-broadsheet .section-label,
      .theme-broadsheet .matchup-league,
      .theme-broadsheet .spotlight-sport,
      .theme-broadsheet .docked-bar-label,
      .theme-broadsheet .banner-sub,
      .theme-broadsheet .ask-hint,
      .theme-broadsheet .nav-btn {
        font-family: 'Geist Mono', monospace;
      }

      .theme-broadsheet .ask-col {
        background: rgba(255,255,255,.65);
        border: 1px solid rgba(26,23,20,.12);
        border-radius: 16px;
      }

      .theme-broadsheet .ask-col:focus-within {
        border-color: rgba(170,34,0,.28);
        box-shadow: 0 0 0 1px rgba(170,34,0,.08);
      }

      .theme-broadsheet .ask-bar {
        font-family: 'Epilogue', sans-serif;
        color: #1A1714;
        font-size: 15px;
      }

      .theme-broadsheet .ask-bar::placeholder {
        color: rgba(26,23,20,.38);
      }

      .theme-broadsheet .send-btn {
        background: #15120E;
        color: #EEE9DF;
        border-radius: 12px;
      }

      .theme-broadsheet .send-btn:hover {
        background: #AA2200;
      }

      .theme-broadsheet .attach-btn {
        border-color: rgba(26,23,20,.12);
        background: rgba(255,255,255,.65);
        color: rgba(26,23,20,.55);
      }

      .theme-broadsheet .ask-card,
      .theme-broadsheet .spotlight-card,
      .theme-broadsheet .matchup-card,
      .theme-broadsheet .player-card,
      .theme-broadsheet .nfl-player-card,
      .theme-broadsheet .nba-game-card,
      .theme-broadsheet .mlb-game-card,
      .theme-broadsheet .golf-leaderboard-card,
      .theme-broadsheet .golf-odds-card,
      .theme-broadsheet .ticker-card,
      .theme-broadsheet .tour-banner,
      .theme-broadsheet .nfl-banner,
      .theme-broadsheet .f1-banner,
      .theme-broadsheet .nba-banner,
      .theme-broadsheet .mlb-banner,
      .theme-broadsheet .golf-banner,
      .theme-broadsheet .detail-card,
      .theme-broadsheet .pro-feature {
        background: rgba(255,255,255,.72);
        border: 1px solid rgba(26,23,20,.10);
      }

      .theme-broadsheet .spotlight-title,
      .theme-broadsheet .matchup-title,
      .theme-broadsheet .player-name,
      .theme-broadsheet .nfl-player-name,
      .theme-broadsheet .nba-player-name,
      .theme-broadsheet .hero-title,
      .theme-broadsheet .banner-title {
        color: #17130F;
        font-family: 'Epilogue', sans-serif;
        font-weight: 800;
        letter-spacing: -.35px;
      }

      .theme-broadsheet .spotlight-edge,
      .theme-broadsheet .matchup-blurb,
      .theme-broadsheet .matchup-meta,
      .theme-broadsheet .hero-sub,
      .theme-broadsheet .banner-note,
      .theme-broadsheet .hdr-tagline {
        color: rgba(26,23,20,.62);
      }

      .theme-broadsheet .bubble.ai {
        background: rgba(255,255,255,.72);
        border: 1px solid rgba(26,23,20,.10);
        color: #1A1714;
        font-family: 'Epilogue', sans-serif;
        line-height: 1.75;
      }

      .theme-broadsheet .bubble.user {
        background: #E3D7C9;
        border: 1px solid rgba(26,23,20,.10);
        color: #1A1714;
        font-family: 'Epilogue', sans-serif;
      }

      .theme-broadsheet .bottom-nav {
        border-top: 1px solid rgba(26,23,20,.12);
        background: rgba(238,233,223,.96);
      }

      .theme-broadsheet .nav-btn {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .5px;
        color: rgba(26,23,20,.42);
      }

      .theme-broadsheet .nav-btn.active {
        color: #15120E;
      }

      .theme-broadsheet .nav-btn.pro-active {
        color: #7A5200;
      }
    `,
  },
};
