import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

  :root{
    --cyan:#0891B2;
    --cyan-bright:#00F5E9;
    --cyan-soft:#E0F2FE;
    --mag:#E11D48;
    --magenta:#FF2D6B;
    --mag-soft:#FFE4E6;
    --gold:#D97706;
    --gold-soft:#FEF3C7;
    --green:#00E676;
    --red:#FF4444;
    --nfl:#FF6B35;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;}
  body{
    background:var(--bg);
    color:var(--text);
    font-family:var(--body-font);
    min-height:100vh;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
  }

  .app{
    min-height:100vh;
    background:var(--bg);
    color:var(--text);
    display:flex;
    flex-direction:column;
    transition:background .2s ease,color .2s ease;
  }

  .theme-dark{
    --bg:#080A0C;
    --surface:#0F1215;
    --surface-2:#0C1014;
    --border:#1E2328;
    --border-2:#2A3040;
    --text:#E8EAF0;
    --muted:#AAB3C2;
    --soft:#D6DCE6;
    --header-bg:rgba(8,10,12,.97);
    --nav-bg:rgba(8,10,12,.98);
    --card-shadow:none;
    --card-shadow-hover:0 10px 30px rgba(0,0,0,.18);
    --body-font:'DM Sans',sans-serif;
    --mono-font:'DM Mono',monospace;
    --display-font:'Bebas Neue',sans-serif;
    --editorial-font:'Bebas Neue',sans-serif;
    --hero-title-size:34px;
    --hero-title-spacing:1px;
    --hero-title-line:1;
    --top-tabs-bg:transparent;
    --top-tab-bg:transparent;
    --top-tab-active-bg:transparent;
    --top-tab-color:var(--muted);
    --top-tab-active-color:var(--text);
    --ask-shadow:none;
    --ask-focus-shadow:none;
    --bottom-nav-height:74px;
  }

  .theme-soft{
    --bg:#FAFAF8;
    --surface:#FFFFFF;
    --surface-2:#F4F4F5;
    --border:#E4E4E7;
    --border-2:#D4D4D8;
    --text:#18181B;
    --muted:#71717A;
    --soft:#52525B;
    --header-bg:rgba(255,255,255,.94);
    --nav-bg:rgba(255,255,255,.98);
    --card-shadow:0 4px 20px rgba(0,0,0,.06);
    --card-shadow-hover:0 10px 32px rgba(0,0,0,.10);
    --body-font:'Plus Jakarta Sans',sans-serif;
    --mono-font:'JetBrains Mono',monospace;
    --display-font:'Instrument Serif',serif;
    --editorial-font:'Instrument Serif',serif;
    --hero-title-size:52px;
    --hero-title-spacing:-0.03em;
    --hero-title-line:1.05;
    --top-tabs-bg:#F4F4F5;
    --top-tab-bg:transparent;
    --top-tab-active-bg:#FFFFFF;
    --top-tab-color:#71717A;
    --top-tab-active-color:#18181B;
    --ask-shadow:0 4px 20px rgba(0,0,0,.06);
    --ask-focus-shadow:0 4px 20px rgba(8,145,178,.12);
    --bottom-nav-height:78px;
  }

  .hdr{
    padding:14px 16px;
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

  .theme-soft .hdr{
    padding:16px 20px;
  }

  .wordmark{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content:center;
    min-width:fit-content;
  }

  .logo-under{
    display:block;
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:5px;
    color:rgba(255,255,255,.6);
    margin-bottom:2px;
    text-transform:uppercase;
  }

  .logo-review{
    display:block;
    font-family:var(--display-font);
    font-size:22px;
    letter-spacing:2px;
    line-height:1;
    background:linear-gradient(90deg,var(--cyan-bright),var(--magenta));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  .theme-soft .logo-under{
    font-size:8px;
    letter-spacing:.2em;
    color:var(--muted);
    margin-bottom:2px;
  }

  .theme-soft .logo-review{
    font-size:22px;
    letter-spacing:-0.02em;
    background:linear-gradient(90deg,var(--cyan),var(--mag));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  .wm-dots{
    display:none;
  }

  .theme-soft .wm-dots{
    display:flex;
    align-items:center;
    gap:4px;
    margin-top:2px;
  }

  .wm-dot{width:4px;height:4px;border-radius:50%;}
  .d-c{background:var(--cyan);}
  .d-m{background:var(--mag);}
  .dot-line{
    flex:1;
    height:1px;
    width:60px;
    background:linear-gradient(90deg,var(--cyan),var(--mag));
  }

  .header-right{
    display:flex;
    align-items:center;
    gap:10px;
    min-width:0;
  }

  .top-tabs{
    display:flex;
    gap:4px;
    background:var(--top-tabs-bg);
    padding:4px;
    border-radius:12px;
    border:1px solid transparent;
  }

  .theme-dark .top-tabs{
    display:none;
  }

  .top-tab{
    font-family:var(--body-font);
    font-size:11px;
    font-weight:600;
    padding:7px 14px;
    border-radius:9px;
    border:none;
    background:var(--top-tab-bg);
    color:var(--top-tab-color);
    cursor:pointer;
    transition:all .18s ease;
    white-space:nowrap;
  }

  .top-tab:hover{color:var(--text);}
  .top-tab.active{
    background:var(--top-tab-active-bg);
    color:var(--top-tab-active-color);
    box-shadow:0 1px 4px rgba(0,0,0,.08);
  }

  .top-tab.pro{
    background:var(--text);
    color:var(--bg);
    font-size:10px;
    letter-spacing:.05em;
  }

  .pill-tag,.pill-live,.pill-nfl{
    font-family:var(--mono-font);
    font-size:10px;
    padding:4px 9px;
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

  .pill-nfl{
    color:var(--nfl);
    border:1px solid rgba(255,107,53,.25);
    background:rgba(255,107,53,.06);
  }

  .theme-soft .pill-live{
    color:var(--cyan);
    border:1px solid rgba(8,145,178,.18);
    background:var(--cyan-soft);
  }

  .theme-soft .pill-tag{
    color:var(--mag);
    border:1px solid rgba(225,29,72,.14);
    background:var(--mag-soft);
  }

  .theme-soft .pill-nfl{
    color:var(--gold);
    border:1px solid rgba(217,119,6,.18);
    background:var(--gold-soft);
  }

  .theme-toggle{
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--text);
    border-radius:999px;
    padding:8px 12px;
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:1px;
    cursor:pointer;
    white-space:nowrap;
    box-shadow:var(--card-shadow);
  }

  .theme-toggle:hover{
    border-color:var(--cyan);
  }

  .screen{
    flex:1;
    overflow-y:auto;
    padding:16px;
    padding-bottom:110px;
  }

  .theme-soft .screen{
    max-width:900px;
    width:100%;
    margin:0 auto;
    padding:24px 20px 110px;
  }

  .hero{
    padding:12px 2px 16px;
    text-align:center;
  }

  .theme-soft .hero{
    text-align:left;
    padding:26px 0 18px;
  }

  .hero-chip{
    display:inline-flex;
    align-items:center;
    gap:6px;
    background:rgba(0,245,233,.08);
    color:var(--cyan-bright);
    font-family:var(--mono-font);
    font-size:9px;
    font-weight:500;
    letter-spacing:.15em;
    text-transform:uppercase;
    padding:5px 10px;
    border-radius:6px;
    margin-bottom:18px;
  }

  .hero-chip::before{
    content:'';
    width:6px;
    height:6px;
    border-radius:50%;
    background:currentColor;
    animation:pulse 2s infinite;
  }

  .theme-soft .hero-chip{
    background:var(--cyan-soft);
    color:var(--cyan);
  }

  @keyframes pulse{
    0%,100%{opacity:1;}
    50%{opacity:.35;}
  }

  .hero-title{
    font-family:var(--display-font);
    font-size:var(--hero-title-size);
    letter-spacing:var(--hero-title-spacing);
    line-height:var(--hero-title-line);
    margin-bottom:10px;
  }

  .theme-dark .hero-title{
    text-transform:none;
  }

  .theme-soft .hero-title em{
    font-style:italic;
    color:var(--mag);
  }

  .hero-sub{
    color:var(--soft);
    font-size:14px;
    line-height:1.6;
    max-width:560px;
    margin:0 auto;
  }

  .theme-soft .hero-sub{
    margin:0;
    font-size:15px;
    line-height:1.65;
    max-width:520px;
  }

  .ask-wrap{margin:12px 0 18px;}
  .ask-row{display:flex;gap:8px;align-items:flex-end;}
  .ask-col{
    flex:1;
    border:1px solid var(--border-2);
    background:var(--surface-2);
    border-radius:18px;
    overflow:hidden;
    transition:border-color .15s ease, box-shadow .15s ease;
    box-shadow:var(--ask-shadow);
  }

  .theme-soft .ask-col{
    border:1.5px solid var(--border);
    background:var(--surface);
    border-radius:16px;
  }

  .ask-col:focus-within{
    border-color:rgba(0,245,233,.4);
    box-shadow:var(--ask-focus-shadow);
  }

  .theme-soft .ask-col:focus-within{
    border-color:var(--cyan);
  }

  .ask-img-preview{padding:8px 12px 0;display:flex;align-items:center;gap:8px;}
  .ask-img-thumb{width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border-2);}
  .ask-img-remove{
    background:rgba(255,45,107,.15);
    border:1px solid rgba(255,45,107,.3);
    color:var(--magenta);
    border-radius:6px;
    padding:3px 8px;
    font-family:var(--mono-font);
    font-size:10px;
    cursor:pointer;
  }

  .theme-soft .ask-img-remove{
    background:var(--mag-soft);
    border-color:rgba(225,29,72,.15);
    color:var(--mag);
  }

  .ask-bar{
    width:100%;
    border:none;
    background:transparent;
    padding:12px 14px;
    color:var(--text);
    font-size:14px;
    outline:none;
    font-family:var(--body-font);
  }

  .theme-soft .ask-bar{
    padding:14px 16px;
    font-size:13px;
  }

  .ask-bar::placeholder{color:var(--muted);}

  .ask-hint{
    font-family:var(--mono-font);
    font-size:9px;
    color:var(--muted);
    letter-spacing:1px;
    padding:0 14px 8px;
    opacity:.65;
  }

  .send-btn{
    width:44px;
    height:44px;
    border:none;
    border-radius:50%;
    background:var(--cyan-bright);
    color:#080A0C;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    flex-shrink:0;
  }

  .send-btn:hover{background:var(--magenta);}
  .send-btn:disabled{background:var(--border);cursor:not-allowed;color:var(--muted);}

  .theme-soft .send-btn{
    width:auto;
    height:auto;
    border-radius:10px;
    padding:12px 18px;
    background:linear-gradient(135deg,var(--cyan) 0%, var(--mag) 100%);
    color:white;
    font-family:var(--body-font);
    font-size:12px;
    font-weight:700;
  }

  .theme-soft .send-btn svg{
    display:none;
  }

  .theme-soft .send-btn::after{
    content:'Get Take →';
  }

  .attach-btn{
    width:36px;
    height:36px;
    border:1px solid var(--border-2);
    border-radius:50%;
    background:var(--surface);
    color:var(--muted);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    flex-shrink:0;
    transition:all .15s ease;
  }

  .attach-btn:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .attach-btn.has-img{
    border-color:var(--cyan-bright);
    color:var(--cyan-bright);
    background:rgba(0,245,233,.08);
  }

  .theme-soft .attach-btn{
    border-radius:10px;
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--muted);
  }

  .theme-soft .attach-btn:hover,
  .theme-soft .attach-btn.has-img{
    border-color:var(--cyan);
    color:var(--cyan);
    background:var(--cyan-soft);
  }

  .section{margin-top:20px;}
  .section-label,
  .section-title-inline{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:2px;
    color:var(--muted);
    margin-bottom:10px;
    text-transform:uppercase;
  }

  .theme-soft .section-label,
  .theme-soft .section-title-inline{
    font-family:var(--body-font);
    font-size:12px;
    font-weight:700;
    letter-spacing:.08em;
  }

  .section-row{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:14px;
    margin-top:24px;
  }

  .see-all{
    font-size:11px;
    font-weight:600;
    color:var(--cyan);
    cursor:pointer;
    text-decoration:none;
    border:none;
    background:none;
    font-family:var(--body-font);
  }

  .q-list{display:flex;flex-direction:column;gap:8px;}
  .theme-soft .q-list{
    display:flex;
    flex-wrap:wrap;
    flex-direction:row;
    gap:8px;
  }

  .q-card{
    width:100%;
    text-align:left;
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:14px;
    padding:12px;
    cursor:pointer;
    color:var(--text);
    box-shadow:var(--card-shadow);
    transition:all .18s ease;
  }

  .q-card:hover{
    border-color:var(--cyan-bright);
    box-shadow:var(--card-shadow-hover);
    transform:translateY(-1px);
  }

  .theme-soft .q-card{
    width:auto;
    border-radius:999px;
    border:1.5px solid var(--border);
    padding:8px 14px;
    background:var(--surface);
  }

  .theme-soft .q-card:hover{
    border-color:var(--cyan);
    color:var(--cyan);
    box-shadow:0 2px 8px rgba(8,145,178,.1);
    transform:none;
  }

  .q-top{display:flex;align-items:center;gap:10px;}
  .q-accent{width:4px;height:30px;border-radius:2px;flex-shrink:0;}
  .theme-soft .q-accent{
    width:6px;
    height:6px;
    border-radius:50%;
  }

  .q-text{font-size:14px;line-height:1.45;color:var(--soft);}
  .theme-soft .q-text{
    font-size:12px;
    font-weight:500;
    color:var(--text);
  }

  .home-banner,
  .tour-banner,
  .nfl-banner{
    border-radius:16px;
    padding:16px;
    margin-bottom:16px;
    border:1px solid var(--border);
    background:var(--surface);
    box-shadow:var(--card-shadow);
  }

  .home-banner{background:linear-gradient(135deg,rgba(0,245,233,.08),rgba(255,45,107,.05));}
  .tour-banner{background:linear-gradient(135deg,rgba(0,245,233,.08),rgba(245,200,66,.06));}
  .nfl-banner{background:linear-gradient(135deg,rgba(255,107,53,.08),rgba(255,45,107,.05));}

  .theme-soft .home-banner{
    background:var(--surface);
  }

  .theme-soft .tour-banner{
    background:var(--surface);
  }

  .theme-soft .nfl-banner{
    background:var(--surface);
  }

  .banner-title{
    font-family:var(--display-font);
    font-size:26px;
    letter-spacing:1px;
    margin-bottom:4px;
  }

  .theme-soft .banner-title{
    font-size:20px;
    letter-spacing:-0.02em;
  }

  .banner-sub{
    font-family:var(--mono-font);
    font-size:10px;
    color:var(--muted);
    letter-spacing:2px;
    margin-bottom:8px;
    text-transform:uppercase;
  }

  .banner-note{
    font-size:13px;
    color:var(--soft);
    line-height:1.5;
  }

  .matchup-list{display:flex;flex-direction:column;gap:10px;}
  .theme-soft .matchup-list.home-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:12px;
  }

  .matchup-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:16px;
    overflow:hidden;
    cursor:pointer;
    box-shadow:var(--card-shadow);
    transition:all .18s ease;
    position:relative;
  }

  .matchup-card:hover{
    border-color:var(--cyan-bright);
    box-shadow:var(--card-shadow-hover);
    transform:translateY(-1px);
  }

  .theme-soft .matchup-card{
    border:1.5px solid var(--border);
  }

  .theme-soft .matchup-card:hover{
    border-color:transparent;
    box-shadow:0 8px 32px rgba(0,0,0,.1);
    transform:translateY(-2px);
  }

  .theme-soft .matchup-card::before{
    content:'';
    position:absolute;
    top:0;left:0;right:0;
    height:3px;
  }

  .theme-soft .matchup-card.accent-cyan::before{background:var(--cyan);}
  .theme-soft .matchup-card.accent-mag::before{background:var(--mag);}
  .theme-soft .matchup-card.accent-gold::before{background:var(--gold);}

  .matchup-top{
    padding:10px 12px;
    border-bottom:1px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:space-between;
    background:rgba(255,255,255,.01);
  }

  .theme-soft .matchup-top{
    border-bottom:none;
    background:transparent;
    padding:18px 20px 0;
    justify-content:flex-start;
  }

  .matchup-league{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:2px;
    text-transform:uppercase;
  }

  .theme-soft .matchup-league{
    font-size:8px;
    color:var(--muted) !important;
    letter-spacing:.15em;
  }

  .matchup-time{
    font-family:var(--mono-font);
    font-size:10px;
    color:var(--muted);
  }

  .theme-soft .matchup-time{
    display:none;
  }

  .matchup-body{padding:12px;}
  .theme-soft .matchup-body{padding:10px 20px 20px;}

  .matchup-title{
    font-size:16px;
    font-weight:600;
    margin-bottom:4px;
    color:var(--text);
  }

  .theme-soft .matchup-title{
    font-family:var(--editorial-font);
    font-size:20px;
    font-weight:400;
    letter-spacing:-0.02em;
    line-height:1.2;
    margin-bottom:8px;
  }

  .matchup-meta{
    font-size:12px;
    color:var(--muted);
    margin-bottom:8px;
  }

  .theme-soft .matchup-meta{
    font-size:11px;
    margin-bottom:10px;
  }

  .matchup-blurb{
    font-size:13px;
    color:var(--soft);
    line-height:1.55;
  }

  .theme-soft .matchup-blurb{
    font-size:11px;
    line-height:1.5;
  }

  .matchup-lean{
    display:inline-flex;
    align-items:center;
    gap:6px;
    font-size:11px;
    font-weight:700;
    padding:5px 12px;
    border-radius:999px;
    margin-top:12px;
  }

  .lean-cyan{background:var(--cyan-soft);color:var(--cyan);}
  .lean-mag{background:var(--mag-soft);color:var(--mag);}
  .lean-gold{background:var(--gold-soft);color:var(--gold);}

  .sport-chips{display:flex;gap:8px;flex-wrap:wrap;}
  .sport-chip{
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--soft);
    border-radius:999px;
    padding:8px 14px;
    font-family:var(--mono-font);
    font-size:11px;
    cursor:pointer;
    transition:all .15s;
  }

  .sport-chip.active,.sport-chip:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .sport-chip.nfl-chip.active,.sport-chip.nfl-chip:hover{border-color:var(--nfl);color:var(--nfl);}

  .theme-soft .sport-chip{
    font-family:var(--body-font);
    font-weight:600;
    border:1.5px solid var(--border);
  }

  .theme-soft .sport-chip.active,.theme-soft .sport-chip:hover{
    border-color:var(--cyan);
    color:var(--cyan);
  }

  .theme-soft .sport-chip.nfl-chip.active,.theme-soft .sport-chip.nfl-chip:hover{
    border-color:var(--mag);
    color:var(--mag);
  }

  .detail-back{
    background:none;
    border:none;
    color:var(--muted);
    font-family:var(--mono-font);
    font-size:11px;
    letter-spacing:1px;
    margin-bottom:12px;
    cursor:pointer;
    display:flex;
    align-items:center;
    gap:6px;
  }

  .detail-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:18px;
    overflow:hidden;
    margin-bottom:14px;
    box-shadow:var(--card-shadow);
  }

  .detail-head{
    padding:12px 14px;
    border-bottom:1px solid var(--border);
    background:var(--surface-2);
  }

  .detail-league{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:2px;
    margin-bottom:6px;
    text-transform:uppercase;
  }

  .detail-title{
    font-family:var(--display-font);
    font-size:28px;
    letter-spacing:1px;
    line-height:1;
    margin-bottom:6px;
  }

  .theme-soft .detail-title{
    font-size:32px;
    letter-spacing:-0.02em;
    line-height:1.05;
  }

  .detail-sub{font-size:12px;color:var(--muted);}

  .what-matters{padding:14px;}
  .wm-label{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:2px;
    color:var(--cyan-bright);
    margin-bottom:8px;
    text-transform:uppercase;
  }

  .theme-soft .wm-label{
    color:var(--cyan);
  }

  .wm-text{font-size:14px;line-height:1.7;color:var(--soft);}

  .quick-hitters{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 14px;}
  .quick-btn{
    border:1px solid var(--border-2);
    background:var(--surface-2);
    color:var(--soft);
    border-radius:999px;
    padding:8px 12px;
    font-size:12px;
    cursor:pointer;
    transition:all .15s ease;
  }

  .quick-btn:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}

  .theme-soft .quick-btn{
    background:var(--surface);
    border:1.5px solid var(--border);
  }

  .theme-soft .quick-btn:hover{
    border-color:var(--cyan);
    color:var(--cyan);
  }

  .mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 14px;}
  .mini-stat{
    background:var(--surface-2);
    border:1px solid var(--border);
    border-radius:12px;
    padding:10px;
    text-align:center;
    box-shadow:var(--card-shadow);
  }

  .mini-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);margin-bottom:4px;}
  .mini-value{font-size:15px;font-weight:700;}

  .chat-thread{display:flex;flex-direction:column;gap:12px;margin-top:8px;}
  .bubble{
    border-radius:18px;
    padding:13px 14px;
    font-size:14px;
    line-height:1.65;
  }

  .bubble.user{
    margin-left:auto;
    max-width:88%;
    background:#1E2B38;
    border:1px solid #2A3A4A;
    color:#E8EAF0;
    border-bottom-right-radius:6px;
  }

  .bubble.ai{
    margin-right:auto;
    max-width:96%;
    background:var(--surface);
    border:1px solid var(--border);
    color:var(--soft);
    border-bottom-left-radius:6px;
    box-shadow:var(--card-shadow);
  }

  .theme-soft .bubble.user{
    background:linear-gradient(135deg,var(--cyan) 0%, var(--mag) 100%);
    border:none;
    color:white;
  }

  .bubble.loading{
    opacity:.5;
    font-family:var(--mono-font);
    font-size:12px;
    letter-spacing:2px;
    color:var(--muted);
  }

  .bubble-img{
    width:100%;
    max-width:200px;
    border-radius:10px;
    margin-bottom:6px;
    display:block;
  }

  .player-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:16px;
    overflow:hidden;
    cursor:pointer;
    margin-bottom:10px;
    box-shadow:var(--card-shadow);
    transition:all .18s ease;
  }

  .player-card:hover{border-color:var(--border-2);box-shadow:var(--card-shadow-hover);}
  .player-top{
    padding:12px 14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
  }

  .player-rank{
    font-family:var(--display-font);
    font-size:32px;
    color:var(--muted);
    line-height:1;
    margin-right:12px;
    min-width:36px;
  }

  .player-info{flex:1;}
  .player-name{font-size:16px;font-weight:600;color:var(--text);margin-bottom:2px;}
  .player-style{font-size:12px;color:var(--muted);}
  .player-elo{text-align:right;}
  .player-elo-num{
    font-family:var(--mono-font);
    font-size:16px;
    color:var(--cyan-bright);
    display:block;
  }

  .theme-soft .player-elo-num{color:var(--cyan);}
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
  .theme-soft .surface-hard{color:var(--cyan);border-color:rgba(8,145,178,.22);}
  .form-badge{
    font-family:var(--mono-font);
    font-size:9px;
    padding:2px 7px;
    border-radius:4px;
    background:rgba(0,245,233,.1);
    color:var(--cyan-bright);
    border:1px solid rgba(0,245,233,.2);
  }

  .theme-soft .form-badge{
    background:var(--cyan-soft);
    color:var(--cyan);
    border-color:rgba(8,145,178,.18);
  }

  .loading-state{text-align:center;padding:40px 20px;}
  .loading-text{
    font-family:var(--mono-font);
    font-size:11px;
    color:var(--muted);
    letter-spacing:2px;
  }

  .section-divider{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:3px;
    margin:20px 0 10px;
    display:flex;
    align-items:center;
    gap:8px;
    color:var(--muted);
    text-transform:uppercase;
  }

  .section-divider::after{
    content:'';
    flex:1;
    height:1px;
    background:var(--border);
  }

  .pos-tabs{
    display:flex;
    gap:6px;
    margin-bottom:14px;
    overflow-x:auto;
    scrollbar-width:none;
    padding-bottom:2px;
  }

  .pos-tabs::-webkit-scrollbar{display:none;}

  .pos-tab{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:1px;
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--muted);
    border-radius:999px;
    padding:6px 14px;
    cursor:pointer;
    white-space:nowrap;
    flex-shrink:0;
    transition:all .15s;
  }

  .pos-tab.active{
    border-color:var(--nfl);
    color:var(--nfl);
    background:rgba(255,107,53,.08);
  }

  .theme-soft .pos-tab{
    font-family:var(--body-font);
    font-weight:600;
  }

  .nfl-player-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:14px;
    overflow:hidden;
    margin-bottom:10px;
    cursor:pointer;
    transition:all .15s ease;
    box-shadow:var(--card-shadow);
  }

  .nfl-player-card:hover{border-color:rgba(255,107,53,.4);box-shadow:var(--card-shadow-hover);}
  .nfl-player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .nfl-player-left{display:flex;align-items:center;gap:12px;flex:1;}
  .nfl-rank{
    font-family:var(--display-font);
    font-size:28px;
    color:var(--muted);
    line-height:1;
    min-width:32px;
    text-align:right;
  }

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

  .nfl-prop-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:12px;
    padding:12px 14px;
    margin-bottom:8px;
    cursor:pointer;
    transition:all .15s ease;
    box-shadow:var(--card-shadow);
  }

  .nfl-prop-card:hover{border-color:rgba(255,107,53,.35);box-shadow:var(--card-shadow-hover);}
  .nfl-prop-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .nfl-prop-player{font-size:14px;font-weight:600;color:var(--text);}
  .nfl-prop-type{
    font-family:var(--mono-font);
    font-size:10px;
    color:var(--nfl);
    background:rgba(255,107,53,.1);
    padding:2px 8px;
    border-radius:4px;
  }

  .nfl-prop-line{font-family:var(--mono-font);font-size:11px;color:var(--gold);margin-bottom:3px;}
  .nfl-prop-lean{font-size:12px;color:var(--soft);line-height:1.4;}

  .nfl-detail-head{
    padding:14px;
    border-bottom:1px solid var(--border);
    background:var(--surface-2);
  }

  .nfl-detail-pos{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:2px;
    color:var(--nfl);
    margin-bottom:6px;
    text-transform:uppercase;
  }

  .nfl-detail-name{
    font-family:var(--display-font);
    font-size:28px;
    letter-spacing:1px;
    line-height:1;
    margin-bottom:6px;
  }

  .theme-soft .nfl-detail-name{
    font-size:32px;
    letter-spacing:-0.02em;
  }

  .nfl-detail-sub{font-size:12px;color:var(--muted);}
  .nfl-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px;}
  .nfl-detail-stat{
    background:var(--surface-2);
    border:1px solid var(--border);
    border-radius:12px;
    padding:10px;
    text-align:center;
    box-shadow:var(--card-shadow);
  }

  .nfl-detail-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);margin-bottom:4px;}
  .nfl-detail-value{font-size:15px;font-weight:700;}
  .nfl-detail-section{padding:0 14px 14px;}
  .nfl-detail-section-label{
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:2px;
    color:var(--nfl);
    margin-bottom:8px;
    text-transform:uppercase;
  }

  .nfl-prop-block{
    background:rgba(255,107,53,.05);
    border:1px solid rgba(255,107,53,.15);
    border-radius:10px;
    padding:12px;
  }

  .nfl-prop-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .nfl-prop-row:last-child{margin-bottom:0;}
  .nfl-prop-name{font-family:var(--mono-font);font-size:11px;color:var(--muted);}
  .nfl-prop-val{font-family:var(--mono-font);font-size:11px;}
  .lean-over{color:var(--green);}
  .lean-fade{color:var(--red);}
  .lean-neutral{color:var(--gold);}
  .nfl-situation{
    background:var(--surface-2);
    border-radius:10px;
    padding:12px;
    font-size:13px;
    color:var(--soft);
    line-height:1.6;
  }

  .nfl-betting-angles{display:flex;flex-direction:column;gap:6px;}
  .nfl-angle-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--soft);line-height:1.5;}
  .nfl-angle-dot{width:5px;height:5px;border-radius:50%;background:var(--nfl);flex-shrink:0;margin-top:5px;}
  .nfl-ask-shell{
    background:var(--surface);
    border:1px solid rgba(255,107,53,.2);
    border-radius:14px;
    padding:14px;
    margin-bottom:16px;
    box-shadow:var(--card-shadow);
  }

  .nfl-ask-label{
    font-family:var(--mono-font);
    font-size:10px;
    color:var(--nfl);
    letter-spacing:2px;
    margin-bottom:8px;
    text-transform:uppercase;
  }

  .bottom-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    background:var(--nav-bg);
    border-top:1px solid var(--border);
    display:grid;
    grid-template-columns:repeat(5,1fr);
    padding:10px 6px max(12px,env(safe-area-inset-bottom));
    z-index:30;
    backdrop-filter:blur(10px);
    min-height:var(--bottom-nav-height);
  }

  .theme-soft .bottom-nav{
    display:flex;
    justify-content:space-around;
    align-items:flex-start;
    padding:10px 0 18px;
  }

  .nav-btn{
    background:none;
    border:none;
    color:var(--muted);
    font-family:var(--mono-font);
    font-size:10px;
    letter-spacing:1px;
    cursor:pointer;
    padding:6px 0;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    opacity:.85;
  }

  .theme-soft .nav-btn{
    font-family:var(--body-font);
    font-size:9px;
    font-weight:600;
    letter-spacing:.05em;
    opacity:.35;
  }

  .nav-btn.active{color:var(--cyan-bright);}
  .nav-btn.tennis-active{color:var(--gold);}
  .nav-btn.nfl-active{color:var(--nfl);}

  .theme-soft .nav-btn.active{
    color:var(--cyan);
    opacity:1;
  }

  .theme-soft .nav-btn.tennis-active{
    color:var(--cyan);
    opacity:1;
  }

  .theme-soft .nav-btn.nfl-active{
    color:var(--cyan);
    opacity:1;
  }

  .nav-icon{
    width:18px;
    height:18px;
    display:block;
  }

  .theme-dark .nav-icon{display:none;}

  .page-spacer{height:80px;}

  @keyframes floatUp{
    from{opacity:0;transform:translateY(20px);}
    to{opacity:1;transform:translateY(0);}
  }

  .theme-soft .hero-chip{animation:floatUp .5s ease both;}
  .theme-soft .hero-title{animation:floatUp .5s ease .1s both;}
  .theme-soft .hero-sub{animation:floatUp .5s ease .2s both;}
  .theme-soft .ask-wrap{animation:floatUp .5s ease .3s both;}

  @media (max-width: 900px){
    .theme-soft .matchup-list.home-grid{
      grid-template-columns:1fr;
    }
  }

  @media (max-width: 720px){
    .hdr{
      padding:12px 14px;
    }

    .theme-soft .hdr{
      padding:12px 14px;
    }

    .header-right{
      gap:8px;
    }

    .theme-soft .top-tabs{
      display:none;
    }

    .theme-soft .screen{
      padding:18px 14px 110px;
    }

    .theme-soft .hero-title{
      font-size:40px;
    }

    .theme-soft .send-btn{
      padding:12px 14px;
      font-size:11px;
    }
  }
