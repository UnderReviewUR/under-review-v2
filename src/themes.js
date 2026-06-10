export const DEFAULT_THEME = "epilogue";

/** Light themes: paid Pro or owner-tier access codes (not friend / free). */
export function canUseProThemes(tier) {
  return tier === "pro" || tier === "owner";
}

export function getStoredAccessTier() {
  if (typeof window === "undefined") return "free";
  try {
    const token = localStorage.getItem("ur_access_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[0]));
      if (!payload.expiresAt || new Date() < new Date(payload.expiresAt)) {
        return payload.tier || "free";
      }
    }
  } catch {
    /* ignore invalid stored token */
  }
  return "free";
}

export function validateThemeForTier(themeId, tier) {
  const meta = THEMES[themeId];
  if (!meta) return DEFAULT_THEME;
  if (meta.proOnly && !canUseProThemes(tier)) return DEFAULT_THEME;
  return themeId;
}

export function resolveInitialTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem("ur_theme") || DEFAULT_THEME;
  return validateThemeForTier(stored, getStoredAccessTier());
}

export function isProLightTheme(id) {
  return id === "broadsheet" || id === "crisp";
}

/** Pro tab marketing surfaces (inline styles assume dark; light themes need ink + paper). */
export function getProMarketingTokens(themeId) {
  if (themeId === "broadsheet") {
    return {
      perfPanel: {
        margin: "12px 16px 0",
        background: "#F7F4EE",
        border: "1px solid #d8d0c4",
        borderRadius: 14,
        padding: "14px 14px 12px",
      },
      ownerBanner: {
        background: "linear-gradient(135deg,rgba(13,148,136,.14),rgba(202,138,4,.08))",
        border: "1px solid rgba(13,148,136,.4)",
        borderRadius: 14,
        padding: "14px 20px",
        margin: "12px 16px 0",
        display: "flex",
        alignItems: "center",
        gap: 12,
      },
      ownerTitle: "#0f766e",
      ownerSub: "#4a3e2e",
      successBanner: {
        wrap: {
          background: "linear-gradient(135deg,rgba(5,150,105,.16),rgba(16,185,129,.09))",
          border: "1px solid rgba(5,150,105,.45)",
          borderRadius: 14,
          padding: "16px 20px",
          margin: "12px 16px 0",
          textAlign: "center",
        },
        title: "#047857",
        sub: "#4a3e2e",
      },
      subscriptionCard: {
        margin: "12px 16px 0",
        padding: "12px 14px 14px",
        background: "#FFFCF7",
        border: "1px solid #d8d0c4",
        borderRadius: 14,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      },
      subLabel: "#5c5046",
      subBody: "#4a3e2e",
      priceAside: "#5c5046",
      priceAsideMuted: "#6b6054",
      trialLine: "rgba(15,118,110,.85)",
      checkoutFoot: "rgba(26,20,16,.5)",
      valueGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 8,
        margin: "20px 20px 0",
        border: "1px solid #c9bfb2",
        borderRadius: 14,
        overflow: "hidden",
      },
      valueCell: {
        padding: "12px 8px",
        textAlign: "center",
        background: "#FFF9F2",
        borderLeft: "1px solid rgba(26,20,16,.1)",
        wordBreak: "break-word",
        hyphens: "auto",
      },
      valueLabel: "#5c5046",
      whatsInc: "#5c5046",
      whatsIncRule: "rgba(26,20,16,.15)",
      featureRow: (i, len) => ({
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 14px",
        background: "#FFFCF7",
        borderRadius: i === 0 ? "12px 12px 0 0" : i === len - 1 ? "0 0 12px 12px" : 0,
        borderTop: i > 0 ? "1px solid rgba(26,20,16,.1)" : "none",
      }),
      featureTitle: "#1A1410",
      featureDesc: "#4a3e2e",
      featureChev: "#5c5046",
      quoteBox: {
        margin: "16px 20px 0",
        padding: "16px 20px",
        borderLeft: "3px solid #be123c",
        background: "rgba(190,18,60,.07)",
        borderRadius: "0 12px 12px 0",
      },
      quoteText: "#3d3428",
      quoteAttrib: "#5c5046",
      bottomMuted: "#5c5046",
      stripeFoot: "#5c5046",
    };
  }
  if (themeId === "crisp") {
    return {
      perfPanel: {
        margin: "12px 16px 0",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "14px 14px 12px",
      },
      ownerBanner: {
        background: "linear-gradient(135deg,rgba(56,189,248,.15),rgba(14,165,233,.08))",
        border: "1px solid rgba(56,189,248,.45)",
        borderRadius: 14,
        padding: "14px 20px",
        margin: "12px 16px 0",
        display: "flex",
        alignItems: "center",
        gap: 12,
      },
      ownerTitle: "#0369a1",
      ownerSub: "#475569",
      successBanner: {
        wrap: {
          background: "linear-gradient(135deg,rgba(5,150,105,.14),rgba(16,185,129,.08))",
          border: "1px solid rgba(16,185,129,.4)",
          borderRadius: 14,
          padding: "16px 20px",
          margin: "12px 16px 0",
          textAlign: "center",
        },
        title: "#047857",
        sub: "#475569",
      },
      subscriptionCard: {
        margin: "12px 16px 0",
        padding: "12px 14px 14px",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      },
      subLabel: "#64748B",
      subBody: "#475569",
      priceAside: "#64748B",
      priceAsideMuted: "#64748B",
      trialLine: "rgba(3,105,161,.9)",
      checkoutFoot: "rgba(15,23,42,.45)",
      valueGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 8,
        margin: "20px 20px 0",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        overflow: "hidden",
      },
      valueCell: {
        padding: "12px 8px",
        textAlign: "center",
        background: "#F8FAFC",
        borderLeft: "1px solid #E2E8F0",
        wordBreak: "break-word",
        hyphens: "auto",
      },
      valueLabel: "#64748B",
      whatsInc: "#64748B",
      whatsIncRule: "#CBD5E1",
      featureRow: (i, len) => ({
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 14px",
        background: "#FFFFFF",
        borderRadius: i === 0 ? "12px 12px 0 0" : i === len - 1 ? "0 0 12px 12px" : 0,
        borderTop: i > 0 ? "1px solid #E2E8F0" : "none",
      }),
      featureTitle: "#0F172A",
      featureDesc: "#475569",
      featureChev: "#64748B",
      quoteBox: {
        margin: "16px 20px 0",
        padding: "16px 20px",
        borderLeft: "3px solid #e11d48",
        background: "rgba(225,29,72,.06)",
        borderRadius: "0 12px 12px 0",
      },
      quoteText: "#334155",
      quoteAttrib: "#64748B",
      bottomMuted: "#64748B",
      stripeFoot: "#64748B",
    };
  }
  return {
    perfPanel: {
      margin: "12px 16px 0",
      background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 14,
      padding: "14px 14px 12px",
    },
    ownerBanner: {
      background: "linear-gradient(135deg,rgba(0,245,233,.08),rgba(0,245,233,.04))",
      border: "1px solid rgba(0,245,233,.2)",
      borderRadius: 14,
      padding: "14px 20px",
      margin: "12px 16px 0",
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    ownerTitle: undefined,
    ownerSub: undefined,
    successBanner: null,
    subscriptionCard: {
      margin: "12px 16px 0",
      padding: "12px 14px 14px",
      background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 14,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    subLabel: undefined,
    subBody: undefined,
    priceAside: undefined,
    priceAsideMuted: undefined,
    trialLine: undefined,
    checkoutFoot: "rgba(255,255,255,.15)",
    valueGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 8,
      margin: "20px 20px 0",
      border: "1px solid rgba(255,255,255,.06)",
      borderRadius: 14,
      overflow: "hidden",
    },
    valueCell: {
      padding: "12px 8px",
      textAlign: "center",
      background: "rgba(255,255,255,.02)",
      borderLeft: "1px solid rgba(255,255,255,.06)",
      wordBreak: "break-word",
      hyphens: "auto",
    },
    valueLabel: "rgba(255,255,255,.62)",
    whatsInc: "rgba(255,255,255,.78)",
    whatsIncRule: "rgba(255,255,255,.14)",
    featureRow: (i, len) => ({
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "13px 14px",
      background: "rgba(255,255,255,.025)",
      borderRadius: i === 0 ? "12px 12px 0 0" : i === len - 1 ? "0 0 12px 12px" : 0,
      borderTop: i > 0 ? "1px solid rgba(255,255,255,.04)" : "none",
    }),
    featureTitle: undefined,
    featureDesc: "rgba(255,255,255,.68)",
    featureChev: "rgba(255,255,255,.55)",
    quoteBox: {
      margin: "16px 20px 0",
      padding: "16px 20px",
      borderLeft: "3px solid var(--magenta)",
      background: "rgba(255,45,107,.04)",
      borderRadius: "0 12px 12px 0",
    },
    quoteText: "rgba(255,255,255,.78)",
    quoteAttrib: "rgba(255,255,255,.58)",
    bottomMuted: undefined,
    stripeFoot: "rgba(255,255,255,.52)",
  };
}

