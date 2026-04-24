/** Global layout + shell styles; injected with theme CSS in App.
 *  Fonts load from index.html (single request, trimmed weights) — no @import here. */
export const baseCss = `
  @keyframes pulse{
    0%,100%{opacity:1;}
    50%{opacity:0.4;}
  }

  :root{
    --cyan:#0891B2;
    --cyan-bright:#00F5E9;
    --mag:#E11D48;
    --magenta:#FF2D6B;
    --gold:#D97706;
    --green:#00E676;
    --red:#FF4444;
    --nfl:#FF6B35;
    --f1:#E10600;
    --nba:#FF6B00;
    --mlb:#1DB954;
    --bg:#080A0C;
    --surface:#0F1215;
    --surface-2:#0C1014;
    --border:#1E2328;
    --border-2:#2A3040;
    --text:#E8EAF0;
    --muted:#AAB3C2;
    --ask-placeholder:rgba(255,255,255,.82);
    --soft:#D6DCE6;
    --header-bg:rgba(8,10,12,.97);
    --nav-bg:rgba(8,10,12,.98);
    --card-shadow:none;
    --card-shadow-hover:0 10px 30px rgba(0,0,0,.18);
    --body-font:'DM Sans',sans-serif;
    --mono-font:'DM Mono',monospace;
    --display-font:'Bebas Neue',sans-serif;
    --bottom-nav-height:96px;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;}
  body{
    background:var(--bg);
    color:var(--text);
    font-family:var(--body-font);
    min-height:100vh;
    -webkit-font-smoothing:antialiased;
  }

  .app{
    min-height:100vh;
    background:var(--bg);
    color:var(--text);
    display:flex;
    flex-direction:column;
  }

  .hdr{
    padding:10px 14px;
    border-bottom:1px solid var(--border);
    background:var(--header-bg);
    display:flex;
    align-items:center;
    justify-content:space-between;
    position:sticky;
    top:0;
    z-index:30;
    backdrop-filter:blur(10px);
    gap:14px;
  }

  .wordmark{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content:center;
    min-width:fit-content;
    cursor:pointer;
  }

  .logo-under{display:none;}

  .logo-review{
    display:block;
    font-family:var(--display-font);
    font-size:26px;
    letter-spacing:1px;
    line-height:1;
    background:linear-gradient(90deg,var(--cyan-bright),var(--magenta));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  .header-right{
    display:flex;
    align-items:center;
    gap:10px;
    min-width:0;
  }

  .pill-tag,.pill-live,.pill-nfl,.pill-f1,.pill-nba,.pill-tennis{
    font-family:var(--mono-font);
    font-size:9px;
    padding:3px 8px;
    border-radius:999px;
    white-space:nowrap;
  }

  .pill-tag{
    color:var(--magenta);
    border:1px solid rgba(255,45,107,.25);
    background:rgba(255,45,107,.06);
  }

  .pill-live{
    color:var(--cyan-bright);
    border:1px solid rgba(0,245,233,.25);
    background:rgba(0,245,233,.06);
  }

  .pill-tennis{
    color:#FFE600;
    border:1px solid rgba(255,230,0,.35);
    background:rgba(255,230,0,.06);
  }

  .pill-nfl{
    color:#4A90D9;
    border:1px solid rgba(74,144,217,.3);
    background:rgba(74,144,217,.06);
  }

  .pill-f1{
    color:var(--f1);
    border:1px solid rgba(225,6,0,.25);
    background:rgba(225,6,0,.06);
  }

  .pill-nba{
    color:#FF6B00;
    border:1px solid rgba(255,107,0,.3);
    background:rgba(255,107,0,.06);
  }

  .pill-mlb{
    color:#1DB954;
    border:1px solid rgba(29,185,84,.3);
    background:rgba(29,185,84,.06);
  }

  .hdr-tagline{
    font-family:var(--mono-font);
    font-size:10px;
    color:rgba(255,255,255,.88);
    letter-spacing:0.5px;
    white-space:nowrap;
  }

  .screen{flex:1;overflow-y:auto;padding:10px 12px;padding-bottom:calc(var(--bottom-nav-height) + 12px + env(safe-area-inset-bottom));scroll-behavior:smooth;-webkit-overflow-scrolling:touch;}
  .screen.has-msgs{padding-bottom:calc(var(--bottom-nav-height) + 140px + env(safe-area-inset-bottom));}
  .docked-bar{position:fixed;left:0;right:0;bottom:calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));background:var(--nav-bg);border-top:1px solid var(--border);padding:8px 12px 8px;z-index:25;backdrop-filter:blur(12px);}
  .docked-bar .ask-wrap{margin:0;}
  .docked-bar .ask-hint{padding-bottom:4px;}
  .docked-bar-label{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase;opacity:.7;}
  .hero{padding:6px 2px 8px;text-align:center;}
  .hero-title{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .hero-sub{color:var(--soft);font-size:13px;line-height:1.5;max-width:560px;margin:0 auto;}

  .sport-rail{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 0 2px;margin-bottom:10px;}
  .sport-rail::-webkit-scrollbar{display:none;}
  .sport-pill{flex-shrink:0;border-radius:999px;padding:8px 20px;font-family:var(--display-font);font-size:15px;letter-spacing:2px;cursor:pointer;border:1.5px solid;transition:all .15s;background:transparent;}
  .sport-pill-tennis{color:#FFE600;border-color:#FFE600;}
  .sport-pill-mlb{color:#1DB954;border-color:#1DB954;}
  .sport-pill-nfl{color:#4A90D9;border-color:#4A90D9;}
  .sport-pill-f1{color:#E10600;border-color:#E10600;}
  .sport-pill-nba{color:#FF6B00;border-color:#FF6B00;}
  .sport-pill:active{opacity:.7;transform:scale(.97);}

  .game-ticker{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:16px;}
  .game-ticker::-webkit-scrollbar{display:none;}
  .ticker-card{flex-shrink:0;background:var(--surface);border-radius:10px;padding:8px 12px;cursor:pointer;min-width:120px;border:1px solid var(--border);}
  .ticker-card.live{border-color:rgba(0,230,118,.35);}
  .ticker-status{font-family:var(--mono-font);font-size:8px;letter-spacing:1.5px;margin-bottom:3px;}
  .ticker-teams{font-size:13px;font-weight:600;color:var(--text);}
  .ticker-score{font-family:var(--mono-font);font-size:11px;color:var(--soft);margin-top:2px;}

  .ask-cards{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;}
  .home-live-label{font-family:var(--mono-font);font-size:8px;letter-spacing:2px;color:rgba(255,255,255,.35);text-transform:uppercase;margin:0 0 6px;}
  .ask-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .15s;}
  .ask-card:active{opacity:.8;}
  .ask-card-bar{width:3px;border-radius:2px;flex-shrink:0;align-self:stretch;min-height:18px;}
  .ask-card-text{font-size:14px;color:var(--soft);line-height:1.35;}

  .spotlight-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;margin-bottom:8px;transition:border-color .15s;}
  .spotlight-card:active{opacity:.85;}
  .draft-gold-pulse{
    border-color:rgba(245,200,66,.58);
    box-shadow:0 0 0 1px rgba(245,200,66,.22),0 0 24px rgba(245,200,66,.14);
    animation:draftGoldPulse 2.2s ease-in-out infinite;
  }
  @keyframes draftGoldPulse{
    0%,100%{
      box-shadow:0 0 0 1px rgba(245,200,66,.16),0 0 16px rgba(245,200,66,.10);
      transform:translateY(0);
    }
    50%{
      box-shadow:0 0 0 1px rgba(245,200,66,.35),0 0 28px rgba(245,200,66,.20);
      transform:translateY(-1px);
    }
  }
  @media (prefers-reduced-motion: reduce){
    .draft-gold-pulse{animation:none;}
  }
  .spotlight-top{padding:10px 14px 0;display:flex;align-items:center;justify-content:space-between;}
  .spotlight-sport{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;font-weight:500;}
  .spotlight-time{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .spotlight-title{padding:6px 14px 4px;font-size:16px;font-weight:700;color:var(--text);line-height:1.3;}
  .spotlight-edge{padding:0 14px 12px;font-size:12px;color:var(--muted);line-height:1.4;}
  .spotlight-atp-matchups-wrap{max-height:min(240px,42vh);overflow-y:auto;-webkit-overflow-scrolling:touch;margin:0 -2px 0 0;padding-right:2px;}
  .spotlight-atp-matchups{display:flex;flex-direction:column;gap:7px;margin:0;padding:0;list-style:none;}
  .spotlight-atp-matchups li{margin:0;padding:2px 0 2px 11px;border-left:2px solid rgba(8,145,178,.4);font-size:12px;line-height:1.38;color:var(--soft);}
  .spotlight-atp-foot{margin-top:10px;font-size:11px;color:var(--muted);line-height:1.35;}

  /* P-PR4 — Home premium pass (scoped: Home main + ticker + slate + prompt rail + spotlights only) */
  .home-surface-premium.screen{padding:8px 14px 0;padding-bottom:calc(96px + env(safe-area-inset-bottom));}
  .home-surface-premium.screen.has-msgs{padding-bottom:calc(var(--bottom-nav-height) + 140px + env(safe-area-inset-bottom));}
  .home-surface-premium .ask-wrap{margin:8px 0 16px;}
  .home-surface-premium .sport-rail{margin-bottom:12px;}
  .home-surface-premium .sport-pill{background:rgba(0,0,0,.14);backdrop-filter:blur(8px);}
  .home-surface-premium .ask-cards{gap:8px;margin-bottom:14px;}
  .home-surface-premium .ask-card{
    border-color:rgba(255,255,255,.1);
    background:linear-gradient(145deg, rgba(255,255,255,.04), var(--surface));
    box-shadow:0 2px 14px rgba(0,0,0,.12);
  }
  .home-surface-premium .ask-card:hover{border-color:rgba(0,245,233,.32);}
  .home-surface-premium .ask-card-text{color:var(--text);}
  .home-surface-premium .spotlight-card{
    border-color:rgba(255,255,255,.1);
    box-shadow:0 3px 18px rgba(0,0,0,.18);
  }
  .home-surface-premium .spotlight-card:hover{border-color:rgba(255,255,255,.16);}
  .home-surface-premium .home-live-label{color:rgba(255,255,255,.4);margin-bottom:8px;}
  .home-surface-premium .home-ticker-premium > div{box-shadow:0 2px 14px rgba(0,0,0,.2);}
  .home-surface-premium .today-slate-panel{box-shadow:0 4px 22px rgba(0,245,233,.07);}
  .home-surface-premium .today-slate-loading{letter-spacing:0.2px;opacity:.92;}
  .home-surface-premium .today-slate-error{max-width:100%;line-height:1.45;}
  .home-micro-hint{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.4px;
    color:rgba(255,255,255,.45);
    margin:-4px 0 10px;
    line-height:1.4;
    max-width:36rem;
  }
  .home-ticker-quiet{
    min-height:52px;
    align-items:center;
    padding:12px 14px;
    border-radius:12px;
    border:1px dashed rgba(255,255,255,.14);
    background:rgba(0,0,0,.12);
  }
  .home-ticker-quiet-copy{
    font-size:12px;
    color:var(--muted);
    line-height:1.45;
    max-width:40ch;
  }
  .today-slate-empty{
    font-size:12px;
    color:var(--muted);
    margin-top:8px;
    line-height:1.45;
    max-width:40ch;
  }

  .ask-wrap{margin:12px 0 18px;}
  .ask-row{display:flex;gap:8px;align-items:flex-end;}
  .ask-col{flex:1;border:1px solid var(--border-2);background:var(--surface-2);border-radius:18px;overflow:hidden;transition:border-color .15s ease;}
  .ask-col:focus-within{border-color:rgba(0,245,233,.4);}
  .ask-img-preview{padding:8px 12px 0;display:flex;align-items:center;gap:8px;}
  .ask-img-thumb{width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border-2);}
  .ask-img-remove{background:rgba(255,45,107,.15);border:1px solid rgba(255,45,107,.3);color:var(--magenta);border-radius:6px;padding:3px 8px;font-family:var(--mono-font);font-size:10px;cursor:pointer;}
  /* 16px+ prevents iOS Safari from force-zooming the viewport on input focus */
  .ask-bar{width:100%;border:none;background:transparent;padding:10px 14px;color:var(--text);font-size:16px;line-height:1.35;outline:none;font-family:var(--body-font);-webkit-text-size-adjust:100%;}
  .ask-bar::placeholder{color:var(--ask-placeholder);opacity:1;}
  .ask-hint{font-family:var(--mono-font);font-size:9px;color:rgba(255,255,255,.52);letter-spacing:1px;padding:0 14px 8px;opacity:1;}
  .send-btn{width:44px;height:44px;border:none;border-radius:50%;background:var(--cyan-bright);color:#080A0C;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .send-btn:hover{background:var(--magenta);}
  .send-btn:disabled{background:var(--border);cursor:not-allowed;color:var(--muted);}
  .attach-btn{width:36px;height:36px;border:1px solid var(--border-2);border-radius:50%;background:var(--surface);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s ease;}
  .attach-btn:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .attach-btn.has-img{border-color:var(--cyan-bright);color:var(--cyan-bright);background:rgba(0,245,233,.08);}

  .section{margin-top:10px;}
  .section-label{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;}

  .q-list{display:flex;flex-direction:column;gap:4px;}
  .q-card{width:100%;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px 10px;cursor:pointer;color:var(--text);transition:all .18s ease;}
  .q-card:hover{border-color:var(--cyan-bright);transform:translateY(-1px);}
  .q-top{display:flex;align-items:center;gap:8px;}
  .q-accent{width:3px;height:22px;border-radius:2px;flex-shrink:0;}
  .q-text{font-size:13px;line-height:1.35;color:var(--soft);}

  .tour-banner,.nfl-banner{border-radius:12px;padding:12px;margin-bottom:10px;border:1px solid var(--border);background:var(--surface);}
  .tour-banner{background:linear-gradient(135deg,rgba(0,245,233,.08),rgba(245,200,66,.06));}
  .nfl-banner{background:linear-gradient(135deg,rgba(255,107,53,.08),rgba(255,45,107,.05));}
  .banner-title{font-family:var(--display-font);font-size:22px;letter-spacing:1px;margin-bottom:2px;}
  .banner-sub{font-family:var(--mono-font);font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:4px;text-transform:uppercase;}
  .banner-note{font-size:12px;color:var(--soft);line-height:1.4;}

  .matchup-list{display:flex;flex-direction:column;gap:6px;}
  .matchup-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .18s ease;position:relative;}
  .matchup-card:hover{border-color:var(--cyan-bright);transform:translateY(-1px);}
  .matchup-top{padding:7px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.01);}
  .matchup-league{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;text-transform:uppercase;}
  .matchup-time{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .matchup-body{padding:8px 10px;}
  .matchup-title{font-size:14px;font-weight:600;margin-bottom:2px;color:var(--text);}
  .matchup-meta{font-size:11px;color:var(--muted);margin-bottom:4px;}
  .matchup-blurb{font-size:12px;color:var(--soft);line-height:1.45;}

  .sport-chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
  .sport-chip{border:1px solid var(--border-2);background:var(--surface);color:var(--soft);border-radius:12px;padding:16px 12px;font-family:var(--display-font);font-size:18px;letter-spacing:2px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
  .sport-chip.active,.sport-chip:hover{border-color:#FFE600;color:#FFE600;background:rgba(255,230,0,.06);}
  .sport-chip.nfl-chip.active,.sport-chip.nfl-chip:hover{border-color:#4A90D9;color:#4A90D9;background:rgba(74,144,217,.06);}
  .sport-chip.f1-chip.active,.sport-chip.f1-chip:hover{border-color:var(--f1);color:var(--f1);background:rgba(225,6,0,.06);}
  .sport-chip.nba-chip.active,.sport-chip.nba-chip:hover{border-color:#FF6B00;color:#FF6B00;background:rgba(255,107,0,.06);}
  .sport-chip.mlb-chip.active,.sport-chip.mlb-chip:hover{border-color:#1DB954;color:#1DB954;background:rgba(29,185,84,.06);}

  .detail-back{background:none;border:none;color:var(--muted);font-family:var(--mono-font);font-size:11px;letter-spacing:1px;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;gap:6px;}
  .detail-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:14px;}
  .detail-head{padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface-2);}
  .detail-league{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase;}
  .detail-title{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .detail-sub{font-size:12px;color:var(--muted);}
  .what-matters{padding:14px;}
  .wm-label{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--cyan-bright);margin-bottom:8px;text-transform:uppercase;}
  .wm-text{font-size:14px;line-height:1.7;color:var(--soft);}
  .quick-hitters{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 14px;}
  .quick-btn{border:1px solid var(--border-2);background:var(--surface-2);color:var(--soft);border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;transition:all .15s ease;}
  .quick-btn:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 14px;}
  .mini-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;}
  .mini-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);margin-bottom:4px;}
  .mini-value{font-size:15px;font-weight:700;}

  .chat-thread{display:flex;flex-direction:column;gap:12px;margin-top:8px;}
  .bubble{border-radius:18px;padding:13px 14px;font-size:14px;line-height:1.65;}
  .bubble.user{margin-left:auto;max-width:88%;background:#1E2B38;border:1px solid #2A3A4A;color:#E8EAF0;border-bottom-right-radius:6px;}
  .bubble.ai{margin-right:auto;max-width:96%;background:var(--surface);border:1px solid var(--border);color:var(--soft);border-bottom-left-radius:6px;}
  .bubble.loading{opacity:.5;font-family:var(--mono-font);font-size:12px;letter-spacing:2px;color:var(--muted);}
  .bubble-img{width:100%;max-width:200px;border-radius:10px;margin-bottom:6px;display:block;}

  .player-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;margin-bottom:10px;transition:all .18s ease;}
  .player-card:hover{border-color:var(--border-2);}
  .player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .player-rank{font-family:var(--display-font);font-size:32px;color:var(--muted);line-height:1;margin-right:12px;min-width:36px;}
  .player-info{flex:1;}
  .player-name{font-size:16px;font-weight:600;color:var(--text);margin-bottom:2px;}
  .player-style{font-size:12px;color:var(--muted);}
  .player-elo{text-align:right;}
  .player-elo-num{font-family:var(--mono-font);font-size:16px;color:var(--cyan-bright);display:block;}
  .player-elo-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .player-stats{padding:0 14px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .pstat{background:var(--surface-2);border-radius:8px;padding:8px;text-align:center;}
  .pstat-label{font-family:var(--mono-font);font-size:8px;color:var(--muted);margin-bottom:3px;}
  .pstat-value{font-family:var(--mono-font);font-size:12px;font-weight:500;}
  .surface-pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
  .surface-pill{font-family:var(--mono-font);font-size:9px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
  .surface-hard{color:var(--cyan-bright);border-color:rgba(0,245,233,.3);}
  .surface-clay{color:var(--gold);border-color:rgba(245,200,66,.3);}
  .surface-grass{color:var(--green);border-color:rgba(0,230,118,.3);}
  .form-badge{font-family:var(--mono-font);font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(0,245,233,.1);color:var(--cyan-bright);border:1px solid rgba(0,245,233,.2);}

  .loading-state{text-align:center;padding:40px 20px;}
  .loading-text{font-family:var(--mono-font);font-size:11px;color:var(--muted);letter-spacing:2px;}

  .section-divider{font-family:var(--mono-font);font-size:10px;letter-spacing:3px;margin:20px 0 10px;display:flex;align-items:center;gap:8px;color:var(--muted);text-transform:uppercase;}
  .section-divider::after{content:'';flex:1;height:1px;background:var(--border);}

  .pos-tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
  .pos-tabs::-webkit-scrollbar{display:none;}
  .pos-tab{font-family:var(--mono-font);font-size:10px;letter-spacing:1px;border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:999px;padding:6px 14px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;}
  .pos-tab.active{border-color:var(--nfl);color:var(--nfl);background:rgba(255,107,53,.08);}

  .nfl-player-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:10px;cursor:pointer;transition:all .15s ease;}
  .nfl-player-card:hover{border-color:rgba(255,107,53,.4);}
  .nfl-player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .nfl-player-left{display:flex;align-items:center;gap:12px;flex:1;}
  .nfl-rank{font-family:var(--display-font);font-size:28px;color:var(--muted);line-height:1;min-width:32px;text-align:right;}
  .nfl-player-info{flex:1;}
  .nfl-player-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .nfl-player-meta{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .nfl-player-right{text-align:right;}
  .nfl-yds-pg{font-family:var(--mono-font);font-size:16px;color:var(--nfl);display:block;}
  .nfl-yds-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .nfl-player-stats{padding:0 14px 12px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
  .nfl-stat{background:var(--surface-2);border-radius:8px;padding:7px;text-align:center;}
  .nfl-stat-label{font-family:var(--mono-font);font-size:8px;color:var(--muted);margin-bottom:3px;}
  .nfl-stat-value{font-family:var(--mono-font);font-size:12px;font-weight:600;}

  .nfl-prop-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .nfl-prop-card:hover{border-color:rgba(255,107,53,.35);}
  .nfl-prop-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .nfl-prop-player{font-size:14px;font-weight:600;color:var(--text);}
  .nfl-prop-type{font-family:var(--mono-font);font-size:10px;color:var(--nfl);background:rgba(255,107,53,.1);padding:2px 8px;border-radius:4px;}
  .nfl-prop-line{font-family:var(--mono-font);font-size:11px;color:var(--gold);margin-bottom:3px;}
  .nfl-prop-lean{font-size:12px;color:var(--soft);line-height:1.4;}

  .nfl-detail-head{padding:14px;border-bottom:1px solid var(--border);background:var(--surface-2);}
  .nfl-detail-pos{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--nfl);margin-bottom:6px;text-transform:uppercase;}
  .nfl-detail-name{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .nfl-detail-sub{font-size:12px;color:var(--muted);}
  .nfl-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px;}
  .nfl-detail-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;}
  .nfl-detail-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);margin-bottom:4px;}
  .nfl-detail-value{font-size:15px;font-weight:700;}
  .nfl-detail-section{padding:0 14px 14px;}
  .nfl-detail-section-label{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--nfl);margin-bottom:8px;text-transform:uppercase;}
  .nfl-prop-block{background:rgba(255,107,53,.05);border:1px solid rgba(255,107,53,.15);border-radius:10px;padding:12px;}
  .nfl-prop-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .nfl-prop-row:last-child{margin-bottom:0;}
  .nfl-prop-name{font-family:var(--mono-font);font-size:11px;color:var(--muted);}
  .nfl-prop-val{font-family:var(--mono-font);font-size:11px;}
  .lean-over{color:var(--green);}
  .lean-fade{color:var(--red);}
  .lean-neutral{color:var(--gold);}
  .nfl-situation{background:var(--surface-2);border-radius:10px;padding:12px;font-size:13px;color:var(--soft);line-height:1.6;}
  .nfl-betting-angles{display:flex;flex-direction:column;gap:6px;}
  .nfl-angle-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--soft);line-height:1.5;}
  .nfl-angle-dot{width:5px;height:5px;border-radius:50%;background:var(--nfl);flex-shrink:0;margin-top:5px;}
  .nfl-ask-shell{background:var(--surface);border:1px solid rgba(255,107,53,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .nfl-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--nfl);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}

  .bottom-nav{position:fixed;left:0;right:0;bottom:0;background:var(--nav-bg);border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,auto);row-gap:4px;column-gap:2px;padding:6px 4px max(8px,env(safe-area-inset-bottom));z-index:30;backdrop-filter:blur(10px);}
  .nav-btn{position:relative;background:none;border:none;color:rgba(255,255,255,.4);font-family:var(--display-font,'Bebas Neue',sans-serif);font-size:15px;font-weight:700;letter-spacing:1.5px;cursor:pointer;padding:8px 2px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;opacity:1;text-transform:uppercase;min-height:40px;line-height:1;}
  .nav-btn span{display:block;}
  .nav-btn.active{color:var(--cyan-bright);}
  .nav-btn.tennis-active{color:#F5C842;}
  .nav-btn.nfl-active{color:#4A90D9;}
  .nav-btn.f1-active{color:var(--f1);}
  .nav-btn.nba-active{color:#FF6B00;}
  .nav-btn.mlb-active{color:#1DB954;}
  .nav-btn.pro-active{color:#F5C842;}
  .nav-btn.active::after,
  .nav-btn.tennis-active::after,
  .nav-btn.nfl-active::after,
  .nav-btn.f1-active::after,
  .nav-btn.nba-active::after,
  .nav-btn.mlb-active::after,
  .nav-btn.golf-active::after,
  .nav-btn.nav-pro-on::after{
    content:"";
    position:absolute;
    bottom:6px;
    left:50%;
    transform:translateX(-50%);
    width:4px;
    height:4px;
    border-radius:50%;
    background:#00F5E9;
  }

  .pro-banner{border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(245,200,66,.3);background:linear-gradient(135deg,rgba(245,200,66,.08),rgba(255,45,107,.04));text-align:center;}
  .pro-feature{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;}
  .pro-feature-dot{width:8px;height:8px;border-radius:50%;background:#F5C842;flex-shrink:0;margin-top:4px;}
  .pro-cta{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,#F5C842,#FF2D6B);color:#080A0C;font-family:var(--display-font);font-size:20px;letter-spacing:2px;cursor:pointer;margin-top:8px;transition:opacity .15s;}
  .pro-cta:hover{opacity:.9;}

  .f1-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid var(--border);background:linear-gradient(135deg,rgba(225,6,0,.08),rgba(255,107,53,.05));}
  .f1-standing-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s ease;}
  .f1-standing-card:hover{border-color:rgba(225,6,0,.4);}
  .f1-pos{font-family:var(--display-font);font-size:28px;color:var(--muted);min-width:32px;text-align:right;line-height:1;}
  .f1-driver-info{flex:1;}
  .f1-driver-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .f1-driver-team{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .f1-pts{text-align:right;}
  .f1-pts-num{font-family:var(--mono-font);font-size:16px;color:var(--f1);display:block;}
  .f1-pts-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .f1-race-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;transition:all .15s ease;}
  .f1-race-card.next-race{border-color:rgba(225,6,0,.4);background:linear-gradient(135deg,rgba(225,6,0,.06),var(--surface));}
  .f1-race-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .f1-race-name{font-size:15px;font-weight:600;color:var(--text);}
  .f1-race-date{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .f1-race-location{font-size:12px;color:var(--muted);}
  .f1-race-badge{font-family:var(--mono-font);font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(225,6,0,.1);color:var(--f1);border:1px solid rgba(225,6,0,.2);}
  .f1-ask-shell{background:var(--surface);border:1px solid rgba(225,6,0,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .f1-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--f1);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}

  .nba-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,107,0,.2);background:linear-gradient(135deg,rgba(255,107,0,.08),rgba(255,45,107,.04));}
  .nba-ask-shell{background:var(--surface);border:1px solid rgba(255,107,0,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .nba-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--nba);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}
  .mlb-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(29,185,84,.2);background:linear-gradient(135deg,rgba(29,185,84,.08),rgba(0,100,40,.04));}
  .mlb-ask-shell{background:var(--surface);border:1px solid rgba(29,185,84,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .mlb-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--mlb);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}
  .mlb-game-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .mlb-game-card:hover{border-color:rgba(29,185,84,.35);}
  .mlb-game-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .mlb-game-teams{font-size:15px;font-weight:600;color:var(--text);}
  .mlb-game-status{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .mlb-game-score{font-family:var(--mono-font);font-size:13px;color:var(--text);margin-bottom:4px;}
  .mlb-pitcher{font-size:11px;color:var(--muted);}
  .mlb-live-badge{color:var(--green);font-family:var(--mono-font);font-size:10px;}
  .nba-player-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s ease;}
  .nba-player-card:hover{border-color:rgba(255,107,0,.4);}
  .nba-player-rank{font-family:var(--display-font);font-size:24px;color:var(--muted);min-width:28px;text-align:right;line-height:1;}
  .nba-player-info{flex:1;}
  .nba-player-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .nba-player-meta{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .nba-player-stats{text-align:right;}
  .nba-pts{font-family:var(--mono-font);font-size:16px;color:var(--nba);display:block;}
  .nba-pts-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .nba-game-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .nba-game-card:hover{border-color:rgba(255,107,0,.35);}
  .nba-game-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .nba-game-teams{font-size:15px;font-weight:600;color:var(--text);}
  .nba-game-status{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .nba-game-score{font-family:var(--mono-font);font-size:13px;color:var(--text);margin-bottom:4px;}
  .nba-game-records{font-size:11px;color:var(--muted);}
  .nba-live-badge{color:var(--green);font-family:var(--mono-font);font-size:10px;}

  .page-spacer{height:20px;}
  .nav-btn.golf-active{color:#FFFFFF;}
  .golf-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,255,255,.15);background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));}
  .golf-ask-shell{background:var(--surface);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:14px;margin-bottom:16px;}
  .golf-ask-label{font-family:var(--mono-font);font-size:10px;color:#FFFFFF;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;opacity:.85;}
  .golf-leaderboard-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s;}
  .golf-leaderboard-card:hover{border-color:rgba(255,255,255,.3);}
  .golf-pos{font-family:var(--display-font);font-size:22px;color:var(--muted);min-width:36px;text-align:right;line-height:1;}
  .golf-player-info{flex:1;}
  .golf-player-name{font-size:14px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .golf-player-country{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .golf-score{text-align:right;}
  .golf-score-num{font-family:var(--mono-font);font-size:16px;color:#FFFFFF;display:block;}
  .golf-score-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .golf-odds-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .15s;}
  .golf-odds-card:hover{border-color:rgba(255,255,255,.3);}
  .golf-player-odds{font-family:var(--mono-font);font-size:14px;color:#FFFFFF;}
`;