`;

const ATP_PLAYERS = [
  "Alcaraz","Sinner","Djokovic","Zverev","Medvedev","De Minaur","Auger-Aliassime","Shelton","Fritz","Musetti",
  "Tien","Draper","Fils","Bublik","Mensik","Ruud","Korda","Fonseca","Paul","Fokina","Rublev","Lehecka","Cerundolo","Norrie","Khachanov"
];

const WTA_PLAYERS = [
  "Sabalenka","Rybakina","Swiatek","Pegula","Gauff","Mboko","Anisimova","Svitolina","Muchova","Bencic",
  "Andreeva","Paolini","Keys","Osaka","Noskova","Kostyuk","Vondrousova","Kalinskaya","Mertens","Cirstea",
  "Jovic","Alexandrova","Zheng","Kartal"
];

const NFL_PLAYERS = {
  "James Cook":         { pos:"RB", team:"BUF", tier:"ELITE",  ydsPg:112.3, rec2025:{g:16,yds:1797,td:14,recPg:2.7,ydsPg:112.3,ypr:7.6},  props:{recYds:{floor:80,ceil:150,lean:"OVER"},                          td:{pg:0.88,lean:"OVER — 14 TDs, elite scorer"}},              situation:"Bills RB1 with Josh Allen. Allen's rushing is the only ceiling check but Cook is the every-down back.", bettingAngles:["Rush yards OVER every week","TD scorer OVER is the primary play","Volume is guaranteed — 16g starter"] },
  "Jonathan Taylor":    { pos:"RB", team:"IND", tier:"ELITE",  ydsPg:105.1, rec2025:{g:17,yds:1786,td:14,recPg:3.2,ydsPg:105.1,ypr:4.6},  props:{recYds:{floor:75,ceil:145,lean:"OVER — 105 yds/g base"},         td:{pg:0.82,lean:"OVER 0.5 — elite red zone back"}},            situation:"Colts RB1. Taylor owns the ground game. Richardson health is the only risk.", bettingAngles:["Rush yards OVER weekly","TD scorer OVER — 82% rate is elite","Monitor Richardson health"] },
  "Derrick Henry":      { pos:"RB", team:"BAL", tier:"ELITE",  ydsPg:103.3, rec2025:{g:16,yds:1653,td:15,recPg:1.1,ydsPg:103.3,ypr:5.1},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},                          td:{pg:0.94,lean:"OVER — 15 TDs, most on team"}},               situation:"Ravens RB1 and primary red zone weapon. Lamar Jackson's legs open massive running lanes.", bettingAngles:["Rush yards OVER is the clearest play","TD scorer every week","Fade receiving yards — he does not catch passes"] },
  "Bijan Robinson":     { pos:"RB", team:"ATL", tier:"ELITE",  ydsPg:100.8, rec2025:{g:17,yds:1713,td:11,recPg:3.8,ydsPg:100.8,ypr:5.3},  props:{recYds:{floor:70,ceil:140,lean:"OVER"},                          td:{pg:0.65,lean:"OVER in favorable matchups"}},                situation:"Falcons RB1 with Penix. Every-down back with elite receiving role.", bettingAngles:["Rush yards OVER — elite volume","Receiving yards OVER on pass-heavy weeks","TD scorer reliable but not elite rate"] },
  "De'Von Achane":      { pos:"RB", team:"MIA", tier:"ELITE",  ydsPg:93.7,  rec2025:{g:14,yds:1312,td:12,recPg:5.4,ydsPg:93.7,ypr:6.3},   props:{recYds:{floor:65,ceil:135,lean:"OVER"},                          td:{pg:0.86,lean:"OVER — 12 TDs in 14 games"}},                 situation:"Dolphins dual-threat RB. Receives 5+ per game. Missed 3 games — health is the only risk.", bettingAngles:["Rush yards OVER when healthy","Receiving yards OVER — 5+ rec/g","Hard fade when injury report shows anything"] },
  "Puka Nacua":         { pos:"WR", team:"LAR", tier:"ELITE",  ydsPg:107.2, rec2025:{g:16,tgt:166,rec:129,yds:1715,td:0,recPg:8.1,ydsPg:107.2,ypr:13.3}, props:{recYds:{floor:75,ceil:140,lean:"OVER — 107.2 base leads WRs"}, rec:{floor:6,ceil:11,lean:"OVER — 8.1 rec/g"}, td:{pg:0,lean:"FADE TD scorer — zero TDs in 16g"}}, situation:"Rams WR1 with Stafford. Most receptions in NFL 2025. TD regression coming but timing unknown.", bettingAngles:["Receiving yards OVER every week","Catches OVER is elite volume play","FADE TD scorer until proven otherwise"] },
  "Ja'Marr Chase":      { pos:"WR", team:"CIN", tier:"ELITE",  ydsPg:88.3,  rec2025:{g:16,tgt:185,rec:125,yds:1412,td:10,recPg:7.8,ydsPg:88.3,ypr:11.3}, props:{recYds:{floor:65,ceil:125,lean:"OVER when Burrow healthy"}, td:{pg:0.63,lean:"OVER 0.5 in favorable matchups"}}, situation:"Bengals WR1. Most talented WR in football. Burrow health is the only variable.", bettingAngles:["Receiving yards OVER when Burrow active","TD scorer OVER in red zone games","Hard fade when Burrow out"] },
  "Jaxon Smith-Njigba": { pos:"WR", team:"SEA", tier:"ELITE",  ydsPg:105.5, rec2025:{g:17,tgt:163,rec:119,yds:1793,td:6,recPg:7.0,ydsPg:105.5,ypr:15.1}, props:{recYds:{floor:75,ceil:145,lean:"OVER — led NFL in receiving yards"}, td:{pg:0.35,lean:"Moderate"}}, situation:"Seahawks WR1. Led the NFL in receiving yards in 2025.", bettingAngles:["Receiving yards OVER is the primary lean","Volume locked in regardless of QB","Market may underrate him"] },
  "George Pickens":     { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:84.1,  rec2025:{g:17,tgt:137,rec:93,yds:1429,td:8,recPg:5.5,ydsPg:84.1,ypr:15.4},   props:{recYds:{floor:65,ceil:125,lean:"OVER"}, td:{pg:0.47,lean:"OVER 0.5 in red zone games"}}, situation:"Cowboys WR with Prescott. Targets him downfield consistently.", bettingAngles:["Receiving yards OVER","TD scorer when Cowboys in red zone","Deep threat — big play every game"] },
  "CeeDee Lamb":        { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:76.9,  rec2025:{g:14,tgt:117,rec:75,yds:1077,td:6,recPg:5.4,ydsPg:76.9,ypr:14.4},   props:{recYds:{floor:60,ceil:115,lean:"OVER when healthy"}, td:{pg:0.43,lean:"OVER in favorable matchups"}}, situation:"Cowboys WR1 when healthy. Missed 3 games in 2025.", bettingAngles:["OVER when active — elite talent","Hard fade when any injury report","Monitor weekly"] },
  "Trey McBride":       { pos:"TE", team:"ARI", tier:"ELITE",  ydsPg:72.9,  rec2025:{g:17,tgt:169,rec:126,yds:1239,td:5,recPg:7.4,ydsPg:72.9,ypr:9.8},   props:{rec:{floor:5,ceil:10,lean:"OVER — 7.4 rec/g leads all TEs"}, recYds:{floor:55,ceil:100,lean:"OVER"}, td:{pg:0.29,lean:"Moderate — 5 TDs only"}}, situation:"Best TE situation in football. Murray-McBride is the most reliable QB-TE connection in the NFL.", bettingAngles:["Catches OVER every week — 7.4/g is the floor","Receiving yards OVER is reliable","FADE TD scorer"] },
  "Brock Bowers":       { pos:"TE", team:"LVR", tier:"ELITE",  ydsPg:56.7,  rec2025:{g:12,tgt:86,rec:64,yds:680,td:3,recPg:5.3,ydsPg:56.7,ypr:10.6},     props:{rec:{floor:4,ceil:8,lean:"OVER when healthy"}, recYds:{lean:"OVER when healthy"}, td:{pg:0.25,lean:"Moderate"}}, situation:"Raiders TE1. Historic rookie 2024. Health is the major variable — missed 5 games in 2025.", bettingAngles:["Health monitor every week","OVER immediately when active","Fade anything when injury report shows anything"] },
  "Travis Kelce":       { pos:"TE", team:"KAN", tier:"ELITE",  ydsPg:50.1,  rec2025:{g:17,tgt:108,rec:76,yds:851,td:4,recPg:4.5,ydsPg:50.1,ypr:11.2},    props:{rec:{floor:3,ceil:7,lean:"OVER — Mahomes always finds him"}, td:{pg:0.24,lean:"Moderate — age 37 concern"}}, situation:"Chiefs TE1 but age 37 in 2026. Declining production is real. Mahomes connection keeps him relevant.", bettingAngles:["Catches OVER when Mahomes healthy","FADE receiving yards — 50 is the real base","Monitor usage as season progresses"] },
  "Tyler Warren":       { pos:"TE", team:"IND", tier:"ELITE",  ydsPg:48.1,  rec2025:{g:17,tgt:112,rec:76,yds:817,td:5,recPg:4.5,ydsPg:48.1,ypr:10.7},    props:{rec:{floor:3,ceil:7,lean:"OVER — 4.5/g is elite TE volume"}, td:{pg:0.29,lean:"OVER 0.5 in favorable matchups"}}, situation:"Colts TE1. Elite rookie season. Richardson health is the key variable.", bettingAngles:["Catches OVER every week","Receiving yards OVER as Richardson improves","Year 2 with Richardson should be elite"] },
};

const NFL_PROP_GUIDE = [
  { player:"James Cook",    pos:"RB", team:"BUF", propType:"RUSH YDS",  line:"115.5", floor:80,  ceil:150, lean:"OVER — 112.3 avg, elite workload",            leanClass:"lean-over" },
  { player:"Puka Nacua",    pos:"WR", team:"LAR", propType:"REC YDS",   line:"85.5",  floor:75,  ceil:140, lean:"OVER — 107.2 yds/g leads NFL",                 leanClass:"lean-over" },
  { player:"Trey McBride",  pos:"TE", team:"ARI", propType:"CATCHES",   line:"6.5",   floor:5,   ceil:10,  lean:"OVER — 7.4/g is historic TE production",        leanClass:"lean-over" },
  { player:"Ja'Marr Chase", pos:"WR", team:"CIN", propType:"REC YDS",   line:"75.5",  floor:65,  ceil:125, lean:"OVER when Burrow healthy",                      leanClass:"lean-over" },
  { player:"Derrick Henry", pos:"RB", team:"BAL", propType:"RUSH TDs",  line:"0.5",   floor:0,   ceil:2,   lean:"OVER — 0.94 TDs/g is elite",                   leanClass:"lean-over" },
  { player:"Travis Kelce",  pos:"TE", team:"KAN", propType:"REC YDS",   line:"52.5",  floor:35,  ceil:80,  lean:"FADE — real floor is ~50, market overprices",   leanClass:"lean-fade" },
];

const NFL_POSITIONS = ["ALL","RB","WR","TE"];

function normalizeTennisMatch(match, fallbackTour = "ATP") {
  if (!match) return null;

  const league =
    match.league ||
    (String(match.league_name || "").toLowerCase().includes("wta") ||
    String(match.event_type_type || "").toLowerCase().includes("women")
      ? "WTA"
      : fallbackTour);

  const home = match.home_team || match.event_first_player || "Player 1";
  const away = match.away_team || match.event_second_player || "Player 2";

  let status = match.status || match.event_status || "Scheduled";
  const rawLive = String(match.live ?? match.event_live ?? "0");
  const isLive = rawLive === "1";

  if (isLive && !String(status).toLowerCase().includes("live")) {
    status = "Live";
  }

  return {
    id: match.id || match.event_key || `${home}-${away}-${league}`,
    league,
    leagueColor: league === "WTA" ? "#E11D48" : "#0891B2",
    title: `${home} vs ${away}`,
    time: status,
    network: match.tournament || match.tournament_name || "Tour Match",
    blurb: `${home} vs ${away}${match.round ? ` · ${match.round}` : ""}${match.score ? ` · ${match.score}` : ""}`,
    whatMatters: "This is generated from the current tennis board. Ask for a side, total, prop, or live angle.",
    quickHitters: ["Best angle here?","Moneyline or total?","Any live edge?"],
    confirmed: true,
    raw: {
      ...match,
      live: rawLive,
      status,
      home,
      away,
    },
  };
}

function getCurrentMonth() {
  return new Date().getMonth();
}

function isNflInSeason() {
  const m = getCurrentMonth();
  return m >= 8 || m <= 1;
}

function isNflRampMode() {
  const m = getCurrentMonth();
  return m >= 6 && m <= 7;
}

function getDaypartLabel() {
  const h = new Date().getHours();
  if (h < 12) return "today";
  if (h < 18) return "this afternoon";
  return "tonight";
}

function getPlayerShortLabel(match) {
  if (!match?.raw) return match?.title || "";
  return `${match.raw.home} vs ${match.raw.away}`;
}

function getHomeCardAccent(match, index) {
  if (match.league?.includes("NFL")) return "accent-gold";
  if (match.league === "WTA") return "accent-mag";
  if (match.league === "ATP" || match.league?.includes("TENNIS")) return "accent-cyan";
  return index % 3 === 0 ? "accent-cyan" : index % 3 === 1 ? "accent-mag" : "accent-gold";
}

function getLeanClass(match) {
  if (match.league?.includes("NFL")) return "lean-gold";
  if (match.league === "WTA") return "lean-mag";
  return "lean-cyan";
}

function getLeanText(match) {
  if (match.league?.includes("NFL")) return "→ Explore";
  if (match.league === "WTA") return "↑ WTA Edge";
  return "↑ Tour Edge";
}

function formatServeStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.holdPct !== undefined) p.push(`Hold ${s.holdPct}%`);
  if (s.acePct !== undefined) p.push(`Ace ${s.acePct}%`);
  if (s.dfPct !== undefined) p.push(`DF ${s.dfPct}%`);
  return p.length ? p.join(", ") : "—";
}

function formatReturnStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.rpwPct !== undefined) p.push(`RPW ${s.rpwPct}%`);
  if (s.breakPct !== undefined) p.push(`Break ${s.breakPct}%`);
  return p.length ? p.join(", ") : "—";
}

function formatOverallStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.dominanceRatio !== undefined) p.push(`DR ${s.dominanceRatio}`);
  if (s.totalPointsWonPct !== undefined) p.push(`TPW ${s.totalPointsWonPct}%`);
  if (s.tiebreakPct !== undefined) p.push(`Tiebreak ${s.tiebreakPct}%`);
  return p.length ? p.join(", ") : "—";
}

function getHoldValue(p) {
  return p?.serveStats?.holdPct !== undefined ? `${p.serveStats.holdPct}%` : "—";
}

function getDrValue(p) {
  return p?.overallStats?.dominanceRatio !== undefined ? `${p.overallStats.dominanceRatio}` : "—";
}

function getTbValue(p) {
  return p?.overallStats?.tiebreakPct !== undefined ? `${p.overallStats.tiebreakPct}%` : "—";
}

function buildNflContext() {
  return Object.entries(NFL_PLAYERS).map(([name, p]) => {
    const tdPg = p.props.td?.pg !== undefined ? `${p.props.td.pg} TDs/g` : "";
    const total = p.rec2025.td !== undefined ? `${p.rec2025.td} total TDs` : "";
    const games = p.rec2025.g !== undefined ? `${p.rec2025.g}g` : "";
    const tdLean = p.props.td?.lean || "—";
    const yLean = p.props.recYds?.lean || p.props.rec?.lean || "—";
    const recPg = p.rec2025.recPg !== undefined ? `, ${p.rec2025.recPg} rec/g` : "";
    const tgt = p.rec2025.tgt !== undefined ? `, ${p.rec2025.tgt} tgt` : "";
    const ypr = p.rec2025.ypr !== undefined ? `, ${p.rec2025.ypr} ypr` : "";
    return [
      `${name} | ${p.pos} | ${p.team} | ${p.tier}`,
      `  Stats: ${p.ydsPg} yds/g, ${total} in ${games}${recPg}${tgt}${ypr}`,
      `  TD rate: ${tdPg || "n/a"} | TD lean: ${tdLean}`,
      `  Volume lean: ${yLean}`,
      `  Situation: ${p.situation}`,
      `  Angles: ${p.bettingAngles.join(" | ")}`,
    ].join("\n");
  }).join("\n\n");
}

function renderMessage(text) {
  if (!text) return null;
  const clean = String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();

  const paragraphs = clean.split(/\n{2,}/);

  return paragraphs.map((para, i) => {
    const lines = para.split("\n").map((s) => s.trim()).filter(Boolean);
    const allBullets =
      lines.length > 1 &&
      lines.every((l) => l.startsWith("•") || (l.includes(" — ") && !l.endsWith(".")));

    if (allBullets) {
      return (
        <div key={i} style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
          {lines.map((line, j) => {
            const norm = line.startsWith("•") ? line.slice(1).trim() : line;
            const parts = norm.split("—").map((s) => s.trim());
            const head = parts[0] || "";
            const tail = parts.slice(1).join(" — ");

            return (
              <div key={j} style={{ background:"rgba(8,145,178,.06)", border:"1px solid rgba(8,145,178,.12)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontWeight:600, color:"var(--text)", fontSize:13, marginBottom: tail ? 4 : 0 }}>{head}</div>
                {tail && <div style={{ fontSize:12, color:"var(--soft)", lineHeight:1.55 }}>{tail}</div>}
              </div>
            );
          })}
        </div>
      );
    }

    return <div key={i} style={{ lineHeight:1.7, marginBottom:10 }}>{para}</div>;
  });
}

const AskBar = memo(function AskBar({
  inputRef,
  fileInputRef,
  value,
  onChange,
  onSubmit,
  placeholder,
  btnColor,
  pastedImage,
  clearImage,
  isAsking,
  processImageFile,
}) {
  const handleChange = useCallback((e) => onChange(e.target.value), [onChange]);
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") onSubmit();
  }, [onSubmit]);

  const handleFileChange = useCallback((e) => {
    if (e.target.files?.[0]) processImageFile(e.target.files[0]);
  }, [processImageFile]);

  return (
    <div className="ask-wrap">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display:"none" }}
        onChange={handleFileChange}
      />

      <div className="ask-row">
        <div className="ask-col">
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} alt="Attached" className="ask-img-thumb" />
              <button className="ask-img-remove" onClick={clearImage} type="button">
                ✕ Remove
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            className="ask-bar"
            value={value}
            onChange={handleChange}
            placeholder={pastedImage ? "Ask about this image..." : placeholder}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
          />

          {!pastedImage && (
            <div className="ask-hint">PASTE IMAGE OR TAP ATTACH</div>
          )}
        </div>

        <button
          className={`attach-btn${pastedImage ? " has-img" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        <button
          className="send-btn"
          onClick={onSubmit}
          disabled={isAsking}
          type="button"
          style={btnColor ? { background: btnColor } : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

function ChatThread({ msgs }) {
  if (!msgs || msgs.length === 0) return null;

  return (
    <div className="chat-thread" style={{ marginBottom:20 }}>
      {msgs.map((m, i) => (
        <div key={i} className={`bubble ${m.role}${m.loading ? " loading" : ""}`}>
          {m.image && <img src={m.image} alt="" className="bubble-img" />}
          {m.loading ? m.text : renderMessage(m.text)}
        </div>
      ))}
    </div>
  );
}

function NavIcon({ type }) {
  if (type === "home") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    );
  }
  if (type === "tennis") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    );
  }
  if (type === "ask") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    );
  }
  if (type === "pro") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    );
  }
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19h16M4 5h16M4 12h16"/>
    </svg>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("ur-theme") || "dark");

  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState("home");
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null);
  const [nflPosFilter, setNflPosFilter] = useState("ALL");

  const [homeInput, setHomeInput] = useState("");
  const [askInput, setAskInput] = useState("");
  const [tennisInput, setTennisInput] = useState("");
  const [nflInput, setNflInput] = useState("");
  const [matchupInput, setMatchupInput] = useState("");

  const [askMsgs, setAskMsgs] = useState([]);
  const [tennisMsgs, setTennisMsgs] = useState([]);
  const [nflMsgs, setNflMsgs] = useState([]);
  const [matchupMsgs, setMatchupMsgs] = useState([]);

  const [isAsking, setIsAsking] = useState(false);
  const [players, setPlayers] = useState(null);
  const [context, setContext] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [tennisLoading, setTennisLoading] = useState(false);

  const [pastedImage, setPastedImage] = useState(null);

  const homeInputRef = useRef(null);
  const askInputRef = useRef(null);
  const tennisInputRef = useRef(null);
  const nflInputRef = useRef(null);
  const matchupInputRef = useRef(null);
  const playerInputRef = useRef(null);
  const nflPlayerInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const nflSeasonMode = useMemo(() => isNflInSeason(), []);
  const nflRampMode = useMemo(() => isNflRampMode(), []);

  useEffect(() => {
    localStorage.setItem("ur-theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setTennisLoading(true);
      try {
        const [pRes, cRes, atpRes, wtaRes] = await Promise.all([
          fetch("/api/tennis-players"),
          fetch("/api/tennis-context"),
          fetch("/api/tennis?tour=atp"),
          fetch("/api/tennis?tour=wta"),
        ]);

        const [p, c, atpLive, wtaLive] = await Promise.all([
          pRes.json(),
          cRes.json(),
          atpRes.json(),
          wtaRes.json(),
        ]);

        if (!active) return;

        setPlayers(p);
        setContext(c);

        const merged = [
          ...(Array.isArray(atpLive) ? atpLive.map((m) => normalizeTennisMatch(m, "ATP")) : []),
          ...(Array.isArray(wtaLive) ? wtaLive.map((m) => normalizeTennisMatch(m, "WTA")) : []),
        ].filter(Boolean);

        const deduped = [];
        const seen = new Set();

        for (const m of merged) {
          const key = `${m.league}-${m.title}-${m.network}-${m.raw?.status || ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(m);
        }

        const sorted = deduped.sort((a, b) => {
          const aLive = String(a?.raw?.live || "0") === "1" ? 1 : 0;
          const bLive = String(b?.raw?.live || "0") === "1" ? 1 : 0;
          return bLive - aLive;
        });

        setLiveMatches(sorted);
      } catch {
        if (active) setLiveMatches([]);
      } finally {
        if (active) setTennisLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const processImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPastedImage({
        base64: dataUrl.split(",")[1],
        mediaType: file.type,
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setPastedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint }) => {
    if (!text || isAsking) return;

    setIsAsking(true);

    const imgToSend = pastedImage;
    const userMsg = { role:"user", text, image: imgToSend?.previewUrl || null };
    const thinkMsg = { role:"ai", text:"THINKING...", loading:true };

    setMsgs((prev) => [...prev, userMsg, thinkMsg]);
    clearImage();

    try {
      const body = {
        question: text,
        players,
        context,
        liveMatches,
        tour: "atp",
        history: [],
        matchupContext: matchup || null,
        nflContext: buildNflContext(),
        sportHint: sportHint || null,
      };

      if (imgToSend) {
        body.image = {
          base64: imgToSend.base64,
          mediaType: imgToSend.mediaType,
        };
      }

      const res = await fetch("/api/ur-take", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      const aiText = data.response || "Couldn't get a response — try again.";
      setMsgs((prev) => [...prev.filter((m) => !m.loading), { role:"ai", text: aiText }]);
    } catch {
      setMsgs((prev) => [...prev.filter((m) => !m.loading), { role:"ai", text:"Something went wrong — try again." }]);
    } finally {
      setIsAsking(false);
    }
  }, [clearImage, context, isAsking, liveMatches, pastedImage, players]);

  const getPlayer = useCallback((name, tour = "atp") => {
    if (!players) return null;
    return (tour === "atp" ? players.atp : players.wta)?.[name] || null;
  }, [players]);

  const getPlayerAny = useCallback((name) => {
    if (!players) return null;
    return players.atp?.[name] || players.wta?.[name] || null;
  }, [players]);

  const pd = screen === "player" && selectedPlayer ? getPlayerAny(selectedPlayer) : null;
  const nflPd = screen === "nflplayer" && selectedNflPlayer ? NFL_PLAYERS[selectedNflPlayer] : null;

  const filteredNflPlayers = useMemo(() => {
    return Object.entries(NFL_PLAYERS)
      .filter(([, p]) => nflPosFilter === "ALL" || p.pos === nflPosFilter)
      .sort((a, b) => b[1].ydsPg - a[1].ydsPg);
  }, [nflPosFilter]);

  const tennisLiveMatches = useMemo(
    () => liveMatches.filter((m) => String(m?.raw?.live || "0") === "1"),
    [liveMatches]
  );

  const tennisUpcomingMatches = useMemo(
    () => liveMatches.filter((m) => String(m?.raw?.live || "0") !== "1"),
    [liveMatches]
  );

  const homeTennisCards = useMemo(() => {
    const cards = [];

    if (tennisLiveMatches[0]) {
      cards.push({
        ...tennisLiveMatches[0],
        homeCategory: "Live Tennis",
      });
    }

    if (tennisUpcomingMatches[0]) {
      cards.push({
        ...tennisUpcomingMatches[0],
        homeCategory: "Upcoming Tennis",
      });
    }

    if (cards.length < 2) {
      cards.push({
        id:"tennis-future-1",
        league:"TENNIS FUTURE",
        leagueColor:"#0891B2",
        title:"Best current tennis future value",
        time:"Always On",
        network:"Tour Futures",
        blurb:"When the live board is thin, the homepage pivots tennis toward current futures, form, draw path, and upcoming spots.",
        whatMatters:"This keeps tennis current and future-facing without hardwiring stale tournament copy.",
        quickHitters:["Best tennis future right now?","Who has the best path?","Which price is stale?"],
        stats:[
          { label:"MODE", value:"FUTURES" },
          { label:"FOCUS", value:"PATH" },
          { label:"EDGE", value:"NOW" },
        ],
        confirmed:true,
      });
    }

    return cards.slice(0, 2);
  }, [tennisLiveMatches, tennisUpcomingMatches]);

  const homeNflCards = useMemo(() => {
    if (nflSeasonMode) {
      return [
        {
          id:"nfl-home-1",
          league:"NFL IN-SEASON",
          leagueColor:"#D97706",
          title:"Best weekly NFL prop board",
          time:"Season Active",
          network:"Weekly Props",
          blurb:"When the NFL season is live, the homepage pivots to weekly usage, current prop mispricing, role changes, and live edges.",
          whatMatters:"Weekly props and role movement should outrank distant futures once the season is active.",
          quickHitters:["Best prop this week?","Biggest role shift?","Best TD angle?"],
          stats:[
            { label:"MODE", value:"WEEKLY" },
            { label:"FOCUS", value:"USAGE" },
            { label:"EDGE", value:"LIVE" },
          ],
          confirmed:true,
        },
        {
          id:"nfl-home-2",
          league:"NFL IN-SEASON",
          leagueColor:"#D97706",
          title:"Most mispriced in-season usage spot",
          time:"Season Active",
          network:"Role + Volume",
          blurb:"Targets the player whose market line lags behind actual carry share, target volume, or red-zone role.",
          whatMatters:"This is the in-season version of homepage NFL: less season-total narrative, more actual market lag.",
          quickHitters:["Which line is stale?","Best volume play?","Best role-based edge?"],
          stats:[
            { label:"FOCUS", value:"ROLE" },
            { label:"MARKET", value:"LAG" },
            { label:"TYPE", value:"WEEKLY" },
          ],
          confirmed:true,
        }
      ];
    }

    return [
      {
        id:"nfl-home-future-1",
        league:"NFL FUTURE",
        leagueColor:"#D97706",
        title:"Puka Nacua 2026 outlook",
        time:nflRampMode ? "Season Approaching" : "Futures Window",
        network:"Season Futures",
        blurb:"Elite volume profile. Best used as a future-facing homepage NFL card until the season flips the app into weekly mode.",
        whatMatters:"Homepage NFL stays future-oriented until the season begins.",
        quickHitters:["Best Puka future?","Yards or catches?","Is price fair yet?"],
        stats:[
          { label:"YDS/G", value:"107.2" },
          { label:"REC", value:"129" },
          { label:"MODE", value:"FUTURE" },
        ],
        confirmed:true,
      },
      {
        id:"nfl-home-future-2",
        league:"NFL FUTURE",
        leagueColor:"#D97706",
        title:"Derrick Henry TD future",
        time:nflRampMode ? "Season Approaching" : "Futures Window",
        network:"Season Futures",
        blurb:"Still one of the cleanest touchdown archetypes in football. Strong fit for offseason homepage exposure.",
        whatMatters:"Keep the future NFL framing now, then automatically rotate to weekly cards once season mode hits.",
        quickHitters:["Henry TD over?","Best RB TD future?","Most reliable scorer profile?"],
        stats:[
          { label:"TD/G", value:"0.94" },
          { label:"YDS/G", value:"103.3" },
          { label:"MODE", value:"FUTURE" },
        ],
        confirmed:true,
      }
    ];
  }, [nflSeasonMode, nflRampMode]);

  const homeCards = useMemo(() => [...homeTennisCards, ...homeNflCards], [homeTennisCards, homeNflCards]);

  const dynamicHomeQuestions = useMemo(() => {
    const prompts = [];
    const used = new Set();
    const daypart = getDaypartLabel();

    const push = (item) => {
      if (!item || used.has(item.text)) return;
      used.add(item.text);
      prompts.push(item);
    };

    if (tennisLiveMatches[0]) {
      const match = tennisLiveMatches[0];
      const label = getPlayerShortLabel(match);
      push({
        id:"q1",
        color: match.league === "WTA" ? "#E11D48" : "#0891B2",
        text:`Best live angle for ${label}?`,
        prompt:`What is the best live betting angle for ${label} right now? Give me the strongest side, total, and any prop edge.`,
      });
    }

    if (tennisUpcomingMatches[0]) {
      const match = tennisUpcomingMatches[0];
      const label = getPlayerShortLabel(match);
      push({
        id:"q2",
        color: match.league === "WTA" ? "#E11D48" : "#0891B2",
        text:`Best tennis bet in ${label} ${daypart}?`,
        prompt:`What is the best bet in ${label} ${daypart}? Give me the cleanest angle and one sharper alternative.`,
      });
    }

    push({
      id:"q3",
      color:"#0891B2",
      text:"Which tennis future still has value right now?",
      prompt:"Which tennis future still has value right now, and why has the market not fully priced it correctly?",
    });

    if (nflSeasonMode) {
      push({
        id:"q4",
        color:"#E11D48",
        text:"Which NFL weekly prop is most mispriced?",
        prompt:"Which NFL weekly player prop looks the most mispriced right now based on current usage and the player database?",
      });

      push({
        id:"q5",
        color:"#E11D48",
        text:"Best NFL in-season edge on the board?",
        prompt:"What is the best NFL in-season betting edge on the board right now, and what is the clearest reason the market may be wrong?",
      });
    } else {
      push({
        id:"q4",
        color:"#E11D48",
        text:"Which NFL future looks most mispriced?",
        prompt:"Which NFL future looks the most mispriced right now based on the current player database and team context?",
      });

      push({
        id:"q5",
        color:"#E11D48",
        text:"Which RB scores the most TDs in 2026?",
        prompt:"Based on the NFL player database, which running back is most likely to lead the NFL in touchdowns in 2026?",
      });
    }

    return prompts.slice(0, 5);
  }, [tennisLiveMatches, tennisUpcomingMatches, nflSeasonMode]);

  const goHome = useCallback(() => {
    setTab("home");
    setScreen("home");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, []);

  const goTennis = useCallback(() => {
    setTab("tennis");
    setScreen("tennis");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, []);

  const goNfl = useCallback(() => {
    setTab("nfl");
    setScreen("nfl");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, []);

  const goAsk = useCallback(() => {
    setTab("ask");
    setScreen("ask");
    setSelectedMatchup(null);
  }, []);

  const goPro = useCallback(() => {
    setTab("pro");
    setScreen("pro");
    setSelectedMatchup(null);
  }, []);

  const openMatchup = useCallback((m) => {
    setSelectedMatchup(m);
    setMatchupMsgs([]);
    setMatchupInput("");
    setScreen("matchup");
    setTab(m?.league?.includes("NFL") ? "nfl" : "home");
  }, []);

  const openPlayer = useCallback((name) => {
    setSelectedPlayer(name);
    setScreen("player");
    setTab("tennis");
  }, []);

  const openNflPlayer = useCallback((name) => {
    setSelectedNflPlayer(name);
    setScreen("nflplayer");
    setTab("nfl");
  }, []);

  const firePrompt = useCallback((prompt) => {
    setTab("ask");
    setScreen("ask");
    setAskInput("");
    askUrTake({ text: prompt, setMsgs: setAskMsgs });
  }, [askUrTake]);

  const submitHome = useCallback(() => {
    const t = homeInput.trim();
    if (!t || isAsking) return;
    setHomeInput("");
    setAskInput("");
    setTab("ask");
    setScreen("ask");
    askUrTake({ text: t, setMsgs: setAskMsgs });
  }, [askUrTake, homeInput, isAsking]);

  const submitAsk = useCallback(() => {
    const t = askInput.trim();
    if (!t || isAsking) return;
    setAskInput("");
    askUrTake({ text: t, setMsgs: setAskMsgs });
  }, [askInput, askUrTake, isAsking]);

  const submitTennis = useCallback((forced) => {
    const t = (forced ?? tennisInput).trim();
    if (!t || isAsking) return;
    if (!forced) setTennisInput("");
    askUrTake({ text: t, setMsgs: setTennisMsgs, sportHint:"tennis" });
  }, [askUrTake, isAsking, tennisInput]);

  const submitNfl = useCallback((forced) => {
    const t = (forced ?? nflInput).trim();
    if (!t || isAsking) return;
    if (!forced) setNflInput("");
    askUrTake({ text: t, setMsgs: setNflMsgs, sportHint:"nfl" });
  }, [askUrTake, isAsking, nflInput]);

  const submitMatchup = useCallback((forced) => {
    const t = (forced ?? matchupInput).trim();
    if (!t || isAsking) return;
    if (!forced) setMatchupInput("");
    const hint = selectedMatchup?.league?.includes("NFL") ? "nfl" : "tennis";
    askUrTake({ text: t, matchup: selectedMatchup, setMsgs: setMatchupMsgs, sportHint: hint });
  }, [askUrTake, isAsking, matchupInput, selectedMatchup]);

  function TennisPlayerCard({ name, idx, tour }) {
    const p = getPlayer(name, tour);
    if (!p) return null;

    return (
      <div className="player-card" onClick={() => openPlayer(name)}>
        <div className="player-top">
          <div className="player-rank">#{idx + 1}</div>
          <div className="player-info">
            <div className="player-name">{name}</div>
            <div className="player-style">
              {Array.isArray(p.style) ? p.style.join(", ").replaceAll("_"," ") : p.style}
            </div>
            <div className="surface-pills">
              {p.surfaceNote?.hard && <span className="surface-pill surface-hard">HARD</span>}
              {p.surfaceNote?.clay && <span className="surface-pill surface-clay">CLAY</span>}
              {p.surfaceNote?.grass && <span className="surface-pill surface-grass">GRASS</span>}
            </div>
          </div>
          <div className="player-elo">
            <span className="player-elo-num">{p.elo}</span>
            <span className="player-elo-label">ELO</span>
            {p.record2026 && <div className="form-badge" style={{ marginTop:4 }}>2026</div>}
          </div>
        </div>
        <div className="player-stats">
          <div className="pstat"><div className="pstat-label">HOLD</div><div className="pstat-value">{getHoldValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">DR</div><div className="pstat-value" style={{ color:"var(--cyan)" }}>{getDrValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">TB%</div><div className="pstat-value">{getTbValue(p)}</div></div>
        </div>
      </div>
    );
  }

  function NflPlayerCard({ name, player }) {
    return (
      <div className="nfl-player-card" onClick={() => openNflPlayer(name)}>
        <div className="nfl-player-top">
          <div className="nfl-player-left">
            <div className="nfl-rank">{player.pos}</div>
            <div className="nfl-player-info">
              <div className="nfl-player-name">{name}</div>
              <div className="nfl-player-meta">{player.team} · {player.tier}</div>
            </div>
          </div>
          <div className="nfl-player-right">
            <span className="nfl-yds-pg">{player.ydsPg}</span>
            <span className="nfl-yds-label">YDS/G</span>
          </div>
        </div>
        <div className="nfl-player-stats">
          <div className="nfl-stat"><div className="nfl-stat-label">GAMES</div><div className="nfl-stat-value">{player.rec2025.g}</div></div>
          <div className="nfl-stat"><div className="nfl-stat-label">TDs</div><div className="nfl-stat-value" style={{ color:"var(--nfl)" }}>{player.rec2025.td}</div></div>
          {player.rec2025.tgt
            ? <div className="nfl-stat"><div className="nfl-stat-label">TGT</div><div className="nfl-stat-value">{player.rec2025.tgt}</div></div>
            : <div className="nfl-stat"><div className="nfl-stat-label">REC/G</div><div className="nfl-stat-value">{player.rec2025.recPg ?? "—"}</div></div>}
          <div className="nfl-stat"><div className="nfl-stat-label">YPR</div><div className="nfl-stat-value">{player.rec2025.ypr}</div></div>
        </div>
      </div>
    );
  }

  const activeHeaderPill = (
    <>
      {screen === "tennis" && <span className="pill-live">TENNIS</span>}
      {screen === "nfl" && <span className="pill-nfl">{nflSeasonMode ? "NFL IN-SEASON" : "NFL FUTURES"}</span>}
      {screen === "nflplayer" && nflPd && <span className="pill-nfl">{selectedNflPlayer?.toUpperCase()}</span>}
      {screen === "player" && <span className="pill-tag">{selectedPlayer?.toUpperCase()}</span>}
      {screen === "matchup" && selectedMatchup && (
        selectedMatchup.league?.includes("NFL")
          ? <span className="pill-nfl">{selectedMatchup.league}</span>
          : <span className="pill-tag">{selectedMatchup.league}</span>
      )}
      {screen === "ask" && <span className="pill-tag">UR TAKE</span>}
      {(screen === "home" || screen === "pro") && <span className="pill-live">LIVE</span>}
    </>
  );

  return (
    <>
      <style>{css}</style>

      <div className={`app theme-${theme}`}>
        <header className="hdr">
          <div className="wordmark">
            <span className="logo-under">Under</span>
            <span className="logo-review">Review</span>
            <div className="wm-dots">
              <div className="wm-dot d-c" />
              <div className="dot-line" />
              <div className="wm-dot d-m" />
            </div>
          </div>

          <div className="header-right">
            <div className="top-tabs">
              <button className={`top-tab${tab === "home" ? " active" : ""}`} onClick={goHome}>Home</button>
              <button className={`top-tab${tab === "tennis" ? " active" : ""}`} onClick={goTennis}>Tennis</button>
              <button className={`top-tab${tab === "ask" ? " active" : ""}`} onClick={goAsk}>Ask</button>
              <button className="top-tab pro" onClick={goPro}>Pro ✦</button>
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "soft" : "dark"))}
            >
              {theme === "dark" ? "LIGHT MODE" : "DARK MODE"}
            </button>

            {activeHeaderPill}
          </div>
        </header>

        {screen === "home" && (
          <main className="screen">
            <section className="hero">
              {theme === "soft" && <div className="hero-chip">UR Take · Live</div>}
              <div className="hero-title">
                {theme === "soft" ? (
                  <>
                    The lean, the data,<br />
                    the <em>edge.</em>
                  </>
                ) : (
                  <>What do you want to know?</>
                )}
              </div>
              <div className="hero-sub">
                {theme === "soft"
                  ? "Ask a matchup, prop, or slate question. UR Take gives you a sharp, stat-backed answer in seconds — not a picks feed, a thinking partner."
                  : "Tennis, NFL, props, futures, live spots, and player angles — without stale homepage copy."}
              </div>
            </section>

            <AskBar
              inputRef={homeInputRef}
              fileInputRef={fileInputRef}
              value={homeInput}
              onChange={setHomeInput}
              onSubmit={submitHome}
              placeholder={
                theme === "soft"
                  ? "Who wins Charleston Open? Best QB rushing props? Swiatek ace under?"
                  : "Ask UR TAKE anything..."
              }
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              processImageFile={processImageFile}
            />

            {theme === "dark" && (
              <div className="home-banner">
                <div className="banner-title">Homepage Board Logic</div>
                <div className="banner-sub">TENNIS NOW · NFL {nflSeasonMode ? "IN-SEASON" : nflRampMode ? "RAMPING UP" : "FUTURES"}</div>
                <div className="banner-note">
                  Tennis cards now prioritize live and upcoming tour activity. NFL stays future-facing until season mode kicks in, then the homepage automatically pivots to in-season weekly NFL cards.
                </div>
              </div>
            )}

            <section className="section">
              {theme === "soft" ? (
                <div className="section-row">
                  <span className="section-title-inline">Trending</span>
                </div>
              ) : (
                <div className="section-label">TRENDING ASKS</div>
              )}

              <div className="q-list">
                {dynamicHomeQuestions.map((q) => (
                  <button key={q.id} className="q-card" onClick={() => firePrompt(q.prompt)}>
                    <div className="q-top">
                      <div className="q-accent" style={{ background:q.color }} />
                      <div className="q-text">{q.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              {theme === "soft" ? (
                <div className="section-row">
                  <span className="section-title-inline">Featured Matchups</span>
                  <button className="see-all" onClick={goTennis}>View all →</button>
                </div>
              ) : (
                <div className="section-label">HOMEPAGE CARDS</div>
              )}

              <div className={`matchup-list${theme === "soft" ? " home-grid" : ""}`}>
                {homeCards.slice(0, theme === "soft" ? 3 : 4).map((m, index) => (
                  <div
                    key={m.id}
                    className={`matchup-card ${theme === "soft" ? getHomeCardAccent(m, index) : ""}`}
                    onClick={() => openMatchup(m)}
                  >
                    <div className="matchup-top">
                      <div className="matchup-league" style={{ color:m.leagueColor }}>
                        {theme === "soft"
                          ? (m.league === "WTA" || m.league === "ATP" ? `${m.league} · Tour` : m.league)
                          : (m.homeCategory || m.league)}
                      </div>
                      <div className="matchup-time">{m.time}</div>
                    </div>

                    <div className="matchup-body">
                      <div className="matchup-title">{m.title}</div>
                      <div className="matchup-meta">{m.network}</div>
                      <div className="matchup-blurb">{m.blurb}</div>
                      {theme === "soft" && (
                        <div className={`matchup-lean ${getLeanClass(m)}`}>{getLeanText(m)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {theme === "dark" && (
              <section className="section">
                <div className="section-label">SPORTS</div>
                <div className="sport-chips">
                  <button className="sport-chip active" onClick={goTennis}>TENNIS</button>
                  <button className="sport-chip nfl-chip active" onClick={goNfl}>
                    {nflSeasonMode ? "NFL IN-SEASON" : "NFL"}
                  </button>
                </div>
              </section>
            )}

            <div className="page-spacer" />
          </main>
        )}

        {screen === "tennis" && (
          <main className="screen">
            <div className="tour-banner">
              <div className="banner-title">Tennis Board</div>
              <div className="banner-sub">CURRENT + UPCOMING TOUR MATCHES</div>
              <div className="banner-note">
                {liveMatches.length > 0
                  ? `${tennisLiveMatches.length} live · ${tennisUpcomingMatches.length} upcoming. This section stays current instead of freezing around one past event.`
                  : "No current matches loaded right now, so the board falls back to player intelligence, futures, and current form."}
              </div>
            </div>

            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:14, marginBottom:16, boxShadow:"var(--card-shadow)" }}>
              <div style={{ fontSize:10, color:"var(--cyan)", fontFamily:"var(--mono-font)", letterSpacing:2, marginBottom:8, textTransform:"uppercase" }}>
                Ask Anything — Tennis
              </div>
              <AskBar
                inputRef={tennisInputRef}
                fileInputRef={fileInputRef}
                value={tennisInput}
                onChange={setTennisInput}
                onSubmit={() => submitTennis()}
                placeholder="Best tennis bet tonight? Which match is mispriced? Best live angle?"
                pastedImage={pastedImage}
                clearImage={clearImage}
                isAsking={isAsking}
                processImageFile={processImageFile}
              />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[
                  "Best tennis bets tonight?",
                  "Which tennis match is mispriced?",
                  "Best live tennis angle right now?",
                  "What futures still have value?"
                ].map((q) => (
                  <button key={q} className="quick-btn" onClick={() => submitTennis(q)} style={{ fontSize:11 }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <ChatThread msgs={tennisMsgs} />

            <div className="section-divider">Live + Upcoming Matches</div>

            {tennisLoading ? (
              <div className="loading-state"><div className="loading-text">LOADING TENNIS BOARD...</div></div>
            ) : liveMatches.length > 0 ? (
              <div className="matchup-list">
                {liveMatches.map((m) => (
                  <div key={m.id} className="matchup-card" onClick={() => openMatchup(m)}>
                    <div className="matchup-top">
                      <div className="matchup-league" style={{ color:m.leagueColor }}>{m.league}</div>
                      <div className="matchup-time">{String(m?.raw?.live || "0") === "1" ? "LIVE" : (m.raw?.status || m.time)}</div>
                    </div>
                    <div className="matchup-body">
                      <div className="matchup-title">{m.title}</div>
                      <div className="matchup-meta">
                        {m.network}
                        {m.raw?.round ? ` · ${m.raw.round}` : ""}
                      </div>
                      <div className="matchup-blurb">
                        {m.raw?.score && m.raw.score !== "-" ? `Current score: ${m.raw.score}. ` : ""}
                        {m.blurb}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading-state"><div className="loading-text">NO CONFIRMED TENNIS MATCHES FOUND</div></div>
            )}

            {context?.ace_props && (
              <>
                <div className="section-divider">Prop Guide</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  {Object.entries(context.ace_props).map(([name, data]) => (
                    <div key={name} className="matchup-card" onClick={() => submitTennis(`Tell me about ${name} ace props right now`)}>
                      <div className="matchup-body">
                        <div className="matchup-title" style={{ fontSize:15 }}>{name}</div>
                        <div className="matchup-meta">ACES</div>
                        <div className="matchup-blurb">{data.avg_aces_hard} avg · {data.ace_rate}</div>
                        <div className="matchup-blurb" style={{ marginTop:6 }}>{data.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {players && (
              <>
                <div className="section-divider">ATP Top 25</div>
                {ATP_PLAYERS.map((name, idx) => <TennisPlayerCard key={name} name={name} idx={idx} tour="atp" />)}

                <div className="section-divider">WTA Top 24</div>
                {WTA_PLAYERS.map((name, idx) => <TennisPlayerCard key={name} name={name} idx={idx} tour="wta" />)}
              </>
            )}

            <div className="page-spacer" />
          </main>
        )}

        {screen === "nfl" && (
          <main className="screen">
            <div className="nfl-banner">
              <div className="banner-title">{nflSeasonMode ? "NFL In-Season Board" : "NFL Futures Board"}</div>
              <div className="banner-sub">{nflSeasonMode ? "WEEKLY PROPS · USAGE · PLAYER ANGLES" : "FUTURES · PLAYER STATS · BETTING ANGLES"}</div>
              <div className="banner-note">
                {nflSeasonMode
                  ? "Homepage and NFL section are aligned to in-season weekly props, role changes, usage shifts, and current edges."
                  : "NFL stays future-facing until the season is active, then the homepage automatically rotates to in-season NFL cards."}
              </div>
            </div>

            <div className="nfl-ask-shell">
              <div className="nfl-ask-label">Ask Anything — NFL</div>
              <AskBar
                inputRef={nflInputRef}
                fileInputRef={fileInputRef}
                value={nflInput}
                onChange={setNflInput}
                onSubmit={() => submitNfl()}
                placeholder={nflSeasonMode ? "Best WR prop this week? Biggest role change?" : "Which RB leads TDs in 2026? Best future?"}
                btnColor="var(--nfl)"
                pastedImage={pastedImage}
                clearImage={clearImage}
                isAsking={isAsking}
                processImageFile={processImageFile}
              />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {(nflSeasonMode
                  ? ["Best WR props this week?","Biggest usage jump?","Best TD scorer angle?","Which line is stale?"]
                  : ["Best WR future?","Top TE by volume?","Fade or take Kelce?","Best RB rushing future?"]
                ).map((q) => (
                  <button key={q} className="quick-btn" onClick={() => submitNfl(q)} style={{ fontSize:11 }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <ChatThread msgs={nflMsgs} />

            <div className="section-divider">{nflSeasonMode ? "Top Weekly Leans" : "Top Future Leans"}</div>

            {NFL_PROP_GUIDE.map((prop) => (
              <div
                key={`${prop.player}-${prop.propType}`}
                className="nfl-prop-card"
                onClick={() => submitNfl(`Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`)}
              >
                <div className="nfl-prop-top">
                  <div className="nfl-prop-player">{prop.player}</div>
                  <div className="nfl-prop-type">{prop.propType}</div>
                </div>
                <div className="nfl-prop-line">Line: {prop.line} · Floor {prop.floor} / Ceil {prop.ceil}</div>
                <div className={`nfl-prop-lean ${prop.leanClass}`}>{prop.lean}</div>
              </div>
            ))}

            <div className="section-divider">Player Database</div>

            <div className="pos-tabs">
              {NFL_POSITIONS.map((pos) => (
                <button
                  key={pos}
                  className={`pos-tab${nflPosFilter === pos ? " active" : ""}`}
                  onClick={() => setNflPosFilter(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>

            {filteredNflPlayers.map(([name, player]) => (
              <NflPlayerCard key={name} name={name} player={player} />
            ))}

            <div className="page-spacer" />
          </main>
        )}

        {screen === "nflplayer" && nflPd && (
          <main className="screen">
            <button className="detail-back" onClick={() => { setScreen("nfl"); setSelectedNflPlayer(null); }}>← BACK</button>

            <div className="detail-card">
              <div className="nfl-detail-head">
                <div className="nfl-detail-pos">{nflPd.pos} · {nflPd.team} · {nflPd.tier}</div>
                <div className="nfl-detail-name">{selectedNflPlayer}</div>
                <div className="nfl-detail-sub">{nflPd.ydsPg} yds/g · {nflPd.rec2025.g} games played</div>
              </div>

              <div className="nfl-detail-grid">
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YDS/G</div><div className="nfl-detail-value" style={{ color:"var(--nfl)" }}>{nflPd.ydsPg}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">TDs</div><div className="nfl-detail-value" style={{ color:"var(--gold)" }}>{nflPd.rec2025.td}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YPR</div><div className="nfl-detail-value">{nflPd.rec2025.ypr}</div></div>
                {nflPd.rec2025.tgt && <div className="nfl-detail-stat"><div className="nfl-detail-label">TARGETS</div><div className="nfl-detail-value">{nflPd.rec2025.tgt}</div></div>}
                {nflPd.rec2025.recPg && <div className="nfl-detail-stat"><div className="nfl-detail-label">REC/G</div><div className="nfl-detail-value">{nflPd.rec2025.recPg}</div></div>}
                <div className="nfl-detail-stat"><div className="nfl-detail-label">GAMES</div><div className="nfl-detail-value">{nflPd.rec2025.g}</div></div>
              </div>

              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">Prop Breakdown</div>
                <div className="nfl-prop-block">
                  {nflPd.props.recYds && (
                    <>
                      <div className="nfl-prop-row"><span className="nfl-prop-name">REC YDS</span><span className="nfl-prop-val" style={{ color:"var(--muted)" }}>Floor {nflPd.props.recYds.floor} / Ceil {nflPd.props.recYds.ceil}</span></div>
                      <div className="nfl-prop-row"><span className="nfl-prop-name">LEAN</span><span className={`nfl-prop-val ${nflPd.props.recYds.lean?.includes("OVER") ? "lean-over" : "lean-neutral"}`}>{nflPd.props.recYds.lean}</span></div>
                    </>
                  )}
                  {nflPd.props.rec && <div className="nfl-prop-row"><span className="nfl-prop-name">CATCHES</span><span className={`nfl-prop-val ${nflPd.props.rec.lean?.includes("OVER") ? "lean-over" : "lean-neutral"}`}>{nflPd.props.rec.lean}</span></div>}
                  {nflPd.props.td && <div className="nfl-prop-row"><span className="nfl-prop-name">TD SCORER</span><span className={`nfl-prop-val ${nflPd.props.td.lean?.includes("OVER") ? "lean-over" : nflPd.props.td.lean?.includes("FADE") ? "lean-fade" : "lean-neutral"}`}>{nflPd.props.td.lean}</span></div>}
                </div>
              </div>

              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">Situation</div>
                <div className="nfl-situation">{nflPd.situation}</div>
              </div>

              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">Betting Angles</div>
                <div className="nfl-betting-angles">
                  {nflPd.bettingAngles.map((angle, i) => (
                    <div key={i} className="nfl-angle-item">
                      <div className="nfl-angle-dot" />
                      <div>{angle}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AskBar
              inputRef={nflPlayerInputRef}
              fileInputRef={fileInputRef}
              value={nflInput}
              onChange={setNflInput}
              onSubmit={() => submitNfl()}
              placeholder={`Ask about ${selectedNflPlayer}...`}
              btnColor="var(--nfl)"
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              processImageFile={processImageFile}
            />
          </main>
        )}

        {screen === "matchup" && selectedMatchup && (
          <main className="screen">
            <button className="detail-back" onClick={() => {
              setSelectedMatchup(null);
              setScreen(selectedMatchup?.league?.includes("NFL") ? "nfl" : "home");
            }}>
              ← BACK
            </button>

            <div className="detail-card">
              <div className="detail-head">
                <div className="detail-league" style={{ color:selectedMatchup.leagueColor }}>{selectedMatchup.league}</div>
                <div className="detail-title">{selectedMatchup.title}</div>
                <div className="detail-sub">{selectedMatchup.time} · {selectedMatchup.network}</div>
              </div>

              <div className="what-matters">
                <div className="wm-label">Here's What Matters</div>
                <div className="wm-text">
                  {selectedMatchup.whatMatters || "This is a live or upcoming board matchup. Ask for sides, totals, or player-specific angles."}
                </div>
              </div>

              {selectedMatchup.stats && (
                <div className="mini-grid">
                  {selectedMatchup.stats.map((s) => (
                    <div key={s.label} className="mini-stat">
                      <div className="mini-label">{s.label}</div>
                      <div className="mini-value">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedMatchup.quickHitters && (
                <div className="quick-hitters">
                  {selectedMatchup.quickHitters.map((q) => (
                    <button key={q} className="quick-btn" onClick={() => submitMatchup(q)}>{q}</button>
                  ))}
                </div>
              )}
            </div>

            <ChatThread msgs={matchupMsgs} />

            <AskBar
              inputRef={matchupInputRef}
              fileInputRef={fileInputRef}
              value={matchupInput}
              onChange={setMatchupInput}
              onSubmit={() => submitMatchup()}
              placeholder={`Ask about ${selectedMatchup.title}...`}
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              processImageFile={processImageFile}
            />
          </main>
        )}

        {screen === "player" && pd && (
          <main className="screen">
            <button className="detail-back" onClick={() => setScreen("tennis")}>← BACK</button>

            <div className="detail-card">
              <div className="detail-head">
                <div className="detail-league" style={{ color:"var(--cyan)" }}>TENNIS PLAYER PROFILE</div>
                <div className="detail-title">{selectedPlayer}</div>
                <div className="detail-sub">
                  {Array.isArray(pd.style) ? pd.style.join(", ").replaceAll("_"," ") : pd.style} · Elo {pd.elo}
                </div>
              </div>

              <div className="what-matters">
                <div className="wm-label">Surface Notes</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:8 }}>
                  <div className="mini-stat"><div className="mini-label">HARD</div><div className="mini-value" style={{ color:"var(--cyan)" }}>•</div><div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{pd.surfaceNote?.hard || "—"}</div></div>
                  <div className="mini-stat"><div className="mini-label">CLAY</div><div className="mini-value" style={{ color:"var(--gold)" }}>•</div><div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{pd.surfaceNote?.clay || "—"}</div></div>
                  <div className="mini-stat"><div className="mini-label">GRASS</div><div className="mini-value" style={{ color:"var(--green)" }}>•</div><div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{pd.surfaceNote?.grass || "—"}</div></div>
                </div>
              </div>

              <div style={{ padding:"0 14px 14px" }}>
                <div className="wm-label" style={{ marginBottom:8 }}>2026 Form</div>
                <div style={{ background:"var(--surface-2)", borderRadius:10, padding:10, fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>
                  {pd.record2026 || "—"}
                </div>
              </div>

              <div className="what-matters" style={{ paddingTop:0 }}>
                <div className="wm-label">Serve</div>
                <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatServeStats(pd.serveStats)}</div>
              </div>

              <div className="what-matters" style={{ paddingTop:0 }}>
                <div className="wm-label">Return</div>
                <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatReturnStats(pd.returnStats)}</div>
              </div>

              <div className="what-matters" style={{ paddingTop:0 }}>
                <div className="wm-label">Overall</div>
                <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatOverallStats(pd.overallStats)}</div>
              </div>

              {pd.miamiNote && (
                <div className="what-matters" style={{ paddingTop:0 }}>
                  <div className="wm-label" style={{ color:"var(--mag)" }}>Tournament Note</div>
                  <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55 }}>{pd.miamiNote}</div>
                </div>
              )}

              {pd.fullNote && (
                <div className="what-matters" style={{ paddingTop:0 }}>
                  <div className="wm-label">UR Take</div>
                  <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55 }}>{pd.fullNote}</div>
                </div>
              )}
            </div>

            <AskBar
              inputRef={playerInputRef}
              fileInputRef={fileInputRef}
              value={tennisInput}
              onChange={setTennisInput}
              onSubmit={() => submitTennis()}
              placeholder={`Ask about ${selectedPlayer}...`}
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              processImageFile={processImageFile}
            />
          </main>
        )}

        {screen === "ask" && (
          <main className="screen">
            <section className="hero" style={{ paddingTop:4 }}>
              <div className="hero-title">UR TAKE</div>
              <div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div>
            </section>

            <AskBar
              inputRef={askInputRef}
              fileInputRef={fileInputRef}
              value={askInput}
              onChange={setAskInput}
              onSubmit={submitAsk}
              placeholder="What do you want to know?"
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              processImageFile={processImageFile}
            />

            {askMsgs.length === 0 ? (
              <section className="section">
                <div className="section-label">TRY ONE</div>
                <div className="q-list">
                  {dynamicHomeQuestions.map((q) => (
                    <button key={q.id} className="q-card" onClick={() => firePrompt(q.prompt)}>
                      <div className="q-top">
                        <div className="q-accent" style={{ background:q.color }} />
                        <div className="q-text">{q.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <ChatThread msgs={askMsgs} />
            )}
          </main>
        )}

        {screen === "pro" && (
          <main className="screen">
            <div style={{ textAlign:"center", padding:"20px 4px 16px" }}>
              <div style={{ fontFamily:"var(--display-font)", fontSize: theme === "soft" ? 42 : 30, letterSpacing: theme === "soft" ? "-0.02em" : "1px", lineHeight:1.1, marginBottom:10 }}>
                Stop Guessing.<br />
                <span style={{ background:"linear-gradient(90deg,var(--cyan),var(--mag))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                  Start Beating the Line.
                </span>
              </div>
              <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55, maxWidth:340, margin:"0 auto" }}>
                You're leaving edges on the table every single slate. UR TAKE Pro closes the gap.
              </div>
            </div>

            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20, padding:"20px 18px", marginBottom:14, boxShadow:"var(--card-shadow)" }}>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:4 }}>
                <span style={{ fontFamily:"var(--display-font)", fontSize:42, lineHeight:1, color:"var(--text)" }}>$9.99</span>
                <span style={{ fontFamily:"var(--mono-font)", fontSize:12, color:"var(--muted)", marginBottom:6 }}>/month</span>
              </div>
              <div style={{ fontFamily:"var(--mono-font)", fontSize:10, color:"var(--cyan)", marginBottom:16, letterSpacing:1 }}>
                LESS THAN ONE BAD BET
              </div>
              <button style={{ width:"100%", border:"none", borderRadius:14, padding:"15px 0", cursor:"pointer", fontFamily:"var(--display-font)", fontSize:20, color: theme === "soft" ? "#FFFFFF" : "#080A0C", background:"linear-gradient(90deg,var(--cyan),var(--mag))" }}>
                UNLOCK MY EDGE
              </button>
            </div>

            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 18px", marginBottom:14, boxShadow:"var(--card-shadow)" }}>
              <div style={{ fontFamily:"var(--mono-font)", fontSize:10, letterSpacing:3, color:"var(--cyan)", marginBottom:14, textTransform:"uppercase" }}>WHAT YOU GET</div>
              {[
                ["Unlimited UR TAKE queries", "No throttling mid-slate, no daily cap. Ask everything."],
                ["Real prop edges", "True floors and ceilings — not public line guesswork."],
                ["Full player intelligence", "QB + RB/WR/TE database + tennis profiles + defense tiers."],
                ["Live matchup breakdowns", "Defense-adjusted prop leans with actual betting angles."],
                ["Saved threads", "Track your takes and review what hit."],
                ["Priority responses", "Faster answers during live games when it matters most."],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:i < 5 ? 12 : 0 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--cyan)", flexShrink:0, marginTop:6 }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{title}</div>
                    <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="page-spacer" />
          </main>
        )}

        <nav className="bottom-nav">
          <button className={`nav-btn${tab === "home" && screen === "home" ? " active" : ""}`} onClick={goHome}>
            <NavIcon type="home" />
            <span>Home</span>
          </button>
          <button className={`nav-btn${tab === "tennis" ? " tennis-active" : ""}`} onClick={goTennis}>
            <NavIcon type="tennis" />
            <span>{theme === "soft" ? "Charleston" : "Tennis"}</span>
          </button>
          <button className={`nav-btn${tab === "nfl" ? " nfl-active" : ""}`} onClick={goNfl}>
            <NavIcon type="nfl" />
            <span>NFL</span>
          </button>
          <button className={`nav-btn${tab === "ask" ? " active" : ""}`} onClick={goAsk}>
            <NavIcon type="ask" />
            <span>Ask</span>
          </button>
          <button className={`nav-btn${tab === "pro" ? " active" : ""}`} onClick={goPro}>
            <NavIcon type="pro" />
            <span>Pro</span>
          </button>
        </nav>
      </div>
    </>
  );
}