/** Pro page “Display mode” picker chrome (dark vs two light variants). */
export function getDisplayModeChrome(activeTheme) {
  if (activeTheme === "broadsheet") {
    return {
      sectionLabel: "#5c5046",
      activeBg: "rgba(26,20,16,.12)",
      inactiveBg: "#fff",
      activeBorder: "#6b5e52",
      inactiveBorder: "rgba(216,206,192,1)",
      rowText: "#1A1410",
      titleActive: "#1A1410",
      titleInactive: "rgba(26,20,16,.55)",
      subtitle: "#6b6054",
      dot: "#1A1410",
    };
  }
  if (activeTheme === "crisp") {
    return {
      sectionLabel: "#475569",
      activeBg: "#e0f2fe",
      inactiveBg: "#fff",
      activeBorder: "#0284c7",
      inactiveBorder: "#E2E8F0",
      rowText: "#0F172A",
      titleActive: "#0F172A",
      titleInactive: "rgba(15,23,42,.55)",
      subtitle: "#475569",
      dot: "#0284c7",
    };
  }
  return {
    sectionLabel: "rgba(255,255,255,.3)",
    activeBg: "rgba(0,245,233,.06)",
    inactiveBg: "rgba(255,255,255,.03)",
    activeBorder: "rgba(0,245,233,.3)",
    inactiveBorder: "rgba(255,255,255,.08)",
    rowText: "#fff",
    titleActive: "#fff",
    titleInactive: "rgba(255,255,255,.65)",
    subtitle: "rgba(255,255,255,.35)",
    dot: "#00F5E9",
  };
}

