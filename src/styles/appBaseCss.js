/** Global layout + shell styles; injected with theme CSS in App.
 *  Fonts load from index.html (single request, trimmed weights) — no @import here. */
export const baseCss = `
  @keyframes pulse{
    0%,100%{opacity:1;}
    50%{opacity:0.4;}
  }

  @keyframes ur-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes ur-pulse{
    0%,100%{transform:scale(1);}
    50%{transform:scale(1.4);}
  }

  @media (prefers-reduced-motion: no-preference) {
    .ur-response-headline {
      animation: ur-fade-up 300ms ease forwards;
    }
    .ur-response-chunk {
      animation: ur-fade-up 300ms ease forwards;
    }
    .ur-response-chunk:nth-child(1) { animation-delay: 80ms; }
    .ur-response-chunk:nth-child(2) { animation-delay: 160ms; }
    .ur-response-chunk:nth-child(3) { animation-delay: 240ms; }
    .ur-response-closing {
      animation: ur-fade-up 300ms ease forwards;
      animation-delay: 320ms;
    }
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
    --ur-cyan:var(--cyan-bright);
    --ur-mag:var(--magenta);
    --ur-muted:rgba(148,163,184,0.62);
    --bottom-nav-height:72px;
    /* Fallbacks when measured chrome vars are unset (see App.jsx ResizeObserver) */
    --ur-dock-askbar-est:72px;
    --ur-dock-followups-est:56px;
    --ur-chat-scroll-dock-buffer:16px;
    --keyboard-height:0px;
    --nfl-predict-bg:#0a0a0a;
    --nfl-predict-surface:#141414;
    --nfl-predict-border:#2a2a2a;
    --nfl-predict-accent:#00F5E9;
    --nfl-predict-magenta:#FF2D6B;
    --nfl-predict-text:#ffffff;
    --nfl-predict-muted:#666666;
    --wc-gold:#F59E0B;
    --wc-green:#22C55E;
    --wc-red:#EF4444;
    --wc-blue:#3B82F6;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  .nav-btn,.bottom-nav button,.send-btn,.attach-btn,.ur-take-follow-up-chip,.ur-dock-icon-btn,.quick-btn,button.q-card,.pill-tag,button.detail-back,button.ur-v2-body-expand{
    touch-action:manipulation;
  }
  /* iOS: lock document scroll; scroll only designated panes (chat, screens) */
  html,body{
    height:100%;
    width:100%;
    overflow:hidden;
    position:fixed;
    margin:0;
    padding:0;
  }
  html{
    min-height:100vh;
    min-height:100dvh;
  }
  #root{
    height:100%;
    width:100%;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    min-height:0;
  }
  body{
    background:var(--bg);
    color:var(--text);
    font-family:var(--body-font);
    min-height:100vh;
    min-height:100dvh;
    -webkit-font-smoothing:antialiased;
  }

  .app{
    flex:1;
    min-height:0;
    overflow:hidden;
    min-height:100vh;
    min-height:100dvh;
    width:100%;
    max-width:none;
    margin:0;
    background:var(--bg);
    color:var(--text);
    display:flex;
    flex-direction:column;
  }

  .hdr{
    padding:10px 14px;
    padding-top:calc(10px + env(safe-area-inset-top, 0px));
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

  button.ur-hdr-account-btn{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.12em;
    text-transform:uppercase;
    color:rgba(255,255,255,0.72);
    background:transparent;
    border:1px solid rgba(255,255,255,0.14);
    border-radius:999px;
    padding:6px 11px;
    cursor:pointer;
    flex-shrink:0;
    transition:opacity 0.15s ease,border-color 0.15s ease;
  }
  button.ur-hdr-account-btn:hover{border-color:rgba(0,245,233,0.35);color:var(--cyan-bright);}
  button.ur-hdr-account-btn:active{opacity:0.88;}

  .pill-tag,.pill-live,.pill-nfl,.pill-f1,.pill-nba,.pill-mlb,.pill-tennis{
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
    font-family:var(--body-font),system-ui,-apple-system,sans-serif;
    font-size:11px;
    font-weight:500;
    color:#555;
    letter-spacing:0;
    line-height:1.35;
    white-space:normal;
    text-align:right;
    max-width:200px;
    hyphens:none;
  }
  @media (max-width:380px){
    .hdr-tagline{display:none;}
  }

  .screen{flex:1;overflow-y:auto;width:100%;max-width:none;margin:0;min-height:0;padding:10px 16px;padding-bottom:calc(var(--bottom-nav-height) + var(--keyboard-height, 0px) + 12px + env(safe-area-inset-bottom));scroll-behavior:smooth;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;box-sizing:border-box;}
  .screen.has-msgs{padding-bottom:calc(var(--bottom-nav-height) + var(--keyboard-height, 0px) + 200px + env(safe-area-inset-bottom));}
  .app.has-docked main.screen.screen--ur-chat.has-msgs{
    display:flex;
    flex-direction:column;
    flex:1;
    min-height:0;
    overflow:hidden;
    padding-left:0;
    padding-right:0;
    padding-top:4px;
    padding-bottom:0;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .ur-session-context-header{
    flex-shrink:0;
    padding-left:16px;
    padding-right:16px;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .ur-session-locked-line{
    flex-shrink:0;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .ur-ask-retention-strip{
    flex-shrink:0;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs > *:first-child{
    flex-shrink:0;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .nba-banner,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .golf-banner,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .nfl-banner,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .f1-banner,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .tour-banner,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .sport-board-header,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .wc-header,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .wc-main-tabs{
    margin-left:16px;
    margin-right:16px;
    width:auto;
    box-sizing:border-box;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .wc-header,
  .app.has-docked main.screen.screen--ur-chat.has-msgs > .wc-main-tabs{
    flex-shrink:0;
  }
  .app.has-docked main.screen.screen--ur-chat.has-msgs .ur-chat-scroll{
    flex:1 1 auto;
    /* Prevent flex min-height:0 chain from collapsing the thread to 0px (blank “black” Ask). */
    min-height:min(360px,55dvh);
    display:flex;
    flex-direction:column;
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
    padding-left:16px;
    padding-right:16px;
    /*
     * Clearance = max(fixed nav band, dock bottom offset + dock height).
     * Do not sum nav + dock — the dock sits just above the nav offset band.
     */
    padding-bottom:calc(
      max(
        var(--ur-nav-measured-h, var(--bottom-nav-height)),
        calc(var(--bottom-nav-height) + var(--ur-dock-measured-h, calc(var(--ur-dock-followups-est) + var(--ur-dock-askbar-est))))
      )
      + var(--ur-vv-rise, 0px)
      + var(--ur-chat-scroll-dock-buffer)
      + var(--keyboard-height, 0px)
    );
    scroll-padding-bottom:calc(
      max(
        var(--ur-nav-measured-h, var(--bottom-nav-height)),
        calc(var(--bottom-nav-height) + var(--ur-dock-measured-h, calc(var(--ur-dock-followups-est) + var(--ur-dock-askbar-est))))
      )
      + var(--ur-vv-rise, 0px)
      + var(--ur-chat-scroll-dock-buffer)
      + var(--keyboard-height, 0px)
    );
  }
  /* Thread must size to its content so .ur-chat-scroll gains scrollHeight; avoid flex:1 + min-height:100% swallowing overflow */
  .app.has-docked main.screen.screen--ur-chat.has-msgs .ur-chat-scroll .chat-thread.chat-thread--ur-chat-dock{
    flex:0 0 auto;
    align-self:stretch;
    width:100%;
    min-height:0;
    margin-top:0;
    margin-bottom:0;
  }
  .docked-bar,.docked-bar.ur-docked-bar{
    position:fixed;
    left:0;
    right:0;
    width:100vw;
    max-width:none;
    margin:0;
    padding:0;
    padding-bottom:max(env(safe-area-inset-bottom,0px),0px);
    bottom:calc(var(--bottom-nav-height) + var(--ur-vv-rise,0px) + var(--keyboard-height,0px));
    z-index:32;
    background:#080808;
    border:none;
    border-top:0.5px solid #161616;
    box-shadow:none;
    backdrop-filter:none;
    -webkit-backdrop-filter:none;
    box-sizing:border-box;
  }
  .docked-interaction-zone{
    width:100%;
    max-width:none;
    box-sizing:border-box;
    padding:0;
    margin:0;
    display:flex;
    flex-direction:column;
    align-items:stretch;
    gap:2px;
    border-top:none;
    background:#080808;
    box-shadow:none;
    backdrop-filter:none;
    -webkit-backdrop-filter:none;
  }
  .docked-interaction-zone .docked-bar-label{margin:0;opacity:0.85;padding:6px 16px 0;}
  .docked-interaction-zone .ur-docked-follow-ups{
    width:100%;
    max-width:none;
    padding:4px 16px 2px;
    margin:0;
    gap:8px;
    max-height:none;
    overflow:visible;
    flex-wrap:wrap;
    box-sizing:border-box;
  }
  .ur-docked-paste-hint{
    font-family:var(--mono-font);
    font-size:7px;
    letter-spacing:0.12em;
    text-transform:uppercase;
    color:#252525;
    padding:0 12px 2px;
    margin:0;
    background:#080808;
    width:100%;
    box-sizing:border-box;
  }
  .docked-interaction-zone .ask-wrap{margin:0;padding:0 0 6px;}
  /* Docked UR row — taller tap-friendly bar (see AskBar.jsx) */
  .docked-bar .ask-wrap--docked-gradient .ask-row--docked-triple,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-row--docked-triple{
    align-items:center;
    gap:10px;
    min-height:56px;
    padding:10px 14px 8px;
    box-sizing:border-box;
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-input-mid,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-input-mid{
    flex:1;
    min-width:0;
    display:flex;
    flex-direction:column;
    align-items:stretch;
    justify-content:center;
  }
  .docked-bar .ask-wrap--docked-gradient .ask-col,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-col{
    border:none;
    background:transparent;
    border-radius:0;
    overflow:visible;
  }
  .docked-bar .ask-wrap--docked-gradient .ask-col:focus-within,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-col:focus-within{
    border-color:transparent;
  }
  /* Docked input: #111 fill only in padding box; cyan→magenta visible only in border (Safari-safe clip) */
  .docked-bar .ask-wrap--docked-gradient .ask-bar-gradient-frame,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar-gradient-frame{
    box-sizing:border-box;
    border:1.5px solid transparent;
    border-radius:24px;
    background-image:linear-gradient(#111,#111),linear-gradient(90deg,#00F5E9,#FF2D6B);
    background-origin:border-box;
    background-clip:padding-box,border-box;
    -webkit-background-clip:padding-box,border-box;
    padding:0;
    flex:1;
    min-width:0;
    width:100%;
    min-height:48px;
    height:48px;
    display:flex;
    align-items:stretch;
  }
  .docked-bar .ask-wrap--docked-gradient .ask-bar-docked-inner,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar-docked-inner{
    flex:1;
    min-width:0;
    min-height:0;
    display:flex;
    flex-direction:column;
    background:transparent;
    border-radius:22px;
    overflow:hidden;
  }
  .docked-bar .ask-wrap--docked-gradient .ask-bar-docked-input-slot,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar-docked-input-slot{
    flex:1 1 auto;
    min-height:0;
    display:flex;
    align-items:center;
  }
  .docked-bar .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill{
    flex:1;
    min-height:44px;
    width:100%;
    margin:0;
    box-sizing:border-box;
    background:transparent;
    border-radius:0;
    border:none;
    color:rgba(255,255,255,.92);
    font-size:16px;
    line-height:1.35;
    padding:0 14px;
    outline:none;
  }
  .docked-bar .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill::placeholder,
  .docked-interaction-zone .ask-wrap--docked-gradient .ask-bar.ask-bar--docked-fill::placeholder{
    color:#555;
    opacity:1;
  }
  .docked-bar .ur-dock-input-mid input,
  .docked-interaction-zone .ur-dock-input-mid input,
  .docked-bar .ur-dock-input-mid textarea,
  .docked-interaction-zone .ur-dock-input-mid textarea{
    font-size:16px;
    -webkit-text-size-adjust:100%;
    touch-action:manipulation;
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-attach,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-attach{
    display:flex;
    width:44px;
    height:44px;
    min-width:44px;
    flex-shrink:0;
    box-sizing:border-box;
    align-items:center;
    justify-content:center;
    padding:0;
    border-radius:50%;
    background:#141414;
    border:none;
    color:rgba(255,255,255,0.82);
    cursor:pointer;
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-attach.has-img,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-attach.has-img{
    box-shadow:0 0 0 1px rgba(0,245,233,0.35);
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-send,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-send{
    display:flex;
    width:44px;
    height:44px;
    min-width:44px;
    flex-shrink:0;
    box-sizing:border-box;
    align-items:center;
    justify-content:center;
    padding:0;
    border-radius:50%;
    background:#FF2D6B;
    border:none;
    color:#ffffff;
    cursor:pointer;
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-send:disabled,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-send:disabled{
    background:#2a2a2a;
    color:rgba(255,255,255,0.45);
    opacity:1;
    cursor:default;
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-send:hover:not(:disabled),
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-icon-btn.ur-dock-send:hover:not(:disabled){
    filter:brightness(1.06);
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-icon-svg--on-magenta,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-icon-svg--on-magenta{
    color:#ffffff;
  }
  .docked-bar .ask-wrap--docked-gradient .ur-dock-send-busy,
  .docked-interaction-zone .ask-wrap--docked-gradient .ur-dock-send-busy{
    font-size:14px;
    font-weight:700;
    line-height:1;
    color:#fff;
  }
  .docked-interaction-zone .ask-hint{padding-top:4px;padding-bottom:6px;}
  .docked-bar-label{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;text-transform:uppercase;}
  .hero{padding:6px 2px 8px;text-align:center;}
  .hero-title{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .hero-sub{color:var(--soft);font-size:13px;line-height:1.5;width:100%;max-width:none;margin:0;}

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
  .home-surface-premium.screen{padding:8px 16px 0;padding-bottom:calc(var(--bottom-nav-height) + var(--keyboard-height, 0px) + env(safe-area-inset-bottom));width:100%;max-width:none;margin:0;box-sizing:border-box;}
  .home-surface-premium.screen.has-msgs{padding-bottom:calc(var(--bottom-nav-height) + var(--keyboard-height, 0px) + 200px + env(safe-area-inset-bottom));}
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
    width:100%;
    max-width:none;
  }
  .home-surface-v1 .ask-wrap{margin:10px 0 8px;}
  @media (prefers-reduced-motion:reduce){
    .home-surface-v1 .ur-home-live-toggle-title::before{animation:none !important;}
  }
  .home-surface-v1.screen{
    background:radial-gradient(ellipse 80% 400px at 50% -100px,rgba(0,245,233,0.04) 0%,transparent 70%),var(--bg);
  }
  .home-surface-v1 .page-spacer{height:8px;min-height:8px;}
  .home-surface-v1 .today-slate-panel{
    background:rgba(8,10,12,0.42) !important;
    border:1px solid rgba(255,255,255,0.06) !important;
    border-radius:10px !important;
    box-shadow:0 4px 22px rgba(0,245,233,0.06);
  }
  .home-surface-v1 .today-slate-title{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.1em;
    text-transform:uppercase;
    color:var(--ur-cyan);
    font-weight:700;
  }
  .home-surface-v1 .today-slate-row > div:first-child{
    font-family:var(--mono-font) !important;
    font-size:10px !important;
    letter-spacing:0.1em !important;
    text-transform:uppercase;
    color:var(--ur-cyan) !important;
    margin-bottom:4px;
  }
  .home-surface-v1 .today-slate-updated{font-size:11px;color:var(--muted);}
  .home-surface-v1 .spotlight-card{
    border:1px solid rgba(255,255,255,0.06);
    border-radius:10px;
  }
  .home-surface-v1 .spotlight-sport{
    font-size:10px;
    letter-spacing:0.1em;
    font-weight:700;
  }
  .home-surface-v1 .ur-home-starter-cards.ask-cards{gap:0;}
  .home-surface-v1 .ur-home-starter-cards .ask-card-bar{display:none;}
  .home-surface-v1 .ur-home-starter-cards .ask-card{
    background:transparent;
    border:none;
    border-radius:0;
    box-shadow:none;
    border-left:2px solid var(--ur-cyan);
    border-bottom:1px solid rgba(255,255,255,0.04);
    padding:12px 16px;
  }
  .home-surface-v1 .ur-home-starter-cards .ask-card:nth-child(2){border-left-color:var(--ur-mag);}
  .home-surface-v1 .ur-home-starter-cards .ask-card:nth-child(3){border-left-color:rgba(0,245,233,0.55);}
  .home-surface-v1 .ur-home-starter-cards .ask-card:last-child{border-bottom:none;}
  .home-surface-v1 .ur-home-starter-cards .ask-card:hover{
    border-bottom-color:rgba(255,255,255,0.06);
    border-left-width:2px;
  }
  .home-surface-v1 .ur-home-starter-cards .ask-card > div:last-child,
  .home-surface-v1 .ur-home-starter-cards .ur-home-starter-chev{color:var(--ur-cyan) !important;font-size:16px;flex-shrink:0;line-height:1;}
  .ur-home-promise{
    font-size:15px;
    font-weight:600;
    color:rgba(255,255,255,0.9);
    letter-spacing:-0.02em;
    line-height:1.35;
    margin:6px 0 14px;
    text-align:center;
    padding:0 10px;
  }
  .ur-home-promise--stripped{
    font-size:14px;
    font-weight:500;
    color:rgba(255,255,255,0.72);
    margin:0 0 14px;
    text-align:center;
    line-height:1.4;
  }
  .ur-home-try-row{display:flex;justify-content:center;margin:0 0 18px;}
  .ur-home-try-chip{
    display:inline-flex;
    align-items:center;
    gap:8px;
    flex-wrap:wrap;
    justify-content:center;
    max-width:100%;
    padding:10px 20px;
    border-radius:999px;
    border:1px solid rgba(0,245,233,0.4);
    background:rgba(0,245,233,0.08);
    cursor:pointer;
    font-family:var(--body-font);
    transition:background 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease;
  }
  .ur-home-try-chip:hover{background:rgba(0,245,233,0.12);border-color:rgba(0,245,233,0.55);box-shadow:0 0 18px rgba(0,245,233,0.12);}
  .ur-home-try-label{font-family:var(--mono-font);font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--cyan-bright);flex-shrink:0;}
  .ur-home-try-text{font-size:14px;font-weight:600;color:var(--text);text-align:left;line-height:1.35;}
  .ur-home-starters{margin-bottom:4px;}
  .ur-home-starters-heading{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.16em;
    text-transform:uppercase;
    color:rgba(255,255,255,0.38);
    margin:0 0 10px;
    padding-left:2px;
  }
  .ur-home-starter-cards{margin-bottom:14px;}
  .ur-home-live-module{margin-bottom:4px;}
  .ur-home-live-toggle{
    width:100%;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    padding:11px 12px;
    border-radius:12px;
    border:1px solid rgba(0,245,233,0.22);
    background:rgba(0,0,0,0.42);
    cursor:pointer;
    font-family:var(--mono-font);
    font-size:11px;
    letter-spacing:0.1em;
    text-transform:uppercase;
    color:rgba(255,255,255,0.78);
    transition:border-color 0.15s ease,background 0.15s ease;
  }
  .ur-home-live-toggle:hover{border-color:rgba(0,245,233,0.35);background:rgba(0,0,0,0.5);}
  .ur-home-live-toggle-title{
    flex:1;
    text-align:left;
    display:flex;
    align-items:center;
    gap:8px;
    font-size:11px;
    font-weight:700;
    letter-spacing:0.1em;
    text-transform:uppercase;
    color:var(--ur-cyan);
  }
  .ur-home-live-toggle-title::before{
    content:"";
    width:6px;
    height:6px;
    border-radius:50%;
    background:var(--ur-cyan);
    flex-shrink:0;
  }
  @media (prefers-reduced-motion:no-preference){
    .ur-home-live-toggle-title::before{animation:ur-pulse 2s ease-in-out infinite;}
  }
  .ur-home-live-toggle-count{color:var(--ur-cyan);font-weight:700;}
  .ur-home-live-toggle-chev{color:var(--cyan-bright);font-size:12px;flex-shrink:0;}
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
    width:100%;
    max-width:none;
  }
  .today-slate-empty{
    font-size:12px;
    color:var(--muted);
    margin-top:8px;
    line-height:1.45;
    width:100%;
    max-width:none;
  }

  .ask-wrap{margin:12px 0 18px;}
  .ask-row{display:flex;gap:8px;align-items:flex-end;}
  /* Inline AskBars (hero shells, detail screens, WTA): one row baseline with docked bar */
  .nba-ask-shell .ask-row,
  .nfl-ask-shell .ask-row,
  .f1-ask-shell .ask-row,
  .mlb-ask-shell .ask-row,
  .golf-ask-shell .ask-row,
  .tennis-ask-shell .ask-row,
  .wc-ask-shell .ask-row,
  .wta-ask-inline .ask-row,
  .home-surface-premium .ask-wrap .ask-row,
  .screen > .detail-card ~ .ask-wrap .ask-row,
  .screen > section.hero ~ .ask-wrap .ask-row{
    align-items:center;
    gap:10px;
  }
  .ask-col{flex:1;border:1px solid var(--border-2);background:var(--surface-2);border-radius:18px;overflow:hidden;transition:border-color .15s ease;}
  .ask-col:focus-within{border-color:rgba(0,245,233,.4);}
  .ask-img-preview{padding:8px 12px 0;display:flex;align-items:center;gap:8px;}
  .ask-img-thumb{width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border-2);}
  .ask-img-remove{background:rgba(255,45,107,.15);border:1px solid rgba(255,45,107,.3);color:var(--magenta);border-radius:6px;padding:3px 8px;font-family:var(--mono-font);font-size:10px;cursor:pointer;}
  /* 16px+ prevents iOS Safari from force-zooming the viewport on input focus */
  .ask-bar{width:100%;border:none;background:transparent;padding:10px 14px;color:var(--text);font-size:16px;line-height:1.35;outline:none;font-family:var(--body-font);-webkit-text-size-adjust:100%;touch-action:manipulation;}
  .ask-bar::placeholder{color:var(--ask-placeholder);opacity:1;}
  .ask-hint{font-family:var(--mono-font);font-size:9px;color:rgba(255,255,255,.52);letter-spacing:1px;padding:0 14px 8px;opacity:1;}
  .send-btn{width:44px;height:44px;border:none;border-radius:50%;background:var(--cyan-bright);color:#080A0C;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .send-btn:hover{background:var(--magenta);}
  .send-btn:disabled{background:var(--border);cursor:not-allowed;color:var(--muted);}
  .home-surface-v1 .ask-wrap .ask-col{
    border:1.5px solid transparent;
    background-image:linear-gradient(var(--surface-2),var(--surface-2)),linear-gradient(90deg,var(--ur-cyan),var(--ur-mag));
    background-origin:border-box,border-box;
    background-clip:padding-box,border-box;
    transition:box-shadow 0.15s ease,border-color 0.15s ease;
  }
  .home-surface-v1 .ask-wrap .ask-col:focus-within{
    box-shadow:0 0 0 3px rgba(0,245,233,0.12);
    border-color:transparent;
  }
  .ur-home-last-lean{
    margin:14px 0 18px;
    padding:14px 16px;
    border-radius:14px;
    border:0.5px solid rgba(0,245,233,0.22);
    background:rgba(8,12,16,0.92);
    box-sizing:border-box;
  }
  .ur-home-last-lean-label{
    font-family:var(--mono-font);
    font-size:9px;
    letter-spacing:0.14em;
    text-transform:uppercase;
    color:rgba(0,245,233,0.72);
    margin:0 0 8px;
  }
  .ur-home-last-lean-body{
    font-family:var(--body-font);
    font-size:15px;
    line-height:1.35;
    font-weight:500;
    color:#fff;
    margin:0 0 8px;
  }
  .ur-home-last-lean-meta{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.06em;
    color:rgba(255,255,255,0.45);
    margin:0 0 10px;
  }
  .ur-home-last-lean-cta,
  .ur-home-last-lean-upgrade-btn{
    font-family:var(--mono-font);
    font-size:11px;
    letter-spacing:0.08em;
    text-transform:none;
    color:var(--cyan-bright);
    background:transparent;
    border:none;
    padding:0;
    cursor:pointer;
    touch-action:manipulation;
  }
  .ur-home-last-lean-cta:hover,
  .ur-home-last-lean-upgrade-btn:hover{opacity:0.88;}
  .ur-home-last-lean-upgrade{margin-top:4px;}
  .ur-home-last-lean-upgrade-text{
    font-family:var(--body-font);
    font-size:12px;
    line-height:1.4;
    color:rgba(255,255,255,0.55);
    margin:0 0 8px;
  }
  .home-surface-v1 .ask-bar::placeholder{
    font-size:15px;
    color:var(--muted);
    opacity:1;
  }
  .home-surface-v1 .send-btn{
    background:linear-gradient(135deg,var(--magenta),#FF5A9A);
    color:#080A0C;
    transition:transform 120ms ease,filter 120ms ease,opacity 0.15s ease,background 0.15s ease;
  }
  .home-surface-v1 .send-btn:hover:not(:disabled){
    transform:scale(1.05);
    filter:brightness(1.06);
  }
  .home-surface-v1 .send-btn:active:not(:disabled){transform:scale(1.05);}
  .home-surface-v1 .send-btn:disabled{transform:none;filter:none;}
  .attach-btn{width:44px;height:44px;border:1px solid var(--border-2);border-radius:50%;background:var(--surface);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s ease;}
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

  .ur-onboarding-backdrop{position:fixed;inset:0;z-index:120;background:rgba(8,10,12,.88);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);}
  .ur-onboarding-card{background:var(--surface);border:1px solid var(--border-2);border-radius:18px;padding:22px 20px;max-width:380px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.35);}
  .ur-onboarding-title{font-family:var(--display-font);font-size:22px;letter-spacing:1px;margin-bottom:12px;background:linear-gradient(90deg,var(--cyan-bright),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .ur-onboarding-lead{font-size:14px;color:var(--soft);line-height:1.55;margin:0 0 14px;}
  .ur-onboarding-list{margin:0 0 18px;padding-left:18px;font-size:13px;color:var(--muted);line-height:1.5;}
  .ur-onboarding-cta{width:100%;border:none;border-radius:12px;padding:12px 16px;font-family:var(--body-font);font-size:15px;font-weight:600;cursor:pointer;background:var(--cyan-bright);color:#080A0C;}

  .ur-session-context-header{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 4px 12px;font-family:var(--mono-font);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);}
  .ur-session-context-kicker{color:rgba(0,245,233,.75);}
  .ur-session-context-sport{color:rgba(255,255,255,.72);}
  .ur-session-context-meta{letter-spacing:0.08em;color:rgba(255,255,255,.45);}
  .ur-session-context-divider{opacity:.35;}
  .ur-session-locked-line{
    font-family:var(--mono-font);
    font-size:9px;
    letter-spacing:0.14em;
    text-transform:uppercase;
    color:rgba(0,245,233,0.42);
    padding:0 16px 10px;
    margin:0;
    line-height:1.35;
  }
  .ur-session-context-soft{
    color:rgba(255,255,255,0.38);
    letter-spacing:0.1em;
    text-transform:none;
    font-size:10px;
  }

  .ur-first-session-home{
    display:flex;
    flex-direction:column;
    align-items:stretch;
    justify-content:center;
    min-height:min(72dvh,640px);
    padding:24px 20px 32px;
    box-sizing:border-box;
  }
  .ur-first-session-stack{max-width:420px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:18px;}
  .ur-first-session-headline{
    font-family:var(--display-font);
    font-size:clamp(28px,8vw,36px);
    letter-spacing:0.04em;
    line-height:1.05;
    color:var(--text);
    text-align:center;
    margin:0;
  }
  .ur-first-session-wait{font-size:13px;color:var(--muted);text-align:center;margin:0;}
  .ur-first-session-prompts{display:flex;flex-direction:column;gap:10px;width:100%;}
  .ur-first-session-pill{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    width:100%;
    padding:14px 16px;
    border-radius:14px;
    border:1px solid rgba(255,255,255,0.1);
    background:rgba(255,255,255,0.04);
    cursor:pointer;
    text-align:left;
    transition:background 0.15s ease,border-color 0.15s ease;
  }
  .ur-first-session-pill:hover{border-color:rgba(0,245,233,0.35);background:rgba(0,245,233,0.06);}
  .ur-first-session-pill:disabled{opacity:0.55;cursor:default;}
  .ur-first-session-pill-text{font-family:var(--body-font);font-size:15px;font-weight:600;line-height:1.3;flex:1;min-width:0;}
  .ur-first-session-pill-arrow{font-size:18px;font-weight:700;flex-shrink:0;}
  .ur-first-session-foot{font-size:11px;color:rgba(255,255,255,0.38);text-align:center;margin:8px 0 0;font-family:var(--mono-font);letter-spacing:0.06em;line-height:1.5;}
  .ur-first-session-foot-secondary{display:block;margin-top:4px;font-size:10px;color:rgba(255,255,255,0.28);}

  .ur-ask-retention-strip{
    flex-shrink:0;
    padding:10px 16px 12px;
    border-top:1px solid rgba(255,255,255,0.06);
    background:rgba(8,10,12,0.92);
    display:flex;
    flex-direction:column;
    gap:10px;
  }
  .ur-ask-retention-row{display:flex;flex-direction:column;gap:8px;}
  .ur-ask-retention-copy{font-size:12px;line-height:1.45;color:rgba(255,255,255,0.55);margin:0;}
  .ur-ask-retention-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
  button.ur-ask-retention-btn{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.1em;
    text-transform:uppercase;
    padding:8px 12px;
    border-radius:10px;
    border:1px solid rgba(0,245,233,0.35);
    background:rgba(0,245,233,0.1);
    color:var(--cyan-bright);
    cursor:pointer;
    transition:opacity 0.15s ease;
  }
  button.ur-ask-retention-btn:hover{opacity:0.92;}
  button.ur-ask-retention-btn--ghost{
    border-color:rgba(255,255,255,0.12);
    background:transparent;
    color:var(--muted);
  }
  .ur-ask-saved-list{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;}
  button.ur-ask-saved-item{
    width:100%;
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    gap:2px;
    padding:10px 12px;
    border-radius:10px;
    border:1px solid rgba(255,255,255,0.08);
    background:rgba(255,255,255,0.03);
    cursor:pointer;
    text-align:left;
  }
  button.ur-ask-saved-item:hover{border-color:rgba(0,245,233,0.25);}
  .ur-ask-saved-sport{font-family:var(--mono-font);font-size:9px;letter-spacing:0.12em;color:rgba(0,245,233,0.65);text-transform:uppercase;}
  .ur-ask-saved-snippet{font-size:13px;color:var(--soft);line-height:1.35;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;}

  .ur-record-dashboard-wrap{margin:16px 16px 0;padding:14px 16px 16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;}
  .ur-record-dashboard-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
  .ur-record-heading{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--cyan-bright);text-transform:uppercase;}
  .ur-record-head-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .ur-record-csv-btn,.ur-record-refresh-btn{font-family:var(--mono-font);font-size:10px;letter-spacing:0.5px;padding:6px 10px;border-radius:8px;border:1px solid var(--border-2);background:var(--surface-2);color:var(--muted);cursor:pointer;}
  .ur-record-csv-btn:hover,.ur-record-refresh-btn:hover{border-color:rgba(255,255,255,0.25);color:var(--soft);}
  .ur-record-muted{font-size:12px;color:var(--muted);line-height:1.5;margin:0;}
  .ur-record-err{font-size:12px;color:#ff4444;margin:0;}

  .ur-record-overall{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:baseline;margin-bottom:14px;font-family:var(--mono-font);font-size:13px;color:var(--soft);}
  .ur-record-wlp{font-weight:700;color:var(--text);}
  .ur-record-roi{color:#00F5E9;}
  .ur-record-sample{font-size:11px;color:var(--muted);}

  .ur-record-section-label{font-family:var(--mono-font);font-size:9px;letter-spacing:1.5px;color:var(--muted);text-transform:uppercase;margin:14px 0 6px;}

  .ur-record-data-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;color:var(--soft);}
  .ur-record-mono{font-family:var(--mono-font);font-size:11px;color:rgba(255,255,255,0.85);}

  .ur-record-last-grid{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
  .ur-record-last-row{display:grid;grid-template-columns:52px 44px minmax(0,1fr) 22px 10px;gap:8px;align-items:center;padding:8px 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;font-size:12px;}
  .ur-record-last-date{color:var(--muted);}
  .ur-record-last-sport{font-family:var(--mono-font);font-size:10px;color:rgba(255,255,255,0.55);}
  .ur-record-last-pick{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--soft);}
  .ur-record-result-badge{font-family:var(--mono-font);font-size:10px;font-weight:700;text-align:center;}
  .ur-badge-w{color:#00ff87;}
  .ur-badge-l{color:#ff4444;}
  .ur-badge-p{color:rgba(255,255,255,0.45);}
  .ur-record-conf-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block;}

  .ur-record-gate{text-align:center;padding:20px 16px;margin:16px 16px 0;background:var(--surface);border:1px solid var(--border);border-radius:14px;}
  .ur-record-teaser{font-family:var(--mono-font);font-size:13px;color:var(--soft);margin-bottom:8px;}
  .ur-record-unlock{font-size:11px;color:var(--muted);margin-bottom:14px;}
  button.ur-upgrade-btn{font-family:var(--mono-font);font-size:12px;letter-spacing:1px;padding:10px 18px;border-radius:10px;border:1px solid rgba(245,200,66,0.35);background:rgba(245,200,66,0.08);color:#F5C842;cursor:pointer;}
  button.ur-upgrade-btn:hover{border-color:rgba(245,200,66,0.55);background:rgba(245,200,66,0.12);}

  .ur-take-share-anchor{position:absolute;bottom:8px;right:8px;z-index:1;}
  button.ur-share-btn{
    font-family:monospace;
    font-size:11px;
    color:#ffffff;
    background:transparent;
    border:1px solid rgba(255,255,255,0.4);
    border-radius:6px;
    padding:5px 10px;
    cursor:pointer;
    transition:all 150ms ease;
  }
  button.ur-share-btn:hover{
    color:#ffffff;
    border-color:rgba(255,255,255,0.55);
  }

  .ur-card-root{
    background:#0d1117;
    border-radius:16px;
    border:1px solid rgba(255,255,255,0.08);
    overflow:hidden;
  }
  .ur-card-accent-bar{
    height:6px;
    width:100%;
    background:linear-gradient(90deg,#00d4a8,#00e5b0);
    margin-bottom:10px;
    flex-shrink:0;
  }
  .ur-card-meta-row{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:12px;
  }
  .ur-card-bottom-row{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-top:16px;
  }
  .ur-closing-share-row{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
    margin-top:16px;
  }
  .ur-closing-share-row .ur-closing-block{
    margin-top:0;
    flex:1;
    min-width:0;
  }
  .ur-card-sport-tag{
    font-family:monospace;
    font-size:10px;
    letter-spacing:0.12em;
    color:#00d4a8;
    text-transform:uppercase;
    margin-bottom:0;
  }
  .ur-card-body{
    padding-left:20px;
    padding-right:20px;
    padding-bottom:16px;
    padding-top:24px;
  }
  .ur-card-headline{
    font-size:20px;
    font-weight:600;
    color:#ffffff;
    line-height:1.3;
    letter-spacing:-0.2px;
    margin-bottom:16px;
  }
  .ur-conf-pill-high{
    font-size:11px;
    font-weight:500;
    padding:3px 12px;
    border-radius:20px;
    background:rgba(74,222,128,0.1);
    color:#4ade80;
    border:1px solid rgba(74,222,128,0.25);
  }
  .ur-conf-pill-medium{
    font-size:11px;
    font-weight:500;
    padding:3px 12px;
    border-radius:20px;
    background:rgba(234,179,8,0.1);
    color:#eab308;
    border:1px solid rgba(234,179,8,0.25);
  }
  .ur-conf-pill-speculative{
    font-size:11px;
    font-weight:500;
    padding:3px 12px;
    border-radius:20px;
    background:rgba(148,163,184,0.1);
    color:#94a3b8;
    border:1px solid rgba(148,163,184,0.25);
  }
  .ur-labeled-block-label{
    font-family:monospace;
    font-size:9px;
    letter-spacing:0.18em;
    text-transform:uppercase;
    color:rgba(255,255,255,0.25);
    margin-bottom:6px;
    padding-left:10px;
    border-left:2px solid rgba(255,255,255,0.1);
    border-radius:0;
  }
  .ur-edge-block{
    background:rgba(99,102,241,0.08);
    border-left:3px solid #6366f1;
    border-radius:0 10px 10px 0;
    padding:12px 16px;
    margin-bottom:16px;
  }
  .ur-edge-block-label{
    font-family:monospace;
    font-size:9px;
    letter-spacing:0.15em;
    color:#6366f1;
    text-transform:uppercase;
    margin-bottom:5px;
  }
  .ur-pick-row{
    border-left:3px solid #6366f1;
    border-radius:0 8px 8px 0;
    background:rgba(99,102,241,0.06);
    padding:10px 14px;
    margin-bottom:8px;
    font-size:13px;
    color:rgba(255,255,255,0.85);
    line-height:1.4;
  }
  .ur-prose-chunk{
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(255,255,255,0.06);
    border-radius:10px;
    padding:12px 14px;
    margin-bottom:10px;
    font-size:13px;
    color:rgba(255,255,255,0.65);
    line-height:1.6;
  }
  .ur-closing-block{
    background:rgba(0,212,168,0.06);
    border:2px solid rgba(0,212,168,0.4);
    border-left:4px solid #00d4a8;
    border-radius:10px;
    padding:14px 16px;
    margin:16px 0 0;
    font-size:14px;
    font-weight:600;
    color:#ffffff;
    line-height:1.4;
  }

  .ur-thread-follow-ups{margin-top:-11px;padding:0;width:100%;}
  .ur-imessage-assistant-row:has(.ur-take-response-bubble-host) + .ur-thread-follow-ups{
    margin-top:-11px;
  }
  .ur-take-follow-up-panel{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    gap:8px;
    width:100%;
    box-sizing:border-box;
    background:transparent;
  }
  .ur-take-follow-up-panel__kicker{
    margin:0;
    padding:0;
    width:100%;
    font-family:var(--mono-font);
    font-size:10px;
    font-weight:400;
    letter-spacing:0.14em;
    text-transform:uppercase;
    color:rgba(255,255,255,0.6);
    line-height:1.3;
  }
  .ur-take-follow-up-panel__chips{
    display:flex;
    flex-wrap:wrap;
    align-items:flex-start;
    gap:8px;
    width:100%;
    max-width:100%;
  }
  button.ur-take-follow-up-chip{
    flex-shrink:0;
    max-width:100%;
    margin:0;
    padding:8px 16px;
    border-radius:999px;
    border:1px solid #00F5E9;
    background:transparent;
    color:#fff;
    font-family:var(--body-font);
    font-size:14px;
    font-weight:400;
    line-height:1.35;
    cursor:pointer;
    text-align:left;
    white-space:normal;
    transition:background 0.15s ease,border-color 0.15s ease,opacity 0.15s ease;
  }
  button.ur-take-follow-up-chip--cyan{border-color:#00F5E9;}
  button.ur-take-follow-up-chip--magenta{border-color:#FF2D6B;}
  button.ur-take-follow-up-chip--cyan:hover{background:rgba(0,245,233,0.15);}
  button.ur-take-follow-up-chip--magenta:hover{background:rgba(255,45,107,0.15);}
  button.ur-take-follow-up-chip:focus-visible{outline:2px solid currentColor;outline-offset:2px;}
  button.ur-take-follow-up-chip--cyan:focus-visible{outline-color:#00F5E9;}
  button.ur-take-follow-up-chip--magenta:focus-visible{outline-color:#FF2D6B;}
  button.ur-take-follow-up-chip:active{opacity:0.88;}
  .ur-take-follow-up-panel--thread{
    margin-top:0;
    padding:14px 16px 14px;
    background:#080808;
    border-top:0.5px solid #1a1a1a;
    border-bottom:0.5px solid #1a1a1a;
  }
  .chat-thread--ur-chat-dock .ur-take-follow-up-panel--thread{
    padding-left:0;
    padding-right:0;
  }
  .ur-take-follow-up-panel--dock{
    padding:8px 16px 10px;
    border-top:1px solid rgba(255,255,255,0.06);
    background:transparent;
  }
  .ur-thread-upgrade-nudge{
    display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px 12px;
    margin-top:6px;padding:8px 6px 10px;
    font-family:var(--mono-font);font-size:10px;letter-spacing:0.12em;line-height:1.45;
    color:rgba(255,255,255,0.4);text-align:center;
  }
  .ur-thread-upgrade-nudge-text{max-width:42ch;}
  button.ur-thread-upgrade-nudge-btn{
    font-family:var(--mono-font);font-size:10px;letter-spacing:0.14em;text-transform:none;
    color:#00d4a8;background:transparent;border:1px solid #00d4a8;border-radius:6px;
    padding:5px 12px;cursor:pointer;flex-shrink:0;transition:opacity 150ms ease;
  }
  button.ur-thread-upgrade-nudge-btn:hover{opacity:0.92;}
  button.ur-thread-upgrade-nudge-btn:active{opacity:0.85;}

  .ur-free-limit-chip{
    display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
    margin-bottom:8px;padding:8px 10px;border-radius:10px;
    border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);
    font-family:var(--mono-font);font-size:10px;letter-spacing:0.12em;line-height:1.45;
    color:rgba(255,255,255,0.4);
  }
  .ur-free-limit-chip-main{flex:1;min-width:0;}
  button.ur-free-limit-chip-dismiss{
    flex-shrink:0;border:none;background:transparent;color:rgba(255,255,255,0.35);
    cursor:pointer;font-size:16px;line-height:1;padding:0 2px;font-family:var(--mono-font);
  }
  button.ur-free-limit-chip-dismiss:hover{color:rgba(255,255,255,0.55);}
  button.ur-free-limit-chip-unlock{
    border:none;background:transparent;font-family:var(--mono-font);font-size:10px;
    letter-spacing:0.14em;color:#00d4a8;cursor:pointer;padding:0;margin-left:4px;
    text-decoration:underline;text-underline-offset:2px;
  }
  button.ur-free-limit-chip-unlock:hover{opacity:0.92;}
  .chat-thread{display:flex;flex-direction:column;gap:12px;margin-top:8px;flex:1;min-height:0;}
  .chat-thread--ur-chat-dock{gap:10px;}
  .ur-chat-thread-anchor{height:1px;width:100%;flex-shrink:0;margin:0;padding:0;pointer-events:none;overflow:hidden;opacity:0;}
  .ur-imessage-user-row{
    display:flex;
    flex-direction:column;
    align-items:stretch;
    width:100%;
    padding:0;
    margin:0;
    box-sizing:border-box;
  }
  .ur-imessage-user-row .bubble--imessage-user{
    align-self:flex-end;
    margin-left:auto;
    margin-right:0;
    max-width:85%;
    width:auto;
    background:rgba(255,255,255,0.08);
    border:none;
    border-radius:18px 18px 4px 18px;
    color:#fff;
    font-size:15px;
    line-height:1.45;
    padding:12px 16px;
    box-shadow:none;
    text-align:left;
  }
  .ur-imessage-assistant-row{width:100%;margin:0;padding:0;box-sizing:border-box;display:flex;justify-content:flex-start;}
  .ur-imessage-assistant-row .bubble--imessage-ai{width:100%;max-width:none;margin:0;padding:0;background:transparent;border:none;box-shadow:none;border-radius:0;}
  .bubble{border-radius:18px;padding:13px 14px;font-size:14px;line-height:1.65;overflow-wrap:break-word;word-break:break-word;}
  .ur-take-structured,.ur-take-response{overflow-wrap:break-word;word-break:break-word;}
  .bubble.user{margin-left:0;margin-right:0;max-width:none;width:100%;background:#1E2B38;border:1px solid rgba(8,145,178,0.45);color:#E8EAF0;border-bottom-right-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,0.18);box-sizing:border-box;}
  /* App-class prefix beats theme .bubble.user rules (theme CSS is appended after baseCss). */
  .app .ur-imessage-user-row .bubble.user.bubble--imessage-user{
    box-sizing:border-box;
    display:block;
    align-self:flex-end;
    max-width:85%;
    width:fit-content;
    margin-left:auto;
    margin-right:0;
    background:rgba(255,255,255,0.08);
    border:none;
    border-radius:18px 18px 4px 18px;
    color:#fff;
    box-shadow:none;
    padding:12px 16px;
    font-size:15px;
    line-height:1.45;
    text-align:left;
  }
  .app .chat-thread--ur-chat-dock .ur-imessage-user-row .bubble.user.bubble--imessage-user--caption{
    max-width:82%;
    width:100%;
    background:transparent;
    border:none;
    border-radius:0;
    box-shadow:none;
    padding:8px 0 10px;
    text-align:right;
  }
  .ur-user-ask-kicker{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:0.14em;
    text-transform:uppercase;
    color:rgba(170,179,194,0.78);
  }
  .ur-user-ask-sep{font-family:var(--mono-font);font-size:10px;color:rgba(255,255,255,0.22);}
  .ur-user-ask-body{
    display:block;
    margin-top:6px;
    font-size:15px;
    line-height:1.45;
    font-weight:500;
    color:rgba(255,255,255,0.92);
    text-align:right;
  }
  .ur-take-ai-panel{
    background:transparent;
    border:none;
    box-shadow:none;
    padding:0;
    margin:0 0 12px;
    width:100%;
    max-width:100%;
    box-sizing:border-box;
  }
  .ur-take-ai-panel--breakdown{
    padding:0 0 2px 12px;
    border-left:2px solid rgba(0,245,233,0.35);
    margin-bottom:12px;
  }
  .ur-take-ai-panel--visual{padding:0;margin-bottom:12px;}
  .bubble.ai{margin-left:0;margin-right:0;max-width:none;width:100%;background:var(--surface);border:1px solid var(--border);color:var(--soft);border-bottom-left-radius:6px;box-sizing:border-box;}
  /* Host is toggled in helpers.jsx when the thread renders URTakeResponse — beats theme .bubble.ai without :has(). */
  .app .bubble.ai.ur-take-response-bubble-host{
    max-width:none;
    width:100%;
    margin-left:0;
    margin-right:0;
    padding:0 !important;
    background:transparent !important;
    background-color:transparent !important;
    border:none !important;
    box-shadow:none !important;
    border-radius:0 !important;
  }
  .app .bubble.ai.ur-take-response-bubble-host .ur-take-structured{margin-top:0;}
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

  .bottom-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    z-index:40;
    display:flex;
    flex-direction:row;
    flex-wrap:nowrap;
    align-items:stretch;
    gap:2px;
    padding:8px 4px max(10px,env(safe-area-inset-bottom)) 4px;
    overflow-x:auto;
    overflow-y:hidden;
    scrollbar-width:none;
    -webkit-overflow-scrolling:touch;
    border-top:1px solid rgba(255,255,255,0.08);
    background:linear-gradient(180deg,rgba(10,12,14,0.99) 0%,rgba(8,10,12,0.98) 40%,var(--nav-bg) 100%);
    backdrop-filter:blur(10px);
    -webkit-backdrop-filter:blur(10px);
    box-shadow:0 -2px 0 rgba(0,0,0,0.35),0 -6px 18px rgba(0,0,0,0.22);
    box-sizing:border-box;
  }
  .bottom-nav::-webkit-scrollbar{display:none;}
  .nav-btn{
    position:relative;
    flex:0 0 auto;
    background:none;
    border:none;
    color:rgba(255,255,255,.42);
    font-family:var(--display-font,'Bebas Neue',sans-serif);
    font-size:13px;
    font-weight:700;
    letter-spacing:1px;
    cursor:pointer;
    padding:8px 10px 10px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:2px;
    opacity:1;
    text-transform:uppercase;
    min-height:46px;
    line-height:1;
    white-space:nowrap;
  }
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
  .nav-btn.wc-active::after,
  .nav-btn.nav-pro-on::after{
    content:"";
    position:absolute;
    bottom:6px;
    left:50%;
    transform:translateX(-50%);
    width:4px;
    height:4px;
    border-radius:50%;
  }
  .nav-btn.active::after{background:var(--cyan-bright);}
  .nav-btn.tennis-active::after{background:#F5C842;}
  .nav-btn.nfl-active::after{background:#4A90D9;}
  .nav-btn.f1-active::after{background:var(--f1);}
  .nav-btn.nba-active::after{background:#FF6B00;}
  .nav-btn.mlb-active::after{background:#1DB954;}
  .nav-btn.golf-active::after{background:#C8D4E0;}
  .nav-btn.nav-pro-on::after{background:#F5C842;}
  .bottom-nav .nav-btn--ur-take{
    background:rgba(0,245,233,0.08);
    border-radius:6px;
    padding:4px 8px;
    margin:0 2px;
    min-height:42px;
  }
  .bottom-nav .nav-btn--ur-take.active{
    color:var(--cyan-bright);
    background:rgba(0,245,233,0.12);
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

  .nba-player-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .nba-player-card:hover{border-color:rgba(255,107,0,.35);}
  .nba-player-card--stale{opacity:.92;border-color:rgba(255,180,0,.25);}
  .nba-player-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;}
  .nba-player-card-name{font-size:15px;font-weight:600;color:var(--text);}
  .nba-player-card-meta{font-size:11px;color:var(--muted);margin-top:2px;}
  .nba-player-card-book{font-family:var(--mono-font);font-size:10px;color:var(--nba);text-align:right;}
  .nba-player-card-book--muted{color:var(--muted);}
  .nba-player-card-props{display:flex;flex-direction:column;gap:4px;}
  .nba-player-prop-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;}
  .nba-player-prop-label{font-family:var(--mono-font);font-size:10px;color:var(--muted);width:28px;}
  .nba-player-prop-line{font-family:var(--mono-font);color:var(--text);}
  .nba-player-prop-ou{color:var(--muted);font-size:10px;}
  .nba-player-card-freshness{margin-top:8px;font-size:10px;color:var(--muted);font-family:var(--mono-font);}
  .nba-player-card-grid{display:flex;flex-direction:column;gap:0;padding:0 0 12px;}

  .page-spacer{height:20px;}
  .nav-btn.golf-active{color:#FFFFFF;}
  .nav-btn.wc-active{color:#F59E0B;}
  .nav-btn.wc-active::after{background:#F59E0B;}

  .wc-live-badge{
    display:inline-flex;
    align-items:center;
    gap:4px;
    background:#EF444420;
    color:#EF4444;
    font-size:11px;
    font-weight:800;
    padding:3px 8px;
    border-radius:20px;
    letter-spacing:0.08em;
  }
  .wc-live-dot{
    width:6px;
    height:6px;
    border-radius:50%;
    background:#EF4444;
    animation:wcLivePulse 1.2s ease-in-out infinite;
  }
  @keyframes wcLivePulse{
    0%,100%{opacity:1;transform:scale(1);}
    50%{opacity:0.4;transform:scale(0.8);}
  }
  .wc-group-advance{background:rgba(34,197,94,0.08);}
  .wc-group-eliminated{opacity:0.5;}
  .wc-odds-bar{
    display:flex;
    height:4px;
    border-radius:2px;
    overflow:hidden;
    margin-top:6px;
  }
  .wc-odds-bar span{display:block;height:100%;}
  .wc-screen{padding-top:4px;}
  .wc-header{margin-bottom:14px;}
  .wc-title{font-family:var(--display-font);font-size:28px;letter-spacing:2px;color:var(--wc-gold);line-height:1;}
  .wc-subtitle{font-size:13px;color:var(--soft);margin-top:4px;}
  .wc-dates{font-size:11px;color:var(--muted);font-family:var(--mono-font);margin-top:2px;}
  .wc-main-tabs,.wc-sub-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px;}
  .wc-main-tab,.wc-sub-tab{
    flex:0 0 auto;
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--soft);
    border-radius:10px;
    padding:8px 12px;
    font-size:12px;
    font-weight:700;
    cursor:pointer;
    text-transform:uppercase;
    letter-spacing:0.06em;
  }
  .wc-main-tab--on,.wc-sub-tab--on{border-color:var(--wc-gold);color:var(--wc-gold);background:rgba(245,158,11,0.08);}
  .wc-groups-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
  @media (max-width:520px){.wc-groups-grid{grid-template-columns:1fr;}}
  .wc-group-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px;margin-bottom:0;}
  .wc-group-card-head{font-family:var(--display-font);font-size:16px;letter-spacing:1px;margin-bottom:8px;}
  .wc-group-team-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
  .wc-group-team-row{
    display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 4px;border-radius:8px;cursor:pointer;
  }
  .wc-group-team-row:hover{background:rgba(255,255,255,0.04);}
  .wc-group-team-name{flex:1;min-width:0;font-weight:600;font-size:13px;text-align:left;}
  .wc-group-team-record{font-family:var(--mono-font);font-size:10px;color:var(--muted);width:100%;padding-left:40px;}
  .wc-strength-tag{
    font-family:var(--mono-font);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;
    padding:2px 6px;border-radius:4px;border:1px solid var(--border-2);
  }
  .wc-strength--favorite{color:var(--wc-gold);border-color:rgba(245,158,11,0.35);}
  .wc-strength--contender{color:#93c5fd;border-color:rgba(59,130,246,0.35);}
  .wc-strength--longshot{color:var(--muted);}
  .wc-flag-sm{border-radius:2px;object-fit:cover;display:block;}
  .wc-flag-lg{border-radius:4px;object-fit:cover;margin:12px 0;}
  .wc-group-expand{width:100%;margin-top:6px;background:none;border:none;color:var(--wc-gold);font-size:11px;cursor:pointer;padding:4px;}
  .wc-match-list{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
  .wc-match-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;}
  .wc-match-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
  .wc-detail-btn{
    padding:8px 12px;border-radius:8px;border:1px solid var(--border);
    background:transparent;color:var(--soft);font-size:12px;cursor:pointer;
  }
  .wc-detail-drawer-backdrop{
    position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1200;
    display:flex;align-items:flex-end;justify-content:center;padding:16px;
  }
  .wc-detail-drawer{
    width:min(480px,100%);max-height:80vh;overflow:auto;background:var(--surface);
    border:1px solid var(--border);border-radius:16px 16px 12px 12px;padding:16px 18px 20px;
    position:relative;
  }
  .wc-detail-close{
    position:absolute;top:8px;right:10px;border:none;background:none;color:var(--muted);
    font-size:22px;cursor:pointer;line-height:1;
  }
  .wc-detail-title{margin:0 0 6px;font-size:17px;}
  .wc-detail-meta,.wc-detail-xi,.wc-detail-muted{font-size:12px;color:var(--muted);margin:0 0 10px;}
  .wc-detail-section{margin:12px 0;}
  .wc-detail-section h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);}
  .wc-detail-stat-row{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;font-size:13px;margin-bottom:6px;}
  .wc-detail-stat-label{text-align:center;color:var(--muted);font-size:11px;}
  .wc-detail-props-list{list-style:none;margin:0;padding:0;}
  .wc-detail-props-list li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--border-2);font-size:13px;}
  .wc-fetch-error{
    margin:0 0 14px;padding:12px 14px;border-radius:12px;
    border:1px solid rgba(239,68,68,0.35);background:rgba(239,68,68,0.08);
    display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  }
  .wc-fetch-error p{margin:0;font-size:13px;color:#fecaca;line-height:1.45;}
  .wc-fetch-error-retry{
    padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);
    background:rgba(255,255,255,0.06);color:#fff;font-size:12px;font-weight:600;cursor:pointer;
    font-family:var(--mono-font);letter-spacing:0.04em;
  }
  .nba-finals-take-card{padding:0;}
  .nba-finals-take-headline{
    font-family:var(--display-font);font-size:15px;font-weight:600;line-height:1.35;
    letter-spacing:0.02em;margin:0 0 14px;color:var(--text);
  }
  .nba-finals-sharp-angle{
    margin:0 0 14px;padding:12px 14px;border-radius:10px;
    border:1px solid rgba(249,115,22,0.45);background:rgba(249,115,22,0.08);
  }
  .nba-finals-sharp-angle-label{
    display:block;font-family:var(--mono-font);font-size:9px;letter-spacing:1.4px;
    text-transform:uppercase;color:rgba(249,115,22,0.9);margin-bottom:6px;
  }
  .nba-finals-sharp-angle-value{
    display:block;font-size:16px;font-weight:700;line-height:1.35;color:#fff;
  }
  .nba-finals-take-row{
    margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border-2);
  }
  .nba-finals-take-row:last-of-type{border-bottom:none;margin-bottom:0;padding-bottom:0;}
  .nba-finals-take-row-label{
    font-family:var(--mono-font);font-size:9px;letter-spacing:1.3px;
    text-transform:uppercase;color:var(--muted);margin-bottom:5px;
  }
  .nba-finals-take-row-body{
    margin:0;font-size:13px;line-height:1.55;color:var(--soft);
  }
  .nba-finals-take-footer{
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    margin-top:14px;padding-top:12px;border-top:1px solid var(--border-2);
  }
  .nba-finals-confidence-pill{
    font-family:var(--mono-font);font-size:10px;letter-spacing:0.08em;
    color:var(--muted);text-transform:uppercase;
  }
  .wc-take-card{padding:0;}
  .wc-take-headline{
    font-family:var(--display-font);font-size:15px;font-weight:600;line-height:1.35;
    letter-spacing:0.02em;margin:0 0 12px;padding:0 16px;color:var(--text);
  }
  .wc-take-stat-grid{margin-bottom:4px;}
  .wc-take-row{
    margin-bottom:12px;padding:0 16px 12px;border-bottom:1px solid var(--border-2);
  }
  .wc-take-row:last-of-type{border-bottom:none;margin-bottom:0;padding-bottom:0;}
  .wc-take-row-label{
    font-family:var(--mono-font);font-size:9px;letter-spacing:1.3px;
    text-transform:uppercase;color:var(--muted);margin-bottom:5px;
  }
  .wc-take-row-body{
    margin:0;font-size:13px;line-height:1.55;color:var(--soft);
  }
  .wc-take-breakdown-toggle{margin:4px 16px 0;}
  .wc-take-breakdown-panel{
    margin:8px 16px 0;padding:12px 0 4px;border-top:1px solid var(--border-2);
  }
  .wc-take-breakdown-label{
    font-family:var(--mono-font);font-size:9px;letter-spacing:1.3px;
    text-transform:uppercase;color:var(--muted);margin-bottom:8px;
  }
  .wc-take-breakdown-body{
    font-size:13px;line-height:1.6;color:var(--soft);white-space:pre-wrap;
  }
  .wc-take-footer{
    display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 12px;
    margin-top:14px;padding:12px 16px 10px;border-top:1px solid var(--border-2);
  }
  .wc-take-confidence-pill{
    font-family:var(--mono-font);font-size:10px;letter-spacing:0.08em;
    color:var(--cyan-bright);text-transform:uppercase;font-weight:600;
  }
  .wc-take-footer-actions{
    display:flex;align-items:center;gap:10px;margin-left:auto;
  }
  .wc-book-ml-row{
    display:flex;flex-wrap:wrap;gap:8px 12px;margin-top:8px;padding-top:8px;
    border-top:1px solid var(--border-2);font-size:10px;font-family:var(--mono-font);
    color:var(--soft);letter-spacing:0.02em;
  }
  .book-odds-panel{
    margin-top:10px;padding-top:10px;border-top:1px solid var(--border-2);
  }
  .book-odds-panel--compact{font-size:10px;}
  .book-odds-label{
    font-family:var(--mono-font);font-size:9px;letter-spacing:1.4px;
    text-transform:uppercase;color:var(--muted);margin-bottom:8px;
  }
  .book-odds-muted{font-size:10px;color:var(--muted);font-family:var(--mono-font);}
  .book-odds-table{display:flex;flex-direction:column;gap:0;}
  .book-odds-head,.book-odds-row,.book-odds-avg-row{
    display:grid;
    grid-template-columns:minmax(72px,1.1fr) repeat(var(--book-odds-cols, 2), minmax(0, 1fr));
    gap:6px 8px;align-items:center;
    font-family:var(--mono-font);font-size:10px;line-height:1.35;
  }
  .book-odds-head{
    color:var(--muted);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;
    padding-bottom:6px;border-bottom:1px solid var(--border-2);margin-bottom:4px;
  }
  .book-odds-row{padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
  .book-odds-row:last-child{border-bottom:none;}
  .book-odds-row--espn{opacity:0.92;}
  .book-odds-avg-row{
    color:var(--cyan-bright);font-weight:600;margin-bottom:6px;padding-bottom:6px;
    border-bottom:1px dashed rgba(0,245,233,0.22);
  }
  .book-odds-avg-label{color:var(--cyan-bright);text-transform:none;letter-spacing:0.02em;}
  .book-odds-book-col{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .book-odds-book-name{color:var(--soft);font-weight:600;}
  .book-odds-ml-col{color:var(--text);text-align:right;}
  .book-odds-draw-col{text-align:right;}
  .book-odds-dash{color:var(--muted);}
  .book-odds-foot{
    margin-top:6px;font-size:9px;color:var(--muted);font-family:var(--mono-font);
    letter-spacing:0.04em;
  }
  .book-odds-panel:has(.book-odds-draw-col){--book-odds-cols:3;}
  .book-odds-panel:not(:has(.book-odds-draw-col)){--book-odds-cols:2;}
  .wc-match-teams{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
  .wc-match-team{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;flex:1;}
  .wc-match-vs{font-family:var(--mono-font);font-size:11px;color:var(--muted);flex:0 0 auto;}
  .wc-match-score{font-size:16px;font-weight:700;color:var(--text);}
  .wc-xi-trust{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
  .wc-xi-chip{
    display:inline-flex;align-items:center;gap:5px;
    padding:4px 9px;border-radius:6px;
    font-family:var(--mono-font);font-size:9px;letter-spacing:1.1px;
    text-transform:uppercase;font-weight:600;
  }
  .wc-xi-chip-icon{font-size:10px;line-height:1;opacity:0.9;}
  .wc-xi-chip--confirmed{
    color:rgba(34,197,94,0.95);
    border:1px solid rgba(34,197,94,0.35);
    background:rgba(34,197,94,0.08);
  }
  .wc-xi-chip--pending{
    color:rgba(245,158,11,0.95);
    border:1px solid rgba(245,158,11,0.35);
    background:rgba(245,158,11,0.08);
  }
  .wc-xi-chip--unavailable{
    color:var(--muted);
    border:1px solid var(--border-2);
    background:rgba(255,255,255,0.03);
  }
  .wc-xi-asof{font-size:9px;color:var(--muted);font-family:var(--mono-font);letter-spacing:0.3px;}
  .wc-xi-help-btn{
    margin-left:4px;padding:0 5px;min-width:16px;height:16px;
    border-radius:50%;border:1px solid rgba(255,255,255,0.2);
    background:transparent;color:inherit;font-size:10px;font-weight:700;cursor:pointer;line-height:1;
  }
  .wc-xi-help-popover{
    flex:1 1 100%;margin:6px 0 0;font-size:10px;line-height:1.45;color:var(--soft);
    font-family:var(--body-font);letter-spacing:0;
    text-transform:none;
  }
  .wc-match-card--highlight{border-color:rgba(0,245,233,0.55);box-shadow:0 0 0 1px rgba(0,245,233,0.2);}
  .wc-xi-confirmed-banner{
    display:flex;align-items:stretch;gap:0;margin:8px 0 10px;
    border-radius:10px;border:1px solid rgba(34,197,94,0.4);
    background:rgba(34,197,94,0.1);overflow:hidden;
  }
  .wc-xi-confirmed-banner-body{
    flex:1;text-align:left;padding:10px 12px;background:transparent;border:none;cursor:pointer;color:#fff;
  }
  .wc-xi-confirmed-banner-kicker{
    display:block;font-family:var(--mono-font);font-size:9px;letter-spacing:1.1px;
    text-transform:uppercase;color:rgba(34,197,94,0.95);margin-bottom:4px;
  }
  .wc-xi-confirmed-banner-text{display:block;font-size:12px;font-weight:600;}
  .wc-xi-confirmed-banner-dismiss{
    flex:0 0 36px;border:none;border-left:1px solid rgba(34,197,94,0.25);
    background:transparent;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;
  }
  .wc-ur-take-pending-nudge{
    margin:8px 16px 4px;font-size:11px;line-height:1.45;color:var(--muted);
    font-family:var(--mono-font);
  }
  .wc-ur-take-pending-link{
    margin-left:6px;padding:0;border:none;background:none;
    color:var(--wc-gold);font:inherit;font-size:11px;text-decoration:underline;cursor:pointer;
  }
  .ur-take-fail-soft-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
  .ur-take-fail-soft-chip{
    font-family:var(--mono-font);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;
    padding:6px 12px;border-radius:999px;border:1px solid rgba(0,245,233,0.35);
    background:rgba(0,245,233,0.1);color:var(--cyan-bright);cursor:pointer;
  }
  .ur-take-fail-soft-chip--upgrade{border-color:rgba(245,158,11,0.4);color:var(--wc-gold);background:rgba(245,158,11,0.1);}
  .wc-match-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:10px;color:var(--muted);font-family:var(--mono-font);margin-bottom:8px;}
  .wc-odds-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--soft);margin-bottom:4px;}
  .wc-empty-cta{ margin-top:12px; width:100%; max-width:320px; }
  .wc-ask-btn{
    width:100%;
    margin-top:8px;
    padding:10px;
    border:1px solid rgba(245,158,11,0.35);
    background:rgba(245,158,11,0.08);
    color:var(--wc-gold);
    border-radius:10px;
    font-weight:700;
    font-size:12px;
    cursor:pointer;
  }
  .wc-live-score{margin-bottom:8px;}
  .wc-live-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .wc-live-side{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;flex:1;}
  .wc-live-side-away{justify-content:flex-end;text-align:right;}
  .wc-live-mid{text-align:center;flex:0 0 auto;}
  .wc-live-score-num{font-size:18px;font-weight:800;display:block;}
  .wc-empty{color:var(--muted);font-size:12px;padding:16px 0;text-align:center;}
  .wc-muted{color:var(--muted);font-size:11px;}
  .wc-outright-fallback{color:#d97706;font-size:10px;font-weight:500;}
  .wc-data-health-chip{color:var(--muted);font-size:11px;margin:0 0 12px;padding:6px 10px;border:1px solid rgba(255,255,255,.08);border-radius:6px;background:rgba(255,255,255,.04);}
  .wc-outright-stale-banner{color:#d97706;font-size:11px;font-weight:600;margin:0 0 12px;padding:8px 10px;border:1px solid rgba(217,119,6,.35);border-radius:6px;background:rgba(217,119,6,.08);}
  .wc-bracket-note{font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;}
  .wc-bracket-grid{display:flex;gap:10px;overflow-x:auto;padding-bottom:12px;}
  .wc-bracket-col{flex:0 0 140px;display:flex;flex-direction:column;gap:8px;}
  .wc-bracket-round-label{font-family:var(--display-font);font-size:13px;color:var(--wc-gold);letter-spacing:1px;margin-bottom:4px;}
  .wc-bracket-slot{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px;font-size:10px;}
  .wc-bracket-placeholder{color:var(--muted);font-size:9px;line-height:1.4;}
  .wc-bracket-team{display:flex;align-items:center;gap:6px;justify-content:space-between;padding:2px 0;}
  .wc-bracket-winner{color:var(--wc-gold);font-weight:700;}
  .wc-bracket-score{font-family:var(--mono-font);}
  .wc-conf-section{margin-bottom:16px;}
  .wc-conf-title{font-family:var(--display-font);font-size:18px;color:var(--wc-gold);letter-spacing:1px;margin-bottom:8px;}
  .wc-team-grid{display:flex;flex-direction:column;gap:8px;}
  .wc-team-card{
    display:flex;
    align-items:center;
    gap:12px;
    width:100%;
    text-align:left;
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:12px;
    padding:10px 12px;
    cursor:pointer;
  }
  .wc-team-card-name{display:block;font-size:14px;font-weight:600;color:var(--text);}
  .wc-team-card-meta{display:block;font-size:11px;color:var(--muted);margin-top:2px;}
  .wc-team-detail{padding:8px 0 24px;}
  .wc-team-detail-name{font-family:var(--display-font);font-size:26px;letter-spacing:1px;margin:8px 0;}
  .wc-team-detail-stats{display:flex;gap:24px;margin:16px 0;}
  .wc-stat-label{display:block;font-size:10px;color:var(--muted);font-family:var(--mono-font);text-transform:uppercase;}
  .wc-stat-val{display:block;font-size:18px;font-weight:700;color:var(--wc-gold);margin-top:4px;}
  .wc-ask-shell{
    width:100%;
    box-sizing:border-box;
    background:var(--surface);
    border:1px solid rgba(245,158,11,.22);
    border-radius:14px;
    padding:14px;
    margin:0 0 16px;
  }
  .wc-ask-label{
    font-family:var(--mono-font);
    font-size:11px;
    color:var(--wc-gold);
    letter-spacing:2px;
    margin-bottom:4px;
    text-transform:uppercase;
    opacity:.9;
  }
  .wc-ask-hint{
    font-size:12px;
    line-height:1.4;
    color:var(--soft);
    margin:0 0 10px;
  }
  .wc-player-pass-note{
    margin:10px 0 4px;
    padding:8px 10px;
    border-radius:8px;
    border:1px solid rgba(245,158,11,.28);
    background:rgba(245,158,11,.08);
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:1px;
    text-transform:uppercase;
    color:var(--wc-gold);
    line-height:1.45;
  }
  .wc-quick-prompts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
  .wc-quick-prompts .quick-btn{font-size:11px;}
  .wc-chat-scroll .wc-groups-grid{margin-top:16px;}
  .wc-chat-scroll .section-divider,
  .wc-chat-scroll .wc-conf-section:first-of-type{margin-top:8px;}
  .golf-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,255,255,.15);background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));}
  .golf-ask-shell{background:var(--surface);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:14px;margin-bottom:16px;}
  .tennis-ask-shell{background:var(--surface);border:1px solid rgba(255,230,0,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .tennis-ask-shell-kicker{font-size:10px;color:#FFE600;font-family:var(--mono-font);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}
  .wta-ask-inline{margin-bottom:10px;}
  .golf-ask-label{font-family:var(--mono-font);font-size:11px;color:#FFFFFF;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;opacity:.85;}
  .golf-leaderboard-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s;}
  .golf-leaderboard-card:hover{border-color:rgba(255,255,255,.3);}
  .golf-pos{font-family:var(--display-font);font-size:22px;color:var(--muted);min-width:36px;text-align:right;line-height:1;}
  .golf-player-info{flex:1;}
  .golf-player-name{font-size:14px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .golf-player-country{font-family:var(--mono-font);font-size:11px;color:var(--muted);}
  .golf-score{text-align:right;}
  .golf-score-num{font-family:var(--mono-font);font-size:16px;color:#FFFFFF;display:block;}
  .golf-score-label{font-family:var(--mono-font);font-size:11px;color:var(--muted);}
  .golf-odds-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .15s;}
  .golf-odds-card:hover{border-color:rgba(255,255,255,.3);}
  .golf-player-odds{font-family:var(--mono-font);font-size:14px;color:#FFFFFF;}
  .golf-quick-btn-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
  .golf-quick-btn-tap{min-height:44px;}
  .golf-schedule-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}
  .golf-schedule-card.golf-odds-card{flex-direction:column;align-items:stretch;justify-content:flex-start;}
  .golf-schedule-blurb{font-size:13px;color:var(--muted);margin-top:8px;line-height:1.45;}
  .golf-schedule-synopsis-link{margin-top:10px;align-self:flex-start;background:none;border:none;padding:4px 0;font-family:var(--mono-font);font-size:11px;letter-spacing:0.5px;color:var(--cyan-bright);cursor:pointer;text-decoration:underline;text-underline-offset:3px;}

  .ur-take-loading-phases--dock{
    min-height:48px;
    padding:6px 0 10px;
    margin:0;
    box-sizing:border-box;
    width:100%;
    max-width:none;
    background:transparent;
    border:none;
  }
  .ur-take-loading-phases--bubble{
    min-height:48px;
    padding:4px 2px 8px;
    margin:0;
    box-sizing:border-box;
    width:100%;
    justify-content:center;
    display:flex;
    flex-direction:column;
  }
  .ur-take-loading-phase-text{
    font-family:var(--body-font);
    font-size:13px;
    line-height:1.35;
    color:var(--muted);
    font-style:italic;
    text-align:center;
    margin:0;
  }
  .ur-loading-progress{
    height:2px;
    background:var(--cyan-bright);
    opacity:0.4;
    width:0%;
    transition:width 10s linear;
    border-radius:1px;
    margin-top:8px;
    max-width:100%;
  }
  .ur-loading-progress--active{
    width:85%;
  }
  .ur-take-loading-phases--dock .ur-take-loading-phase-text{
    text-align:left;
    padding-left:2px;
  }
  .ur-loading-progress--complete{
    width:100%;
    opacity:0;
    transition:width 0.2s ease, opacity 0.4s ease 0.1s;
  }

  @keyframes ur-v2-card-enter{
    from{opacity:0;transform:translateY(8px);}
    to{opacity:1;transform:translateY(0);}
  }
  .chat-thread--ur-chat-dock .ur-take-response-v2.ur-v2-card{
    margin-right:20px;
    max-width:calc(100% - 4px);
    box-sizing:border-box;
    border-left:3px solid var(--cyan-bright);
    background:rgba(255,255,255,0.03);
  }
  @media (prefers-reduced-motion: no-preference){
    .chat-thread--ur-chat-dock .ur-take-response-v2.ur-v2-card{
      animation:ur-v2-card-enter 220ms ease-out;
    }
  }

  .ur-v2-card{background:#080808;border-radius:0;overflow:hidden;width:100%;max-width:none;margin:0;border:none;border-bottom:0.5px solid #1a1a1a;box-sizing:border-box;}
  .ur-v2-body-pad{padding:0;width:100%;max-width:none;margin:0;box-sizing:border-box;}
  .ur-v2-sport-bar{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;background:#0f0f0f;padding:6px 16px;border-bottom:0.5px solid #1a1a1a;width:100%;max-width:none;box-sizing:border-box;}
  .ur-v2-sport-bar-tag{font-family:var(--mono-font);font-size:10px;letter-spacing:0.18em;color:#00F5E9;text-transform:uppercase;}
  .ur-v2-sport-bar-dot{color:rgba(255,255,255,.25);font-size:12px;}
  .ur-v2-sport-bar-ctx{font-family:var(--body-font);font-size:12px;color:rgba(255,255,255,.55);}
  .ur-v2-sport-bar-spacer{flex:1;}
  .ur-v2-mode-pill{font-family:var(--mono-font);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px;border:0.5px solid #1e1e1e;background:#111;color:rgba(255,255,255,.65);display:inline-flex;align-items:center;gap:6px;}
  .ur-v2-mode-pill--odds{border-color:rgba(34,197,94,.35);color:#86efac;}
  .ur-v2-mode-pill--ee{border-color:rgba(0,245,233,.35);color:#5eead4;}
  .ur-v2-mode-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;}
  .ur-v2-mode-ic{font-size:10px;line-height:1;}
  .ur-v2-wc-caution{
    display:flex;align-items:flex-start;gap:8px;
    margin:10px 16px 12px;padding:12px 14px;
    border-radius:8px;
    border:1px solid rgba(245,158,11,0.35);
    background:rgba(245,158,11,0.08);
    font-family:var(--mono-font);font-size:11px;line-height:1.5;
    letter-spacing:0.04em;color:rgba(245,158,11,0.95);
  }
  .ur-v2-wc-caution-icon{font-size:11px;line-height:1.2;flex-shrink:0;opacity:0.9;}
  .ur-v2-wc-caution-text{flex:1;}
  .ur-v2-headline-wrap{padding:10px 16px 8px;}
  .ur-v2-headline{font-family:var(--body-font);font-size:17px;line-height:1.2;font-weight:800;color:#fff;margin:0;letter-spacing:-0.02em;}
  .ur-v2-headline.ur-v2-headline--lean{font-size:15px;font-weight:500;line-height:1.35;letter-spacing:0;color:#fff;}
  .ur-v2-pill-row{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;}
  .ur-v2-mini-pill{font-size:10px;padding:4px 10px;border-radius:999px;background:#111;border:0.5px solid #1e1e1e;color:rgba(255,255,255,.72);font-family:var(--mono-font);letter-spacing:0.06em;text-transform:uppercase;}
  .ur-v2-mini-pill--muted{color:rgba(255,255,255,.45);}
  .ur-v2-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 16px;margin-bottom:0;}
  .ur-v2-stat-cell{background:#111;border:0.5px solid #1e1e1e;border-radius:8px;padding:8px 10px;min-height:0;display:flex;flex-direction:column;justify-content:center;}
  .ur-v2-stat-cell--hi{border-color:rgba(0,245,233,.55);box-shadow:0 0 0 1px rgba(0,245,233,.1);}
  .ur-v2-stat-label{font-family:var(--mono-font);font-size:8px;letter-spacing:0.07em;text-transform:uppercase;color:#444;margin-bottom:4px;}
  .ur-v2-stat-value{font-size:13px;font-weight:800;color:#fff;line-height:1.35;word-break:break-word;}
  .ur-v2-divider{height:0.5px;background:#141414;margin:8px 16px;border:none;}
  .ur-v2-body-copy{font-size:14px;line-height:1.65;color:#999;padding:0 16px;}
  .ur-v2-body-prose-wrap--clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;}
  button.ur-v2-body-expand{margin:6px 16px 0;padding:0;border:none;background:none;color:#00F5E9;font-family:var(--mono-font);font-size:11px;letter-spacing:0.08em;cursor:pointer;text-align:left;touch-action:manipulation;}
  .ur-v2-body-p{margin:0 0 12px;}
  .ur-v2-muted{color:rgba(255,255,255,.55);}
  .ur-v2-inline-label{font-family:var(--mono-font);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-right:6px;}
  .ur-v2-driver-list{margin:8px 0 0;padding-left:18px;color:rgba(255,255,255,.65);font-size:13px;}
  .ur-v2-caveats{margin:12px 0 0;padding-left:18px;color:rgba(255,230,100,.85);font-size:13px;}
  .ur-v2-parlay-block{margin-top:12px;padding:0 16px 12px;border-top:none;}
  .ur-v2-parlay-title{font-family:var(--mono-font);font-size:9px;letter-spacing:0.18em;color:rgba(255,255,255,.35);text-transform:uppercase;margin-bottom:8px;}
  .ur-v2-parlay-leg{margin-bottom:10px;}
  .ur-v2-parlay-leg-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;}
  .ur-v2-parlay-play{font-weight:600;color:#fff;font-size:14px;}
  .ur-v2-parlay-odds{font-family:var(--mono-font);font-size:10px;color:rgba(255,255,255,.4);}
  .ur-v2-parlay-rationale{font-size:12px;color:rgba(255,255,255,.55);margin-top:4px;line-height:1.45;}
  .ur-v2-parlay-combined{margin-top:10px;}
  .ur-v2-parlay-combined-label{font-family:var(--mono-font);font-size:10px;color:rgba(255,255,255,.4);}
  .ur-v2-parlay-explainer{font-size:11px;color:rgba(255,255,255,.48);margin-top:6px;line-height:1.45;}
  .ur-v2-footer-row{display:flex;align-items:center;justify-content:space-between;padding:8px 16px 12px;border-top:none;}
  .ur-v2-ts{font-family:var(--mono-font);font-size:10px;color:rgba(255,255,255,.22);}

  @media (max-width:390px){
    .wc-take-headline{font-size:14px;line-height:1.4;}
    .ur-v2-stat-value{font-size:12px;line-height:1.4;}
    .ur-v2-stat-cell{padding:10px 8px;}
    .wc-take-row-body{font-size:13px;line-height:1.6;}
  }

  @media (max-width:767px){
    .home-surface-v1.home-surface-premium.screen{padding-top:20px;}
    .home-surface-v1 .ur-home-promise{margin:6px 0 10px;}
    .home-surface-v1 .ask-wrap{margin:10px 0 20px;}
    .home-surface-v1 .ur-home-try-row{display:none !important;}
    .home-surface-v1 .ur-home-starters{margin-top:28px;margin-bottom:20px;}
    .home-surface-v1 .ur-home-starters-heading{
      font-size:10px;
      letter-spacing:0.12em;
      color:var(--ur-muted);
    }
    .home-surface-v1 .ur-home-starter-cards .ask-card{
      min-height:52px;
      padding:14px 16px;
      align-items:center;
    }
    .home-surface-v1 .ur-home-starter-cards .ask-card-text{
      font-size:14px;
      font-weight:500;
      line-height:1.35;
    }
  }

  @media (max-width:390px){
    .quick-btn{min-height:44px;font-size:12px;}
    .golf-leaderboard-card{padding:12px 14px;}
  }

  .nfl-predict-pick-btn { transition: opacity 150ms ease, box-shadow 150ms ease; min-height: 44px; }
  .nfl-predict-pick-btn.unselected { opacity: 0.4; }
  .nfl-predict-confidence { transition: opacity 150ms ease; }
  @media (prefers-reduced-motion: reduce) { .nfl-predict-pick-btn, .nfl-predict-confidence { transition: none; } }
  .nfl-predict-pro-cta { width: 100%; display: block; border: none; background: transparent; padding: 0; cursor: pointer; }
`;