export const THEMES = {
  epilogue: {
    id: "epilogue",
    name: "Authority",
    label: "Epilogue Dark — default",
    proOnly: false,
    appBg: "#070710",
    css: `
      /* ─────────────────────────────────────────────
         EPILOGUE — AUTHORITY THEME
      ───────────────────────────────────────────── */

      .app.theme-epilogue,
      .app.theme-epilogue .screen,
      .app.theme-epilogue .docked-bar,
      .app.theme-epilogue .bottom-nav {
        background: #070710;
        color: #F5F7FB;
        font-family: 'Epilogue', sans-serif;
      }

      .theme-epilogue .logo-review {
        font-family: 'Epilogue', sans-serif;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -1px;
        line-height: 1;
        background: linear-gradient(90deg, #ffffff 0%, #ffffff 30%, #00F5E9 55%, #FF2D6B 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .theme-epilogue .hdr {
        background: rgba(7,7,16,.96);
        border-bottom: 1px solid rgba(255,255,255,.08);
        backdrop-filter: blur(12px);
      }

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
        font-size: 16px;
        color: rgba(255,255,255,.92);
      }

      .theme-epilogue .ask-bar::placeholder {
        color: rgba(255,255,255,.78);
        opacity: 1;
      }

      .theme-epilogue .send-btn {
        background: linear-gradient(135deg, #FF2D6B, #FF6B00);
        border-radius: 12px;
        font-weight: 900;
        color: #fff;
      }

      .theme-epilogue .attach-btn {
        background: rgba(255,255,255,.03);
        border-color: rgba(255,255,255,.10);
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
      }

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

      .theme-epilogue .spotlight-edge,
      .theme-epilogue .matchup-blurb,
      .theme-epilogue .matchup-meta,
      .theme-epilogue .banner-note,
      .theme-epilogue .hero-sub {
        color: rgba(255,255,255,.50);
      }

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

      .theme-epilogue .bottom-nav {
        border-top: 1px solid rgba(255,255,255,.08);
        background: rgba(7,7,16,.98);
        backdrop-filter: blur(12px);
      }

      .theme-epilogue .nav-btn {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: rgba(255,255,255,.4);
      }

      .theme-epilogue .nav-btn.active {
        color: #FF2D6B;
      }

      .theme-epilogue .nav-btn.tennis-active {
        color: #f5c842;
      }
      .theme-epilogue .nav-btn.nfl-active {
        color: #4a90d9;
      }
      .theme-epilogue .nav-btn.f1-active {
        color: #e10600;
      }
      .theme-epilogue .nav-btn.nba-active {
        color: #ff6b00;
      }
      .theme-epilogue .nav-btn.mlb-active {
        color: #1db954;
      }
      .theme-epilogue .nav-btn.golf-active {
        color: #ffffff;
      }

      .theme-epilogue .nav-btn.pro-active {
        color: #F5C842;
      }
    `,
  },

  broadsheet: {
    id: "broadsheet",
    name: "Broadsheet Edition",
    label: "Broadsheet — newspaper light",
    proOnly: true,
    appBg: "#E0D8CC",
    css: `
      /* BROADSHEET LIGHT (Pro) — cream paper + ink masthead */

      .app.theme-broadsheet,
      .app.theme-broadsheet .screen {
        background: #E0D8CC;
        color: #1A1410;
        font-family: 'DM Sans', sans-serif;
      }

      /* Readable ink on paper — overrides global :root vars meant for dark UI */
      .app.theme-broadsheet {
        --text: #1A1410;
        --muted: #5c5046;
        --soft: #4a3e2e;
        --cyan-bright: #0f766e;
        --cyan: #0d9488;
        --surface: #F7F4EE;
        --surface-2: #FAF6EF;
        --border: #d8d0c4;
        --border-2: #c9bfb2;
        --bg: #E0D8CC;
      }

      .theme-broadsheet .pro-cta-btn {
        border: none !important;
        color: #ffffff !important;
        background: #080A0C !important;
      }
      .theme-broadsheet .pro-cta-btn:hover {
        background: #080A0C !important;
        border: none !important;
        color: #ffffff !important;
      }

      .app.theme-broadsheet .docked-bar {
        background: transparent;
        border: none;
        box-shadow: none;
        backdrop-filter: none;
      }
      .app.theme-broadsheet .docked-interaction-zone {
        background: #080808;
        border-top: none;
        backdrop-filter: none;
        box-shadow: none;
      }
      .theme-broadsheet .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar-docked-inner,
      .theme-broadsheet .docked-bar .ask-wrap--docked-gradient .ask-bar-docked-inner {
        background: #FFFFFF;
      }
      .theme-broadsheet .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill::placeholder,
      .theme-broadsheet .docked-bar .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill::placeholder {
        color: #8a7a6a;
        opacity: 1;
      }
      .theme-broadsheet .docked-interaction-zone .ur-docked-paste-hint,
      .theme-broadsheet .docked-bar .ur-docked-paste-hint {
        color: #9a8b7a;
      }

      .app.theme-broadsheet .bottom-nav {
        background: #0F0D0A;
        border-top: 2px solid #C9A84C;
        backdrop-filter: none;
      }

      .theme-broadsheet .logo-review {
        font-family: 'Playfair Display', serif;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: .5px;
        line-height: 1;
        color: #1a1a1a;
        -webkit-text-fill-color: #1a1a1a;
      }

      .theme-broadsheet .hdr {
        background: #0F0D0A;
        border-bottom: 1px solid #C9A84C;
        backdrop-filter: none;
      }

      .theme-broadsheet .hdr-tagline {
        color: #C9A84C;
      }

      .theme-broadsheet .pill-tag,
      .theme-broadsheet .pill-live,
      .theme-broadsheet .pill-nfl,
      .theme-broadsheet .pill-f1,
      .theme-broadsheet .pill-nba,
      .theme-broadsheet .pill-tennis,
      .theme-broadsheet .pill-mlb {
        font-family: 'DM Mono', monospace;
      }

      .theme-broadsheet .section-label,
      .theme-broadsheet .matchup-league,
      .theme-broadsheet .spotlight-sport,
      .theme-broadsheet .docked-bar-label,
      .theme-broadsheet .banner-sub,
      .theme-broadsheet .ask-hint,
      .theme-broadsheet .nav-btn,
      .theme-broadsheet .ticker-status,
      .theme-broadsheet .home-live-label {
        font-family: 'DM Mono', monospace;
        color: #6b6054;
      }

      .theme-broadsheet .home-live-label {
        color: rgba(26,20,16,.35);
      }

      .theme-broadsheet .ask-col {
        background: #FFFFFF;
        border: 1.5px solid #0F0D0A;
        border-radius: 0;
      }

      .theme-broadsheet .ask-col:focus-within {
        border-color: #C9A84C;
        box-shadow: none;
      }

      .theme-broadsheet .ask-bar {
        font-family: 'Playfair Display', serif;
        font-size: 16px;
        font-style: italic;
        color: #1A1410;
      }

      .theme-broadsheet .ask-bar::placeholder {
        color: #8a7a6a;
        opacity: 1;
      }

      .theme-broadsheet .send-btn {
        background: #0F0D0A;
        color: #F7F4EE;
        border-radius: 0;
        font-family: 'DM Mono', monospace;
        font-size: 9px;
        letter-spacing: 2px;
        font-weight: 500;
      }

      .theme-broadsheet .attach-btn {
        background: #F7F4EE;
        border-color: #0F0D0A;
        color: #1A1410;
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
      .theme-broadsheet .pro-feature,
      .theme-broadsheet .q-card {
        background: #F7F4EE;
        border: 1px solid #d8d0c4;
      }

      .theme-broadsheet .ask-card-text,
      .theme-broadsheet .spotlight-edge,
      .theme-broadsheet .matchup-blurb,
      .theme-broadsheet .q-text {
        color: #4a3e2e;
      }

      .theme-broadsheet .spotlight-title,
      .theme-broadsheet .matchup-title,
      .theme-broadsheet .player-name,
      .theme-broadsheet .nba-player-name,
      .theme-broadsheet .nfl-player-name,
      .theme-broadsheet .banner-title,
      .theme-broadsheet .hero-title {
        font-family: 'Playfair Display', serif;
        font-weight: 900;
        color: #0F0D0A;
      }

      .theme-broadsheet .hero-sub {
        color: #4a3e2e;
      }

      .theme-broadsheet .ticker-teams {
        color: #0F0D0A;
      }

      .theme-broadsheet .bubble.ai {
        background: #FFFFFF;
        border: 1px solid #d8d0c4;
        color: #1A1410;
      }

      .theme-broadsheet .bubble.user {
        background: #0F0D0A;
        border: 1px solid #0F0D0A;
        color: #F7F4EE;
      }

      .theme-broadsheet .nav-btn {
        color: rgba(107, 96, 84, 0.55);
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }

      .theme-broadsheet .nav-btn.active {
        color: #C9A84C;
      }

      .theme-broadsheet .nav-btn.tennis-active {
        color: #e8d5a8;
      }
      .theme-broadsheet .nav-btn.nfl-active {
        color: #9ec5e8;
      }
      .theme-broadsheet .nav-btn.f1-active {
        color: #f0a8a0;
      }
      .theme-broadsheet .nav-btn.nba-active {
        color: #ffc090;
      }
      .theme-broadsheet .nav-btn.mlb-active {
        color: #8fdfb0;
      }
      .theme-broadsheet .nav-btn.golf-active {
        color: #f7f4ee;
      }

      .theme-broadsheet .nav-btn.pro-active {
        color: #C9A84C;
      }

      .theme-broadsheet .sport-pill {
        font-family: 'Playfair Display', serif;
      }
    `,
  },

  crisp: {
    id: "crisp",
    name: "Crisp Sport",
    label: "Crisp Sport — slate light",
    proOnly: true,
    appBg: "#CBD5E1",
    css: `
      /* CRISP SPORT LIGHT (Pro) — slate / sky accent */

      .app.theme-crisp,
      .app.theme-crisp .screen {
        background: #CBD5E1;
        color: #0F172A;
        font-family: 'Barlow', sans-serif;
      }

      .app.theme-crisp {
        --text: #0F172A;
        --muted: #64748B;
        --soft: #475569;
        --cyan-bright: #0284c7;
        --cyan: #0369a1;
        --surface: #FFFFFF;
        --surface-2: #F1F5F9;
        --border: #E2E8F0;
        --border-2: #CBD5E1;
        --bg: #CBD5E1;
      }

      .theme-crisp .pro-cta-btn {
        border: 2px solid #0F172A !important;
        color: #FFFFFF !important;
        background: #0F172A !important;
      }
      .theme-crisp .pro-cta-btn:hover {
        background: #1e293b !important;
        border-color: #1e293b !important;
        color: #FFFFFF !important;
      }

      .app.theme-crisp .docked-bar {
        background: transparent;
        border: none;
        box-shadow: none;
        backdrop-filter: none;
      }
      .app.theme-crisp .docked-interaction-zone {
        background: #080808;
        border-top: none;
        backdrop-filter: none;
        box-shadow: none;
      }
      .theme-crisp .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar-docked-inner,
      .theme-crisp .docked-bar .ask-wrap--docked-gradient .ask-bar-docked-inner {
        background: #FFFFFF;
      }
      .theme-crisp .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill::placeholder,
      .theme-crisp .docked-bar .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill::placeholder {
        color: #64748B;
        opacity: 1;
      }
      .theme-crisp .docked-interaction-zone .ur-docked-paste-hint,
      .theme-crisp .docked-bar .ur-docked-paste-hint {
        color: #94a3b8;
      }

      .app.theme-crisp .bottom-nav {
        background: #0F172A;
        border-top: 1px solid rgba(56,189,248,.25);
        backdrop-filter: none;
      }

      .theme-crisp .logo-review {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 2px;
        line-height: 1;
        background: linear-gradient(90deg, #FFFFFF 20%, #38BDF8 85%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .theme-crisp .hdr {
        background: #0F172A;
        border-bottom: 1px solid rgba(56,189,248,.2);
        backdrop-filter: none;
      }

      .theme-crisp .hdr-tagline {
        color: rgba(248,250,252,.85);
      }

      .theme-crisp .pill-tag,
      .theme-crisp .pill-live,
      .theme-crisp .pill-nfl,
      .theme-crisp .pill-f1,
      .theme-crisp .pill-nba,
      .theme-crisp .pill-tennis,
      .theme-crisp .pill-mlb {
        font-family: 'DM Mono', monospace;
      }

      .theme-crisp .section-label,
      .theme-crisp .matchup-league,
      .theme-crisp .spotlight-sport,
      .theme-crisp .docked-bar-label,
      .theme-crisp .banner-sub,
      .theme-crisp .ask-hint,
      .theme-crisp .nav-btn,
      .theme-crisp .ticker-status,
      .theme-crisp .home-live-label {
        font-family: 'DM Mono', monospace;
        color: #64748B;
      }

      .theme-crisp .home-live-label {
        color: #94A3B8;
      }

      .theme-crisp .ask-col {
        background: #F8FAFC;
        border: 1.5px solid #0F172A;
        border-radius: 8px;
      }

      .theme-crisp .ask-col:focus-within {
        border-color: #38BDF8;
        box-shadow: 0 0 0 1px rgba(56,189,248,.2);
      }

      .theme-crisp .ask-bar {
        font-family: 'Barlow', sans-serif;
        font-size: 16px;
        color: #0F172A;
      }

      .theme-crisp .ask-bar::placeholder {
        color: #94A3B8;
        opacity: 1;
      }

      .theme-crisp .send-btn {
        background: #0F172A;
        color: #FFFFFF;
        border-radius: 8px;
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 2px;
      }

      .theme-crisp .attach-btn {
        background: #FFFFFF;
        border-color: #E2E8F0;
        color: #64748B;
      }

      .theme-crisp .attach-btn:hover {
        border-color: #38BDF8;
        color: #38BDF8;
      }

      .theme-crisp .ask-card,
      .theme-crisp .spotlight-card,
      .theme-crisp .matchup-card,
      .theme-crisp .player-card,
      .theme-crisp .nfl-player-card,
      .theme-crisp .nba-game-card,
      .theme-crisp .mlb-game-card,
      .theme-crisp .golf-leaderboard-card,
      .theme-crisp .golf-odds-card,
      .theme-crisp .ticker-card,
      .theme-crisp .tour-banner,
      .theme-crisp .nfl-banner,
      .theme-crisp .f1-banner,
      .theme-crisp .nba-banner,
      .theme-crisp .mlb-banner,
      .theme-crisp .golf-banner,
      .theme-crisp .detail-card,
      .theme-crisp .pro-feature,
      .theme-crisp .q-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
      }

      .theme-crisp .ask-card-text,
      .theme-crisp .spotlight-edge,
      .theme-crisp .matchup-blurb,
      .theme-crisp .q-text {
        color: #475569;
      }

      .theme-crisp .spotlight-title,
      .theme-crisp .matchup-title,
      .theme-crisp .player-name,
      .theme-crisp .nba-player-name,
      .theme-crisp .nfl-player-name,
      .theme-crisp .banner-title,
      .theme-crisp .hero-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        letter-spacing: .5px;
        color: #0F172A;
      }

      .theme-crisp .hero-sub {
        color: #64748B;
      }

      .theme-crisp .ticker-teams {
        color: #0F172A;
      }

      .theme-crisp .bubble.ai {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        color: #0F172A;
      }

      .theme-crisp .bubble.user {
        background: #0F172A;
        border: 1px solid #0F172A;
        color: #F8FAFC;
      }

      .theme-crisp .nav-btn {
        color: rgba(71, 85, 105, 0.65);
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }

      .theme-crisp .nav-btn.active {
        color: #38BDF8;
      }

      .theme-crisp .nav-btn.tennis-active {
        color: #fbbf24;
      }
      .theme-crisp .nav-btn.nfl-active {
        color: #60a5fa;
      }
      .theme-crisp .nav-btn.f1-active {
        color: #f87171;
      }
      .theme-crisp .nav-btn.nba-active {
        color: #fb923c;
      }
      .theme-crisp .nav-btn.mlb-active {
        color: #4ade80;
      }
      .theme-crisp .nav-btn.golf-active {
        color: #f8fafc;
      }

      .theme-crisp .nav-btn.pro-active {
        color: #F59E0B;
      }

      .theme-crisp .sport-pill {
        font-family: 'Barlow Condensed', sans-serif;
      }
    `,
  },
};
